<script lang="ts">
	import type { EntityDefinition } from '@stratiqai/types-simple';

	interface Props {
		definitions: Array<{ id: string; data: EntityDefinition }>;
		selectedId: string | null;
		onselect: (id: string) => void;
		darkMode: boolean;
	}

	let { definitions, selectedId, onselect, darkMode }: Props = $props();

	let filter = $state('');

	let filtered = $derived.by(() => {
		if (!filter.trim()) return definitions;
		const q = filter.toLowerCase();
		return definitions.filter(
			(d) =>
				d.data.name.toLowerCase().includes(q) ||
				d.data.description?.toLowerCase().includes(q)
		);
	});
</script>

<div class="flex h-full flex-col">
	<!-- Search -->
	<div class="flex items-center gap-2 border-b p-2.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<svg class="h-3.5 w-3.5 shrink-0 {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
		<input
			type="text"
			placeholder="Filter definitions..."
			class="w-full border-0 bg-transparent px-0 py-1 text-xs focus:outline-none
				{darkMode ? 'text-slate-200 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}"
			bind:value={filter}
		/>
	</div>

	<!-- List -->
	<div class="flex-1 overflow-y-auto">
		{#if filtered.length === 0}
			<div class="px-3 py-8 text-center">
				<svg class="mx-auto h-8 w-8 {darkMode ? 'text-slate-700' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
				</svg>
				<p class="mt-2 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					{filter ? 'No matching definitions' : 'No definitions yet'}
				</p>
			</div>
		{:else}
			<nav class="space-y-0.5 p-1.5">
				{#each filtered as entry (entry.id)}
					{@const def = entry.data}
					{@const isSelected = selectedId === entry.id}
					{@const propCount = def.properties?.filter(Boolean).length ?? 0}
					<button
						type="button"
						class="flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-all
							{isSelected
								? darkMode
									? 'bg-primary-900/40 text-primary-300'
									: 'bg-primary-50 text-primary-700'
								: darkMode
									? 'text-slate-300 hover:bg-slate-700/50'
									: 'text-slate-700 hover:bg-slate-50'}"
						onclick={() => onselect(entry.id)}
					>
						<div class="flex items-center gap-2">
							<span class="truncate text-sm font-medium">{def.name}</span>
							<span class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none
								{isSelected
									? darkMode
										? 'bg-primary-800/60 text-primary-300'
										: 'bg-primary-200 text-primary-700'
									: darkMode
										? 'bg-slate-700 text-slate-400'
										: 'bg-slate-100 text-slate-500'}">
								{propCount}
							</span>
						</div>
						{#if def.description}
							<p class="mt-0.5 truncate text-[11px] {isSelected
								? darkMode ? 'text-primary-400/70' : 'text-primary-600/70'
								: darkMode ? 'text-slate-500' : 'text-slate-400'}">
								{def.description}
							</p>
						{/if}
					</button>
				{/each}
			</nav>
		{/if}
	</div>
</div>
