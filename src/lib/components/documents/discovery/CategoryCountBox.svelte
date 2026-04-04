<script lang="ts">
	const {
		count,
		label,
		subtitle,
		selected = false,
		delta = 0,
		pulse = false,
		darkMode = false,
		bgNormal,
		bgSelected,
		borderNormal,
		borderSelected,
		ringColor,
		textColor,
		deltaBg,
		hoverShadow = '',
		onclick
	}: {
		count: number;
		label: string;
		subtitle: string;
		selected?: boolean;
		delta?: number;
		pulse?: boolean;
		darkMode?: boolean;
		bgNormal: string;
		bgSelected: string;
		borderNormal: string;
		borderSelected: string;
		ringColor: string;
		textColor: string;
		deltaBg: string;
		hoverShadow?: string;
		onclick: () => void;
	} = $props();

	const pulseClass = $derived(
		pulse ? `scale-105 ring-2 ${ringColor} shadow-lg ${hoverShadow}` : 'hover:scale-105'
	);
	const selectionClass = $derived(
		selected
			? `${bgSelected} ${borderSelected} ring-2 ${ringColor}`
			: `${bgNormal} ${borderNormal}`
	);
</script>

<button
	type="button"
	{onclick}
	class="relative p-4 rounded-lg border cursor-pointer text-left transition-all duration-300 {pulseClass} {selectionClass}"
>
	{#if delta > 0}
		<span
			class="absolute -top-2 -right-2 flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full {deltaBg} text-white text-xs font-bold shadow-md animate-bounce"
		>
			+{delta}
		</span>
	{/if}
	<div class="text-3xl font-bold {textColor} mb-1">{count}</div>
	<div class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-600'}">{label}</div>
	<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">{subtitle}</div>
</button>
