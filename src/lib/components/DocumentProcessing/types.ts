// src/lib/components/DocumentProcessing/types.ts

import type {
	Notification,
	Text,
	Table,
	Image,
	Scan
} from '@stratiqai/types-simple';

/** Processing status for the overall document */
export type DocumentProcessingStatus =
	| 'uploading'
	| 'analyzing'
	| 'processing'
	| 'complete'
	| 'error';

/** Status of a single page */
export type PageStatus = 'pending' | 'processing' | 'complete' | 'error';

/** State of a single page */
export interface PageState {
	pageNumber: number;
	status: PageStatus;
	textBlocks: Text[];
	tables: Table[];
	images: Image[];
	processingTimeMs?: number;
}

/** Statistics for document processing */
export interface ProcessingStatistics {
	totalPages: number;
	processedPages: number;
	textBlocks: number;
	tables: number;
	images: number;
	scans: number;
}

/** Feed entry for the activity stream */
export interface FeedEntry {
	id: string;
	timestamp: string;
	type: 'notification' | 'text' | 'table' | 'image' | 'scan' | 'error';
	entity?: Notification | Text | Table | Image | Scan;
	pageNumber?: number;
	message: string;
	details?: Record<string, any>;
}

/** Workflow state (for future use) */
export interface WorkflowState {
	id: string;
	name: string;
	status: 'pending' | 'running' | 'complete' | 'failed';
	progress?: number;
	message?: string;
	startedAt?: string;
	completedAt?: string;
	error?: string;
}

/** Main document processing state */
export interface DocumentProcessingState {
	documentId: string;
	projectId: string;
	filename: string;
	status: DocumentProcessingStatus;
	pages: PageState[];
	statistics: ProcessingStatistics;
	workflows: WorkflowState[];
	feedEntries: FeedEntry[];
	selectedPage: number;
	classification?: {
		documentType: string;
		confidence: number;
	};
	error?: {
		type: string;
		message: string;
		recoverable: boolean;
	};
}
