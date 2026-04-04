<!-- src/lib/components/DocumentUpload/UploadListItem.svelte -->
<script lang="ts">
	import type { DocumentListItem, UploadStatus } from './types';

	const { item, onRemove, onRetry, onClick, removingDoclinkId = null } = $props<{
		item: DocumentListItem;
		onRemove?: (event: { item: DocumentListItem }) => void;
		onRetry?: (event: { item: DocumentListItem }) => void;
		onClick?: (event: { item: DocumentListItem }) => void;
		removingDoclinkId?: string | null;
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
	const canRemoveExisting = $derived(item.status === 'existing');
	const showRemoveButton = $derived(canRemove || canRemoveExisting);
	const isRemoving = $derived(canRemoveExisting && removingDoclinkId === item.id);
	const progress = $derived(item.status === 'upload' && item.uploadFile ? item.uploadFile.progress : undefined);
	const uploadStatus = $derived(item.status === 'upload' && item.uploadFile ? item.uploadFile.status : undefined);
	const canClick = $derived(item.status === 'existing' || (item.status === 'upload' && uploadStatus === 'success'));

	function handleRowClick(e: MouseEvent) {
		// Don't trigger if clicking on remove button or retry button
		const target = e.target as HTMLElement;
		if (target.closest('button')) return;
		
		if (canClick && onClick) {
			onClick({ item });
		}
	}
</script>

<tr
	class="border-b border-gray-300 last:border-b-0 transition-all {canClick
		? 'cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-sm dark:hover:bg-indigo-900/20 dark:hover:border-indigo-600 group'
		: 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
	onclick={handleRowClick}
	role={canClick ? 'button' : undefined}
	tabindex={canClick ? 0 : undefined}
	onkeydown={(e) => {
		if (canClick && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			onClick?.({ item });
		}
	}}
	title={canClick ? 'Click to view extraction details' : undefined}
>
	<td class="px-4 py-2 text-center">
		{#if showRemoveButton}
			<button
				type="button"
				class="text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={canRemoveExisting ? `Remove ${displayName} from project` : `Remove ${displayName}`}
				disabled={(canRemoveExisting ? false : !canRemove) || isRemoving}
				onclick={(e) => {
					e.stopPropagation();
					onRemove?.({ item });
				}}
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
		{/if}
	</td>
	<td class="px-4 py-2">
		<div class="break-words">
			<div class="flex items-center gap-2">
				<span class="block font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
					{displayName}
				</span>
				{#if canClick}
					<svg
						class="h-4 w-4 text-indigo-600 dark:text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						></path>
					</svg>
				{/if}
			</div>
			{#if fileSize !== undefined}
				<span class="text-xs text-gray-500 dark:text-slate-400">
					{(fileSize / (1024 * 1024)).toFixed(2)} MB
				</span>
			{:else if item.status === 'existing'}
				<span class="text-xs text-gray-500 dark:text-slate-400">Existing document</span>
			{/if}
			{#if canClick}
				<div class="mt-1 flex items-center gap-1.5 text-xs">
					<span class="text-indigo-600 dark:text-indigo-400 font-medium">
						View extraction details
					</span>
					<svg
						class="h-3 w-3 text-indigo-600 dark:text-indigo-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						></path>
					</svg>
				</div>
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
		<div class="flex items-center justify-center gap-2">
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
						onclick={(e) => {
							e.stopPropagation();
							onRetry?.({ item });
						}}
					>
						Retry
					</button>
				</div>
			{:else if uploadStatus}
				<span class="text-blue-600 dark:text-indigo-400">{statusText(uploadStatus)}</span>
			{/if}
			{#if canClick}
				<svg
					class="h-4 w-4 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					></path>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
					></path>
				</svg>
			{/if}
		</div>
	</td>
</tr>