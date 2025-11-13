<!-- src/lib/components/DocumentUpload/UploadList.svelte -->
<script lang="ts">
	import type { UploadFile } from './types';
	import UploadListItem from './UploadListItem.svelte';

	const { files, onRemove, onRetry } = $props<{
		files: UploadFile[];
		onRemove?: (event: { fileId: string }) => void;
		onRetry?: (event: { fileId: string }) => void;
	}>();

	const statusCounts = $derived.by(() => {
		const counts = { uploading: 0, success: 0, error: 0 };
		for (const file of files) {
			if (['hashing', 'uploading', 'pending'].includes(file.status)) counts.uploading++;
			else if (file.status === 'success') counts.success++;
			else if (file.status === 'error') counts.error++;
		}
		return counts;
	});
</script>

{#if files.length > 0}
	<div class="mt-4">
		<!-- Summary Stats -->
		{#if statusCounts.uploading > 0 || statusCounts.error > 0}
			<div class="mb-2 flex gap-4 text-sm">
				{#if statusCounts.success > 0}
					<span class="text-green-600">✓ {statusCounts.success} uploaded</span>
				{/if}
				{#if statusCounts.uploading > 0}
					<span class="text-blue-600">↻ {statusCounts.uploading} in progress</span>
				{/if}
				{#if statusCounts.error > 0}
					<span class="text-red-600">✗ {statusCounts.error} failed</span>
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
				{#each files as file (file.id)}
					<UploadListItem {file} {onRemove} {onRetry} />
				{/each}
			</tbody>
		</table>
	</div>
{/if}