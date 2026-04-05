<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';
	import { M_UPDATE_PROJECT } from '@stratiqai/types-simple';
	import { print } from 'graphql';
	import { goto } from '$app/navigation';
	import { gql } from '$lib/services/realtime/graphql/requestHandler';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('dashboard');

	interface Props {
		projects: Project[];
		selectedProjectId: string | null;
		darkMode: boolean;
		idToken?: string | null;
		onProjectChange: (projectId: string | null) => void;
	}

	let { projects, selectedProjectId, darkMode, idToken, onProjectChange }: Props = $props();
	let isOpen = $state(false);

	// Inline rename state
	let renamingId = $state<string | null>(null);
	let renameValue = $state('');
	let isSaving = $state(false);

	const selectedProject = $derived(
		selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null
	);

	function handleSelect(projectId: string | null) {
		onProjectChange(projectId);
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.project-switcher')) {
			isOpen = false;
			renamingId = null;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});

	function startRename(e: Event, project: Project) {
		e.preventDefault();
		e.stopPropagation();
		if (!idToken) return;
		renamingId = project.id;
		renameValue = project.name;
		setTimeout(() => {
			const input = document.getElementById(`switcher-rename-${project.id}`) as HTMLInputElement;
			input?.focus();
			input?.select();
		}, 0);
	}

	async function saveRename(projectId: string) {
		const trimmed = renameValue.trim();
		const original = projects.find((p) => p.id === projectId);
		if (!trimmed || trimmed === original?.name || !idToken) {
			renamingId = null;
			return;
		}
		isSaving = true;
		try {
			await gql<{ updateProject: Project }>(
				print(M_UPDATE_PROJECT),
				{ id: projectId, input: { name: trimmed } },
				idToken
			);
			globalProjectStore.updateProject(projectId, { name: trimmed });
		} catch (err) {
			log.error('Failed to rename project:', err);
		} finally {
			isSaving = false;
			renamingId = null;
		}
	}

	function handleRenameKeydown(e: KeyboardEvent, projectId: string) {
		if (e.key === 'Enter') { e.preventDefault(); saveRename(projectId); }
		else if (e.key === 'Escape') { e.preventDefault(); renamingId = null; }
	}
</script>

<div class="project-switcher relative">
	<button
		onclick={() => (isOpen = !isOpen)}
		class="flex items-center gap-2 px-3 py-2 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'} rounded-lg transition-colors text-sm font-medium"
		aria-label="Select project"
		aria-expanded={isOpen}
		title="Switch project or create a new one"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"></path>
		</svg>
		<span class="max-w-[200px] truncate">
			{selectedProject ? selectedProject.name || 'Unnamed Project' : 'Select Project'}
		</span>
		<svg
			class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute top-full left-0 mt-2 w-72 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
		>
			<div class="p-2">
			{#if projects.length === 0}
				<div class="px-3 py-2 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
					No projects available
				</div>
			{:else}
				{#each projects as project (project.id)}
					{#if renamingId === project.id}
						<!-- Inline rename mode -->
						<div class="flex items-center gap-1.5 px-2 py-1.5 rounded-md {darkMode ? 'bg-slate-700' : 'bg-slate-50'}">
							<input
								id={`switcher-rename-${project.id}`}
								type="text"
								bind:value={renameValue}
								onkeydown={(e) => handleRenameKeydown(e, project.id)}
								onblur={() => saveRename(project.id)}
								disabled={isSaving}
								class="flex-1 min-w-0 px-2 py-0.5 text-sm rounded border transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500
									{darkMode
									? 'bg-slate-600 border-slate-500 text-white'
									: 'bg-white border-slate-300 text-slate-900'}"
							/>
						</div>
					{:else}
						<div
							role="option"
							aria-selected={selectedProjectId === project.id}
							tabindex="0"
							onclick={() => handleSelect(project.id)}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(project.id); } }}
							class="w-full text-left px-3 py-2 rounded-md text-sm group/item cursor-pointer {darkMode ? selectedProjectId === project.id ? 'bg-indigo-900 text-indigo-300' : 'text-slate-300 hover:bg-slate-700' : selectedProjectId === project.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'} transition-colors"
						>
							<div class="flex items-center gap-2">
								<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"></path>
								</svg>
								<span class="truncate flex-1 {project.name === 'New Project' ? 'italic opacity-70' : ''}">
									{project.name || 'Unnamed Project'}
								</span>
								{#if idToken}
									<button
										onclick={(e) => startRename(e, project)}
										class="p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 {darkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}"
										title="Rename project"
										aria-label="Rename project"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
								{/if}
								{#if selectedProjectId === project.id}
									<svg class="w-4 h-4 shrink-0 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
									</svg>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			{/if}
				<div class="h-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'} my-2"></div>
				<button
					onclick={() => { isOpen = false; goto('/projects?action=new'); }}
					class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors {darkMode ? 'text-indigo-400 hover:bg-slate-700' : 'text-indigo-600 hover:bg-slate-100'}"
				>
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
						</svg>
						<span>Create New Project</span>
					</div>
				</button>
			</div>
		</div>
	{/if}
</div>
