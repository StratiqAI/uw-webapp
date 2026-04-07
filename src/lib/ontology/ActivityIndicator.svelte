<script lang="ts">
	interface Props {
		status: string;
		darkMode: boolean;
	}

	let { status, darkMode }: Props = $props();

	let label = $derived(
		status === 'ready'
			? 'Live'
			: status === 'initializing'
				? 'Connecting...'
				: status === 'error'
					? 'Error'
					: 'Offline'
	);

	let dotClass = $derived(
		status === 'ready'
			? 'bg-emerald-400'
			: status === 'initializing'
				? 'bg-amber-400 animate-pulse'
				: status === 'error'
					? 'bg-red-400'
					: darkMode
						? 'bg-slate-600'
						: 'bg-slate-300'
	);

	let textClass = $derived(
		status === 'ready'
			? darkMode ? 'text-emerald-400' : 'text-emerald-600'
			: status === 'initializing'
				? darkMode ? 'text-amber-400' : 'text-amber-600'
				: status === 'error'
					? darkMode ? 'text-red-400' : 'text-red-600'
					: darkMode ? 'text-slate-500' : 'text-slate-400'
	);
</script>

<div class="flex items-center gap-1.5">
	<span class="relative flex h-2 w-2">
		{#if status === 'ready'}
			<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50"></span>
		{/if}
		<span class="relative inline-flex h-2 w-2 rounded-full {dotClass}"></span>
	</span>
	<span class="text-xs font-medium {textClass}">{label}</span>
</div>
