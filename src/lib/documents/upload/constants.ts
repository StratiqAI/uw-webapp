// src/lib/components/DocumentUpload/constants.ts

export const SUPPORTED_FILE_TYPES = '.pdf';
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_RETRY_ATTEMPTS = 1;
export const RETRY_DELAY_MS = 1000;
export const CONCURRENT_UPLOAD_LIMIT = 3;
export const LOG_PREFIX = '[DocumentUpload]';
export const DEFAULT_PRESIGNED_URL_ENDPOINT = '/api/s3-presigned';

export const PROGRESS_PENDING = 0;
export const PROGRESS_HASHING = 5;
export const PROGRESS_GETTING_URL = 10;
export const PROGRESS_UPLOADING_MAX = 95;
export const PROGRESS_COMPLETE = 100;

/** Aggregated defaults exposed for consumer introspection / overrides. */
export const DEFAULTS = {
	supportedFileTypes: SUPPORTED_FILE_TYPES,
	maxFileSize: MAX_FILE_SIZE,
	maxRetryAttempts: MAX_RETRY_ATTEMPTS,
	retryDelayMs: RETRY_DELAY_MS,
	concurrentUploadLimit: CONCURRENT_UPLOAD_LIMIT,
	presignedUrlEndpoint: DEFAULT_PRESIGNED_URL_ENDPOINT
} as const;