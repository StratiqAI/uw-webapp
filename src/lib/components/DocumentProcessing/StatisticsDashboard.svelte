<!-- src/lib/components/DocumentProcessing/StatisticsDashboard.svelte -->
<script lang="ts">
	import ProgressIndicator from './ProgressIndicator.svelte';
	import type { ProcessingStatistics } from './types';

	const { statistics, progress } = $props<{
		statistics: ProcessingStatistics;
		progress: number;
	}>();
</script>

<div class="space-y-4">
	<!-- Overall Progress -->
	<ProgressIndicator {progress} label="Overall Progress" />

	<!-- Statistics Grid -->
	<div class="grid grid-cols-2 gap-4">
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
			<div class="text-xs text-gray-600 dark:text-gray-400">Pages</div>
			<div class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
				{statistics.processedPages} / {statistics.totalPages}
			</div>
			{#if statistics.totalPages > 0}
				<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					{Math.round((statistics.processedPages / statistics.totalPages) * 100)}% complete
				</div>
			{/if}
		</div>

		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
			<div class="text-xs text-gray-600 dark:text-gray-400">Text Blocks</div>
			<div class="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
				{statistics.textBlocks}
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
			<div class="text-xs text-gray-600 dark:text-gray-400">Tables</div>
			<div class="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
				{statistics.tables}
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
			<div class="text-xs text-gray-600 dark:text-gray-400">Images</div>
			<div class="mt-1 text-2xl font-semibold text-orange-600 dark:text-orange-400">
				{statistics.images}
			</div>
		</div>
	</div>
</div>
