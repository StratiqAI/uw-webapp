<!-- src/lib/components/DocumentUpload/DocumentUpload.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createUploader } from './uploader.svelte';
	import UploadDropZone from './UploadDropZone.svelte';
	import UploadList from './UploadList.svelte';
	import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from './constants';
	import type {
		DocumentUploadProps,
		DocumentListItem,
		ExistingDocument
	} from './types';

	const {
		idToken,
		projectId,
		metadata,
		existingDocuments = [],
		onDeleteDocument,
		onDocumentClick,
		onUploadComplete,
		onError,
		presignedUrlEndpoint,
		logger,
		config
	}: DocumentUploadProps = $props();

	const acceptedFileTypes = config?.supportedFileTypes ?? SUPPORTED_FILE_TYPES;
	const maxFileSize = config?.maxFileSize ?? MAX_FILE_SIZE;

	// svelte-ignore state_referenced_locally
	const uploader = createUploader({
		idToken,
		projectId,
		metadata: metadata ?? null,
		logger,
		presignedUrlEndpoint,
		onUploadComplete
	});

	// Sync metadata reactively
	let lastMetadata = $state<typeof metadata>(null);
	$effect(() => {
		const current = metadata ?? null;
		const last = lastMetadata;

		if (
			current?.tenantId !== last?.tenantId ||
			current?.ownerId !== last?.ownerId ||
			current?.parentId !== last?.parentId
		) {
			uploader.updateMetadata(current!);
			lastMetadata = current;
		}
	});

	// Sync token reactively
	let lastToken = $state<typeof idToken>(null);
	$effect(() => {
		if (idToken !== lastToken) {
			uploader.updateToken(idToken);
			lastToken = idToken;
		}
	});

	const uploadFiles = $derived(uploader.files);

	// Combine existing documents (from host) with in-flight uploads
	const documentList = $derived.by(() => {
		const items: DocumentListItem[] = [];

		for (const doc of existingDocuments) {
			items.push({
				id: doc.id,
				filename: doc.filename,
				status: 'existing',
				documentLink: doc
			});
		}

		for (const uploadFile of uploadFiles) {
			items.push({
				id: uploadFile.id,
				filename: uploadFile.file.name,
				size: uploadFile.file.size,
				status: 'upload',
				uploadFile
			});
		}

		return items;
	});

	onDestroy(() => {
		uploader.cancelAll();
	});

	function handleFilesAdded(event: { validFiles: File[] }) {
		const existingFileNames = new Set([
			...uploadFiles.map((f) => f.file.name),
			...existingDocuments.map((doc: ExistingDocument) => doc.filename)
		]);
		const newFiles = event.validFiles.filter((file) => !existingFileNames.has(file.name));
		uploader.add(newFiles);
	}

	function handleError(event: { errors: string[] }) {
		onError?.(event.errors);
	}

	// State for removing an existing document (loading + error)
	let removingDocId = $state<string | null>(null);
	let removeError = $state<string | null>(null);

	async function handleRemove(event: { item: DocumentListItem }) {
		const item = event.item;

		if (item.status === 'upload' && item.uploadFile) {
			uploader.remove(item.uploadFile.id);
			return;
		}

		if (item.status === 'existing' && item.documentLink && onDeleteDocument) {
			removeError = null;
			removingDocId = item.documentLink.id;
			try {
				await onDeleteDocument(item.documentLink);
			} catch (err) {
				removeError = err instanceof Error ? err.message : 'Could not remove document';
			} finally {
				removingDocId = null;
			}
		}
	}

	function handleDocumentClick(event: { item: DocumentListItem }) {
		onDocumentClick?.(event.item);
	}
</script>

<UploadDropZone
	{acceptedFileTypes}
	{maxFileSize}
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
	removingDoclinkId={removingDocId}
	onRetry={(e) => {
		if (e.item.status === 'upload' && e.item.uploadFile) {
			uploader.retry(e.item.uploadFile.id);
		}
	}}
	onClick={handleDocumentClick}
/>
