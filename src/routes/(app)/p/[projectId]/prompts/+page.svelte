<script lang="ts">
	import { onMount, onDestroy, setContext, untrack } from 'svelte';
	import type { Prompt, Project } from '@stratiqai/types-simple';
	import type { Doclink } from '$lib/types/cloud/app';
	import type { AiStudioToolsConfig } from '$lib/types/ai-studio.js';
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
	import PromptWorkspaceCenter from './components/PromptWorkspaceCenter.svelte';
	import PromptChatSidebar from './components/PromptChatSidebar.svelte';
	import PromptLibrarySidebar from './components/PromptLibrarySidebar.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { addPlainParagraphToDashboard } from '$lib/documents/discovery/addToDashboard';
	import {
		PROMPTS_ADD_CHAT_TO_DASHBOARD,
		type PromptsAddChatToDashboardContext
	} from './promptsDashboardContext';
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
	import { WORKSPACE_DEFAULT_SYSTEM_INSTRUCTION } from './workspacePromptDefaults';
	import {
		buildSchemaPreview,
		parseJsonSchemaToBuilderState
	} from '@stratiqai/dashboard-widget-sdk';
	import { Q_GET_JSON_SCHEMA } from '$lib/services/graphql/jsonSchemaOperations';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('prompts');

	const LIBRARY_SIDEBAR_MIN = 200;
	const LIBRARY_SIDEBAR_MAX = 520;
	/** SSR / first paint before `onMount` applies viewport fractions. */
	const LIBRARY_SIDEBAR_DEFAULT = 320;

	const CHAT_SIDEBAR_MIN = 280;
	/** Upper bound when `window` is unavailable (SSR). In the browser, max is 50% of viewport width. */
	const CHAT_SIDEBAR_MAX = 560;
	const CHAT_SIDEBAR_DEFAULT = 360;
	const CHAT_SIDEBAR_MAX_VIEWPORT_FRACTION = 0.5;

	/** Initial library column width as a fraction of viewport (reference layout ~22%). */
	const LIBRARY_SIDEBAR_VIEWPORT_FRACTION = 0.22;
	/** Initial chat column width as a fraction of viewport (reference layout ~48%, nearly half). */
	const CHAT_SIDEBAR_VIEWPORT_FRACTION = 0.48;

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

	let leftSidebarWidth = $state(LIBRARY_SIDEBAR_DEFAULT);
	let rightSidebarWidth = $state(CHAT_SIDEBAR_DEFAULT);
	/** Keeps chat slider `aria-valuemax` in sync after window resize. */
	let viewportInnerWidth = $state(0);

	let chatSidebarMaxPx = $derived(
		viewportInnerWidth <= 0
			? CHAT_SIDEBAR_MAX
			: Math.max(
					CHAT_SIDEBAR_MIN,
					Math.floor(viewportInnerWidth * CHAT_SIDEBAR_MAX_VIEWPORT_FRACTION)
				)
	);

	let workspaceTopK = $state(5);
	let workspaceTopKPerNs = $state(5);
	let workspacePriority = $state<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
	let workspaceToolsConfig = $state<AiStudioToolsConfig>({ googleSearch: true });
	let workspaceGoogleSearchProxy = $state(true);
	let workspaceDocScopeSelectedOnly = $state(false);

	let workspaceResponseFormatType = $state<'text' | 'json_object' | 'json_schema'>('json_schema');
	let workspaceSchemaProperties = $state<Record<string, Record<string, unknown>>>({});
	let workspaceSchemaRequired = $state<string[]>([]);
	let workspaceFieldOrder = $state<string[]>([]);

	let selectedWorkspacePrompt = $state<Prompt | null>(null);
	let workspaceSelectedDocId = $state('');
	let workspaceQuestion = $state('');
	let workspaceSystemInstruction = $state(WORKSPACE_DEFAULT_SYSTEM_INSTRUCTION);
	let workspaceVarValues = $state<Record<string, string>>({});
	let streamingBuffer = $state('');
	/** Prior assistant replies (oldest first); current stream is in `streamingBuffer`. */
	let workspaceChatHistory = $state<{ id: string; text: string }[]>([]);
	let workspaceExecuting = $state(false);
	let workspaceStreamError = $state('');
	/** Aborts in-flight `POST /api/ai-studio` (no AppSync submitAIQuery). */
	let workspaceRunAbort = $state<AbortController | null>(null);

	function clampLibrarySidebarWidth(w: number): number {
		if (typeof window === 'undefined') {
			return Math.min(LIBRARY_SIDEBAR_MAX, Math.max(LIBRARY_SIDEBAR_MIN, w));
		}
		const maxByViewport = Math.floor(window.innerWidth * 0.5);
		const cap = Math.min(LIBRARY_SIDEBAR_MAX, Math.max(LIBRARY_SIDEBAR_MIN, maxByViewport));
		return Math.min(cap, Math.max(LIBRARY_SIDEBAR_MIN, w));
	}

	function onLeftResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = leftSidebarWidth;

		function onMove(ev: PointerEvent) {
			leftSidebarWidth = clampLibrarySidebarWidth(startW + (ev.clientX - startX));
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

	function clampChatSidebarWidth(w: number): number {
		if (typeof window === 'undefined') {
			return Math.min(CHAT_SIDEBAR_MAX, Math.max(CHAT_SIDEBAR_MIN, w));
		}
		const cap = Math.max(
			CHAT_SIDEBAR_MIN,
			Math.floor(window.innerWidth * CHAT_SIDEBAR_MAX_VIEWPORT_FRACTION)
		);
		return Math.min(cap, Math.max(CHAT_SIDEBAR_MIN, w));
	}

	function onRightResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = rightSidebarWidth;

		function onMove(ev: PointerEvent) {
			// Handle is the chat panel’s left edge: moving the pointer right moves the edge right → center grows, chat narrows.
			rightSidebarWidth = clampChatSidebarWidth(startW - (ev.clientX - startX));
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

	function getTemplateDisplayInfo(template: Prompt) {
		const templateStr = getTemplateStrForEditor(template);
		const aiData = parseTemplateToAIQueryData(templateStr ?? '');
		return {
			prompt: aiData.prompt,
			hasSchema: aiData.responseFormat?.type === 'json_schema'
		};
	}

	let projectScopedTemplates = $derived.by(() => {
		let templates = allTemplates;
		if (selectedProjectId) {
			templates = templates.filter(
				(t) =>
					(t as { parentId?: string }).parentId == null ||
					(t as { parentId?: string }).parentId === selectedProjectId
			);
		}
		return templates;
	});

	let filteredTemplates = $derived.by(() => {
		let templates = projectScopedTemplates;
		if (searchFilter) {
			const search = searchFilter.toLowerCase();
			templates = templates.filter((t) => {
				if (t.name.toLowerCase().includes(search)) return true;
				if (t.description?.toLowerCase().includes(search)) return true;
				const { prompt } = getTemplateDisplayInfo(t);
				return prompt.toLowerCase().includes(search);
			});
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
			workspaceChatHistory = [];
		});
	});

	$effect(() => {
		const prompt = selectedWorkspacePrompt;
		untrack(() => {
			if (!prompt) {
				workspaceSchemaProperties = {};
				workspaceSchemaRequired = [];
				workspaceFieldOrder = [];
				workspaceResponseFormatType = 'json_schema';
				return;
			}

			const jsonSchemaId = (prompt as { jsonSchemaId?: string }).jsonSchemaId;
			if (jsonSchemaId && queryClient) {
				loadWorkspaceSchemaById(jsonSchemaId);
				return;
			}

			const templateStr = getTemplateStrForEditor(prompt);
			const aiData = parseTemplateToAIQueryData(templateStr ?? '');
			if (aiData.responseFormat) {
				const rf = aiData.responseFormat;
				const rfType = (rf as { type: string }).type;
				workspaceResponseFormatType = (rfType === 'json_schema_nested' ? 'json_schema' : rfType) as
					| 'text' | 'json_object' | 'json_schema';
				if ((rfType === 'json_schema' || rfType === 'json_schema_nested') && (rf as { schema?: unknown }).schema) {
					const state = parseJsonSchemaToBuilderState((rf as { schema: unknown }).schema);
					workspaceSchemaProperties = state.properties;
					workspaceSchemaRequired = state.required;
					workspaceFieldOrder = state.fieldOrder;
				} else {
					workspaceSchemaProperties = {};
					workspaceSchemaRequired = [];
					workspaceFieldOrder = [];
				}
			} else {
				workspaceResponseFormatType = 'json_schema';
				workspaceSchemaProperties = {};
				workspaceSchemaRequired = [];
				workspaceFieldOrder = [];
			}
		});
	});

	$effect(() => {
		const gsFromTools = workspaceToolsConfig.googleSearch ?? true;
		untrack(() => {
			workspaceGoogleSearchProxy = gsFromTools;
		});
	});

	$effect(() => {
		const gsFromProxy = workspaceGoogleSearchProxy;
		untrack(() => {
			if ((workspaceToolsConfig.googleSearch ?? true) !== gsFromProxy) {
				workspaceToolsConfig = { ...workspaceToolsConfig, googleSearch: gsFromProxy };
			}
		});
	});

	/** Load dashboard layout for this project so “Add to Dashboard” uses project-scoped storage (same as /dashboard). */
	$effect(() => {
		const pid = selectedProjectId;
		const token = data.idToken;
		if (!pid || !token) return;
		void dashboard.initialize(pid, token);
	});

	async function loadWorkspaceSchemaById(id: string) {
		if (!queryClient) return;
		try {
			const result = await queryClient.query<{ getJsonSchema: { id: string; schemaDefinition: string } | null }>(
				Q_GET_JSON_SCHEMA,
				{ id }
			);
			if (result?.getJsonSchema?.schemaDefinition) {
				const raw = result.getJsonSchema.schemaDefinition;
				const schema = typeof raw === 'string' ? JSON.parse(raw) : raw;
				const state = parseJsonSchemaToBuilderState(schema);
				workspaceSchemaProperties = state.properties;
				workspaceSchemaRequired = state.required;
				workspaceFieldOrder = state.fieldOrder;
				workspaceResponseFormatType = 'json_schema';
			}
		} catch (e) {
			log.error('Failed to load workspace schema:', e);
		}
	}

	function nextChatTurnId(): string {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID();
		}
		return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	}

	async function handleAddChatResponseToDashboard(text: string, tabId?: string): Promise<void> {
		const pid = selectedProjectId;
		const tok = data.idToken;
		if (!pid || !tok || !text.trim()) return;
		await dashboard.initialize(pid, tok);
		const title = selectedWorkspacePrompt?.name?.trim() || 'Prompt response';
		addPlainParagraphToDashboard(text, pid, title, tabId);
	}

	const promptsAddChatToDashboard: PromptsAddChatToDashboardContext = {
		add: (text, tabId) => {
			void handleAddChatResponseToDashboard(text, tabId);
		}
	};
	setContext(PROMPTS_ADD_CHAT_TO_DASHBOARD, promptsAddChatToDashboard);

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
		selectedWorkspacePrompt = template;
		const templateStr = getTemplateStrForEditor(template);
		const data = parseTemplateToAIQueryData(templateStr ?? '');
		workspaceQuestion = (data.prompt ?? '').trim();
		workspaceSystemInstruction =
			(data.systemPrompt ?? '').trim() || WORKSPACE_DEFAULT_SYSTEM_INSTRUCTION;
	}

	function handleSelectWorkspacePrompt(template: Prompt) {
		editingTemplate = null;
		selectedWorkspacePrompt = template;
		const templateStr = getTemplateStrForEditor(template);
		const data = parseTemplateToAIQueryData(templateStr ?? '');
		workspaceQuestion = (data.prompt ?? '').trim();
		workspaceSystemInstruction =
			(data.systemPrompt ?? '').trim() || WORKSPACE_DEFAULT_SYSTEM_INSTRUCTION;
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
			} else {
				const updateTarget = editingTemplate ?? selectedWorkspacePrompt;
				if (!updateTarget) {
					toastStore.error('No prompt selected to update.');
					return;
				}
				const updatedTemplate = await updatePromptTemplate(
					queryClient,
					updateTarget.id,
					{
						name: saveData.name,
						aiQueryData: saveData.aiQueryData,
						description: saveData.description || undefined,
						jsonSchemaId: saveData.jsonSchemaId,
						schemaData: saveData.schemaData,
						existingJsonSchemaId: (updateTarget as { jsonSchemaId?: string }).jsonSchemaId
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
		workspaceRunAbort?.abort();
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
		const prior = streamingBuffer.trim();
		if (prior.length > 0) {
			workspaceChatHistory = [...workspaceChatHistory, { id: nextChatTurnId(), text: streamingBuffer }];
		}
		streamingBuffer = '';
		workspaceRunAbort?.abort();
		const ac = new AbortController();
		workspaceRunAbort = ac;

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

		const googleGroundingActive = workspaceToolsConfig.googleSearch === true || workspaceToolsConfig.googleMaps === true;

		try {
			const res = await fetch('/api/ai-studio', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				signal: ac.signal,
				body: JSON.stringify({
					projectId: selectedProjectId,
					promptId: selectedWorkspacePrompt.id,
					inputValues,
					...(documentIds?.length ? { documentIds } : {}),
					...(!googleGroundingActive && workspaceSelectedDocId.trim()
						? { workspacePdfDocumentId: workspaceSelectedDocId.trim() }
						: {}),
			topK: workspaceTopK,
			topKPerNs: workspaceTopKPerNs,
			priority: workspacePriority,
			tools: workspaceToolsConfig,
			...(workspaceToolsConfig.structuredOutputs &&
			workspaceToolsConfig.applyStructuredResponse !== false &&
			workspaceToolsConfig.googleSearch !== true &&
			workspaceToolsConfig.googleMaps !== true &&
			Object.keys(workspaceSchemaProperties).length > 0
				? { structuredOutput: { responseJsonSchema: buildSchemaPreview(workspaceSchemaProperties, workspaceSchemaRequired) } }
				: {})
			})
			});

			const contentType = res.headers.get('Content-Type') ?? '';

			if (!res.ok) {
				const payload = (await res.json().catch(() => ({}))) as { error?: string };
				workspaceStreamError =
					typeof payload.error === 'string' && payload.error.length > 0
						? payload.error
						: `Run failed (${res.status})`;
				return;
			}

			if (!res.body || !contentType.includes('text/event-stream')) {
				workspaceStreamError = 'Unexpected response from AI Studio.';
				return;
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let lineBuffer = '';
			let accumulated = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				lineBuffer += decoder.decode(value, { stream: true });
				const lines = lineBuffer.split('\n');
				lineBuffer = lines.pop() ?? '';
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith('data:')) continue;
					const jsonStr = trimmed.slice(5).trimStart();
					let evt: { type?: string; text?: string; message?: string };
					try {
						evt = JSON.parse(jsonStr) as typeof evt;
					} catch {
						continue;
					}
					if (evt.type === 'chunk' && typeof evt.text === 'string') {
						accumulated += evt.text;
						streamingBuffer = accumulated;
					} else if (evt.type === 'error') {
						workspaceStreamError =
							typeof evt.message === 'string' && evt.message.length > 0
								? evt.message
								: 'Generation failed';
					} else if (evt.type === 'done' && typeof evt.text === 'string') {
						streamingBuffer = evt.text;
					}
				}
			}
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				return;
			}
			log.error('Workspace AI Studio run failed:', err);
			workspaceStreamError = err instanceof Error ? err.message : 'Run failed';
		} finally {
			workspaceExecuting = false;
			workspaceRunAbort = null;
		}
	}

	onMount(() => {
		const vw = window.innerWidth;
		viewportInnerWidth = vw;
		leftSidebarWidth = clampLibrarySidebarWidth(Math.round(vw * LIBRARY_SIDEBAR_VIEWPORT_FRACTION));
		rightSidebarWidth = clampChatSidebarWidth(Math.round(vw * CHAT_SIDEBAR_VIEWPORT_FRACTION));
		initialize();
		function onResize() {
			viewportInnerWidth = window.innerWidth;
			leftSidebarWidth = clampLibrarySidebarWidth(leftSidebarWidth);
			rightSidebarWidth = clampChatSidebarWidth(rightSidebarWidth);
		}
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	onDestroy(() => {
		promptSyncManager?.cleanup();
		projectSyncManager?.cleanup();
		workspaceRunAbort?.abort();
	});
</script>

<div
	class="flex h-screen w-full flex-col overflow-hidden transition-colors {darkMode ? 'bg-slate-900' : 'bg-slate-50'}"
>
	<TopBar pageTitle="Prompt Library" onProjectChange={handleProjectSelect}>
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
		{:else if isLoading && projectScopedTemplates.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center gap-3">
				<div
					class="h-10 w-10 animate-spin rounded-full border-4 {darkMode
						? 'border-slate-600 border-t-indigo-500'
						: 'border-slate-200 border-t-indigo-600'}"
				></div>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading templates…</p>
			</div>
		{:else}
			<!-- Left: Prompt library only -->
			<div
				class="flex min-h-0 shrink-0 flex-col overflow-hidden border-r {darkMode
					? 'border-slate-700 bg-slate-800/50'
					: 'border-slate-200 bg-white'}"
				style="width: {leftSidebarWidth}px"
			>
				{#if projectScopedTemplates.length === 0}
					<div class="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
						<p class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
							No query templates yet
						</p>
						<button
							onclick={handleCreateNew}
							class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
						>
							Create your first query
						</button>
					</div>
				{:else}
					<PromptLibrarySidebar
						{darkMode}
						bind:searchFilter
						libraryTotalCount={projectScopedTemplates.length}
						templates={filteredTemplates}
						selectedId={selectedWorkspacePrompt?.id ?? null}
						onSelect={handleSelectWorkspacePrompt}
						onEdit={handleEditTemplate}
						onDelete={requestDeleteTemplate}
						{getTemplateDisplayInfo}
					/>
				{/if}
			</div>

			<div
				role="slider"
				tabindex="0"
				aria-label="Prompt library width"
				aria-valuenow={leftSidebarWidth}
				aria-valuemin={LIBRARY_SIDEBAR_MIN}
				aria-valuemax={LIBRARY_SIDEBAR_MAX}
				aria-orientation="horizontal"
				class="w-1.5 shrink-0 cursor-col-resize touch-none select-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500 {darkMode
					? 'bg-slate-700 hover:bg-slate-600'
					: 'bg-slate-200 hover:bg-slate-300'}"
				onpointerdown={onLeftResizePointerDown}
				onkeydown={(e) => {
					const step = e.shiftKey ? 40 : 12;
					if (e.key === 'ArrowLeft') {
						e.preventDefault();
						leftSidebarWidth = clampLibrarySidebarWidth(leftSidebarWidth - step);
					} else if (e.key === 'ArrowRight') {
						e.preventDefault();
						leftSidebarWidth = clampLibrarySidebarWidth(leftSidebarWidth + step);
					}
				}}
			></div>

			<!-- Center: PDF + edit prompt + AI tools -->
			<PromptWorkspaceCenter
				{darkMode}
				documents={workspaceDocuments}
				bind:selectedDocumentId={workspaceSelectedDocId}
				bind:topK={workspaceTopK}
				bind:topKPerNs={workspaceTopKPerNs}
				bind:priority={workspacePriority}
				bind:googleSearchEnabled={workspaceGoogleSearchProxy}
				bind:documentScopeSelectedOnly={workspaceDocScopeSelectedOnly}
			>
				{#snippet workspaceEdit()}
					<PromptEditModal
						variant="inline"
						{darkMode}
						template={isCreating ? null : (editingTemplate ?? selectedWorkspacePrompt)}
						{isCreating}
						{queryClient}
						projectId={selectedProjectId ?? ''}
						bind:workspaceQuestion
						bind:systemInstruction={workspaceSystemInstruction}
						onSave={handleSaveTemplate}
						onCancel={handleCancelEdit}
					/>
				{/snippet}
			</PromptWorkspaceCenter>

			<div
				role="slider"
				tabindex="0"
				aria-label="Chat panel width"
				aria-valuenow={rightSidebarWidth}
				aria-valuemin={CHAT_SIDEBAR_MIN}
				aria-valuemax={chatSidebarMaxPx}
				aria-orientation="horizontal"
				class="w-1.5 shrink-0 cursor-col-resize touch-none select-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500 {darkMode
					? 'bg-slate-700 hover:bg-slate-600'
					: 'bg-slate-200 hover:bg-slate-300'}"
				onpointerdown={onRightResizePointerDown}
				onkeydown={(e) => {
					const step = e.shiftKey ? 40 : 12;
					if (e.key === 'ArrowLeft') {
						e.preventDefault();
						rightSidebarWidth = clampChatSidebarWidth(rightSidebarWidth + step);
					} else if (e.key === 'ArrowRight') {
						e.preventDefault();
						rightSidebarWidth = clampChatSidebarWidth(rightSidebarWidth - step);
					}
				}}
			></div>

			<!-- Right: chat + composer -->
			<div
				class="flex min-h-0 shrink-0 flex-col overflow-hidden"
				style="width: {rightSidebarWidth}px"
			>
			<PromptChatSidebar
				{darkMode}
				projectId={selectedProjectId ?? ''}
				selectedPrompt={selectedWorkspacePrompt}
				bind:question={workspaceQuestion}
				bind:systemInstruction={workspaceSystemInstruction}
				chatHistory={workspaceChatHistory}
				extraVarNames={workspaceExtraVarNames}
				bind:extraVarValues={workspaceVarValues}
				bind:toolsConfig={workspaceToolsConfig}
				bind:responseFormatType={workspaceResponseFormatType}
				bind:schemaProperties={workspaceSchemaProperties}
				bind:schemaRequired={workspaceSchemaRequired}
				bind:fieldOrder={workspaceFieldOrder}
				onLoadSchemaFromLibrary={() => (showSchemaLibrary = true)}
				streamingText={streamingBuffer}
				executing={workspaceExecuting}
				streamError={workspaceStreamError}
				onRun={runWorkspaceStream}
				onCancel={cancelWorkspaceStream}
			/>
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

{#if showSchemaLibrary && queryClient}
	<JsonSchemaPickerModal
		{darkMode}
		{queryClient}
		projectId={selectedProjectId ?? ''}
		onselect={() => (showSchemaLibrary = false)}
		onclose={() => (showSchemaLibrary = false)}
	/>
{/if}
