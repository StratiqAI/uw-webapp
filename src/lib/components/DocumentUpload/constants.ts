// src/lib/components/DocumentUpload/constants.ts

export const SUPPORTED_FILE_TYPES = '.pdf';
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;
export const CONCURRENT_UPLOAD_LIMIT = 3;
export const LOG_PREFIX = '[DocumentUpload]';

// Progress constants for clear, readable steps in the upload process
export const PROGRESS_PENDING = 0;
export const PROGRESS_HASHING = 5;
export const PROGRESS_GETTING_URL = 10;
export const PROGRESS_UPLOADING_MAX = 95;
export const PROGRESS_COMPLETE = 100;