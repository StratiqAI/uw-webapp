<script lang="ts">
	interface Props {
		total: number;
		current: number;
		darkMode?: boolean;
		onDotClick?: (index: number) => void;
	}

	let { total, current, darkMode = false, onDotClick }: Props = $props();
</script>

<div class="flex items-center gap-1.5" role="tablist" aria-label="Tour progress">
	{#each Array(total) as _, i}
		<button
			type="button"
			role="tab"
			aria-selected={i === current}
			aria-label="Go to step {i + 1}"
			class="h-2 rounded-full transition-all duration-200 {i === current
				? `w-5 ${darkMode ? 'bg-indigo-400' : 'bg-indigo-600'}`
				: `w-2 ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-300 hover:bg-slate-400'}`}"
			onclick={() => onDotClick?.(i)}
		></button>
	{/each}
</div>
