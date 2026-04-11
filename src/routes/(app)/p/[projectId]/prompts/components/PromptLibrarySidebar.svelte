<script lang="ts">
	import type { Prompt } from '@stratiqai/types-simple';

	let {
		darkMode,
		templates,
		selectedId,
		onSelect,
		onEdit,
		onDelete,
		getTemplateDisplayInfo
	} = $props<{
		darkMode: boolean;
		templates: Prompt[];
		selectedId: string | null;
		onSelect: (t: Prompt) => void;
		onEdit: (t: Prompt) => void;
		onDelete: (t: Prompt) => void;
		getTemplateDisplayInfo: (t: Prompt) => { prompt: string; model: string; hasSchema: boolean };
	}>();

	const panel = $derived(
		darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'
	);
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden border-l {panel}">
	<div class="border-b px-3 py-2.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<h2 class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			Prompt library ({templates.length})
		</h2>
		<p class="mt-1 text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			Click a card to load it in the workspace. Use the pencil to edit.
		</p>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		<div class="flex flex-col gap-2">
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
						<div class="flex items-start gap-2 pr-14">
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg {darkMode
									? 'bg-emerald-900'
									: 'bg-emerald-100'}"
							>
								<span class="text-[10px] font-bold {darkMode ? 'text-emerald-300' : 'text-emerald-600'}">AI</span>
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="text-xs font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
									{template.name}
								</h3>
								<p class="mt-0.5 line-clamp-2 text-[11px] {darkMode ? 'text-slate-400' : 'text-slate-600'}">
									{template.description || displayInfo.prompt.slice(0, 80)}
									{displayInfo.prompt.length > 80 ? '…' : ''}
								</p>
								<div class="mt-1.5 flex flex-wrap gap-1">
									<span
										class="rounded px-1.5 py-0.5 text-[9px] font-medium {darkMode
											? 'bg-slate-700 text-slate-300'
											: 'bg-slate-200 text-slate-600'}"
									>
										{displayInfo.model}
									</span>
									{#if displayInfo.hasSchema}
										<span
											class="rounded px-1.5 py-0.5 text-[9px] font-medium {darkMode
												? 'bg-teal-900/50 text-teal-300'
												: 'bg-teal-100 text-teal-700'}"
										>
											Structured
										</span>
									{/if}
								</div>
							</div>
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
		</div>
	</div>
</div>
