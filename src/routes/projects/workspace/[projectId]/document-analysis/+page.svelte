<script lang="ts">
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Types and Data Stores
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import type { Project, Doclink } from '$lib/types/cloud/app';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
	import { getAppSyncWsClient, initAppSyncWsClient } from '$lib/realtime/websocket/wsClient';
	import { computeExecutionIdForSubmitInput } from '$lib/ai-query/calculateExecutionId';
	
	// ProjectDocument type for PDFViewer (id and filename)
	interface ProjectDocument {
		id: string;
		filename: string;
	}
	
	// Use ValidatedTopicStore instead of appStateStore
	import { store } from '$lib/realtime/websocket/projectSync';
	
	// Import DocumentEntitiesSyncManager for fetching texts, tables, and images
	import { DocumentEntitiesSyncManager } from '$lib/realtime/websocket/syncManagers/DocumentEntitiesSyncManager';
	
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import DocumentUpload from '$lib/components/DocumentUpload/DocumentUpload.svelte';
	
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Application Defined Components
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import type { Prompt } from '@stratiqai/types-simple';
	import ProjectEntitiesDisplay from '$lib/components/ProjectEntities/ProjectEntitiesDisplay.svelte';
	import PDFViewer from '$lib/components/PDFViewer/PDFViewer.svelte';
	import PromptsSidebar from './components/PromptsSidebar.svelte';
	import PromptEditModal from '../../../../library/components/PromptEditModal.svelte';
	import { updatePromptTemplate, createPromptTemplate, deletePromptTemplate, type AIQueryData } from '../../../../library/PromptService';
	import { GraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { M_SUBMIT_AI_QUERY, S_ON_UPDATE_AI_QUERY_EXECUTION_BY_EXECUTION_ID, Q_GET_AI_QUERY_EXECUTION } from '@stratiqai/types-simple';
	import { streamCatalog } from '$lib/stores/streamCatalog.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import SendToDashboardModal from './components/SendToDashboardModal.svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Initialize the state variables for this component
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	
	// Get page data including idToken
	let { data } = $props();
	const idToken = $derived(data?.idToken);
	const pageQueryClient = $derived(idToken ? new GraphQLQueryClient(idToken) : null);
	const currentUser = $derived(data?.currentUser ?? authStore.currentUser);
	const isNewProject = $derived(data?.isNewProject);
	
	// Get projectId from route params
	import { page } from '$app/stores';
	const projectId = $derived($page.params.projectId ?? null);

	// Dark mode support
	const darkMode = $derived(darkModeStore.darkMode);

	// Upload section: collapsed by default when documents exist, expanded when empty
	let uploadExpanded = $state(false);
	
	// Document entities sync manager instance
	let documentEntitiesManager = $state<DocumentEntitiesSyncManager | null>(null);
	let isLoadingEntities = $state(false);
	let entitiesError = $state<string | null>(null);
	
	// Track which document IDs we've already fetched to prevent re-fetching
	let lastFetchedDocIds = $state<string>('');

	// Per-prompt execution state: supports multiple concurrent AI queries
	interface VisionQueryResult {
		answer: string;
		structuredOutput?: unknown;
		matchCount: number;
	}

	interface PromptExecution {
		loading: boolean;
		error: string | null;
		result: VisionQueryResult | null;
		statusMessage: string | null;
		_unsub: (() => void) | null;
		_timeoutId: ReturnType<typeof setTimeout> | null;
		_pollingId: ReturnType<typeof setInterval> | null;
	}

	let executions = $state<Map<string, PromptExecution>>(new Map());

	function cleanupExecution(promptId: string) {
		const entry = executions.get(promptId);
		if (!entry) return;
		if (entry._timeoutId != null) clearTimeout(entry._timeoutId);
		if (entry._pollingId != null) clearInterval(entry._pollingId);
		entry._unsub?.();
		entry._timeoutId = null;
		entry._pollingId = null;
		entry._unsub = null;
	}

	function clearExecution(promptId: string) {
		cleanupExecution(promptId);
		executions.delete(promptId);
		executions = new Map(executions);
	}

	// Prompt edit modal: edit existing (click in sidebar) or create new
	let editingPrompt = $state<Prompt | null>(null);
	let isCreatingPrompt = $state(false);
	let promptSaveLoading = $state(false);
	let promptsRefreshTrigger = $state(0);

	/** "Send to Dashboard" modal: tracks which prompt's result to show */
	let sendToDashboardPromptId = $state<string | null>(null);
	let sendToDashboardPromptRef = $state<Prompt | null>(null);
	const showSendToDashboard = $derived(sendToDashboardPromptId != null);

	onDestroy(() => {
		for (const promptId of executions.keys()) {
			cleanupExecution(promptId);
		}
	});

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Component Variables that are Derived from the Stores
	// Do not modify these variables directly
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Get current project from ValidatedTopicStore
	const project = $derived.by(() => {
		if (!projectId) return null;
		return store.at<Project>(`projects/${projectId}`) ?? null;
	});

	// File metadata for S3 uploads (must be after `project` derivation)
	const fileMetadata = $derived.by(() => {
		const hasOwnerId = !!currentUser?.sub;
		const hasProjectId = !!projectId;
		if (!hasOwnerId || !hasProjectId) return null;
		return {
			tenantId: project?.tenantId || currentUser.tenant || authStore.currentUser?.tenant || 'default',
			ownerId: currentUser.sub,
			parentId: projectId
		};
	});

	// Get doclinks from project (these link to documents)
	const doclinks = $derived.by(() => {
		const currentProject = project;
		if (!currentProject?.doclinks) return [] as Doclink[];
		const links = currentProject.doclinks;
		if (Array.isArray(links)) {
			return links;
		}
		return (links as { items: Doclink[] })?.items || [];
	});

	// Convert doclinks to ProjectDocument format for PDFViewer
	// The id should be the documentId (SHA256 hash) which is used in the S3 URL path
	const documents = $derived.by(() => {
		return doclinks
			.filter((link) => link.documentId && link.filename)
			.map((link) => ({
				id: link.documentId!, // This is the SHA256 hash used in S3 path: {hash}/document.pdf
				filename: link.filename
			})) as ProjectDocument[];
	});

	// Selected document state for PDFViewer
	let selectedDocId = $state<string>('');
	let currentPage = $state(1);

	// Always select the first document by default when documents are available
	$effect(() => {
		if (documents.length > 0) {
			const firstDocId = documents[0].id;
			// Always select the first document if none is selected, or if the current selection is invalid
			if (!selectedDocId || !documents.some((doc) => doc.id === selectedDocId)) {
				selectedDocId = firstDocId;
				currentPage = 1; // Reset to first page when changing documents
			}
		} else if (selectedDocId) {
			// Clear selection if documents list becomes empty
			selectedDocId = '';
		}
	});

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Fetch document entities using DocumentEntitiesSyncManager
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	
	// Create a stable key from document IDs to detect actual changes
	const documentIdsKey = $derived(documents.map(doc => doc.id).sort().join(','));
	
	/**
	 * Initialize and fetch document entities when documents are available
	 */
	async function fetchDocumentEntities(documentIds: string[], token: string, pid: string): Promise<void> {
		if (!browser) return;

		isLoadingEntities = true;
		entitiesError = null;

		try {
			// Cleanup existing manager if any
			if (documentEntitiesManager) {
				documentEntitiesManager.cleanup();
			}

			// Create and initialize the manager
			documentEntitiesManager = await DocumentEntitiesSyncManager.create({
				idToken: token,
				projectId: pid,
				documentIds
			});
		} catch (err) {
			console.error('Failed to fetch document entities:', err);
			entitiesError = err instanceof Error ? err.message : 'Failed to load document entities';
		} finally {
			isLoadingEntities = false;
		}
	}

	// Fetch entities when document IDs change (using stable key comparison)
	$effect(() => {
		const docIdsKey = documentIdsKey;
		const token = idToken;
		const pid = projectId;
		
		// Only fetch if we have valid data and the document IDs have actually changed
		if (browser && token && pid && docIdsKey && docIdsKey !== lastFetchedDocIds) {
			lastFetchedDocIds = docIdsKey;
			const documentIds = docIdsKey.split(',').filter(id => id);
			if (documentIds.length > 0) {
				fetchDocumentEntities(documentIds, token, pid);
			}
		}
	});

	// Cleanup on component destroy
	$effect(() => {
		return () => {
			if (documentEntitiesManager) {
				documentEntitiesManager.cleanup();
			}
		};
	});

	const selectedDocFilename = $derived(
		documents.find(d => d.id === selectedDocId)?.filename ?? null
	);

	function handleEditPrompt(prompt: Prompt) {
		editingPrompt = prompt;
		isCreatingPrompt = false;
	}

	function handleCreatePrompt() {
		editingPrompt = null;
		isCreatingPrompt = true;
	}

	async function handleDeletePrompt(prompt: Prompt) {
		if (!idToken) return;
		clearExecution(prompt.id);
		const queryClient = new GraphQLQueryClient(idToken);
		await deletePromptTemplate(queryClient, prompt.id);
		promptsRefreshTrigger += 1;
	}

	function handleClearResult(promptId: string) {
		clearExecution(promptId);
	}

	function handleSendToDashboard(prompt: Prompt) {
		sendToDashboardPromptRef = prompt;
		sendToDashboardPromptId = prompt.id;
	}

	function closeSendToDashboard() {
		sendToDashboardPromptId = null;
		sendToDashboardPromptRef = null;
	}

	type AIQueryExecPayload = {
		status: string;
		statusMessage?: string | null;
		rawOutput?: string | null;
		errorMessage?: string | null;
		errorCode?: string | null;
		retryCount?: number | null;
		model?: string | null;
	};

	const ERROR_CODE_MESSAGES: Record<string, string> = {
		PROMPT_NOT_FOUND: 'The selected prompt no longer exists.',
		SCHEMA_PARSE_ERROR: 'The JSON schema is malformed. Edit the schema and try again.',
		MISSING_INPUT: 'Required input variables are missing.',
		RATE_LIMITED: 'The AI service is busy. Please try again in a moment.',
		GEMINI_ERROR: 'The AI model returned an error. Try again or use a different model.',
		VISION_CONFIG_MISSING: 'Server is not configured for document analysis.',
		API_KEY_MISSING: 'Server AI key is not configured. Contact your administrator.',
		TIMEOUT: 'The request took too long. Try with a simpler prompt or fewer documents.',
		INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
	};

	function friendlyErrorMessage(exec: AIQueryExecPayload): string {
		if (exec.errorCode && ERROR_CODE_MESSAGES[exec.errorCode]) {
			return ERROR_CODE_MESSAGES[exec.errorCode];
		}
		return exec.errorMessage ?? 'Execution failed';
	}

	/** Trigger reactive re-render when mutating a map entry in-place. */
	function touchExecutions() {
		executions = new Map(executions);
	}

	/**
	 * Per-prompt execution: each prompt gets its own subscription, polling, and timeout.
	 * Multiple prompts can run concurrently without interfering with each other.
	 */
	async function runVisionQueryWithPrompt(prompt: Prompt) {
		const pid = prompt.id;

		if (!idToken || !projectId) {
			executions.set(pid, {
				loading: false, error: 'Missing session or project.', result: null,
				statusMessage: null, _unsub: null, _timeoutId: null, _pollingId: null
			});
			touchExecutions();
			return;
		}
		if (!selectedDocId) {
			executions.set(pid, {
				loading: false, error: 'Select a document in the viewer to run this prompt.', result: null,
				statusMessage: null, _unsub: null, _timeoutId: null, _pollingId: null
			});
			touchExecutions();
			return;
		}

		// If re-running the same prompt, clean up previous lifecycle
		cleanupExecution(pid);

		const documentIds = [selectedDocId];
		const inputValues = '{}';

		const entry: PromptExecution = {
			loading: true,
			error: null,
			result: null,
			statusMessage: 'Submitting...',
			_unsub: null,
			_timeoutId: null,
			_pollingId: null
		};
		executions.set(pid, entry);
		touchExecutions();

		let settled = false;

		const finishLoading = () => {
			entry.loading = false;
			touchExecutions();
		};

		const resetAdaptiveTimeout = () => {
			if (entry._timeoutId != null) clearTimeout(entry._timeoutId);
			entry._timeoutId = setTimeout(() => {
				if (!settled) {
					settled = true;
					cleanupExecution(pid);
					entry.error = 'Timed out waiting for result.';
					entry.result = null;
					entry.statusMessage = null;
					finishLoading();
				}
			}, 120_000);
		};

		const applyExecutionResult = (exec: AIQueryExecPayload) => {
			if (settled) return;
			resetAdaptiveTimeout();

			if (exec.status === 'QUEUED' || exec.status === 'PROCESSING') {
				entry.statusMessage = exec.statusMessage ?? (exec.status === 'QUEUED' ? 'Queued...' : 'AI is processing...');
				if (exec.retryCount && exec.retryCount > 0) {
					entry.statusMessage = `Retrying (${exec.retryCount})...`;
				}
				touchExecutions();
				return;
			}

			if (exec.status === 'SUCCESS') {
				settled = true;
				cleanupExecution(pid);
				entry.statusMessage = null;
				let structuredOutput: unknown = undefined;
				if (exec.rawOutput) {
					try {
						const parsed = JSON.parse(exec.rawOutput);
						structuredOutput = typeof parsed === 'object' && parsed !== null ? parsed : undefined;
					} catch { /* plain text */ }
				}
				entry.result = {
					answer: exec.rawOutput ?? '',
					structuredOutput,
					matchCount: documentIds.length
				};

				if (prompt.id) {
					const stream = streamCatalog.getStreamByPromptId(prompt.id);
					if (stream && structuredOutput !== undefined) {
						const ok = validatedTopicStore.publish(stream.topic, structuredOutput);
						if (!ok) {
							console.warn(`[document-analysis] Auto-publish to stream "${stream.topic}" rejected by validation`);
						}
					}
				}

				finishLoading();
			} else if (exec.status === 'ERROR') {
				settled = true;
				cleanupExecution(pid);
				entry.statusMessage = null;
				entry.error = friendlyErrorMessage(exec);
				entry.result = null;
				finishLoading();
			}
		};

		try {
			const executionIdHash = await computeExecutionIdForSubmitInput({
				projectId,
				promptId: prompt.id,
				inputValues,
				documentIds,
				jsonSchemaId: prompt.jsonSchemaId,
				model: prompt.model
			});

			const client = getAppSyncWsClient() ?? initAppSyncWsClient({
				graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
				auth: { mode: 'cognito', idToken }
			});

			let submittedExecId: string | null = null;

			const startPollingFallback = () => {
				if (entry._pollingId != null || settled || !submittedExecId) return;
				entry.statusMessage = 'Polling for updates...';
				touchExecutions();
				entry._pollingId = setInterval(async () => {
					if (settled || !submittedExecId || !idToken) {
						if (entry._pollingId != null) clearInterval(entry._pollingId);
						entry._pollingId = null;
						return;
					}
					try {
						const pollRes = await gql<{ getAIQueryExecution: AIQueryExecPayload | null }>(
							Q_GET_AI_QUERY_EXECUTION,
							{ id: submittedExecId },
							idToken
						);
						const exec = pollRes.getAIQueryExecution;
						if (exec) applyExecutionResult(exec);
					} catch { /* non-fatal */ }
				}, 4_000);
			};

			const subHandle = client.subscribe({
				query: S_ON_UPDATE_AI_QUERY_EXECUTION_BY_EXECUTION_ID,
				variables: { executionId: executionIdHash },
				next: (payload: unknown) => {
					const data = payload as {
						onUpdateAIQueryExecutionByExecutionId?: AIQueryExecPayload | null;
					};
					const exec = data?.onUpdateAIQueryExecutionByExecutionId;
					if (exec) applyExecutionResult(exec);
				},
				error: (e: unknown) => {
					console.error('[document-analysis] subscription error, falling back to polling', e);
					entry._unsub?.();
					entry._unsub = null;
					startPollingFallback();
				}
			});
			entry._unsub = () => subHandle.unsubscribe();

			resetAdaptiveTimeout();

			const submitRes = await gql<{ submitAIQuery: AIQueryExecPayload & { id: string } }>(
				M_SUBMIT_AI_QUERY,
				{
					input: {
						projectId,
						promptId: prompt.id,
						executionId: executionIdHash,
						inputValues,
						documentIds,
						topK: 5
					}
				},
				idToken
			);

			const immediate = submitRes.submitAIQuery;
			if (immediate?.id) submittedExecId = immediate.id;
			if (immediate) applyExecutionResult(immediate);
		} catch (err) {
			settled = true;
			cleanupExecution(pid);
			entry.statusMessage = null;
			entry.error = err instanceof Error ? err.message : 'Vision query failed';
			entry.result = null;
			finishLoading();
		}
	}

	async function handleSavePrompt(saveData: {
		name: string;
		description: string;
		aiQueryData: AIQueryData;
		jsonSchemaId?: string;
		schemaData?: { name: string; description?: string; schemaDefinition: unknown };
	}) {
		if (!idToken) {
			alert('Unable to save: session missing. Please refresh and try again.');
			return;
		}
		promptSaveLoading = true;
		try {
			const queryClient = new GraphQLQueryClient(idToken);
			if (isCreatingPrompt) {
				if (!projectId) {
					alert('Unable to create prompt: no project selected. Open a project first.');
					return;
				}
				await createPromptTemplate(
					queryClient,
					projectId,
					saveData.name,
					saveData.aiQueryData,
					saveData.description || undefined,
					saveData.jsonSchemaId,
					saveData.schemaData
				);
				isCreatingPrompt = false;
				promptsRefreshTrigger += 1;
			} else if (editingPrompt) {
				await updatePromptTemplate(
					queryClient,
					editingPrompt.id,
					{
						name: saveData.name,
						description: saveData.description,
						aiQueryData: saveData.aiQueryData,
						jsonSchemaId: saveData.jsonSchemaId,
						schemaData: saveData.schemaData,
						existingJsonSchemaId: (editingPrompt as { jsonSchemaId?: string }).jsonSchemaId
					},
					(editingPrompt as { parentId?: string }).parentId
				);
				editingPrompt = null;
			}
		} catch (err) {
			console.error('Failed to save prompt:', err);
			throw err;
		} finally {
			promptSaveLoading = false;
		}
	}

	function handleCancelPrompt() {
		editingPrompt = null;
		isCreatingPrompt = false;
	}

</script>

<div class="flex h-full w-full overflow-hidden">
	<div class="flex-1 overflow-y-auto">
	<div class="mx-auto max-w-7xl px-6 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center gap-3 mb-3">
				<div class="w-1 h-8 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-full"></div>
				<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Document <span class="{darkMode ? 'text-indigo-400' : 'text-indigo-600'}">Workspace</span>
				</h2>
			</div>
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} ml-4">
				Upload, view, and analyze your documents.
			</p>
		</div>

		<!-- Upload Section -->
		{#if documents.length === 0}
			<!-- Expanded upload when no documents -->
			<div class="mb-8 {darkMode ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-900/20 border-indigo-500/30' : 'bg-gradient-to-br from-white via-indigo-50/50 to-white border-indigo-200'} rounded-lg border-2 shadow-lg">
				<div class="p-6">
					<DocumentUpload
						{idToken}
						{projectId}
						metadata={fileMetadata}
					/>
				</div>
			</div>
		{:else}
			<!-- Compact collapsible upload bar when documents exist -->
			<div class="mb-8 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<button
					type="button"
					onclick={() => uploadExpanded = !uploadExpanded}
					class="w-full flex items-center justify-between px-6 py-3 text-left transition-colors {darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}"
				>
					<div class="flex items-center gap-3">
						<svg class="w-5 h-5 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
						</svg>
						<span class="text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">
							Upload more documents
						</span>
						<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
							{documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
						</span>
					</div>
					<svg
						class="w-4 h-4 transition-transform {uploadExpanded ? 'rotate-180' : ''} {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						fill="none" stroke="currentColor" viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
					</svg>
				</button>
				{#if uploadExpanded}
					<div class="px-6 pb-6 border-t {darkMode ? 'border-slate-700' : 'border-slate-200'}">
						<div class="pt-4">
							<DocumentUpload
								{idToken}
								{projectId}
								metadata={fileMetadata}
							/>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- PDF Viewer -->
		{#if documents.length > 0 && selectedDocId}
			<div class="mb-8">
				<PDFViewer
					documents={documents}
					bind:currentDocHash={selectedDocId}
					bind:currentPage={currentPage}
					showButtons={['navigation', 'zoom', 'rotate', 'download']}
				/>
			</div>
		{/if}

		<!-- Document Entities Display -->
		{#if projectId && documents.length > 0}
			<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<div class="p-6">
					{#if isLoadingEntities}
						<div class="flex items-center justify-center py-8">
							<div class="flex items-center gap-3">
								<svg class="animate-spin h-5 w-5 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<span class="{darkMode ? 'text-slate-300' : 'text-slate-600'}">Loading document entities...</span>
							</div>
						</div>
					{:else if entitiesError}
						<div class="p-4 {darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'} rounded-lg border">
							<div class="flex items-center gap-2 text-red-600 dark:text-red-400">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<span class="font-medium">Error loading entities</span>
							</div>
							<p class="mt-1 text-sm {darkMode ? 'text-red-300' : 'text-red-600'}">{entitiesError}</p>
							<button
								onclick={() => {
									lastFetchedDocIds = ''; // Reset to allow re-fetch
									const docIds = documents.map(doc => doc.id);
									if (idToken && projectId && docIds.length > 0) {
										fetchDocumentEntities(docIds, idToken, projectId);
									}
								}}
								class="mt-3 px-3 py-1.5 text-sm font-medium {darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-700'} rounded-md transition-colors"
							>
								Retry
							</button>
						</div>
					{:else}
						<ProjectEntitiesDisplay {projectId} {documents} />
					{/if}
				</div>
			</div>
		{/if}

		<!-- Help Link -->
		<div class="mt-6 text-center">
			<a
				href="/blog/uploading-your-first-property"
				class="text-sm {darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} font-medium hover:underline transition-colors inline-flex items-center gap-2 group"
			>
				<span>Learn more about uploading documents</span>
				<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
			</a>
		</div>
	</div>
	</div>

	<!-- Prompts sidebar (right) -->
	<PromptsSidebar
		{idToken}
		{darkMode}
		{executions}
		canRunPrompt={!!selectedDocId}
		{selectedDocFilename}
		onRunPrompt={runVisionQueryWithPrompt}
		onEditPrompt={handleEditPrompt}
		onCreatePrompt={handleCreatePrompt}
		onDeletePrompt={handleDeletePrompt}
		onClearResult={handleClearResult}
		onSendToDashboard={handleSendToDashboard}
		refreshTrigger={promptsRefreshTrigger}
	/>

	<!-- Same edit dialog as Prompt library: open when editing or creating a prompt -->
	{#if editingPrompt || isCreatingPrompt}
		<PromptEditModal
			{darkMode}
			template={editingPrompt}
			isCreating={isCreatingPrompt}
			queryClient={pageQueryClient}
			onSave={handleSavePrompt}
			onCancel={handleCancelPrompt}
		/>
	{/if}

	<!-- Send to Dashboard modal -->
	{#if showSendToDashboard && sendToDashboardPromptId}
		{@const dashExec = executions.get(sendToDashboardPromptId)}
		<SendToDashboardModal
			{darkMode}
			prompt={sendToDashboardPromptRef}
			result={dashExec?.result?.structuredOutput ?? dashExec?.result?.answer}
			onclose={closeSendToDashboard}
			onpublished={closeSendToDashboard}
		/>
	{/if}
</div>
