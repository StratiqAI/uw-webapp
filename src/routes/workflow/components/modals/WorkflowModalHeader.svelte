<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		darkMode = false,
		titleId,
		title,
		subtitle,
		icon,
		actions,
		below
	}: {
		darkMode?: boolean;
		titleId: string;
		title: string;
		subtitle: string;
		icon?: Snippet;
		actions?: Snippet;
		below?: Snippet;
	} = $props();
</script>

<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			{#if icon}
				{@render icon?.()}
			{/if}
			<div>
				<h2 id={titleId} class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					{title}
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">{subtitle}</p>
			</div>
		</div>
		{#if actions}
			<div class="flex items-center gap-2">
				{@render actions?.()}
			</div>
		{/if}
	</div>
	{#if below}
		{@render below?.()}
	{/if}
</div>
