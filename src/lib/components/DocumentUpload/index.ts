// src/lib/components/DocumentUpload/index.ts

export { default as DocumentUpload } from './DocumentUpload.svelte';

export type {
	ExistingDocument,
	DocumentListItem,
	DocumentUploadProps,
	DocumentUploadConfig,
	UploadFile,
	UploadStatus,
	UploadResult,
	FileMetadata,
	LoggerFn
} from './types';

export { DEFAULTS } from './constants';
