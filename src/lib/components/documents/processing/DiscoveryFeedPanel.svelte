<!-- src/lib/components/DocumentProcessing/DiscoveryFeedPanel.svelte -->
<script lang="ts">
	import ActivityStream from './ActivityStream.svelte';
	import StatisticsDashboard from './StatisticsDashboard.svelte';
	import WorkflowStatusList from './WorkflowStatusList.svelte';

	const { store } = $props<{
		store: ReturnType<typeof import('./processing.store.svelte').createProcessingStore>;
	}>();
</script>

<div class="flex h-full flex-col space-y-6 p-6">
	<!-- Processing Status Section -->
	<div>
		<h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">📊 Processing Status</h3>
		<ActivityStream feedEntries={store.state.feedEntries} />
	</div>

	<!-- Statistics Section -->
	<div>
		<h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">📈 Statistics</h3>
		<StatisticsDashboard statistics={store.state.statistics} progress={store.progress} />
	</div>

	<!-- Workflows Section -->
	{#if store.state.workflows.length > 0}
		<div>
			<h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">⚙️ Workflows</h3>
			<WorkflowStatusList workflows={store.state.workflows} />
		</div>
	{/if}
</div>
