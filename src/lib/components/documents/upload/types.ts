// src/lib/components/DocumentUpload/types.ts

/** Defines the possible states of a file upload. */
export type UploadStatus = 'pending' | 'hashing' | 'uploading' | 'success' | 'error';

/** Represents the result of a completed upload attempt. */
export interface UploadResult {
	success: boolean;
	message: string;
}

/** Represents a file being managed by the uploader. */
export interface UploadFile {
	id: string;
	file: File;
	status: UploadStatus;
	progress: number;
	result: UploadResult | null;
	abortController: AbortController;
	retryCount: number;
}

/** The expected response from the presigned URL API endpoint. */
export interface PresignedUrlResponse {
	url: string;
	key: string;
}

/** File metadata to attach to S3 uploads. */
export interface FileMetadata {
	tenantId: string;
	ownerId: string;
	parentId: string;
}

/**
 * Minimal interface for documents that already exist in the system.
 * The host app maps its own document type (e.g. Doclink) to this shape.
 * Extra fields are preserved via the index signature so the host can
 * read them back in callbacks.
 */
export interface ExistingDocument {
	id: string;
	filename: string;
	parentId?: string;
	[key: string]: unknown;
}

/** Unified list item: either an in-flight upload or an existing document. */
export interface DocumentListItem {
	id: string;
	filename: string;
	size?: number;
	status: 'upload' | 'existing';
	uploadFile?: UploadFile;
	documentLink?: ExistingDocument;
}

/** Optional configuration overrides for the component. */
export interface DocumentUploadConfig {
	supportedFileTypes?: string;
	maxFileSize?: number;
	maxRetryAttempts?: number;
	retryDelayMs?: number;
	concurrentUploadLimit?: number;
}

/** Logger function signature accepted by the component. */
export type LoggerFn = (...args: unknown[]) => void;

/** Props accepted by the root DocumentUpload component. */
export interface DocumentUploadProps {
	idToken: string | null;
	projectId: string | null;
	metadata?: FileMetadata | null;
	existingDocuments?: ExistingDocument[];
	onDeleteDocument?: (doc: ExistingDocument) => Promise<void>;
	onDocumentClick?: (item: DocumentListItem) => void;
	onUploadComplete?: (item: UploadFile) => void;
	onError?: (errors: string[]) => void;
	presignedUrlEndpoint?: string;
	logger?: LoggerFn;
	config?: DocumentUploadConfig;
}
