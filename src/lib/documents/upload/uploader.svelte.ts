// src/lib/components/DocumentUpload/uploader.svelte.ts

import {
	MAX_RETRY_ATTEMPTS,
	RETRY_DELAY_MS,
	CONCURRENT_UPLOAD_LIMIT,
	PROGRESS_PENDING,
	PROGRESS_HASHING,
	PROGRESS_GETTING_URL,
	PROGRESS_UPLOADING_MAX,
	PROGRESS_COMPLETE,
	LOG_PREFIX,
	DEFAULT_PRESIGNED_URL_ENDPOINT
} from './constants';
import type { UploadFile, PresignedUrlResponse, FileMetadata, LoggerFn } from './types';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('documents');

export interface UploaderOptions {
	idToken?: string | null;
	projectId?: string | null;
	metadata?: FileMetadata | null;
	logger?: LoggerFn;
	presignedUrlEndpoint?: string;
	onUploadComplete?: (file: UploadFile) => void;
}

const noop: LoggerFn = () => {};

export function createUploader(options: UploaderOptions = {}) {
	let files = $state<UploadFile[]>([]);
	let uploadQueue: UploadFile[] = [];
	let activeUploads = $state(0);
	let token = $state(options.idToken ?? null);
	let project = $state(options.projectId ?? null);
	let fileMetadata = $state(options.metadata ?? null);

	const log: LoggerFn = options.logger ?? noop;
	const endpoint = options.presignedUrlEndpoint ?? DEFAULT_PRESIGNED_URL_ENDPOINT;
	const onUploadComplete = options.onUploadComplete;

	function updateFile(fileId: string, updates: Partial<UploadFile>) {
		files = files.map((f) => (f.id === fileId ? { ...f, ...updates } : f));
	}

	function processQueue() {
		while (uploadQueue.length > 0 && activeUploads < CONCURRENT_UPLOAD_LIMIT) {
			const fileToUpload = uploadQueue.shift();
			if (fileToUpload) {
				activeUploads++;
				performUpload(fileToUpload).finally(() => {
					activeUploads--;
					processQueue();
				});
			}
		}
	}

	async function performUpload(upload: UploadFile): Promise<void> {
		try {
			log(`${LOG_PREFIX} [UPLOAD_START] Starting upload for:`, {
				fileName: upload.file.name,
				fileSize: upload.file.size,
				hasToken: !!token,
				hasProject: !!project,
				hasMetadata: !!fileMetadata,
				metadata: fileMetadata,
				projectId: project,
				timestamp: new Date().toISOString()
			});

			updateFile(upload.id, { status: 'hashing', progress: PROGRESS_HASHING });
			const sha256 = await calculateSHA256(upload.file);

			log(`${LOG_PREFIX} [UPLOAD_STEP] SHA256 calculated:`, {
				fileName: upload.file.name,
				sha256: sha256.substring(0, 16) + '...',
				hasMetadata: !!fileMetadata,
				metadata: fileMetadata
			});

			updateFile(upload.id, { progress: PROGRESS_GETTING_URL });

			// Wait for metadata to become available (with timeout).
			// Handles the case where metadata is set reactively after upload starts.
			let metadataAtRequestTime = fileMetadata;
			log(`${LOG_PREFIX} [UPLOAD_STEP] Checking metadata before presigned URL:`, {
				fileName: upload.file.name,
				hasMetadata: !!metadataAtRequestTime
			});

			if (!metadataAtRequestTime) {
				log.warn(
					`${LOG_PREFIX} [UPLOAD_WAIT] Metadata not immediately available, waiting up to 2 seconds...`,
					{ fileName: upload.file.name }
				);

				const maxWaitTime = 2000;
				const checkInterval = 100;
				const startTime = Date.now();
				let checkCount = 0;

				while (!metadataAtRequestTime && Date.now() - startTime < maxWaitTime) {
					await new Promise((resolve) => setTimeout(resolve, checkInterval));
					metadataAtRequestTime = fileMetadata;
					checkCount++;

					if (checkCount % 5 === 0) {
						log(`${LOG_PREFIX} [UPLOAD_WAIT] Still waiting for metadata (check ${checkCount}):`, {
							fileName: upload.file.name,
							elapsed: Date.now() - startTime,
							hasMetadata: !!metadataAtRequestTime
						});
					}
				}

				log(`${LOG_PREFIX} [UPLOAD_WAIT] Wait complete:`, {
					fileName: upload.file.name,
					elapsed: Date.now() - startTime,
					hasMetadata: !!metadataAtRequestTime,
					checks: checkCount
				});
			}

			if (!metadataAtRequestTime) {
				const errorMsg = `Metadata is required for upload but was not available after waiting. Token: ${token ? 'present' : 'null'}, Project: ${project ? 'present' : 'null'}. Please ensure the project is fully loaded before uploading.`;
				log.error(`${LOG_PREFIX} [UPLOAD_ERROR] ${errorMsg}`, {
					fileName: upload.file.name,
					stackTrace: new Error().stack
				});
				throw new Error(errorMsg);
			}

			log(`${LOG_PREFIX} [UPLOAD_STEP] Using metadata for presigned URL:`, {
				fileName: upload.file.name,
				metadata: metadataAtRequestTime
			});

			const { url } = await getPresignedUrl(
				endpoint,
				upload.file.name,
				upload.file.type,
				sha256,
				token,
				project,
				metadataAtRequestTime
			);

			updateFile(upload.id, { status: 'uploading' });
			await uploadToS3(url, upload, log, (progress) => {
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

			const completedFile = files.find((f) => f.id === upload.id);
			if (completedFile) onUploadComplete?.(completedFile);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			if (errorMessage.includes('cancelled')) {
				return;
			}

			const currentRetryCount = upload.retryCount;
			if (currentRetryCount < MAX_RETRY_ATTEMPTS) {
				const newRetryCount = currentRetryCount + 1;
				updateFile(upload.id, { retryCount: newRetryCount });

				const updatedFile = files.find((f) => f.id === upload.id);
				if (updatedFile) {
					setTimeout(() => performUpload(updatedFile), RETRY_DELAY_MS * newRetryCount);
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

	return {
		get files() {
			return files;
		},
		get activeUploads() {
			return activeUploads;
		},
		updateMetadata(newMetadata: FileMetadata) {
			if (
				fileMetadata?.tenantId !== newMetadata?.tenantId ||
				fileMetadata?.ownerId !== newMetadata?.ownerId ||
				fileMetadata?.parentId !== newMetadata?.parentId
			) {
				fileMetadata = newMetadata;
			}
		},
		updateToken(newToken: string | null) {
			if (token !== newToken) {
				token = newToken;
			}
		},
		add(filesToAdd: File[]) {
			if (!fileMetadata) {
				log.warn(
					`${LOG_PREFIX} Files added but metadata is not available yet. Upload will wait for metadata or fail if it doesn't become available.`,
					{ hasToken: !!token, hasProject: !!project, hasMetadata: !!fileMetadata }
				);
			}

			const newUploads: UploadFile[] = filesToAdd.map((file) => ({
				id: `${file.name}-${Date.now()}`,
				file,
				status: 'pending',
				progress: PROGRESS_PENDING,
				result: null,
				abortController: new AbortController(),
				retryCount: 0
			}));
			files = [...files, ...newUploads];
			uploadQueue.push(...newUploads);
			processQueue();
		},
		remove(fileId: string) {
			const fileToRemove = files.find((f) => f.id === fileId);
			if (!fileToRemove) return;

			if (['uploading', 'hashing'].includes(fileToRemove.status)) {
				fileToRemove.abortController.abort();
			}
			files = files.filter((f) => f.id !== fileId);
			uploadQueue = uploadQueue.filter((f) => f.id !== fileId);
		},
		retry(fileId: string) {
			const fileToRetry = files.find((f) => f.id === fileId);
			if (!fileToRetry) return;

			updateFile(fileId, {
				status: 'pending',
				progress: PROGRESS_PENDING,
				result: null,
				retryCount: 0,
				abortController: new AbortController()
			});
			uploadQueue.unshift(fileToRetry);
			processQueue();
		},
		cancelAll() {
			files.forEach((f) => {
				if (['uploading', 'hashing', 'pending'].includes(f.status)) {
					f.abortController.abort();
				}
			});
			uploadQueue = [];
		}
	};
}

// ---------------------------------------------------------------------------
// Pure helpers (no external deps)
// ---------------------------------------------------------------------------

async function calculateSHA256(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getPresignedUrl(
	endpoint: string,
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
		const errorMsg = 'Project ID is required for upload';
		log.error(`${LOG_PREFIX} ${errorMsg}. ProjectId: ${projectId}`);
		throw new Error(errorMsg);
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

	const response = await fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify(requestBody)
	});
	if (!response.ok) {
		const errorText = await response.text();
		const errorMsg = `Could not get upload URL (${response.status}): ${errorText}`;
		log.error(`${LOG_PREFIX} ${errorMsg}`, {
			status: response.status,
			statusText: response.statusText,
			errorText,
			requestBody: { filename, contentType, fileHash, projectId, hasMetadata: !!metadata }
		});
		throw new Error(errorMsg);
	}
	return response.json();
}

function uploadToS3(
	url: string,
	upload: UploadFile,
	log: LoggerFn,
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

		// Metadata is included in the presigned URL query parameters, not as headers.
		// Sending metadata headers would cause a signature mismatch.

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				log(`${LOG_PREFIX} Upload successful for ${upload.file.name}`);
				resolve();
			} else {
				const errorMsg = `Upload failed with status ${xhr.status}${xhr.responseText ? `: ${xhr.responseText}` : ''}`;
				log.error(`${LOG_PREFIX} ${errorMsg}`, {
					status: xhr.status,
					statusText: xhr.statusText,
					responseText: xhr.responseText,
					fileName: upload.file.name
				});
				reject(new Error(errorMsg));
			}
		};

		xhr.onerror = () => reject(new Error('Network error during upload'));
		xhr.ontimeout = () => reject(new Error('Upload timed out'));

		xhr.send(upload.file);
	});
}
