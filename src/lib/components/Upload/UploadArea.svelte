<!-- 
  Document Upload Component
  Features:
  - GraphQL integration for project document updates
  - S3 presigned URL uploads with SHA-256 verification
  - Drag & drop support
  - Progress tracking
  - Error handling and retry logic
-->

<script lang="ts">
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// External Dependencies
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import { TrashBinOutline } from 'flowbite-svelte-icons';
	import { onMount, onDestroy } from 'svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Internal Dependencies
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import YesNoDialog from '$lib/components/Dialog/YesNoDialog.svelte';
	import { logger } from '$lib/logging/debug';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { M_UPDATE_PROJECT } from '$lib/realtime/graphql/mutations/Project';
	import type { Project, ProjectDocument } from '$lib/types/Project';
	import { project as projectStore } from '$lib/stores/project.svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Types & Interfaces
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	interface UploadFile {
		file: File;
		uploading: boolean;
		progress: number;
		result: UploadResult | null;
		documentId?: string;
		abortController?: AbortController;
		retryCount: number;
	}

	interface UploadResult {
		success: boolean;
		message: string;
		sha256?: string;
		key?: string;
	}

	interface PresignedUrlResponse {
		url: string;
		key: string;
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Constants
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	const SUPPORTED_FILE_TYPES = '.pdf';
	const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
	const MAX_RETRY_ATTEMPTS = 3;
	const RETRY_DELAY_MS = 1000;
	const CONCURRENT_UPLOAD_LIMIT = 3;

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Props & State
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	let { idToken }: { idToken: string } = $props();

	const project: Project = $derived($projectStore)!;
	const documents = $derived(project?.documents || []);

	let fileInput: HTMLInputElement;
	let openDeleteDialog = $state(false);
	let selectedFile = $state<UploadFile | null>(null);
	let isDragging = $state(false);
	let uploadQueue = $state<File[]>([]);
	let activeUploads = $state(0);

	// Initialize files from existing documents
	let files = $state<UploadFile[]>(
		documents.map((doc: ProjectDocument) => ({
			file: new File([], doc.filename),
			uploading: false,
			progress: 100,
			result: { success: true, message: 'Existing document', sha256: doc.id },
			documentId: doc.id,
			retryCount: 0
		}))
	);

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Lifecycle
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	onMount(() => {
		// Process upload queue
		processUploadQueue();
	});

	onDestroy(() => {
		// Cancel any ongoing uploads
		files.forEach((f) => f.abortController?.abort());
	});

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// GraphQL Operations
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	async function updateProjectDocuments(updatedDocuments: ProjectDocument[]): Promise<void> {
		console.log('updateProjectDocuments', updatedDocuments);
		try {
			await gql<{ updateProject: Project }>(
				M_UPDATE_PROJECT,
				{ input: { id: project.id, documents: updatedDocuments } },
				idToken
			);
			logger('Project documents updated successfully');
		} catch (error) {
			logger('Error updating project documents:', error);
			throw new Error('Failed to update project documents. Please try again.');
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// File Validation
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	function validateFile(file: File): { valid: boolean; error?: string } {
		// Check file size
		if (file.size > MAX_FILE_SIZE) {
			return {
				valid: false,
				error: `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
			};
		}

		// Check file type
		const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
		if (!SUPPORTED_FILE_TYPES.includes(extension)) {
			return {
				valid: false,
				error: `File type "${extension}" not supported. Only PDF files are allowed.`
			};
		}

		// Check for duplicate
		const isDuplicate = files.some((f) => f.file.name === file.name && f.result?.success);
		if (isDuplicate) {
			return {
				valid: false,
				error: `File "${file.name}" has already been uploaded.`
			};
		}

		return { valid: true };
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// SHA-256 Calculation
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	async function calculateSHA256(file: File): Promise<string> {
		try {
			const arrayBuffer = await file.arrayBuffer();
			const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
		} catch (error) {
			logger('Error calculating SHA-256:', error);
			throw new Error('Failed to calculate file hash');
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// S3 Upload Operations
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	async function getPresignedUrl(
		filename: string,
		contentType: string,
		fileHash: string
	): Promise<PresignedUrlResponse> {
		const response = await fetch('/api/s3-presigned', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename, contentType, fileHash, projectId: project.id })
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to get presigned URL: ${errorText}`);
		}

		return response.json();
	}

	async function uploadToS3(
		url: string,
		file: File,
		fileIndex: number,
		abortController: AbortController
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			// Set up abort handling
			abortController.signal.addEventListener('abort', () => {
				xhr.abort();
				reject(new Error('Upload cancelled'));
			});

			xhr.open('PUT', url);
			xhr.setRequestHeader('Content-Type', file.type || 'application/pdf');

			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) {
					files[fileIndex].progress = Math.round((e.loaded / e.total) * 100);
					files = [...files];
				}
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve();
				} else {
					reject(new Error(`Upload failed with status ${xhr.status}`));
				}
			};

			xhr.onerror = () => reject(new Error('Network error during upload'));
			xhr.ontimeout = () => reject(new Error('Upload timeout'));
			xhr.timeout = 300000; // 5 minute timeout

			xhr.send(file);
		});
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Upload Management
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	async function processUploadQueue() {
		while (uploadQueue.length > 0 && activeUploads < CONCURRENT_UPLOAD_LIMIT) {
			const file = uploadQueue.shift();
			if (file) {
				activeUploads++;
				uploadFile(file).finally(() => {
					activeUploads--;
					processUploadQueue();
				});
			}
		}
	}

	async function uploadFile(file: File, retryCount = 0): Promise<void> {
		const fileObj: UploadFile = {
			file,
			uploading: true,
			progress: 0,
			result: null,
			abortController: new AbortController(),
			retryCount
		};

		files = [...files, fileObj];
		const fileIndex = files.length - 1;

		try {
			// Calculate hash
			files[fileIndex].progress = 5;
			files = [...files];
			const sha256 = await calculateSHA256(file);

			// Get presigned URL
			files[fileIndex].progress = 10;
			files = [...files];
			const { url, key } = await getPresignedUrl(file.name, file.type || 'application/pdf', sha256);

			// Upload to S3
			await uploadToS3(url, file, fileIndex, fileObj.abortController!);

		// TODO: Update project documents - needs to be re-implemented with new schema
		// The new schema doesn't have documents on Project - documents need to be managed separately
		files[fileIndex].progress = 95;
		files = [...files];

		// const updatedDocuments = [...project.documents, { id: sha256, filename: file.name }];
		// await updateProjectDocuments(updatedDocuments);

			// Mark as complete
			files[fileIndex] = {
				...files[fileIndex],
				uploading: false,
				progress: 100,
				result: { success: true, message: 'Upload successful', sha256, key },
				documentId: sha256
			};
			files = [...files];
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Upload failed';

			// Retry logic
			if (retryCount < MAX_RETRY_ATTEMPTS && !errorMessage.includes('cancelled')) {
				logger(`Retrying upload for ${file.name}, attempt ${retryCount + 1}`);
				files = files.filter((_, idx) => idx !== fileIndex);

				setTimeout(
					() => {
						uploadQueue.push(file);
						uploadFile(file, retryCount + 1);
					},
					RETRY_DELAY_MS * (retryCount + 1)
				);
			} else {
				files[fileIndex] = {
					...files[fileIndex],
					uploading: false,
					result: { success: false, message: errorMessage }
				};
				files = [...files];
			}
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// File Management
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	async function addFiles(fileList: File[]): Promise<void> {
		const validFiles: File[] = [];
		const errors: string[] = [];

		for (const file of fileList) {
			const validation = validateFile(file);
			if (validation.valid) {
				validFiles.push(file);
			} else if (validation.error) {
				errors.push(validation.error);
			}
		}

		if (errors.length > 0) {
			// You could show these errors in a toast or modal
			logger('File validation errors:', errors);
		}

		uploadQueue.push(...validFiles);
		processUploadQueue();
	}

	async function removeFile(fileToRemove: UploadFile): Promise<void> {
		try {
			// Cancel upload if in progress
			fileToRemove.abortController?.abort();

			// Remove from UI immediately
			files = files.filter((f) => f !== fileToRemove);

		// TODO: Remove document from project - needs to be re-implemented with new schema
		// The new schema doesn't have documents on Project - documents need to be managed separately
		// if (fileToRemove.documentId && fileToRemove.result?.success) {
		// 	const updatedDocuments = project.documents.filter(
		// 		(doc) => doc.id !== fileToRemove.documentId
		// 	);
		// 	await updateProjectDocuments(updatedDocuments);
		// }
		} catch (error) {
			logger('Error removing file:', error);
			// Re-add file to list if removal failed
			files = [...files, fileToRemove];
			throw error;
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Event Handlers
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	function handleFileSelect(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		if (input.files?.length) {
			addFiles(Array.from(input.files));
			input.value = ''; // Reset to allow re-selection
		}
	}

	function handleDragEnter(event: DragEvent): void {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent): void {
		event.preventDefault();
		// Only set isDragging to false if we're leaving the drop zone entirely
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX;
		const y = event.clientY;

		if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
			isDragging = false;
		}
	}

	function handleDragOver(event: DragEvent): void {
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'copy';
	}

	function handleDrop(event: DragEvent): void {
		event.preventDefault();
		isDragging = false;

		const droppedFiles = event.dataTransfer?.files;
		if (droppedFiles?.length) {
			addFiles(Array.from(droppedFiles));
		}
	}

	function handleDeleteClick(file: UploadFile): void {
		selectedFile = file;
		openDeleteDialog = true;
	}

	async function handleDeleteConfirm(): Promise<void> {
		if (selectedFile) {
			await removeFile(selectedFile);
			selectedFile = null;
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			fileInput?.click();
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Computed Properties
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	const uploadingCount = $derived(files.filter((f) => f.uploading).length);
	const successCount = $derived(files.filter((f) => f.result?.success).length);
	const errorCount = $derived(files.filter((f) => f.result && !f.result.success).length);
</script>

<!-- Upload Area -->
<div
	class="hidden cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-2 pb-4 transition-colors lg:flex
		{isDragging
		? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
		: 'border-gray-300 hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-400'}"
	role="button"
	tabindex="0"
	aria-label="Upload documents"
	onkeydown={handleKeydown}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	<input
		type="file"
		accept={SUPPORTED_FILE_TYPES}
		multiple
		class="hidden"
		bind:this={fileInput}
		onchange={handleFileSelect}
		aria-label="File input"
	/>

	<svg class="mb-4 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-4l-4-4m0 0l-4 4m4-4v12"
		/>
	</svg>

	<p class="text-lg font-medium">Upload sources</p>
	<p class="text-center text-sm">
		Drag & drop<br />or
		<button
			type="button"
			class="rounded underline hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			onclick={() => fileInput?.click()}
		>
			click
		</button>
		to upload
	</p>
	<p class="mt-2 text-xs text-gray-500">
		Supported: PDF (max {MAX_FILE_SIZE / (1024 * 1024)}MB)
	</p>

	{#if uploadingCount > 0}
		<p class="mt-2 text-xs text-blue-600">
			Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}...
		</p>
	{/if}
</div>

<!-- Files Table -->
{#if files.length > 0}
	<div class="mt-4 hidden lg:block">
		<!-- Summary Stats -->
		{#if uploadingCount > 0 || errorCount > 0}
			<div class="mb-2 flex gap-4 text-sm">
				{#if successCount > 0}
					<span class="text-green-600">✓ {successCount} uploaded</span>
				{/if}
				{#if uploadingCount > 0}
					<span class="text-blue-600">↻ {uploadingCount} uploading</span>
				{/if}
				{#if errorCount > 0}
					<span class="text-red-600">✗ {errorCount} failed</span>
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
				{#each files as file}
					<tr
						class="border-b border-gray-300 last:border-b-0 hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-gray-800/50"
					>
						<td class="px-4 py-2 text-center">
							<button
								type="button"
								class="text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
								aria-label="Remove {file.file.name}"
								disabled={file.uploading}
								onclick={() => handleDeleteClick(file)}
							>
								<TrashBinOutline class="h-5 w-5" />
							</button>
						</td>
						<td class="px-4 py-2">
							<div class="break-words">
								<span class="block font-medium">{file.file.name}</span>
								{#if file.file.size > 0}
									<span class="text-xs text-gray-500">
										{(file.file.size / (1024 * 1024)).toFixed(2)} MB
									</span>
								{/if}
							</div>
							{#if file.uploading}
								<div class="mt-1">
									<div class="flex items-center gap-2">
										<progress
											class="flex-1"
											max="100"
											value={file.progress}
											aria-label="Upload progress"
										></progress>
										<span class="text-xs text-gray-600">{file.progress}%</span>
									</div>
								</div>
							{/if}
						</td>
						<td class="px-4 py-2 text-center">
							{#if file.uploading}
								<span class="text-xs text-blue-600">Uploading...</span>
							{:else if file.result?.success}
								<span class="text-xs text-green-600">✓ Uploaded</span>
							{:else if file.result}
								<div class="text-xs text-red-600">
									<span>✗ Failed</span>
									{#if file.retryCount < MAX_RETRY_ATTEMPTS}
										<button
											type="button"
											class="ml-2 underline hover:text-red-800"
											onclick={() => {
												files = files.filter((f) => f !== file);
												uploadQueue.push(file.file);
												processUploadQueue();
											}}
										>
											Retry
										</button>
									{/if}
								</div>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<!-- Delete Confirmation Dialog -->
<YesNoDialog
	bind:open={openDeleteDialog}
	data={selectedFile}
	{idToken}
	title="Remove Document"
	message="Are you sure you want to remove '{selectedFile?.file.name}'?"
	onConfirm={handleDeleteConfirm}
/>
