<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Prompt, Project } from '@stratiqai/types-simple';
	import { PromptSyncManager } from '$lib/services/realtime/websocket/sync-managers/PromptSyncManager';
	import { ProjectSyncManager } from '$lib/services/realtime/websocket/sync-managers/ProjectSyncManager';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { GraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
	import { toTopicPath } from '$lib/services/realtime/store/TopicMapper';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	import TopBar from '$lib/components/layout/TopBar.svelte';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
	import PromptEditModal from './components/PromptEditModal.svelte';
	import JsonSchemaPickerModal from '$lib/components/schemas/JsonSchemaPickerModal.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import {
		fetchProjectWithPromptTemplates,
		createPromptTemplate,
		updatePromptTemplate,
		deletePromptTemplate,
		getTemplateStrForEditor,
		parseTemplateToAIQueryData,
		type AIQueryData
	} from './PromptService';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('prompts');

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

	// Get projects from store or page data
	let projects = $derived.by(() => {
		const storeProjects = validatedTopicStore.getAllAtArray<Project>('projects');
		return storeProjects.length > 0 ? storeProjects : data.projects;
	});

	// Get all templates from store
	let allTemplates = $derived.by(() => {
		return validatedTopicStore.getAllAtArray<Prompt>('prompts');
	});

	// Filter templates by selected project and search
	let filteredTemplates = $derived.by(() => {
		let templates = allTemplates;

		// Filter by project if selected (prompts are no longer project-scoped; show all when parentId is absent)
		if (selectedProjectId) {
			templates = templates.filter(
				(t) => (t as { parentId?: string }).parentId == null || (t as { parentId?: string }).parentId === selectedProjectId
			);
		}

		// Filter by search
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

	// Initialize sync managers and fetch data
	async function initialize() {
		if (!data.idToken) {
			error = 'Not authenticated';
			return;
		}

		isLoading = true;
		error = null;

		try {
			queryClient = new GraphQLQueryClient(data.idToken);

			// Initialize project sync manager
			projectSyncManager = ProjectSyncManager.createInactive();
			await projectSyncManager.initialize({
				idToken: data.idToken,
				initialItems: data.projects,
				setupSubscriptions: true
			});

			// Initialize prompt template sync manager
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

	// Load templates for a specific project by fetching the project with its templates
	async function loadTemplatesForProject(projectId: string) {
		if (!queryClient) return;

		isLoading = true;
		try {
			// Fetch project with its nested prompt templates
			const { project, promptTemplates } = await fetchProjectWithPromptTemplates(
				queryClient,
				projectId
			);

			// Publish project to store
			validatedTopicStore.publish(toTopicPath('projects', project.id), project);

			// Publish each template to store
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
			goto(`/p/${projectId}/prompts`);
		}
	}

	// Handle create new template
	function handleCreateNew() {
		if (!selectedProjectId) {
			toastStore.info('Please select a project first.');
			return;
		}
		isCreating = true;
		editingTemplate = null;
	}

	// Handle edit template
	function handleEditTemplate(template: Prompt) {
		editingTemplate = template;
		isCreating = false;
	}

	// Handle save template (create or update)
	async function handleSaveTemplate(saveData: {
		name: string;
		description: string;
		aiQueryData: AIQueryData;
		entityDefinitionId?: string;
		schemaData?: { name: string; description?: string; schemaDefinition: unknown };
	}) {
		if (!queryClient) {
			toastStore.error('Unable to save: not connected. Please refresh the page and try again.');
			return;
		}

		isLoading = true;
		try {
			if (isCreating && selectedProjectId) {
				// Create new template
				const newTemplate = await createPromptTemplate(
					queryClient,
					selectedProjectId,
					saveData.name,
					saveData.aiQueryData,
					saveData.description || undefined,
					saveData.entityDefinitionId,
					saveData.schemaData
				);

				// Publish to store
				validatedTopicStore.publish(toTopicPath('prompts', newTemplate.id), newTemplate);
			} else if (editingTemplate) {
				// Update existing template
				const updatedTemplate = await updatePromptTemplate(
					queryClient,
					editingTemplate.id,
					{
						name: saveData.name,
						aiQueryData: saveData.aiQueryData,
						description: saveData.description || undefined,
						entityDefinitionId: saveData.entityDefinitionId,
						schemaData: saveData.schemaData,
						existingEntityDefinitionId: (editingTemplate as { entityDefinitionId?: string }).entityDefinitionId
					}
				);

				// Update in store
				validatedTopicStore.publish(
					toTopicPath('prompts', updatedTemplate.id),
					updatedTemplate
				);
			}

			// Close modal
			editingTemplate = null;
			isCreating = false;
		} catch (err) {
			log.error('Failed to save template:', err);
			// Rethrow so the modal can show the error and reset saving state
			throw err;
		} finally {
			isLoading = false;
		}
	}

	// Handle cancel edit
	function handleCancelEdit() {
		editingTemplate = null;
		isCreating = false;
	}

	// Handle delete template
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

	// Get display info for a template
	function getTemplateDisplayInfo(template: Prompt) {
		const templateStr = getTemplateStrForEditor(template);
		const aiData = parseTemplateToAIQueryData(templateStr ?? '');
		return {
			prompt: aiData.prompt,
			model: aiData.model,
			hasSchema: aiData.responseFormat?.type === 'json_schema'
		};
	}

	onMount(() => {
		initialize();
	});

	onDestroy(() => {
		promptSyncManager?.cleanup();
		projectSyncManager?.cleanup();
	});
</script>

<div class="min-h-screen {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<TopBar
		pageTitle="Prompt Library"
		onProjectChange={handleProjectSelect}
	>
		{#snippet tabs()}
			<div class="relative flex-1 min-w-[120px] max-w-sm">
				<input
					type="text"
					bind:value={searchFilter}
					placeholder="Search queries..."
					class="w-full h-7 px-3 pl-8 text-xs rounded-md border transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
						{darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}"
				/>
				<svg
					class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 {darkMode ? 'text-slate-400' : 'text-slate-400'}"
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				{#if searchFilter}
					<button
						onclick={() => (searchFilter = '')}
						class="absolute right-2 top-1/2 -translate-y-1/2 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'} transition-colors"
						aria-label="Clear filter"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				{/if}
			</div>
		{/snippet}
		{#snippet actions()}
			<button
				onclick={() => showSchemaLibrary = true}
				disabled={!queryClient}
				class="px-3 py-1.5 text-xs font-medium {darkMode
					? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20'
					: 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'} rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
				</svg>
				Schemas
			</button>
			<button
				onclick={handleCreateNew}
				disabled={!selectedProjectId || isLoading}
				class="px-3 py-1.5 text-xs font-medium {darkMode
					? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20'
					: 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
				</svg>
				Create New
			</button>
		{/snippet}
	</TopBar>

	<!-- Main Content -->
	<div class="max-w-7xl mx-auto px-6 py-8">
		<!-- Error Message -->
		{#if error}
			<div
				class="mb-6 p-4 rounded-lg {darkMode
					? 'bg-red-900/20 border-red-800 text-red-300'
					: 'bg-red-50 border-red-200 text-red-700'} border"
			>
				<p class="text-sm">{error}</p>
			</div>
		{/if}

		<!-- Loading State -->
		{#if isLoading && filteredTemplates.length === 0}
			<div class="text-center py-12">
				<div
					class="w-12 h-12 mx-auto mb-4 border-4 {darkMode
						? 'border-slate-600 border-t-indigo-500'
						: 'border-slate-200 border-t-indigo-600'} rounded-full animate-spin"
				></div>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading templates...</p>
			</div>
		{:else if !selectedProjectId}
			<!-- No Project Selected -->
			<div class="text-center py-12">
				<svg
					class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
					></path>
				</svg>
				<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
					Select a Project
				</p>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					Choose a project from the dropdown to view and manage its query templates
				</p>
			</div>
		{:else if filteredTemplates.length === 0}
			<!-- No Templates -->
			<div class="text-center py-12">
				<svg
					class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					></path>
				</svg>
				<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
					{searchFilter ? 'No queries found' : 'No query templates yet'}
				</p>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">
					{searchFilter
						? 'Try adjusting your search terms'
						: 'Create your first AI query template to get started'}
				</p>
				{#if !searchFilter}
					<button
						onclick={handleCreateNew}
						class="px-4 py-2 text-sm font-medium {darkMode
							? 'bg-indigo-600 hover:bg-indigo-700'
							: 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
					>
						Create Your First Query
					</button>
				{/if}
			</div>
		{:else}
			<!-- Template Grid -->
			<div>
				<h2
					class="text-sm font-semibold {darkMode
						? 'text-slate-300'
						: 'text-slate-700'} mb-4 flex items-center gap-2"
				>
					<span class="w-1 h-4 {darkMode ? 'bg-emerald-500' : 'bg-emerald-600'} rounded"></span>
					Query Templates ({filteredTemplates.length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each filteredTemplates as template (template.id)}
						{@const displayInfo = getTemplateDisplayInfo(template)}
						<div
							class="{darkMode
								? 'bg-slate-800 border-slate-700 hover:border-emerald-500'
								: 'bg-white border-slate-200 hover:border-emerald-300'} border rounded-lg p-4 transition-all hover:shadow-lg group relative cursor-pointer"
							onclick={() => handleEditTemplate(template)}
							onkeydown={(e) => e.key === 'Enter' && handleEditTemplate(template)}
							role="button"
							tabindex="0"
						>
							<!-- Delete Button -->
							<button
								onclick={(e) => {
									e.stopPropagation();
									requestDeleteTemplate(template);
								}}
								class="absolute top-2 right-2 p-1 {darkMode
									? 'text-slate-500 hover:text-red-400 hover:bg-red-900/20'
									: 'text-slate-400 hover:text-red-600 hover:bg-red-50'} rounded transition-colors opacity-0 group-hover:opacity-100"
								title="Delete query"
								aria-label="Delete query"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									></path>
								</svg>
							</button>

							<div class="flex items-start gap-3 pr-6">
								<div
									class="w-10 h-10 shrink-0 {darkMode
										? 'bg-emerald-900'
										: 'bg-emerald-100'} rounded-lg flex items-center justify-center"
								>
									<span class="text-xs font-bold {darkMode ? 'text-emerald-300' : 'text-emerald-600'}"
										>AI</span
									>
								</div>
								<div class="flex-1 min-w-0">
									<h3
										class="text-sm font-semibold {darkMode
											? 'text-white'
											: 'text-slate-900'} mb-1 group-hover:text-emerald-400 transition-colors"
									>
										{template.name}
									</h3>
									<p
										class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2 mb-2"
									>
										{template.description || displayInfo.prompt.slice(0, 100)}
										{displayInfo.prompt.length > 100 ? '...' : ''}
									</p>
									<div class="flex items-center gap-2 flex-wrap">
										<span
											class="text-[10px] px-1.5 py-0.5 {darkMode
												? 'bg-slate-700 text-slate-300'
												: 'bg-slate-200 text-slate-600'} rounded font-medium"
										>
											{displayInfo.model}
										</span>
										{#if displayInfo.hasSchema}
											<span
												class="text-[10px] px-1.5 py-0.5 {darkMode
													? 'bg-teal-900/50 text-teal-300'
													: 'bg-teal-100 text-teal-700'} rounded font-medium"
											>
												Structured Output
											</span>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
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

<!-- Edit/Create Modal -->
<PromptEditModal
	{darkMode}
	template={editingTemplate}
	{isCreating}
	{queryClient}
	onSave={handleSaveTemplate}
	onCancel={handleCancelEdit}
/>

<!-- Schema Library Modal -->
{#if showSchemaLibrary && queryClient}
	<JsonSchemaPickerModal
		{darkMode}
		{queryClient}
		onselect={() => showSchemaLibrary = false}
		onclose={() => showSchemaLibrary = false}
	/>
{/if}
