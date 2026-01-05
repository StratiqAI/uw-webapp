<!-- src/lib/components/DocumentUpload/DocumentUpload.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createUploader } from './uploader.store.svelte';
	import UploadDropZone from './UploadDropZone.svelte';
	import UploadList from './UploadList.svelte';
	import DocumentProcessingModal from '../DocumentProcessing/DocumentProcessingModal.svelte';
	import { project } from '$lib/stores/appStateStore';
	import type { ProjectDocumentLink } from '$lib/types/Project';
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
	
	// Update uploader token when it changes reactively
	$effect(() => {
		if (uploader.updateToken) {
			uploader.updateToken(idToken);
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

	// Modal state
	let selectedDocument = $state<{
		documentId: string;
		projectId: string;
		filename: string;
	} | null>(null);
	let isModalOpen = $derived(selectedDocument !== null);

	function handleDocumentClick(event: { item: DocumentListItem }) {
		const item = event.item;
		
		// Get document ID and project ID
		let documentId: string | null = null;
		const currentProjectId = projectId;
		
		if (item.status === 'existing' && item.documentLink) {
			// For existing documents, use the document link ID
			// Note: This might need adjustment based on your data structure
			documentId = item.documentLink.id;
		} else if (item.status === 'upload' && item.uploadFile?.result?.success) {
			// For uploaded files, we need to get the document ID from the upload result
			// This might need to be stored in the upload result or fetched
			// For now, use a placeholder - in production, this would come from the upload response
			documentId = `doc-${item.id}`;
		}

		if (documentId && currentProjectId) {
			selectedDocument = {
				documentId,
				projectId: currentProjectId,
				filename: item.filename
			};
		}
	}

	function handleModalClose() {
		selectedDocument = null;
	}
</script>

<UploadDropZone 
    acceptedFileTypes={SUPPORTED_FILE_TYPES} 
    maxFileSize={MAX_FILE_SIZE}
    onFilesAdded={handleFilesAdded} 
    onError={handleError}
>
	{#if uploader.activeUploads > 0}
		<p class="mt-2 text-xs text-blue-600 dark:text-indigo-400">
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
	onClick={handleDocumentClick}
/>

{#if selectedDocument}
	<DocumentProcessingModal
		documentId={selectedDocument.documentId}
		projectId={selectedDocument.projectId}
		filename={selectedDocument.filename}
		isOpen={isModalOpen}
		onClose={handleModalClose}
	/>
{/if}