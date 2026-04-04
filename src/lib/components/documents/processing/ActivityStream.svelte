<!-- src/lib/components/DocumentProcessing/ActivityStream.svelte -->
<script lang="ts">
	import ActivityEntry from './ActivityEntry.svelte';
	import type { FeedEntry } from './types';

	const { feedEntries } = $props<{
		feedEntries: FeedEntry[];
	}>();

	// Sort entries by timestamp (newest first)
	const sortedEntries = $derived.by(() => {
		return [...feedEntries].sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
	});
</script>

<div class="max-h-96 space-y-2 overflow-y-auto">
	{#if sortedEntries.length === 0}
		<div class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
			No activity yet
		</div>
	{:else}
		{#each sortedEntries as entry (entry.id)}
			<ActivityEntry {entry} />
		{/each}
	{/if}
</div>
