// src/lib/components/DocumentUpload/uploader.store.svelte.ts

import {
	LOG_PREFIX,
	MAX_RETRY_ATTEMPTS,
	RETRY_DELAY_MS,
	CONCURRENT_UPLOAD_LIMIT,
	PROGRESS_PENDING,
	PROGRESS_HASHING,
	PROGRESS_GETTING_URL,
	PROGRESS_UPLOADING_MAX,
	PROGRESS_COMPLETE
} from './constants';
import type { UploadFile, PresignedUrlResponse } from './types';
import { logger } from '$lib/logging/debug'; // Assuming you have a logger utility

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Uploader Store - Encapsulates all upload logic
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
export function createUploader(idToken: string | null = null, projectId: string | null = null) {
	let files = $state<UploadFile[]>([]);
	let uploadQueue: UploadFile[] = [];
	let activeUploads = $state(0);
	let token = $state(idToken);
	let project = $state(projectId);

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
			const { url, key } = await getPresignedUrl(upload.file.name, upload.file.type, sha256, token, project);
			logger(`${LOG_PREFIX} Got presigned URL for ${upload.file.name}, key: ${key}`);

			updateFile(upload.id, { status: 'uploading' });
			await uploadToS3(url, upload, (progress) => {
				const newProgress = Math.round(
					PROGRESS_GETTING_URL + (PROGRESS_UPLOADING_MAX - PROGRESS_GETTING_URL) * progress
				);
				updateFile(upload.id, { progress: newProgress });
			});

			logger(`${LOG_PREFIX} Upload completed successfully for ${upload.file.name}`);
			updateFile(upload.id, {
				status: 'success',
				progress: PROGRESS_COMPLETE,
				result: { success: true, message: 'Upload successful' }
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			if (errorMessage.includes('cancelled')) {
				logger(`${LOG_PREFIX} Upload cancelled for ${upload.file.name}.`);
				return;
			}

			if (upload.retryCount < MAX_RETRY_ATTEMPTS) {
				const newRetryCount = upload.retryCount + 1;
				updateFile(upload.id, { retryCount: newRetryCount });
				logger(`${LOG_PREFIX} Retrying ${upload.file.name} (attempt ${newRetryCount})`);
				setTimeout(() => uploadFile(upload), RETRY_DELAY_MS * newRetryCount);
			} else {
				updateFile(upload.id, {
					status: 'error',
					result: { success: false, message: errorMessage }
				});
				logger(`${LOG_PREFIX} Upload failed for ${upload.file.name}: ${errorMessage}`);
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

			logger(`${LOG_PREFIX} Removing file: ${fileToRemove.file.name}`);
			if (['uploading', 'hashing'].includes(fileToRemove.status)) {
				fileToRemove.abortController.abort();
			}
			files = files.filter((f) => f.id !== fileId);
			uploadQueue = uploadQueue.filter((f) => f.id !== fileId);
		},
		retry: (fileId: string) => {
			const fileToRetry = files.find((f) => f.id === fileId);
			if (!fileToRetry) return;

			logger(`${LOG_PREFIX} Retrying upload for: ${fileToRetry.file.name}`);
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
	projectId: string | null
): Promise<PresignedUrlResponse> {
	const headers: HeadersInit = { 'Content-Type': 'application/json' };
	if (idToken) {
		headers['Authorization'] = `Bearer ${idToken}`;
	}
	
	if (!projectId) {
		throw new Error('Project ID is required for upload');
	}
	
	const response = await fetch('/api/s3-presigned', {
		method: 'POST',
		headers,
		body: JSON.stringify({ filename, contentType, fileHash, projectId })
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

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) resolve();
			else reject(new Error(`Upload failed with status ${xhr.status}`));
		};

		xhr.onerror = () => reject(new Error('Network error during upload'));
		xhr.ontimeout = () => reject(new Error('Upload timed out'));
		xhr.send(upload.file);
	});
}

