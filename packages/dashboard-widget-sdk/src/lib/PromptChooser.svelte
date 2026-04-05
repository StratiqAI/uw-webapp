<script lang="ts">
	/**
	 * Searchable list of compatible prompts from the cloud library.
	 * Pure UI — the host provides pre-filtered prompts via props.
	 */

	interface CompatiblePrompt {
		id: string;
		name: string;
		description?: string;
		prompt: string;
		model: string;
		updatedAt: string;
		isTemplate?: boolean;
	}

	interface Props {
		darkMode?: boolean;
		currentPromptId?: string;
		compatiblePrompts?: CompatiblePrompt[];
		isLoading?: boolean;
		onSelect?: (promptId: string) => void;
		onCreateNew?: () => void;
		onCloneFromSelected?: (promptId: string) => void;
	}

	let {
		darkMode = false,
		currentPromptId,
		compatiblePrompts = [],
		isLoading = false,
		onSelect,
		onCreateNew,
		onCloneFromSelected
	}: Props = $props();

	let searchQuery = $state('');

	let filteredPrompts = $derived.by(() => {
		if (!searchQuery.trim()) return compatiblePrompts;
		const q = searchQuery.toLowerCase();
		return compatiblePrompts.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				(p.description?.toLowerCase().includes(q) ?? false) ||
				p.prompt.toLowerCase().includes(q)
		);
	});

	function truncate(text: string, max = 80): string {
		if (text.length <= max) return text;
		return text.slice(0, max) + '...';
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return iso;
		}
	}
</script>

<div class="space-y-3">
	<!-- Search -->
	<div class="relative">
		<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search prompts..."
			class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 {darkMode ? 'bg-slate-800/80 text-white border-slate-600/80 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-200 placeholder-slate-400'}"
		/>
	</div>

	<!-- Prompt list -->
	{#if isLoading}
		<div class="flex items-center justify-center py-6">
			<svg class="w-5 h-5 animate-spin {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
			</svg>
			<span class="ml-2 text-sm {darkMode ? 'text-slate-500' : 'text-slate-400'}">Loading prompts...</span>
		</div>
	{:else if filteredPrompts.length === 0}
		<div class="rounded-xl border-2 border-dashed {darkMode ? 'border-slate-700/60' : 'border-slate-200'} py-6 text-center">
			<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-400'}">
				{searchQuery ? 'No matching prompts found' : 'No compatible prompts available'}
			</p>
		</div>
	{:else}
		<div class="max-h-56 space-y-1.5 overflow-y-auto">
			{#each filteredPrompts as prompt (prompt.id)}
				{@const isActive = prompt.id === currentPromptId}
				<button
					type="button"
					onclick={() => onSelect?.(prompt.id)}
					class="w-full rounded-lg border px-3 py-2.5 text-left transition-all
						{isActive
							? darkMode
								? 'border-indigo-500/40 bg-indigo-500/10'
								: 'border-indigo-300 bg-indigo-50/50'
							: darkMode
								? 'border-slate-700/50 bg-slate-800/20 hover:border-slate-600 hover:bg-slate-800/40'
								: 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50'}"
				>
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="text-sm font-semibold truncate {darkMode ? 'text-white' : 'text-slate-900'}">{prompt.name}</span>
								{#if prompt.isTemplate}
									<span class="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded {darkMode ? 'bg-violet-500/15 text-violet-400 border border-violet-500/25' : 'bg-violet-50 text-violet-600 border border-violet-200'}">
										Template
									</span>
								{/if}
								{#if isActive}
									<span class="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded {darkMode ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}">
										Active
									</span>
								{/if}
							</div>
							{#if prompt.description}
								<p class="mt-0.5 text-xs truncate {darkMode ? 'text-slate-400' : 'text-slate-500'}">{prompt.description}</p>
							{/if}
							<p class="mt-1 text-[11px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">{truncate(prompt.prompt)}</p>
						</div>
						<div class="flex flex-col items-end gap-1 shrink-0">
							<span class="text-[10px] px-1.5 py-0.5 rounded font-medium {darkMode ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500'}">{prompt.model}</span>
							<span class="text-[10px] {darkMode ? 'text-slate-600' : 'text-slate-400'}">{formatDate(prompt.updatedAt)}</span>
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Footer actions -->
	<div class="flex items-center gap-2 pt-1">
		{#if onSelect && currentPromptId}
			<button
				type="button"
				onclick={() => onSelect?.(currentPromptId!)}
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all
					{darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
			>
				Use Selected
			</button>
		{/if}
		{#if onCloneFromSelected && currentPromptId}
			<button
				type="button"
				onclick={() => onCloneFromSelected?.(currentPromptId!)}
				class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
					{darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-300'}"
			>
				Clone as New
			</button>
		{/if}
		{#if onCreateNew}
			<button
				type="button"
				onclick={onCreateNew}
				class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
					{darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-300'}"
			>
				New Prompt
			</button>
		{/if}
	</div>
</div>
