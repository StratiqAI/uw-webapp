<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import type { Prompt, Project } from '@stratiqai/types-simple';
	import type { Doclink } from '$lib/types/cloud/app';
	import { PromptSyncManager } from '$lib/services/realtime/websocket/sync-managers/PromptSyncManager';
	import { ProjectSyncManager } from '$lib/services/realtime/websocket/sync-managers/ProjectSyncManager';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { GraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
	import { toTopicPath } from '$lib/services/realtime/store/TopicMapper';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	import TopBar from '$lib/components/layout/TopBar.svelte';
	import PromptEditModal from './components/PromptEditModal.svelte';
	import JsonSchemaPickerModal from '$lib/components/schemas/JsonSchemaPickerModal.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PromptWorkspaceToolsSidebar from './components/PromptWorkspaceToolsSidebar.svelte';
	import PromptWorkspaceCenter from './components/PromptWorkspaceCenter.svelte';
	import PromptLibrarySidebar from './components/PromptLibrarySidebar.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import {
		fetchProjectWithPromptTemplates,
		createPromptTemplate,
		updatePromptTemplate,
		deletePromptTemplate,
		getTemplateStrForEditor,
		parseTemplateToAIQueryData,
		extractPromptVariableNames,
		type AIQueryData
	} from './PromptService';
	import { aiService } from '$lib/services/ai';
	import type { ExecutionHandle } from '$lib/services/ai/types';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('prompts');

	const SIDEBAR_MIN = 200;
	const SIDEBAR_MAX = 560;
	const SIDEBAR_DEFAULT_LEFT = 280;
	const SIDEBAR_DEFAULT_RIGHT = 320;

	const RESERVED_TEMPLATE_VARS = new Set(['question', 'text', 'prompt']);

	let { data } = $props<{ data: { idToken: string; projects: Project[] } }>();

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	let promptSyncManager: PromptSyncManager | null = null;
	let projectSyncManager: ProjectSyncManager | null = null;
	let queryClient = $state<GraphQLQueryClient | null>(null);

	const selectedProjectId = $derived($page.params.projectId ?? null);
	let editingTemplate = $state<Prompt | null>(null);
	let isCreating = $state(false);
	let searchFilter = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let deleteTemplateConfirm = $state<Prompt | null>(null);
	let deleteTemplateModalOpen = $state(false);
	let showSchemaLibrary = $state(false);

	let leftSidebarWidth = $state(SIDEBAR_DEFAULT_LEFT);
	let rightSidebarWidth = $state(SIDEBAR_DEFAULT_RIGHT);

	let workspaceTopK = $state(5);
	let workspaceTopKPerNs = $state(5);
	let workspacePriority = $state<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
	let workspaceGoogleSearch = $state(true);
	let workspaceDocScopeSelectedOnly = $state(false);

	let selectedWorkspacePrompt = $state<Prompt | null>(null);
	let workspaceSelectedDocId = $state('');
	let workspaceQuestion = $state('');
	let workspaceVarValues = $state<Record<string, string>>({});
	let streamingBuffer = $state('');
	let workspaceExecuting = $state(false);
	let workspaceStreamError = $state('');
	let executionHandle = $state<ExecutionHandle | null>(null);

	function clampSidebarWidth(w: number): number {
		if (typeof window === 'undefined') return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w));
		const maxByViewport = Math.floor(window.innerWidth * 0.5);
		return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w), maxByViewport);
	}

	function onLeftResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = leftSidebarWidth;

		function onMove(ev: PointerEvent) {
			leftSidebarWidth = clampSidebarWidth(startW + (ev.clientX - startX));
		}

		function onUp(ev: PointerEvent) {
			target.releasePointerCapture(ev.pointerId);
			target.removeEventListener('pointermove', onMove);
			target.removeEventListener('pointerup', onUp);
			target.removeEventListener('pointercancel', onUp);
		}

		target.addEventListener('pointermove', onMove);
		target.addEventListener('pointerup', onUp);
		target.addEventListener('pointercancel', onUp);
	}

	function onRightResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = rightSidebarWidth;

		function onMove(ev: PointerEvent) {
			rightSidebarWidth = clampSidebarWidth(startW - (ev.clientX - startX));
		}

		function onUp(ev: PointerEvent) {
			target.releasePointerCapture(ev.pointerId);
			target.removeEventListener('pointermove', onMove);
			target.removeEventListener('pointerup', onUp);
			target.removeEventListener('pointercancel', onUp);
		}

		target.addEventListener('pointermove', onMove);
		target.addEventListener('pointerup', onUp);
		target.addEventListener('pointercancel', onUp);
	}

	let allTemplates = $derived.by(() => {
		return validatedTopicStore.getAllAtArray<Prompt>('prompts');
	});

	let filteredTemplates = $derived.by(() => {
		let templates = allTemplates;

		if (selectedProjectId) {
			templates = templates.filter(
				(t) =>
					(t as { parentId?: string }).parentId == null ||
					(t as { parentId?: string }).parentId === selectedProjectId
			);
		}

		if (searchFilter) {
			const search = searchFilter.toLowerCase();
			templates = templates.filter(
				(t) =>
					t.name.toLowerCase().includes(search) ||
					(t.description && t.description.toLowerCase().includes(search))
			);
		}

		return templates;
	});

	let projectFromStore = $derived.by(() => {
		if (!selectedProjectId) return null;
		return validatedTopicStore.at<Project>(`projects/${selectedProjectId}`) ?? null;
	});

	type DoclinkWithLinkType = Doclink & { linkType?: string };

	let workspaceDocuments = $derived.by(() => {
		const p = projectFromStore;
		if (!p?.doclinks) return [] as { id: string; filename: string }[];
		const links = Array.isArray(p.doclinks) ? p.doclinks : ((p.doclinks as { items?: Doclink[] }).items ?? []);
		const byDoc = new Map<string, Doclink>();
		for (const link of links as DoclinkWithLinkType[]) {
			if (!link.documentId || link.deletedAt) continue;
			const existing = byDoc.get(link.documentId);
			if (!existing || link.linkType === 'NONE') byDoc.set(link.documentId, link);
		}
		return Array.from(byDoc.values())
			.filter((link) => link.documentId && link.filename)
			.map((link) => ({ id: link.documentId!, filename: link.filename }));
	});

	let workspaceExtraVarNames = $derived.by(() => {
		const pr = selectedWorkspacePrompt;
		if (!pr?.prompt) return [];
		const fromApi = (pr as { inputVariables?: string[] }).inputVariables ?? [];
		const fromText = extractPromptVariableNames(pr.prompt);
		const merged = [...new Set([...fromApi, ...fromText])];
		return merged.filter((n) => !RESERVED_TEMPLATE_VARS.has(n));
	});

	function getTemplateDisplayInfo(template: Prompt) {
		const templateStr = getTemplateStrForEditor(template);
		const aiData = parseTemplateToAIQueryData(templateStr ?? '');
		return {
			prompt: aiData.prompt,
			model: aiData.model,
			hasSchema: aiData.responseFormat?.type === 'json_schema'
		};
	}

	$effect(() => {
		const names = workspaceExtraVarNames;
		untrack(() => {
			const next: Record<string, string> = {};
			for (const n of names) {
				next[n] = workspaceVarValues[n] ?? '';
			}
			workspaceVarValues = next;
		});
	});

	$effect(() => {
		const docs = workspaceDocuments;
		untrack(() => {
			if (docs.length === 0) {
				workspaceSelectedDocId = '';
				return;
			}
			if (!workspaceSelectedDocId || !docs.some((d) => d.id === workspaceSelectedDocId)) {
				workspaceSelectedDocId = docs[0].id;
			}
		});
	});

	$effect(() => {
		const _ = selectedWorkspacePrompt?.id;
		untrack(() => {
			streamingBuffer = '';
			workspaceStreamError = '';
		});
	});

	async function initialize() {
		if (!data.idToken) {
			error = 'Not authenticated';
			return;
		}

		isLoading = true;
		error = null;

		try {
			queryClient = new GraphQLQueryClient(data.idToken);

			projectSyncManager = ProjectSyncManager.createInactive();
			await projectSyncManager.initialize({
				idToken: data.idToken,
				initialItems: data.projects,
				setupSubscriptions: true
			});

			promptSyncManager = PromptSyncManager.createInactive();
			await promptSyncManager.initialize({
				idToken: data.idToken,
				setupSubscriptions: true
			});

			if (selectedProjectId) {
				await loadTemplatesForProject(selectedProjectId);
			}
		} catch (err) {
			log.error('Failed to initialize:', err);
			error = err instanceof Error ? err.message : 'Failed to initialize';
		} finally {
			isLoading = false;
		}
	}

	async function loadTemplatesForProject(projectId: string) {
		if (!queryClient) return;

		isLoading = true;
		try {
			const { project, promptTemplates } = await fetchProjectWithPromptTemplates(queryClient, projectId);

			validatedTopicStore.publish(toTopicPath('projects', project.id), project);

			for (const template of promptTemplates) {
				validatedTopicStore.publish(toTopicPath('prompts', template.id), template);
			}
		} catch (err) {
			log.error('Failed to load templates:', err);
			error = err instanceof Error ? err.message : 'Failed to load templates';
		} finally {
			isLoading = false;
		}
	}

	function handleProjectSelect(projectId: string | null) {
		if (projectId && projectId !== selectedProjectId) {
			goto(resolve(`/p/${projectId}/prompts`));
		}
	}

	function handleCreateNew() {
		if (!selectedProjectId) {
			toastStore.info('Please select a project first.');
			return;
		}
		isCreating = true;
		editingTemplate = null;
	}

	function handleEditTemplate(template: Prompt) {
		editingTemplate = template;
		isCreating = false;
	}

	function handleSelectWorkspacePrompt(template: Prompt) {
		selectedWorkspacePrompt = template;
	}

	async function handleSaveTemplate(saveData: {
		name: string;
		description: string;
		aiQueryData: AIQueryData;
		jsonSchemaId?: string;
		schemaData?: { name: string; description?: string; schemaDefinition: unknown };
	}) {
		if (!queryClient) {
			toastStore.error('Unable to save: not connected. Please refresh the page and try again.');
			return;
		}

		isLoading = true;
		try {
			if (isCreating && selectedProjectId) {
				const newTemplate = await createPromptTemplate(
					queryClient,
					selectedProjectId,
					saveData.name,
					saveData.aiQueryData,
					saveData.description || undefined,
					saveData.jsonSchemaId,
					saveData.schemaData
				);

				validatedTopicStore.publish(toTopicPath('prompts', newTemplate.id), newTemplate);
			} else if (editingTemplate) {
				const updatedTemplate = await updatePromptTemplate(
					queryClient,
					editingTemplate.id,
					{
						name: saveData.name,
						aiQueryData: saveData.aiQueryData,
						description: saveData.description || undefined,
						jsonSchemaId: saveData.jsonSchemaId,
						schemaData: saveData.schemaData,
						existingJsonSchemaId: (editingTemplate as { jsonSchemaId?: string }).jsonSchemaId
					},
					selectedProjectId ?? undefined
				);

				validatedTopicStore.publish(toTopicPath('prompts', updatedTemplate.id), updatedTemplate);
				if (selectedWorkspacePrompt?.id === updatedTemplate.id) {
					selectedWorkspacePrompt = updatedTemplate;
				}
			}

			editingTemplate = null;
			isCreating = false;
		} catch (err) {
			log.error('Failed to save template:', err);
			throw err;
		} finally {
			isLoading = false;
		}
	}

	function handleCancelEdit() {
		editingTemplate = null;
		isCreating = false;
	}

	function requestDeleteTemplate(template: Prompt) {
		deleteTemplateConfirm = template;
		deleteTemplateModalOpen = true;
	}

	async function confirmDeleteTemplate() {
		const template = deleteTemplateConfirm;
		if (!template || !queryClient) return;

		isLoading = true;
		try {
			await deletePromptTemplate(queryClient, template.id, undefined);

			validatedTopicStore.delete(toTopicPath('prompts', template.id));
			if (selectedWorkspacePrompt?.id === template.id) {
				selectedWorkspacePrompt = null;
			}
		} catch (err) {
			log.error('Failed to delete template:', err);
			toastStore.error(err instanceof Error ? err.message : 'Failed to delete template');
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (!deleteTemplateModalOpen) deleteTemplateConfirm = null;
	});

	function cancelWorkspaceStream() {
		executionHandle?.cancel();
	}

	async function runWorkspaceStream() {
		if (!data.idToken || !selectedProjectId || !selectedWorkspacePrompt || workspaceExecuting) return;
		const q = workspaceQuestion.trim();
		if (!q) {
			toastStore.info('Enter a message or question to run.');
			return;
		}

		workspaceExecuting = true;
		workspaceStreamError = '';
		streamingBuffer = '';
		executionHandle?.destroy();
		executionHandle = null;

		const inputValues: Record<string, unknown> = {
			...workspaceVarValues,
			question: q
		};

		const hasDocs = workspaceDocuments.length > 0;
		const documentIds =
			!hasDocs
				? undefined
				: workspaceDocScopeSelectedOnly && workspaceSelectedDocId
					? [workspaceSelectedDocId]
					: undefined;

		let unsubStatus: (() => void) | undefined;
		let unsubExec: (() => void) | undefined;

		try {
			const handle = await aiService.submitStreamingExecution(
				{
					projectId: selectedProjectId,
					promptId: selectedWorkspacePrompt.id,
					inputValues,
					documentIds,
					topK: workspaceTopK,
					topKPerNs: workspaceTopKPerNs,
					priority: workspacePriority,
					googleSearchEnabled: workspaceGoogleSearch ? undefined : false
				},
				data.idToken,
				(text) => {
					streamingBuffer += text;
				}
			);

			executionHandle = handle;

			unsubStatus = handle.status.subscribe((s) => {
				if (s === 'ERROR') {
					workspaceStreamError = 'Execution failed.';
				}
			});
			unsubExec = handle.execution.subscribe((ex) => {
				if (ex?.status === 'ERROR' && ex.errorMessage) {
					workspaceStreamError = ex.errorMessage;
				}
			});

			handle.result
				.then((raw) => {
					if (raw != null) streamingBuffer = raw;
					workspaceExecuting = false;
					unsubStatus?.();
					unsubExec?.();
				})
				.catch((err) => {
					log.error('Workspace stream failed:', err);
					workspaceStreamError = err instanceof Error ? err.message : 'Run failed';
					workspaceExecuting = false;
					unsubStatus?.();
					unsubExec?.();
				});
		} catch (err) {
			log.error('Workspace submit failed:', err);
			workspaceStreamError = err instanceof Error ? err.message : 'Run failed';
			workspaceExecuting = false;
		}
	}

	onMount(() => {
		initialize();
		function onResize() {
			leftSidebarWidth = clampSidebarWidth(leftSidebarWidth);
			rightSidebarWidth = clampSidebarWidth(rightSidebarWidth);
		}
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	onDestroy(() => {
		promptSyncManager?.cleanup();
		projectSyncManager?.cleanup();
		executionHandle?.destroy();
	});
</script>

<div
	class="flex h-screen w-full flex-col overflow-hidden transition-colors {darkMode ? 'bg-slate-900' : 'bg-slate-50'}"
>
	<TopBar pageTitle="Prompt Library" onProjectChange={handleProjectSelect}>
		{#snippet tabs()}
			<div class="relative min-w-[120px] max-w-sm flex-1">
				<input
					type="text"
					bind:value={searchFilter}
					placeholder="Search queries..."
					class="h-7 w-full rounded-md border px-3 pl-8 text-xs transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none
						{darkMode
						? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400'
						: 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400'}"
				/>
				<svg
					class="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					></path>
				</svg>
				{#if searchFilter}
					<button
						onclick={() => (searchFilter = '')}
						class="absolute top-1/2 right-2 -translate-y-1/2 transition-colors {darkMode
							? 'text-slate-400 hover:text-slate-200'
							: 'text-slate-400 hover:text-slate-600'}"
						aria-label="Clear filter"
					>
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"
							></path>
						</svg>
					</button>
				{/if}
			</div>
		{/snippet}
		{#snippet actions()}
			<button
				onclick={() => (showSchemaLibrary = true)}
				disabled={!queryClient}
				class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {darkMode
					? 'text-emerald-400 hover:bg-emerald-900/20 hover:text-emerald-300'
					: 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'}"
			>
				<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
					/>
				</svg>
				Schemas
			</button>
			<button
				onclick={handleCreateNew}
				disabled={!selectedProjectId || isLoading}
				class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {darkMode
					? 'text-indigo-400 hover:bg-indigo-900/20 hover:text-indigo-300'
					: 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'}"
			>
				<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
				</svg>
				Create New
			</button>
		{/snippet}
	</TopBar>

	{#if error}
		<div
			class="shrink-0 border-b px-4 py-2 text-sm {darkMode
				? 'border-red-800 bg-red-900/20 text-red-300'
				: 'border-red-200 bg-red-50 text-red-700'}"
		>
			{error}
		</div>
	{/if}

	<div class="flex min-h-0 flex-1 overflow-hidden">
		{#if !selectedProjectId}
			<div class="flex flex-1 flex-col items-center justify-center p-8 text-center">
				<p class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">Select a Project</p>
				<p class="mt-1 text-xs {darkMode ? 'text-slate-500' : 'text-slate-500'}">
					Choose a project from the dropdown to use the prompt workspace.
				</p>
			</div>
		{:else if isLoading && filteredTemplates.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center gap-3">
				<div
					class="h-10 w-10 animate-spin rounded-full border-4 {darkMode
						? 'border-slate-600 border-t-indigo-500'
						: 'border-slate-200 border-t-indigo-600'}"
				></div>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading templates…</p>
			</div>
		{:else}
			<!-- Left: tools -->
			<div
				class="flex min-h-0 shrink-0 flex-col overflow-hidden"
				style="width: {leftSidebarWidth}px"
			>
				<PromptWorkspaceToolsSidebar
					{darkMode}
					bind:topK={workspaceTopK}
					bind:topKPerNs={workspaceTopKPerNs}
					bind:priority={workspacePriority}
					bind:googleSearchEnabled={workspaceGoogleSearch}
					bind:documentScopeSelectedOnly={workspaceDocScopeSelectedOnly}
					hasDocuments={workspaceDocuments.length > 0}
				/>
			</div>

			<div
				role="slider"
				tabindex="0"
				aria-label="Tools panel width"
				aria-valuenow={leftSidebarWidth}
				aria-valuemin={SIDEBAR_MIN}
				aria-valuemax={SIDEBAR_MAX}
				aria-orientation="horizontal"
				class="w-1.5 shrink-0 cursor-col-resize touch-none select-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500 {darkMode
					? 'bg-slate-700 hover:bg-slate-600'
					: 'bg-slate-200 hover:bg-slate-300'}"
				onpointerdown={onLeftResizePointerDown}
				onkeydown={(e) => {
					const step = e.shiftKey ? 40 : 12;
					if (e.key === 'ArrowLeft') {
						e.preventDefault();
						leftSidebarWidth = clampSidebarWidth(leftSidebarWidth - step);
					} else if (e.key === 'ArrowRight') {
						e.preventDefault();
						leftSidebarWidth = clampSidebarWidth(leftSidebarWidth + step);
					}
				}}
			></div>

			<!-- Center -->
			<PromptWorkspaceCenter
				{darkMode}
				documents={workspaceDocuments}
				selectedPrompt={selectedWorkspacePrompt}
				bind:selectedDocumentId={workspaceSelectedDocId}
				bind:question={workspaceQuestion}
				extraVarNames={workspaceExtraVarNames}
				bind:extraVarValues={workspaceVarValues}
				streamingText={streamingBuffer}
				executing={workspaceExecuting}
				streamError={workspaceStreamError}
				onRun={runWorkspaceStream}
				onCancel={cancelWorkspaceStream}
			/>

			<div
				role="slider"
				tabindex="0"
				aria-label="Prompt library panel width"
				aria-valuenow={rightSidebarWidth}
				aria-valuemin={SIDEBAR_MIN}
				aria-valuemax={SIDEBAR_MAX}
				aria-orientation="horizontal"
				class="w-1.5 shrink-0 cursor-col-resize touch-none select-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500 {darkMode
					? 'bg-slate-700 hover:bg-slate-600'
					: 'bg-slate-200 hover:bg-slate-300'}"
				onpointerdown={onRightResizePointerDown}
				onkeydown={(e) => {
					const step = e.shiftKey ? 40 : 12;
					if (e.key === 'ArrowLeft') {
						e.preventDefault();
						rightSidebarWidth = clampSidebarWidth(rightSidebarWidth + step);
					} else if (e.key === 'ArrowRight') {
						e.preventDefault();
						rightSidebarWidth = clampSidebarWidth(rightSidebarWidth - step);
					}
				}}
			></div>

			<!-- Right: library -->
			<div
				class="flex min-h-0 shrink-0 flex-col overflow-hidden"
				style="width: {rightSidebarWidth}px"
			>
				{#if filteredTemplates.length === 0}
					<div
						class="flex h-full flex-col items-center justify-center gap-2 border-l p-4 text-center {darkMode
							? 'border-slate-700 bg-slate-800/50'
							: 'border-slate-200 bg-white'}"
					>
						<p class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
							{searchFilter ? 'No queries found' : 'No query templates yet'}
						</p>
						{#if !searchFilter}
							<button
								onclick={handleCreateNew}
								class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
							>
								Create your first query
							</button>
						{/if}
					</div>
				{:else}
					<PromptLibrarySidebar
						{darkMode}
						templates={filteredTemplates}
						selectedId={selectedWorkspacePrompt?.id ?? null}
						onSelect={handleSelectWorkspacePrompt}
						onEdit={handleEditTemplate}
						onDelete={requestDeleteTemplate}
						{getTemplateDisplayInfo}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

<ConfirmModal
	bind:open={deleteTemplateModalOpen}
	title="Delete template?"
	message={deleteTemplateConfirm
		? `Are you sure you want to delete "${deleteTemplateConfirm.name}"?`
		: ''}
	confirmLabel="Delete"
	cancelLabel="Cancel"
	darkMode={darkMode}
	onConfirm={confirmDeleteTemplate}
/>

<PromptEditModal
	{darkMode}
	template={editingTemplate}
	{isCreating}
	{queryClient}
	projectId={selectedProjectId ?? ''}
	onSave={handleSaveTemplate}
	onCancel={handleCancelEdit}
/>

{#if showSchemaLibrary && queryClient}
	<JsonSchemaPickerModal
		{darkMode}
		{queryClient}
		projectId={selectedProjectId ?? ''}
		onselect={() => (showSchemaLibrary = false)}
		onclose={() => (showSchemaLibrary = false)}
	/>
{/if}
