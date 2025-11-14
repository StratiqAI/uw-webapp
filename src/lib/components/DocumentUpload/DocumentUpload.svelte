<!-- src/lib/components/DocumentUpload/DocumentUpload.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createUploader } from './uploader.store.svelte';
	import UploadDropZone from './UploadDropZone.svelte';
	import UploadList from './UploadList.svelte';

	import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from './constants';

	const { idToken, projectId, metadata } = $props<{
		idToken: string | null;
		projectId: string | null;
		metadata?: import('./types').FileMetadata | null;
	}>();

	// The uploader store manages all state and logic
	const uploader = createUploader(idToken, projectId, metadata ?? null);
	
	// Update uploader metadata when it changes reactively
	$effect(() => {
		if (metadata && uploader.updateMetadata) {
			uploader.updateMetadata(metadata);
		}
	});
	
	// Make files reactive so the list updates when files are added
	const files = $derived(uploader.files);

	// Cancel any ongoing uploads when the component is removed from the DOM
	onDestroy(() => {
		uploader.cancelAll();
	});

	function handleFilesAdded(event: { validFiles: File[] }) {
		// Prevent adding files that are already in the list
		const existingFileNames = files.map((f) => f.file.name);
		const newFiles = event.validFiles.filter(
			(file) => !existingFileNames.includes(file.name)
		);
		uploader.add(newFiles);
	}

	function handleError(event: { errors: string[] }) {
		// Here you would typically show a toast notification or an alert
		// For now, we'll just log them.
		console.error('Validation errors:', event.errors);
	}
</script>

<UploadDropZone 
    acceptedFileTypes={SUPPORTED_FILE_TYPES} 
    maxFileSize={MAX_FILE_SIZE}
    onFilesAdded={handleFilesAdded} 
    onError={handleError}
>
	{#if uploader.activeUploads > 0}
		<p class="mt-2 text-xs text-blue-600">
			Uploading {uploader.activeUploads} file{uploader.activeUploads > 1 ? 's' : ''}...
		</p>
	{/if}
</UploadDropZone>

<UploadList
	files={files}
	onRemove={(e) => uploader.remove(e.fileId)}
	onRetry={(e) => uploader.retry(e.fileId)}
/>