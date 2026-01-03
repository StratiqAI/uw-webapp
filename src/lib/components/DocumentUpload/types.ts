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
	id: string; // Unique ID for the file instance
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

/** Unified list item that can represent either an upload file or an existing ProjectDocumentLink */
export interface DocumentListItem {
	id: string;
	filename: string;
	size?: number; // File size in bytes (only available for uploads)
	status: 'upload' | 'existing'; // 'upload' for files being uploaded, 'existing' for ProjectDocumentLinks
	uploadFile?: UploadFile; // Present if status is 'upload'
	documentLink?: import('$lib/types/Project').ProjectDocumentLink; // Present if status is 'existing'
}