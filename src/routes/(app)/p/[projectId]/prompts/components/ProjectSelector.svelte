<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';

	const {
		projects = [],
		selectedProjectId = null,
		darkMode = false,
		onSelect
	}: {
		projects: Project[];
		selectedProjectId: string | null;
		darkMode?: boolean;
		onSelect: (projectId: string | null) => void;
	} = $props();

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = target.value;
		onSelect(value === '' ? null : value);
	}

	// Get selected project name for display
	let selectedProject = $derived(
		selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null
	);
</script>

<div class="flex items-center gap-2">
	<label
		for="project-selector"
		class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-600'}"
	>
		Project:
	</label>
	<div class="relative">
		<select
			id="project-selector"
			value={selectedProjectId ?? ''}
			onchange={handleChange}
			class="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer
				{darkMode
				? 'bg-slate-700 border-slate-600 text-white hover:border-slate-500 focus:border-indigo-500'
				: 'bg-white border-slate-300 text-slate-900 hover:border-slate-400 focus:border-indigo-500'}
				focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
		>
			<option value="">All Projects</option>
			{#each projects as project (project.id)}
				<option value={project.id}>
					{project.name}
					{#if project.status === 'ARCHIVED'}
						(Archived)
					{/if}
				</option>
			{/each}
		</select>
		<div
			class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none {darkMode
				? 'text-slate-400'
				: 'text-slate-500'}"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</div>
	{#if selectedProject}
		<span
			class="text-xs px-2 py-0.5 rounded-full {darkMode
				? 'bg-indigo-900/50 text-indigo-300'
				: 'bg-indigo-100 text-indigo-700'}"
		>
			{selectedProject.status === 'ACTIVE' ? 'Active' : selectedProject.status}
		</span>
	{/if}
</div>
