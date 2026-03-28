<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getValueType } from './utils';

	interface Props {
		selectedTopic: string | null;
		onselect: (topic: string) => void;
		ondelete: (topic: string) => void;
		onclear: (path: string) => void;
		darkMode: boolean;
		filter: string;
	}

	let { selectedTopic, onselect, ondelete, onclear, darkMode, filter }: Props = $props();

	let expandedNodes = $state<Set<string>>(new Set());

	function toggleExpand(path: string) {
		const next = new Set(expandedNodes);
		if (next.has(path)) next.delete(path);
		else next.add(path);
		expandedNodes = next;
	}

	function isExpanded(path: string): boolean {
		return expandedNodes.has(path);
	}

	function matchesFilter(path: string, value: unknown): boolean {
		if (!filter) return true;
		const lower = filter.toLowerCase();
		if (path.toLowerCase().includes(lower)) return true;
		if (typeof value === 'string' && value.toLowerCase().includes(lower)) return true;
		if (typeof value === 'object' && value !== null) {
			try {
				if (JSON.stringify(value).toLowerCase().includes(lower)) return true;
			} catch { /* ignore */ }
		}
		return false;
	}

	function isObjectNode(value: unknown): boolean {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	function hasError(path: string): boolean {
		return validatedTopicStore.errors.has(path);
	}

	let confirmingDelete = $state<string | null>(null);

	function requestDelete(path: string, e: Event) {
		e.stopPropagation();
		if (confirmingDelete === path) {
			ondelete(path);
			confirmingDelete = null;
		} else {
			confirmingDelete = path;
			setTimeout(() => { if (confirmingDelete === path) confirmingDelete = null; }, 3000);
		}
	}

	function requestClear(path: string, e: Event) {
		e.stopPropagation();
		onclear(path);
	}
</script>

{#snippet treeNode(key: string, value: unknown, path: string, depth: number)}
	{@const isObj = isObjectNode(value)}
	{@const visible = matchesFilter(path, value)}
	{@const errored = hasError(path)}
	{@const selected = selectedTopic === path}
	{#if visible}
		<div style="padding-left: {depth * 16}px">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm cursor-pointer transition-colors
					{selected ? (darkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-800') : (darkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-700 hover:bg-slate-100')}
					{errored ? 'ring-1 ring-red-400/50' : ''}"
				onclick={() => { if (isObj) toggleExpand(path); onselect(path); }}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isObj) toggleExpand(path); onselect(path); } }}
				title={path}
				role="treeitem"
				aria-selected={selected}
				tabindex="0"
			>
				{#if isObj}
					<svg class="h-3.5 w-3.5 shrink-0 transition-transform {isExpanded(path) ? 'rotate-90' : ''} {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
					</svg>
					<svg class="h-3.5 w-3.5 shrink-0 {darkMode ? 'text-amber-400' : 'text-amber-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
					</svg>
				{:else if Array.isArray(value)}
					<span class="shrink-0 text-xs font-mono {darkMode ? 'text-purple-400' : 'text-purple-600'}">[]</span>
				{:else}
					<span class="h-2 w-2 shrink-0 rounded-full
						{getValueType(value) === 'string' ? (darkMode ? 'bg-green-400' : 'bg-green-500') :
						 getValueType(value) === 'number' ? (darkMode ? 'bg-blue-400' : 'bg-blue-500') :
						 getValueType(value) === 'boolean' ? (darkMode ? 'bg-yellow-400' : 'bg-yellow-500') :
						 (darkMode ? 'bg-slate-400' : 'bg-slate-500')}"></span>
				{/if}

				<span class="min-w-0 flex-1 truncate font-mono text-xs">{key}</span>

				{#if errored}
					<span class="h-2 w-2 shrink-0 rounded-full bg-red-500" title="Validation error"></span>
				{/if}

				{#if !isObj}
					<span class="max-w-[120px] truncate text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}" title={String(value)}>
						{typeof value === 'string' ? `"${value}"` : String(value)}
					</span>
				{:else}
					<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
						{Object.keys(value as Record<string, unknown>).length}
					</span>
				{/if}

				<span class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
					{#if isObj}
						<button
							type="button"
							class="rounded p-0.5 {darkMode ? 'text-slate-500 hover:text-orange-400 hover:bg-slate-600' : 'text-slate-400 hover:text-orange-600 hover:bg-slate-200'} transition-colors"
							title="Clear all children"
							onclick={(e) => requestClear(path, e)}
						>
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
						</button>
					{/if}
					<button
						type="button"
						class="rounded p-0.5 transition-colors
							{confirmingDelete === path ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : (darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-slate-600' : 'text-slate-400 hover:text-red-600 hover:bg-slate-200')}"
						title={confirmingDelete === path ? 'Click again to confirm' : 'Delete'}
						onclick={(e) => requestDelete(path, e)}
					>
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
					</button>
				</span>
			</div>

			{#if isObj && isExpanded(path)}
				{@const entries = Object.entries(value as Record<string, unknown>)}
				{#each entries as [childKey, childValue] (childKey)}
					{@render treeNode(childKey, childValue, path ? `${path}/${childKey}` : childKey, depth + 1)}
				{/each}
			{/if}
		</div>
	{/if}
{/snippet}

<div class="flex h-full flex-col overflow-hidden">
	<div class="flex-1 overflow-y-auto p-2">
		{#each Object.entries(validatedTopicStore.tree) as [key, value] (key)}
			{@render treeNode(key, value, key, 0)}
		{:else}
			<p class="px-3 py-8 text-center text-sm {darkMode ? 'text-slate-500' : 'text-slate-400'}">
				Store is empty
			</p>
		{/each}
	</div>
</div>
