<!-- src/lib/components/DocumentUpload/UploadListItem.svelte -->
<script lang="ts">
	import type { DocumentListItem, UploadStatus } from './types';
	import { TrashBinOutline } from 'flowbite-svelte-icons';

	const { item, onRemove, onRetry } = $props<{
		item: DocumentListItem;
		onRemove?: (event: { item: DocumentListItem }) => void;
		onRetry?: (event: { item: DocumentListItem }) => void;
	}>();

	const statusText = (status: UploadStatus) => {
		const map: Record<UploadStatus, string> = {
			pending: 'Pending...',
			hashing: 'Hashing...',
			uploading: 'Uploading...',
			success: '✓ Uploaded',
			error: '✗ Failed'
		};
		return map[status];
	};

	const displayName = $derived(item.filename);
	const fileSize = $derived(item.size);
	const isUploading = $derived(item.status === 'upload' && item.uploadFile && ['hashing', 'uploading', 'pending'].includes(item.uploadFile.status));
	const canRemove = $derived(item.status === 'upload' && item.uploadFile && !['uploading', 'hashing'].includes(item.uploadFile.status));
	const progress = $derived(item.status === 'upload' && item.uploadFile ? item.uploadFile.progress : undefined);
	const uploadStatus = $derived(item.status === 'upload' && item.uploadFile ? item.uploadFile.status : undefined);
</script>

<tr
	class="border-b border-gray-300 last:border-b-0 hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-gray-800/50"
>
	<td class="px-4 py-2 text-center">
		{#if canRemove}
			<button
				type="button"
				class="text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label="Remove {displayName}"
				disabled={!canRemove}
				onclick={() => onRemove?.({ item })}
			>
				<TrashBinOutline class="h-5 w-5" />
			</button>
		{:else if item.status === 'existing'}
			<!-- Existing documents don't have remove button for now -->
			<span class="text-gray-400 dark:text-slate-500">—</span>
		{/if}
	</td>
	<td class="px-4 py-2">
		<div class="break-words">
			<span class="block font-medium text-gray-900 dark:text-white">{displayName}</span>
			{#if fileSize !== undefined}
				<span class="text-xs text-gray-500 dark:text-slate-400">
					{(fileSize / (1024 * 1024)).toFixed(2)} MB
				</span>
			{:else if item.status === 'existing'}
				<span class="text-xs text-gray-500 dark:text-slate-400">Existing document</span>
			{/if}
		</div>
		{#if progress !== undefined && uploadStatus !== 'success' && uploadStatus !== 'error'}
			<div class="mt-1">
				<div class="flex items-center gap-2">
					<progress class="flex-1" max="100" value={progress} aria-label="Upload progress"
					></progress>
					<span class="text-xs text-gray-600 dark:text-slate-400">{progress}%</span>
				</div>
			</div>
		{/if}
	</td>
	<td class="px-4 py-2 text-center text-xs">
		{#if item.status === 'existing'}
			<span class="text-gray-600 dark:text-slate-400">✓ Existing</span>
		{:else if uploadStatus === 'success'}
			<span class="text-green-600 dark:text-green-400">{statusText(uploadStatus)}</span>
		{:else if uploadStatus === 'error'}
			<div class="text-red-600 dark:text-red-400" title={item.uploadFile?.result?.message}>
				<span>{statusText(uploadStatus)}</span>
				<button
					type="button"
					class="ml-2 underline hover:text-red-800 dark:hover:text-red-300"
					onclick={() => onRetry?.({ item })}
				>
					Retry
				</button>
			</div>
		{:else if uploadStatus}
			<span class="text-blue-600 dark:text-indigo-400">{statusText(uploadStatus)}</span>
		{/if}
	</td>
</tr>