<!-- src/lib/components/VectorStores.svelte -->
<script lang="ts">
	import type { Writable } from 'svelte/store';

	export let vectorStoreIds: Writable<string[]>;  

	function addVectorStore() {
		$vectorStoreIds = [...$vectorStoreIds, ''];
	}

	function removeVectorStore(index: number) {
		$vectorStoreIds = $vectorStoreIds.filter((_, i) => i !== index);
	}
</script>

<div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
		Vector Store IDs
	</div>
	{#each $vectorStoreIds as vectorStoreId, index (index)}
		<div
			class="mb-4 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm"
		>
			<input
				type="text"
				bind:value={$vectorStoreIds[index]}
				placeholder="vs_..."
				class="font-inherit w-full flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
				aria-label="Vector store ID"
			/>
			{#if $vectorStoreIds.length > 1}
				<button
					type="button"
					onclick={() => removeVectorStore(index)}
					class="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-red-600"
					aria-label="Remove vector store"
					title="Remove"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M4 4L12 12M12 4L4 12"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			{/if}
		</div>
	{/each}
	<button
		type="button"
		onclick={addVectorStore}
		class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-5 py-2.5 text-[0.9375rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
		</svg>
		Add Vector Store
	</button>
</div>