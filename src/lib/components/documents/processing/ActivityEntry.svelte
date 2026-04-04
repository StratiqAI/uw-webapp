<!-- src/lib/components/DocumentProcessing/ActivityEntry.svelte -->
<script lang="ts">
	import ContentTypeIcon from './ContentTypeIcon.svelte';
	import type { FeedEntry } from './types';

	const { entry } = $props<{
		entry: FeedEntry;
	}>();

	let isExpanded = $state(false);

	const timeAgo = $derived.by(() => {
		const now = new Date();
		const then = new Date(entry.timestamp);
		const diffMs = now.getTime() - then.getTime();
		const diffSecs = Math.floor(diffMs / 1000);
		const diffMins = Math.floor(diffSecs / 60);

		if (diffSecs < 10) return 'just now';
		if (diffSecs < 60) return `${diffSecs} seconds ago`;
		if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
		return then.toLocaleTimeString();
	});
</script>

<div
	class="rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
>
	<div class="flex items-start gap-3">
		<ContentTypeIcon type={entry.type} size="sm" />
		<div class="flex-1 min-w-0">
			<div class="flex items-center justify-between gap-2">
				<p class="text-sm font-medium text-gray-900 dark:text-white">{entry.message}</p>
				<span class="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
			</div>
			{#if entry.pageNumber}
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Page {entry.pageNumber}</p>
			{/if}
			{#if entry.details && Object.keys(entry.details).length > 0}
				<button
					type="button"
					class="mt-2 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
					onclick={() => (isExpanded = !isExpanded)}
				>
					{isExpanded ? 'Hide' : 'Show'} details
				</button>
				{#if isExpanded}
					<div class="mt-2 rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">
						<pre class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
{JSON.stringify(entry.details, null, 2)}
						</pre>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
