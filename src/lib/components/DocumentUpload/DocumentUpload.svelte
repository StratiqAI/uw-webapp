<!-- src/lib/components/DocumentUpload/DocumentUpload.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createUploader } from './uploader.store.svelte';
	import UploadDropZone from './UploadDropZone.svelte';
	import UploadList from './UploadList.svelte';
	import { project } from '$lib/stores/appStateStore';
	import type { ProjectDocumentLink } from '@stratiqai/types';
	import type { DocumentListItem } from './types';

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
	const uploadFiles = $derived(uploader.files);

	// Get projectDocumentLinks from the project store reactively
	const projectDocumentLinks = $derived.by(() => {
		const currentProject = $project;
		if (!currentProject?.projectDocumentLinks) return [] as ProjectDocumentLink[];
		
		const links = currentProject.projectDocumentLinks;
		if (Array.isArray(links)) {
			return links;
		}
		return (links as { items: ProjectDocumentLink[] }).items || [];
	});

	// Combine upload files and existing ProjectDocumentLinks into a unified list
	const documentList = $derived.by(() => {
		const items: DocumentListItem[] = [];
		
		// Add existing ProjectDocumentLinks
		for (const link of projectDocumentLinks) {
			items.push({
				id: link.id,
				filename: link.filename,
				status: 'existing',
				documentLink: link
			});
		}
		
		// Add upload files
		for (const uploadFile of uploadFiles) {
			items.push({
				id: uploadFile.id,
				filename: uploadFile.file.name,
				size: uploadFile.file.size,
				status: 'upload',
				uploadFile: uploadFile
			});
		}
		
		return items;
	});

	// Cancel any ongoing uploads when the component is removed from the DOM
	onDestroy(() => {
		uploader.cancelAll();
	});

	function handleFilesAdded(event: { validFiles: File[] }) {
		// Prevent adding files that are already in the list (check both uploads and existing links)
		const existingFileNames = new Set([
			...uploadFiles.map((f) => f.file.name),
			...projectDocumentLinks.map((link: ProjectDocumentLink) => link.filename)
		]);
		const newFiles = event.validFiles.filter(
			(file) => !existingFileNames.has(file.name)
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
	items={documentList}
	onRemove={(e) => {
		if (e.item.status === 'upload' && e.item.uploadFile) {
			uploader.remove(e.item.uploadFile.id);
		}
		// Note: Removing existing ProjectDocumentLinks would require a mutation
		// For now, we'll only allow removing upload files
	}}
	onRetry={(e) => {
		if (e.item.status === 'upload' && e.item.uploadFile) {
			uploader.retry(e.item.uploadFile.id);
		}
	}}
/>