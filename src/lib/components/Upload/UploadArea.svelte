<!-- 
  Document Upload Component
  Features:
  - Abstraction of upload logic into a custom store for better separation of concerns
  - S3 presigned URL uploads with SHA-256 verification
  - Drag & drop support
  - Progress tracking with defined steps
  - Enhanced error handling, user feedback, and unified retry logic
-->

<script lang="ts">
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// External Dependencies
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import { TrashBinOutline } from 'flowbite-svelte-icons';
	import { createEventDispatcher, onDestroy } from 'svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Internal Dependencies
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import { logger } from '$lib/logging/debug';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Types & Interfaces
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	type UploadStatus = 'pending' | 'hashing' | 'uploading' | 'success' | 'error';

	interface UploadFile {
		id: string; // Unique ID for the file instance (e.g., timestamp + name)
		file: File;
		status: UploadStatus;
		progress: number;
		result: UploadResult | null;
		abortController: AbortController;
		retryCount: number;
	}

	interface UploadResult {
		success: boolean;
		message: string;
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
	const LOG_PREFIX = '[DocumentUpload]';

	// Progress constants for clarity
	const PROGRESS_PENDING = 0;
	const PROGRESS_HASHING = 5;
	const PROGRESS_GETTING_URL = 10;
	const PROGRESS_UPLOADING_MAX = 95;
	const PROGRESS_COMPLETE = 100;

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Props & Component State
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	const dispatch = createEventDispatcher<{ error: string[] }>();

	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Uploader Store - Encapsulates all upload logic
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	function createUploader() {
		let files = $state<UploadFile[]>([]);
		let uploadQueue = $state<UploadFile[]>([]);
		let activeUploads = $state(0);

		// Helper to update a file and trigger reactivity
		function updateFile(fileId: string, updates: Partial<UploadFile>) {
			files = files.map((f) => (f.id === fileId ? { ...f, ...updates } : f));
		}

		function addFilesToQueue(fileList: File[]) {
			const newUploads: UploadFile[] = fileList.map((file) => ({
				id: `${file.name}-${Date.now()}`,
				file,
				status: 'pending',
				progress: PROGRESS_PENDING,
				result: null,
				abortController: new AbortController(),
				retryCount: 0
			}));

			files.push(...newUploads);
			uploadQueue.push(...newUploads);
			processQueue();
		}

		function processQueue() {
			while (uploadQueue.length > 0 && activeUploads < CONCURRENT_UPLOAD_LIMIT) {
				const fileToUpload = uploadQueue.shift();
				if (fileToUpload) {
					activeUploads++;
					uploadFile(fileToUpload).finally(() => {
						activeUploads--;
						processQueue();
					});
				}
			}
		}

		async function removeFile(fileToRemove: UploadFile) {
			logger(`${LOG_PREFIX} Removing file: ${fileToRemove.file.name}`);
			// Abort ongoing upload
			if (fileToRemove.status === 'uploading' || fileToRemove.status === 'hashing') {
				fileToRemove.abortController.abort();
			}

			// Remove from local state
			files = files.filter((f) => f.id !== fileToRemove.id);
		}

		function retryUpload(fileToRetry: UploadFile) {
			logger(`${LOG_PREFIX} Retrying upload for: ${fileToRetry.file.name}`);
			// Reset state for retry
			const newAbortController = new AbortController();
			updateFile(fileToRetry.id, {
				status: 'pending',
				progress: PROGRESS_PENDING,
				result: null,
				retryCount: 0,
				abortController: newAbortController
			});

			// Get the updated file object
			const updatedFile = files.find((f) => f.id === fileToRetry.id);
			if (updatedFile) {
				// Add to front of the queue for immediate processing
				uploadQueue.unshift(updatedFile);
				processQueue();
			}
		}

		// Public interface of the store
		return {
			get files() {
				return files;
			},
			add: addFilesToQueue,
			remove: removeFile,
			retry: retryUpload,
			updateFile,
			cancelAll: () => {
				files.forEach((f) => {
					if (f.status === 'uploading' || f.status === 'hashing') {
						f.abortController.abort();
					}
				});
				uploadQueue.length = 0; // Clear the queue
			}
		};
	}

	const uploader = createUploader();

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Lifecycle
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	onDestroy(() => {
		logger(`${LOG_PREFIX} Component destroying. Cancelling all uploads.`);
		uploader.cancelAll();
	});

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Upload Pipeline
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	async function uploadFile(upload: UploadFile): Promise<void> {
		try {
			// Step 1: Hashing
			uploader.updateFile(upload.id, { status: 'hashing', progress: PROGRESS_HASHING });
			const sha256 = await calculateSHA256(upload.file);

			// Step 2: Get Presigned URL
			uploader.updateFile(upload.id, { progress: PROGRESS_GETTING_URL });
			const { url } = await getPresignedUrl(
				upload.file.name,
				upload.file.type || 'application/pdf',
				sha256
			);

			// Step 3: Upload to S3
			uploader.updateFile(upload.id, { status: 'uploading' });
			await uploadToS3(url, upload);

			// Step 4: Success
			uploader.updateFile(upload.id, {
				status: 'success',
				progress: PROGRESS_COMPLETE,
				result: { success: true, message: 'Upload successful' }
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			if (errorMessage.includes('cancelled')) {
				logger(`${LOG_PREFIX} Upload cancelled for ${upload.file.name}.`);
				// This will be handled by the removeFile function which triggered the abort
				return;
			}

			// Handle retries for network/server errors
			if (upload.retryCount < MAX_RETRY_ATTEMPTS) {
				const newRetryCount = upload.retryCount + 1;
				uploader.updateFile(upload.id, { retryCount: newRetryCount });
				logger(
					`${LOG_PREFIX} Upload failed for ${upload.file.name}. Retrying attempt ${newRetryCount}...`
				);
				// Get the updated upload object
				const updatedUpload = uploader.files.find((f) => f.id === upload.id);
				if (updatedUpload) {
					setTimeout(() => uploadFile(updatedUpload), RETRY_DELAY_MS * newRetryCount);
				}
			} else {
				uploader.updateFile(upload.id, {
					status: 'error',
					result: { success: false, message: errorMessage }
				});
				logger(
					`${LOG_PREFIX} Upload failed for ${upload.file.name} after all retries: ${errorMessage}`
				);
			}
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// API & Helper Functions
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

	async function getPresignedUrl(
		filename: string,
		contentType: string,
		fileHash: string
	): Promise<PresignedUrlResponse> {
		const response = await fetch('/api/s3-presigned', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename, contentType, fileHash })
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Could not get upload URL: ${errorText}`);
		}

		return response.json();
	}

	function uploadToS3(url: string, upload: UploadFile): Promise<void> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			const { signal } = upload.abortController;

			logger('Starting S3 upload:', { url, fileName: upload.file.name, fileSize: upload.file.size });

			signal.addEventListener('abort', () => {
				xhr.abort();
				logger('Upload aborted by user:', upload.file.name);
				reject(new Error('Upload cancelled by user'));
			});

		xhr.open('PUT', url);
		xhr.setRequestHeader('Content-Type', upload.file.type || 'application/pdf');
		// xhr.setRequestHeader('x-amz-acl', 'bucket-owner-full-control');

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) {
				const uploadedPercentage = e.loaded / e.total;
				const newProgress = Math.round(
					PROGRESS_GETTING_URL +
						(PROGRESS_UPLOADING_MAX - PROGRESS_GETTING_URL) * uploadedPercentage
				);
				uploader.updateFile(upload.id, { progress: newProgress });
				logger(
					`Upload progress (${upload.file.name}):`,
					`${newProgress}% (${e.loaded}/${e.total} bytes)`
				);
			}
		};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					logger('Upload successful:', upload.file.name, `Status ${xhr.status}`);
					resolve();
				} else {
					logger('Upload failed:', upload.file.name, `Status ${xhr.status}`, xhr.responseText);
					reject(new Error(`Upload failed with status ${xhr.status}`));
				}
			};
			xhr.onerror = () => {
				logger('Network error during upload:', upload.file.name);
				reject(new Error('Network error during upload'));
			};
			xhr.ontimeout = () => {
				logger('Upload timed out:', upload.file.name);
				reject(new Error('Upload timed out'));
			};
			xhr.timeout = 300000; // 5 minute timeout

			xhr.send(upload.file);
			logger('Upload request sent:', upload.file.name);
		});
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// File Validation & Event Handlers
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	function handleAddFiles(incomingFiles: FileList | null): void {
		if (!incomingFiles) return;

		const filesToValidate = Array.from(incomingFiles);
		const validFiles: File[] = [];
		const errors: string[] = [];
		const existingFileNames = uploader.files.map((f) => f.file.name);

		for (const file of filesToValidate) {
			if (file.size > MAX_FILE_SIZE) {
				errors.push(`"${file.name}" is too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB).`);
			} else if (!file.name.toLowerCase().endsWith('.pdf')) {
				errors.push(`"${file.name}" is not a supported PDF file.`);
			} else if (existingFileNames.includes(file.name)) {
				errors.push(`"${file.name}" has already been added.`);
			} else {
				validFiles.push(file);
			}
		}

		if (errors.length > 0) {
			dispatch('error', errors);
		}

		if (validFiles.length > 0) {
			uploader.add(validFiles);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		handleAddFiles(event.dataTransfer?.files ?? null);
	}

	function handleFileSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		handleAddFiles(input.files);
		input.value = ''; // Reset to allow re-selection of the same file
	}

	function handleDeleteClick(file: UploadFile) {
		uploader.remove(file);
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			fileInput?.click();
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// UI Computed Properties
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	const statusCounts = $derived.by(() => {
		const counts = { uploading: 0, success: 0, error: 0 };
		for (const file of uploader.files) {
			if (['hashing', 'uploading', 'pending'].includes(file.status))
				counts.uploading++;
			else if (file.status === 'success') counts.success++;
			else if (file.status === 'error') counts.error++;
		}
		return counts;
	});

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
	ondragenter={() => (isDragging = true)}
	ondragleave={() => (isDragging = false)}
	ondragover={(e) => e.preventDefault()}
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

	{#if statusCounts.uploading > 0}
		<p class="mt-2 text-xs text-blue-600">
			Uploading {statusCounts.uploading} file{statusCounts.uploading > 1 ? 's' : ''}...
		</p>
	{/if}
</div>

<!-- Files Table -->
{#if uploader.files.length > 0}
	<div class="mt-4 hidden lg:block">
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
				{#each uploader.files as file (file.id)}
					<tr
						class="border-b border-gray-300 last:border-b-0 hover:bg-gray-50 dark:border-gray-500 dark:hover:bg-gray-800/50"
					>
						<td class="px-4 py-2 text-center">
							<button
								type="button"
								class="text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
								aria-label="Remove {file.file.name}"
								disabled={file.status === 'uploading' || file.status === 'hashing'}
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
							{#if file.status !== 'success' && file.status !== 'error'}
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
						<td class="px-4 py-2 text-center text-xs">
							{#if file.status === 'success'}
								<span class="text-green-600">{statusText(file.status)}</span>
							{:else if file.status === 'error'}
								<div class="text-red-600" title={file.result?.message}>
									<span>{statusText(file.status)}</span>
									<button
										type="button"
										class="ml-2 underline hover:text-red-800"
										onclick={() => uploader.retry(file)}
									>
										Retry
									</button>
								</div>
							{:else}
								<span class="text-blue-600">{statusText(file.status)}</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}