// src/lib/components/DocumentUpload/uploader.store.svelte.ts

import {
	MAX_RETRY_ATTEMPTS,
	RETRY_DELAY_MS,
	CONCURRENT_UPLOAD_LIMIT,
	PROGRESS_PENDING,
	PROGRESS_HASHING,
	PROGRESS_GETTING_URL,
	PROGRESS_UPLOADING_MAX,
	PROGRESS_COMPLETE
} from './constants';
import type { UploadFile, PresignedUrlResponse, FileMetadata } from './types';

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Uploader Store - Encapsulates all upload logic
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
export function createUploader(
	idToken: string | null = null,
	projectId: string | null = null,
	metadata: FileMetadata | null = null
) {
	let files = $state<UploadFile[]>([]);
	let uploadQueue: UploadFile[] = [];
	let activeUploads = $state(0);
	let token = $state(idToken);
	let project = $state(projectId);
	let fileMetadata = $state(metadata);

	function updateFile(fileId: string, updates: Partial<UploadFile>) {
		files = files.map((f) => (f.id === fileId ? { ...f, ...updates } : f));
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

	async function uploadFile(upload: UploadFile): Promise<void> {
		try {
			updateFile(upload.id, { status: 'hashing', progress: PROGRESS_HASHING });
			const sha256 = await calculateSHA256(upload.file);

			updateFile(upload.id, { progress: PROGRESS_GETTING_URL });
			
			// Capture metadata at the time of presigned URL request
			// This ensures metadata is included in the presigned URL signature
			const metadataAtRequestTime = fileMetadata;
			
			if (!metadataAtRequestTime) {
				throw new Error('Metadata is required for upload but was not available');
			}
			
			const { url, key } = await getPresignedUrl(
				upload.file.name,
				upload.file.type,
				sha256,
				token,
				project,
				metadataAtRequestTime
			);

			updateFile(upload.id, { status: 'uploading' });
			// IMPORTANT: Only send metadata headers if metadata was included in the presigned URL
			// Using metadataAtRequestTime ensures headers match what was signed
			await uploadToS3(url, upload, metadataAtRequestTime, (progress) => {
				const newProgress = Math.round(
					PROGRESS_GETTING_URL + (PROGRESS_UPLOADING_MAX - PROGRESS_GETTING_URL) * progress
				);
				updateFile(upload.id, { progress: newProgress });
			});

			updateFile(upload.id, {
				status: 'success',
				progress: PROGRESS_COMPLETE,
				result: { success: true, message: 'Upload successful' }
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			if (errorMessage.includes('cancelled')) {
				return;
			}

			const currentRetryCount = upload.retryCount;
			if (currentRetryCount < MAX_RETRY_ATTEMPTS) {
				const newRetryCount = currentRetryCount + 1;
				updateFile(upload.id, { retryCount: newRetryCount });
				
				// Get the updated file from the array to ensure we have the latest retryCount
				const updatedFile = files.find((f) => f.id === upload.id);
				if (updatedFile) {
					setTimeout(() => uploadFile(updatedFile), RETRY_DELAY_MS * newRetryCount);
				} else {
					updateFile(upload.id, {
						status: 'error',
						result: { success: false, message: 'File not found for retry' }
					});
				}
			} else {
				updateFile(upload.id, {
					status: 'error',
					result: { success: false, message: errorMessage }
				});
			}
		}
	}

	// Public interface of the store
	return {
		get files() {
			return files;
		},
		get activeUploads() {
			return activeUploads;
		},
		updateMetadata: (newMetadata: FileMetadata) => {
			fileMetadata = newMetadata;
		},
		add: (filesToAdd: File[]) => {
			const newUploads: UploadFile[] = filesToAdd.map((file) => ({
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
		},
		remove: (fileId: string) => {
			const fileToRemove = files.find((f) => f.id === fileId);
			if (!fileToRemove) return;

			if (['uploading', 'hashing'].includes(fileToRemove.status)) {
				fileToRemove.abortController.abort();
			}
			files = files.filter((f) => f.id !== fileId);
			uploadQueue = uploadQueue.filter((f) => f.id !== fileId);
		},
		retry: (fileId: string) => {
			const fileToRetry = files.find((f) => f.id === fileId);
			if (!fileToRetry) return;

			updateFile(fileId, {
				status: 'pending',
				progress: PROGRESS_PENDING,
				result: null,
				retryCount: 0,
				abortController: new AbortController()
			});
			uploadQueue.unshift(fileToRetry); // Prioritize retry
			processQueue();
		},
		cancelAll: () => {
			files.forEach((f) => {
				if (['uploading', 'hashing', 'pending'].includes(f.status)) {
					f.abortController.abort();
				}
			});
			uploadQueue = []; // Clear the queue
		}
	};
}

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// API & Helper Functions
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
async function calculateSHA256(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getPresignedUrl(
	filename: string,
	contentType: string,
	fileHash: string,
	idToken: string | null,
	projectId: string | null,
	metadata: FileMetadata | null
): Promise<PresignedUrlResponse> {
	const headers: HeadersInit = { 'Content-Type': 'application/json' };
	if (idToken) {
		headers['Authorization'] = `Bearer ${idToken}`;
	}
	
	if (!projectId) {
		throw new Error('Project ID is required for upload');
	}
	
	const requestBody: {
		filename: string;
		contentType: string;
		fileHash: string;
		projectId: string;
		metadata?: FileMetadata;
	} = { filename, contentType, fileHash, projectId };
	
	if (metadata) {
		requestBody.metadata = metadata;
	}
	
	const response = await fetch('/api/s3-presigned', {
		method: 'POST',
		headers,
		body: JSON.stringify(requestBody)
	});
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Could not get upload URL: ${errorText}`);
	}
	return response.json();
}

function uploadToS3(
	url: string,
	upload: UploadFile,
	metadata: FileMetadata | null,
	onProgress: (progress: number) => void
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const { signal } = upload.abortController;

		signal.addEventListener('abort', () => {
			xhr.abort();
			reject(new Error('Upload cancelled by user'));
		});

		xhr.open('PUT', url);
		xhr.setRequestHeader('Content-Type', upload.file.type || 'application/pdf');

		// NOTE: Metadata is included in the presigned URL query parameters, not as headers
		// When Metadata is included in PutObjectCommand, AWS SDK includes it in the URL
		// but doesn't automatically sign the headers. Since the metadata is already in the URL,
		// we don't need to (and shouldn't) send it as headers to avoid signature mismatch errors.
		// The metadata will be attached to the S3 object from the URL parameters.

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve();
			} else {
				reject(new Error(`Upload failed with status ${xhr.status}`));
			}
		};

		xhr.onerror = () => reject(new Error('Network error during upload'));
		xhr.ontimeout = () => reject(new Error('Upload timed out'));
		
		xhr.send(upload.file);
	});
}

