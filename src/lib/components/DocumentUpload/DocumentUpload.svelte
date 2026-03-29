<!-- src/lib/components/DocumentUpload/DocumentUpload.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createUploader } from './uploader.store.svelte';
	import UploadDropZone from './UploadDropZone.svelte';
	import UploadList from './UploadList.svelte';
	import DocumentProcessingModal from '../DocumentProcessing/DocumentProcessingModal.svelte';
	import { store } from '$lib/realtime/websocket/projectSync';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { print } from 'graphql';
	import { M_DELETE_DOCLINK } from '@stratiqai/types-simple';
	import type { Project, Doclink } from '@stratiqai/types-simple';
	import type { DocumentListItem } from './types';

	import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from './constants';

	const { idToken, projectId, metadata, onDoclinkRemoved } = $props<{
		idToken: string | null;
		projectId: string | null;
		metadata?: import('./types').FileMetadata | null;
		onDoclinkRemoved?: (projectId: string) => void | Promise<void>;
	}>();

	// The uploader store manages all state and logic (token/project/metadata synced in $effect below)
	// svelte-ignore state_referenced_locally
	const uploader = createUploader(idToken, projectId, metadata ?? null);
	
	// Update uploader metadata when it changes reactively
	// Only update if the values actually changed to prevent infinite loops
	let lastMetadata = $state<typeof metadata>(null);
	$effect(() => {
		if (!uploader.updateMetadata) return;
		
		// Compare values, not references
		const current = metadata ?? null;
		const last = lastMetadata;
		
		if (
			current?.tenantId !== last?.tenantId ||
			current?.ownerId !== last?.ownerId ||
			current?.parentId !== last?.parentId
		) {
			uploader.updateMetadata(current);
			lastMetadata = current;
		}
	});
	
	// Update uploader token when it changes reactively
	let lastToken = $state<typeof idToken>(null);
	$effect(() => {
		if (!uploader.updateToken) return;
		
		if (idToken !== lastToken) {
			uploader.updateToken(idToken);
			lastToken = idToken;
		}
	});

	// Make files reactive so the list updates when files are added
	const uploadFiles = $derived(uploader.files);

	// Get doclinks from the store for the current project
	// Use store.at() to directly access the project instead of getAllAtArray
	// which creates new arrays and can cause infinite loops
	const doclinks = $derived.by(() => {
		if (!projectId) return [] as Doclink[];
		
		// Directly access the project at the specific path
		const currentProject = store.at<Project>(`projects/${projectId}`);
		if (!currentProject) return [] as Doclink[];
		
		// Extract doclinks from project (supports connection or array formats)
		const links = (currentProject as any)?.doclinks;
		if (!links) return [] as Doclink[];
		
		if (Array.isArray(links)) {
			return links as Doclink[];
		}
		return (links.items || []) as Doclink[];
	});

	// One row per documentId (prefer primary Doclink with linkType NONE)
	type DoclinkWithLinkType = Doclink & { linkType?: string };
	const doclinksByDocument = $derived.by(() => {
		const byDoc = new Map<string, Doclink>();
		for (const link of doclinks as DoclinkWithLinkType[]) {
			if (!link.documentId) continue;
			const existing = byDoc.get(link.documentId);
			if (!existing || link.linkType === 'NONE') byDoc.set(link.documentId, link);
		}
		return Array.from(byDoc.values());
	});

	// Combine upload files and existing doclinks into a unified list
	const documentList = $derived.by(() => {
		const items: DocumentListItem[] = [];
		
		// Add existing doclinks (one per document)
		for (const link of doclinksByDocument) {
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
			...doclinksByDocument.map((link: Doclink) => link.filename)
		]);
		const newFiles = event.validFiles.filter(
			(file) => !existingFileNames.has(file.name)
		);
		
		uploader.add(newFiles);
	}

	function handleError(event: { errors: string[] }) {
		// Error handling - could be extended to show toast notifications
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

	// State for removing existing doclink (loading + error)
	let removingDoclinkId = $state<string | null>(null);
	let removeError = $state<string | null>(null);

	async function handleRemove(event: { item: DocumentListItem }) {
		const item = event.item;
		if (item.status === 'upload' && item.uploadFile) {
			uploader.remove(item.uploadFile.id);
			return;
		}
		if (item.status === 'existing' && item.documentLink && projectId && idToken) {
			removeError = null;
			removingDoclinkId = item.documentLink.id;
			try {
				await gql(
					print(M_DELETE_DOCLINK),
					{
						key: {
							id: item.documentLink.id,
							parentId: item.documentLink.parentId
						}
					},
					idToken
				);
				await onDoclinkRemoved?.(projectId);
			} catch (err) {
				removeError = err instanceof Error ? err.message : 'Could not remove document';
			} finally {
				removingDoclinkId = null;
			}
		}
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

{#if removeError}
	<p class="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{removeError}</p>
{/if}
<UploadList
	items={documentList}
	onRemove={handleRemove}
	removingDoclinkId={removingDoclinkId}
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