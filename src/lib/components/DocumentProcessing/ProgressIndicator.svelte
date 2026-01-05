<!-- src/lib/components/DocumentProcessing/ProgressIndicator.svelte -->
<script lang="ts">
	const { progress, label, showPercentage = true } = $props<{
		progress: number;
		label?: string;
		showPercentage?: boolean;
	}>();

	const clampedProgress = $derived(Math.max(0, Math.min(100, progress)));
</script>

<div class="w-full">
	{#if label}
		<div class="mb-1 flex items-center justify-between text-xs">
			<span class="text-gray-600 dark:text-gray-400">{label}</span>
			{#if showPercentage}
				<span class="font-medium text-gray-700 dark:text-gray-300">{clampedProgress}%</span>
			{/if}
		</div>
	{/if}
	<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
		<div
			class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 ease-out"
			style="width: {clampedProgress}%"
			role="progressbar"
			aria-valuenow={clampedProgress}
			aria-valuemin="0"
			aria-valuemax="100"
		>
		</div>
	</div>
</div>
