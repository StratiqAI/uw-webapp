<script lang="ts">
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';

	interface Props {
		onSend: (tabId?: string) => void;
		darkMode?: boolean;
		colorClasses?: string;
	}

	let { onSend, darkMode = false, colorClasses = '' }: Props = $props();

	let isOpen = $state(false);
	let containerEl = $state<HTMLElement>();

	const tabs = $derived(dashboard.tabOrder);
	const hasMultipleTabs = $derived(tabs.length > 1);

	function handleDefaultSend() {
		onSend();
	}

	function handleTabSend(tabId: string) {
		onSend(tabId);
		isOpen = false;
	}

	function togglePicker(e: MouseEvent) {
		e.stopPropagation();
		isOpen = !isOpen;
	}

	function handleClickOutside(e: MouseEvent) {
		if (isOpen && containerEl && !containerEl.contains(e.target as Node)) {
			isOpen = false;
		}
	}
</script>

<svelte:document onclick={handleClickOutside} />

<div bind:this={containerEl} class="relative inline-flex items-center gap-0.5">
	<button
		onclick={handleDefaultSend}
		class="flex items-center gap-1.5 text-xs font-medium transition-colors {colorClasses}"
	>
		<span>Send to Dashboard</span>
		<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
		</svg>
	</button>

	{#if hasMultipleTabs}
		<button
			onclick={togglePicker}
			class="flex items-center justify-center rounded p-0.5 transition-colors {darkMode
				? 'hover:bg-slate-600/40 text-slate-400 hover:text-slate-200'
				: 'hover:bg-slate-200/60 text-slate-400 hover:text-slate-600'}"
			aria-label="Choose dashboard tab"
		>
			<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	{/if}

	{#if isOpen}
		<div
			class="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border py-1 shadow-lg {darkMode
				? 'border-slate-700 bg-slate-800'
				: 'border-slate-200 bg-white'}"
		>
			{#each tabs as tab (tab.id)}
				<button
					onclick={() => handleTabSend(tab.id)}
					class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors {darkMode
						? 'text-slate-200 hover:bg-slate-700'
						: 'text-slate-700 hover:bg-slate-100'}"
				>
					<span class="flex-1 font-medium">{tab.label}</span>
					{#if tab.id === dashboard.activeTabId}
						<span class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">current</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
