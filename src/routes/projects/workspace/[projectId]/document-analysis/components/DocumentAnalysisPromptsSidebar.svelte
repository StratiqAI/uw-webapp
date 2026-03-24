<script lang="ts">
	/**
	 * Sidebar listing prompts loaded the same way as the Prompt library page.
	 * Uses listPrompts(scope: OWNED_BY_ME) via GraphQL. Selecting a prompt runs the parent's
	 * vision query using the prompt's main `prompt` text as the question.
	 */
	import type { Prompt } from '@stratiqai/types-simple';
	import { Q_LIST_PROMPTS } from '$lib/graphql/promptOperations';
	import { GraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';

	interface Props {
		idToken: string | undefined;
		darkMode?: boolean;
		isLoading?: boolean;
		/** When this number changes, the sidebar refetches the prompt list (e.g. after creating a new prompt). */
		refreshTrigger?: number;
		onSelectPrompt?: (prompt: Prompt) => void;
		onCreatePrompt?: () => void;
	}

	let { idToken, darkMode = true, isLoading = false, refreshTrigger = 0, onSelectPrompt, onCreatePrompt }: Props = $props();

	let prompts = $state<Prompt[]>([]);
	let promptsLoading = $state(false);
	let promptsError = $state<string | null>(null);
	let searchQuery = $state('');
	let isOpen = $state(true);

	const filteredPrompts = $derived(
		searchQuery.trim()
			? prompts.filter(
					(p) =>
						p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						(p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
						(p.prompt && p.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
				)
			: prompts
	);

	async function loadPrompts() {
		if (!idToken) return;
		promptsLoading = true;
		promptsError = null;
		try {
			const queryClient = new GraphQLQueryClient(idToken);
			const response = await queryClient.query<{ listPrompts: { items: Prompt[] } }>(Q_LIST_PROMPTS, {
				scope: 'OWNED_BY_ME',
				limit: 200
			});
			prompts = response?.listPrompts?.items ?? [];
		} catch (err) {
			console.error('Failed to load prompts:', err);
			promptsError = err instanceof Error ? err.message : 'Failed to load prompts';
			prompts = [];
		} finally {
			promptsLoading = false;
		}
	}

	let hasFetched = $state(false);

	$effect(() => {
		if (!idToken) return;
		// Initial load or refetch when refreshTrigger changes (e.g. after creating a prompt)
		if (!hasFetched && !promptsLoading) {
			hasFetched = true;
			loadPrompts();
		}
	});

	$effect(() => {
		if (idToken && refreshTrigger > 0) {
			loadPrompts();
		}
	});

	function getBodySnippet(prompt: Prompt): string {
		const body = prompt.prompt ?? '';
		return body.length > 80 ? body.slice(0, 80) + '...' : body;
	}
</script>

<div
	class="flex shrink-0 flex-col border-l transition-[width] duration-200 ease-out {darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}"
	style="width: {isOpen ? '340px' : '44px'};"
>
	<!-- Toggle tab -->
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="flex h-12 w-full items-center {isOpen ? 'justify-end px-2' : 'justify-center'} {darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'} transition-colors"
		aria-label={isOpen ? 'Close prompts' : 'Open prompts'}
		title="Prompts"
	>
		{#if isOpen}
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		{:else}
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		{/if}
	</button>

	{#if isOpen}
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Header -->
			<div class="border-b px-4 py-4 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Prompts</h2>
				<p class="mt-0.5 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">From your library</p>
			</div>

			<!-- Create new prompt -->
			{#if onCreatePrompt}
				<div class="px-4 pt-3">
					<button
						type="button"
						onclick={onCreatePrompt}
						class="flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors {darkMode ? 'border-indigo-600 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40' : 'border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Create new prompt
					</button>
				</div>
			{/if}

			<!-- Search -->
			<div class="mt-2 px-4">
				<div class="relative">
					<svg
						class="absolute left-2.5 top-2.5 h-4 w-4 {darkMode ? 'text-slate-500' : 'text-slate-400'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search by name or description..."
						class="w-full rounded-lg border py-2 pl-9 pr-3 text-sm {darkMode ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}"
					/>
				</div>
			</div>

			<!-- List -->
			<div class="flex-1 overflow-y-auto px-4 py-4">
				{#if promptsLoading}
					<div class="flex items-center justify-center py-8">
						<svg
							class="animate-spin h-8 w-8 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
				{:else if promptsError}
					<p class="text-sm {darkMode ? 'text-red-400' : 'text-red-600'}">{promptsError}</p>
				{:else if filteredPrompts.length === 0}
					<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						{searchQuery.trim() ? 'No prompts match your search.' : 'No prompts yet. Create some in the library.'}
					</p>
				{:else}
					<div class="grid grid-cols-1 gap-2">
						{#each filteredPrompts as prompt (prompt.id)}
							<button
								type="button"
								disabled={isLoading}
								onclick={() => onSelectPrompt?.(prompt)}
								class="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors {darkMode ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'} disabled:opacity-60 disabled:cursor-not-allowed"
							>
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded {darkMode ? 'bg-slate-700' : 'bg-slate-100'}"
								>
									<svg
										class="h-4 w-4 {darkMode ? 'text-slate-300' : 'text-slate-600'}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
								<div class="min-w-0 flex-1">
									<p class="font-medium {darkMode ? 'text-white' : 'text-slate-900'}">{prompt.name}</p>
									<p class="mt-0.5 line-clamp-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
										{prompt.description || getBodySnippet(prompt)}
									</p>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
