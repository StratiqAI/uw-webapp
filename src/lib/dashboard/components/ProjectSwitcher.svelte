<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';
	import { goto } from '$app/navigation';

	interface Props {
		projects: Project[];
		selectedProjectId: string | null;
		darkMode: boolean;
		onProjectChange: (projectId: string | null) => void;
	}

	let { projects, selectedProjectId, darkMode, onProjectChange }: Props = $props();
	let isOpen = $state(false);

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
</script>

<div class="project-switcher relative">
	<button
		onclick={() => (isOpen = !isOpen)}
		class="flex items-center gap-2 px-3 py-2 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'} rounded-lg transition-colors text-sm font-medium"
		aria-label="Select project"
		aria-expanded={isOpen}
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
			class="absolute top-full left-0 mt-2 w-64 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
		>
			<div class="p-2">
				{#if projects.length === 0}
					<div class="px-3 py-2 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
						No projects available
					</div>
				{:else}
					{#each projects as project}
						<button
							onclick={() => handleSelect(project.id)}
							class="w-full text-left px-3 py-2 rounded-md text-sm {darkMode ? selectedProjectId === project.id ? 'bg-indigo-900 text-indigo-300' : 'text-slate-300 hover:bg-slate-700' : selectedProjectId === project.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'} transition-colors"
						>
							<div class="flex items-center gap-2">
								<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"></path>
								</svg>
								<span class="truncate">{project.name || 'Unnamed Project'}</span>
								{#if selectedProjectId === project.id}
									<svg class="w-4 h-4 ml-auto shrink-0 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
									</svg>
								{/if}
							</div>
						</button>
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

