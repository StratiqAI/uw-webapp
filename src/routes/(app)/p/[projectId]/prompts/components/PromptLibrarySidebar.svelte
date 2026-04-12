<script lang="ts">
	import type { Prompt } from '@stratiqai/types-simple';

	let {
		darkMode,
		searchFilter = $bindable(''),
		libraryTotalCount,
		templates,
		selectedId,
		onSelect,
		onEdit,
		onDelete,
		getTemplateDisplayInfo
	} = $props<{
		darkMode: boolean;
		searchFilter?: string;
		/** Total prompts in the project (list below may be filtered by search). */
		libraryTotalCount: number;
		templates: Prompt[];
		selectedId: string | null;
		onSelect: (t: Prompt) => void;
		onEdit: (t: Prompt) => void;
		onDelete: (t: Prompt) => void;
		getTemplateDisplayInfo: (t: Prompt) => { prompt: string; hasSchema: boolean };
	}>();

	const panel = $derived(
		darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'
	);
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden border-r {panel}">
	<div class="border-b px-3 py-2.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<h2 class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			Prompt library ({libraryTotalCount})
		</h2>
		<p class="mt-1 text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			Click a card to load it in the workspace. Use the pencil to edit.
		</p>
	</div>

	<div class="shrink-0 border-b px-2 py-2 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<div class="relative">
			<input
				type="search"
				bind:value={searchFilter}
				placeholder="Search prompts…"
				autocomplete="off"
				class="h-8 w-full rounded-md border py-1 pr-8 pl-8 text-xs transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none {darkMode
					? 'border-slate-600 bg-slate-900/80 text-white placeholder-slate-500'
					: 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400'}"
			/>
			<svg
				class="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			{#if searchFilter}
				<button
					type="button"
					onclick={() => (searchFilter = '')}
					class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 transition-colors {darkMode
						? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
						: 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}"
					aria-label="Clear search"
				>
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		<div class="flex flex-col gap-2">
			{#if templates.length === 0}
				<p
					class="px-1 py-10 text-center text-[11px] {darkMode ? 'text-slate-500' : 'text-slate-500'}"
				>
					{searchFilter.trim()
						? 'No prompts match your search.'
						: 'No prompts to show.'}
				</p>
			{:else}
				{#each templates as template (template.id)}
					{@const displayInfo = getTemplateDisplayInfo(template)}
					{@const isSelected = selectedId === template.id}
					<div
						class="group relative rounded-lg border p-3 transition-all {isSelected
							? darkMode
								? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/40'
								: 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
							: darkMode
								? 'border-slate-700 bg-slate-800/80 hover:border-slate-600'
								: 'border-slate-200 bg-white hover:border-slate-300'}"
					>
						<button
							type="button"
							class="w-full text-left"
							onclick={() => onSelect(template)}
						>
							<div class="min-w-0 pr-14">
								<h3 class="text-xs font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
									{template.name}
								</h3>
								<p class="mt-0.5 line-clamp-2 text-[11px] {darkMode ? 'text-slate-400' : 'text-slate-600'}">
									{template.description || displayInfo.prompt.slice(0, 80)}
									{displayInfo.prompt.length > 80 ? '…' : ''}
								</p>
								{#if displayInfo.hasSchema}
									<div class="mt-1.5">
										<span
											class="rounded px-1.5 py-0.5 text-[9px] font-medium {darkMode
												? 'bg-teal-900/50 text-teal-300'
												: 'bg-teal-100 text-teal-700'}"
										>
											Structured
										</span>
									</div>
								{/if}
							</div>
						</button>

						<div class="absolute right-2 top-2 flex gap-0.5">
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									onEdit(template);
								}}
								class="rounded p-1 {darkMode
									? 'text-slate-400 hover:bg-slate-700 hover:text-indigo-300'
									: 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}"
								title="Edit prompt"
								aria-label="Edit prompt"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
									/>
								</svg>
							</button>
							<button
								type="button"
								onclick={(e) => {
									e.stopPropagation();
									onDelete(template);
								}}
								class="rounded p-1 {darkMode
									? 'text-slate-500 hover:bg-red-900/30 hover:text-red-400'
									: 'text-slate-400 hover:bg-red-50 hover:text-red-600'}"
								title="Delete prompt"
								aria-label="Delete prompt"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
