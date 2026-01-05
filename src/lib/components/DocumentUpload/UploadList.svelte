<!-- src/lib/components/DocumentUpload/UploadList.svelte -->
<script lang="ts">
	import type { DocumentListItem } from './types';
	import UploadListItem from './UploadListItem.svelte';

	const { items, onRemove, onRetry, onClick } = $props<{
		items: DocumentListItem[];
		onRemove?: (event: { item: DocumentListItem }) => void;
		onRetry?: (event: { item: DocumentListItem }) => void;
		onClick?: (event: { item: DocumentListItem }) => void;
	}>();

	const statusCounts = $derived.by(() => {
		const counts = { uploading: 0, success: 0, error: 0, existing: 0 };
		for (const item of items) {
			if (item.status === 'existing') {
				counts.existing++;
			} else if (item.uploadFile) {
				const status = item.uploadFile.status;
				if (['hashing', 'uploading', 'pending'].includes(status)) counts.uploading++;
				else if (status === 'success') counts.success++;
				else if (status === 'error') counts.error++;
			}
		}
		return counts;
	});
</script>

{#if items.length > 0}
	<div class="mt-4">
		<!-- Summary Stats -->
		{#if statusCounts.uploading > 0 || statusCounts.error > 0 || statusCounts.existing > 0}
			<div class="mb-2 flex gap-4 text-sm">
				{#if statusCounts.existing > 0}
					<span class="text-gray-600 dark:text-slate-400">📄 {statusCounts.existing} existing</span>
				{/if}
				{#if statusCounts.success > 0}
					<span class="text-green-600 dark:text-green-400">✓ {statusCounts.success} uploaded</span>
				{/if}
				{#if statusCounts.uploading > 0}
					<span class="text-blue-600 dark:text-indigo-400">↻ {statusCounts.uploading} in progress</span>
				{/if}
				{#if statusCounts.error > 0}
					<span class="text-red-600 dark:text-red-400">✗ {statusCounts.error} failed</span>
				{/if}
			</div>
		{/if}

		<table class="w-full table-fixed border border-gray-300 text-left text-sm dark:border-gray-500">
			<thead
				class="border-b border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100"
			>
				<tr>
					<th class="w-12 px-4 py-2" aria-label="Actions"></th>
					<th class="px-4 py-2">Your Documents</th>
					<th class="w-32 px-4 py-2 text-center">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item (item.id)}
					<UploadListItem {item} {onRemove} {onRetry} {onClick} />
				{/each}
			</tbody>
		</table>
	</div>
{/if}