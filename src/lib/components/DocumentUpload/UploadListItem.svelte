<!-- src/lib/components/DocumentUpload/UploadListItem.svelte -->
<script lang="ts">
	import type { UploadFile, UploadStatus } from './types';
	import { TrashBinOutline } from 'flowbite-svelte-icons';

	const { file, onRemove, onRetry } = $props<{
		file: UploadFile;
		onRemove?: (event: { fileId: string }) => void;
		onRetry?: (event: { fileId: string }) => void;
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
</script>

<tr
	class="border-b border-gray-300 last:border-b-0 hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-gray-800/50"
>
	<td class="px-4 py-2 text-center">
		<button
			type="button"
			class="text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="Remove {file.file.name}"
			disabled={file.status === 'uploading' || file.status === 'hashing'}
			onclick={() => onRemove?.({ fileId: file.id })}
		>
			<TrashBinOutline class="h-5 w-5" />
		</button>
	</td>
	<td class="px-4 py-2">
		<div class="break-words">
			<span class="block font-medium">{file.file.name}</span>
			<span class="text-xs text-gray-500">
				{(file.file.size / (1024 * 1024)).toFixed(2)} MB
			</span>
		</div>
		{#if file.status !== 'success' && file.status !== 'error'}
			<div class="mt-1">
				<div class="flex items-center gap-2">
					<progress class="flex-1" max="100" value={file.progress} aria-label="Upload progress"
					></progress>
					<span class="text-xs text-gray-600">{file.progress}%</span>
				</div>
			</div>
		{/if}
	</td>
	<td class="px-4 py-2 text-center text-xs">
		{#if file.status === 'success'}
			<span class="text-green-600">{statusText(file.status)}</span>
		{:else if file.status === 'error'}
			<div class="text-red-600" title={file.result?.message}>
				<span>{statusText(file.status)}</span>
				<button
					type="button"
					class="ml-2 underline hover:text-red-800"
					onclick={() => onRetry?.({ fileId: file.id })}
				>
					Retry
				</button>
			</div>
		{:else}
			<span class="text-blue-600">{statusText(file.status)}</span>
		{/if}
	</td>
</tr>