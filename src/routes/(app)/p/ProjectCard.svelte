<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';
	import { M_UPDATE_PROJECT } from '@stratiqai/types-simple';
	import { print } from 'graphql';
	import { gql } from '$lib/services/realtime/graphql/requestHandler';
	import { timeAgo } from '$lib/utils/dateFormat';

	interface Props {
		project: Project;
		darkMode: boolean;
		idToken?: string;
		onDelete: (project: Project) => void;
	}

	let { project, darkMode, idToken, onDelete }: Props = $props();

	const projectBase = $derived(`/p/${project.id}`);

	const projectPages = [
		{ label: 'Documents', segment: 'docs' },
		{ label: 'Dashboard', segment: 'dashboard' },
		{ label: 'Deal Room', segment: 'dealroom' },
		{ label: 'Prompts', segment: 'prompts' },
		{ label: 'Workflows', segment: 'workflows' }
	];

	const statusColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
		ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-900/40', darkText: 'text-emerald-300' },
		DRAFT: { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-900/40', darkText: 'text-amber-300' },
		ARCHIVED: { bg: 'bg-slate-200', text: 'text-slate-600', darkBg: 'bg-slate-700', darkText: 'text-slate-300' },
		PUBLISHED: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-900/40', darkText: 'text-blue-300' },
		DELETED: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'bg-red-900/40', darkText: 'text-red-300' }
	};

	const statusStyle = $derived(statusColors[project.status] ?? statusColors.ACTIVE);

	// Inline rename state
	let isEditing = $state(false);
	let editedName = $state('');
	let isSaving = $state(false);

	function startEditing(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		if (!idToken) return;
		editedName = project.name;
		isEditing = true;
		setTimeout(() => {
			const input = document.getElementById(`rename-${project.id}`) as HTMLInputElement;
			input?.focus();
			input?.select();
		}, 0);
	}

	async function saveRename() {
		const trimmed = editedName.trim();
		if (!trimmed || trimmed === project.name || !idToken) {
			isEditing = false;
			return;
		}
		isSaving = true;
		try {
			await gql<{ updateProject: Project }>(
				print(M_UPDATE_PROJECT),
				{ id: project.id, input: { name: trimmed } },
				idToken
			);
		} catch (err) {
			console.error('Failed to rename project:', err);
		} finally {
			isSaving = false;
			isEditing = false;
		}
	}

	function cancelRename() {
		isEditing = false;
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); saveRename(); }
		else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
	}
</script>

<div
	class="card-enhanced {darkMode
		? 'border-slate-700/50'
		: 'border-primary-200/60'} group flex flex-col rounded-xl border"
>
	<!-- Header row: icon, name, status badge -->
	<div class="flex items-start gap-3 p-4 pb-2">
		<a
			href={`${projectBase}/docs`}
			class="h-10 w-10 shrink-0 {darkMode ? 'bg-indigo-900/60' : 'bg-indigo-100'} flex items-center justify-center rounded-lg transition-colors hover:ring-2 hover:ring-indigo-400/50"
			title="Open project"
		>
			<svg class="h-5 w-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
			</svg>
		</a>

		<div class="min-w-0 flex-1">
			{#if isEditing}
				<div class="flex items-center gap-1.5">
					<input
						id={`rename-${project.id}`}
						type="text"
						bind:value={editedName}
						onkeydown={handleRenameKeydown}
						onblur={saveRename}
						disabled={isSaving}
						class="w-full px-2 py-0.5 text-sm font-semibold rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500
							{darkMode
							? 'bg-slate-700 border-slate-600 text-white'
							: 'bg-white border-slate-300 text-slate-900'}"
					/>
				</div>
			{:else}
				<div class="flex items-center gap-1.5 group/name">
					<a
						href={`${projectBase}/docs`}
						class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} truncate hover:text-indigo-500 transition-colors"
						title={project.name}
					>
						{project.name}
					</a>
					{#if idToken}
						<button
							onclick={startEditing}
							class="p-0.5 rounded opacity-0 group-hover/name:opacity-100 transition-opacity {darkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}"
							title="Rename project"
							aria-label="Rename project"
						>
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			{#if project.description}
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-1 mt-0.5">{project.description}</p>
			{:else}
				<p class="text-xs {darkMode ? 'text-slate-600' : 'text-slate-400'} italic mt-0.5">No description</p>
			{/if}
		</div>

		<!-- Status badge -->
		<span
			class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider
				{darkMode ? statusStyle.darkBg : statusStyle.bg}
				{darkMode ? statusStyle.darkText : statusStyle.text}"
		>
			{project.status}
		</span>
	</div>

	<!-- Metadata row -->
	<div class="flex items-center gap-3 px-4 pb-2 text-[11px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">
		<span class="flex items-center gap-1" title={project.createdAt ? new Date(project.createdAt).toLocaleString() : ''}>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
			{timeAgo(project.createdAt)}
		</span>
		<span class="flex items-center gap-1" title={project.updatedAt ? new Date(project.updatedAt).toLocaleString() : ''}>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
			{timeAgo(project.updatedAt)}
		</span>
		{#if project.sharingMode === 'PRIVATE'}
			<span class="flex items-center gap-1" title="Private project">
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
				</svg>
				Private
			</span>
		{:else}
			<span class="flex items-center gap-1" title="Shared project">
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				Shared
			</span>
		{/if}
	</div>

	<div class="flex items-center gap-1.5 px-4 py-2.5 border-t {darkMode ? 'border-slate-700/50' : 'border-slate-200/60'} flex-wrap">
		{#each projectPages as wp}
			<a
				href={`${projectBase}/${wp.segment}`}
				class="px-2 py-1 text-[11px] font-medium rounded-md transition-colors
					{darkMode
					? 'bg-slate-800 text-slate-400 hover:bg-indigo-900/40 hover:text-indigo-300 border border-slate-700/50'
					: 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/60'}"
				title={`Open ${wp.label}`}
			>
				{wp.label}
			</a>
		{/each}

		<!-- Delete button pushed to the right -->
		<button
			onclick={() => onDelete(project)}
			class="ml-auto p-1.5 {darkMode
				? 'text-slate-500 hover:bg-red-900/20 hover:text-red-400'
				: 'text-slate-400 hover:bg-red-50 hover:text-red-600'} rounded-lg opacity-0 transition-all group-hover:opacity-100"
			aria-label="Delete project"
			title="Delete project"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
			</svg>
		</button>
	</div>
</div>
