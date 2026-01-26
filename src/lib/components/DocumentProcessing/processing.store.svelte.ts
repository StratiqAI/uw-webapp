// src/lib/components/DocumentProcessing/processing.store.svelte.ts

import type {
	Notification,
	Text,
	Table,
	Image,
	Scan
} from '@agnathan/types-simple';
import type {
	DocumentProcessingState,
	PageState,
	FeedEntry,
	ProcessingStatistics
} from './types';

/**
 * Creates a reactive store for managing document processing state.
 * The store handles events from GraphQL subscriptions and updates UI reactively.
 */
export function createProcessingStore(
	documentId: string,
	projectId: string,
	filename: string
) {
	// Reactive state using Svelte 5 runes
	let state = $state<DocumentProcessingState>({
		documentId,
		projectId,
		filename,
		status: 'uploading',
		pages: [],
		statistics: {
			totalPages: 0,
			processedPages: 0,
			textBlocks: 0,
			tables: 0,
			images: 0,
			scans: 0
		},
		workflows: [],
		feedEntries: [],
		selectedPage: 1
	});

	// Helper: Get or create page state
	function getOrCreatePage(pageNumber: number): PageState {
		let page = state.pages.find((p) => p.pageNumber === pageNumber);
		if (!page) {
			page = {
				pageNumber,
				status: 'pending',
				textBlocks: [],
				tables: [],
				images: []
			};
			state.pages.push(page);
			state.pages.sort((a, b) => a.pageNumber - b.pageNumber);
		}
		return page;
	}

	// Helper: Add feed entry
	function addFeedEntry(entry: Omit<FeedEntry, 'id' | 'timestamp'>) {
		const feedEntry: FeedEntry = {
			id: `entry-${Date.now()}-${Math.random()}`,
			timestamp: new Date().toISOString(),
			...entry
		};
		state.feedEntries = [feedEntry, ...state.feedEntries];
	}

	// Event handlers for subscription data

	/**
	 * Handles Notification created event (processing status updates)
	 */
	function handleNotificationCreated(notification: Notification) {
		// Parse Notification.properties (AWSJSON) for processing status
		let properties: Record<string, any> = {};
		try {
			if (notification.properties) {
				properties =
					typeof notification.properties === 'string'
						? JSON.parse(notification.properties)
						: notification.properties;
			}
		} catch (e) {
			console.error('Failed to parse Notification.properties:', e);
		}

		const eventType = properties.eventType || notification.message;
		const pageNumber = properties.pageNumber;

		// Update status based on event type
		if (eventType === 'AnalysisStarted' || notification.message?.includes('analysis started')) {
			state.status = 'analyzing';
			addFeedEntry({
				type: 'notification',
				entity: notification,
				message: '🔍 Document analysis started',
				details: properties
			});
		} else if (eventType === 'PageAnalysisStarted' && pageNumber) {
			const page = getOrCreatePage(pageNumber);
			page.status = 'processing';
			addFeedEntry({
				type: 'notification',
				entity: notification,
				pageNumber,
				message: `📄 Page ${pageNumber} analysis started`,
				details: properties
			});
		} else if (eventType === 'PageAnalysisComplete' && pageNumber) {
			const page = getOrCreatePage(pageNumber);
			page.status = 'complete';
			state.statistics.processedPages = state.pages.filter((p) => p.status === 'complete').length;
			addFeedEntry({
				type: 'notification',
				entity: notification,
				pageNumber,
				message: `✓ Page ${pageNumber} analysis complete`,
				details: properties
			});
		} else if (eventType === 'Classified') {
			state.classification = {
				documentType: properties.documentType || 'unknown',
				confidence: properties.confidence || 0
			};
			addFeedEntry({
				type: 'notification',
				entity: notification,
				message: `🏷️ Document classified as: ${properties.documentType || 'unknown'}`,
				details: properties
			});
		} else if (eventType === 'Complete') {
			state.status = 'complete';
			addFeedEntry({
				type: 'notification',
				entity: notification,
				message: '✅ Document processing complete',
				details: properties
			});
		} else if (eventType === 'Error') {
			state.status = 'error';
			state.error = {
				type: properties.errorType || 'unknown',
				message: notification.message || 'Processing error occurred',
				recoverable: properties.recoverable !== false
			};
			addFeedEntry({
				type: 'error',
				entity: notification,
				message: `✗ Error: ${notification.message}`,
				details: properties
			});
		} else {
			// Generic notification
			addFeedEntry({
				type: 'notification',
				entity: notification,
				message: notification.message || 'Processing update',
				details: properties
			});
		}
	}

	/**
	 * Handles Text created event (text block discovery)
	 */
	function handleTextCreated(text: Text) {
		if (!text.parentId || text.parentId !== documentId) return;

		const pageNumber = text.pageNum || 1;
		const page = getOrCreatePage(pageNumber);
		page.textBlocks.push(text);
		state.statistics.textBlocks += 1;

		addFeedEntry({
			type: 'text',
			entity: text,
			pageNumber,
			message: `📄 Text block discovered on page ${pageNumber}`,
			details: { textLength: text.text?.length || 0 }
		});
	}

	/**
	 * Handles Table created event (table discovery)
	 */
	function handleTableCreated(table: Table) {
		if (!table.parentId || table.parentId !== documentId) return;

		const pageNumber = table.pageNum || 1;
		const page = getOrCreatePage(pageNumber);
		page.tables.push(table);
		state.statistics.tables += 1;

		addFeedEntry({
			type: 'table',
			entity: table,
			pageNumber,
			message: `📊 Table discovered on page ${pageNumber}`,
			details: { description: table.description }
		});
	}

	/**
	 * Handles Image created event (image discovery)
	 */
	function handleImageCreated(image: Image) {
		if (!image.parentId || image.parentId !== documentId) return;

		const pageNumber = image.pageNum || 1;
		const page = getOrCreatePage(pageNumber);
		page.images.push(image);
		state.statistics.images += 1;

		addFeedEntry({
			type: 'image',
			entity: image,
			pageNumber,
			message: `🖼️ Image discovered on page ${pageNumber}`,
			details: {
				imageId: image.imageId,
				sizeBytes: image.sizeBytes,
				mimeType: image.mimeType
			}
		});
	}

	/**
	 * Handles Scan created event (scan creation)
	 */
	function handleScanCreated(scan: Scan) {
		if (!scan.parentId || scan.parentId !== documentId) return;

		state.statistics.scans += 1;

		addFeedEntry({
			type: 'scan',
			entity: scan,
			message: '📄 Scan created',
			details: { s3Bucket: scan.s3Bucket, s3Key: scan.s3Key }
		});
	}

	// Helper methods
	function getPage(pageNumber: number): PageState | undefined {
		return state.pages.find((p) => p.pageNumber === pageNumber);
	}

	function setSelectedPage(pageNumber: number) {
		state.selectedPage = pageNumber;
	}

	function clear() {
		state = {
			documentId,
			projectId,
			filename,
			status: 'uploading',
			pages: [],
			statistics: {
				totalPages: 0,
				processedPages: 0,
				textBlocks: 0,
				tables: 0,
				images: 0,
				scans: 0
			},
			workflows: [],
			feedEntries: [],
			selectedPage: 1
		};
	}

	/**
	 * Initialize store with mock data (for testing/static UI)
	 */
	function initializeWithMockData(mockState: DocumentProcessingState) {
		state = {
			...mockState,
			documentId,
			projectId,
			filename
		};
	}

	// Computed derived values
	const progress = $derived.by(() => {
		if (state.statistics.totalPages === 0) return 0;
		return Math.round(
			(state.statistics.processedPages / state.statistics.totalPages) * 100
		);
	});

	const isComplete = $derived.by(() => state.status === 'complete');

	const hasErrors = $derived.by(() => state.status === 'error' || state.error !== undefined);

	// Public API
	return {
		get state() {
			return state;
		},
		get progress() {
			return progress;
		},
		get isComplete() {
			return isComplete;
		},
		get hasErrors() {
			return hasErrors;
		},
		handleNotificationCreated,
		handleTextCreated,
		handleTableCreated,
		handleImageCreated,
		handleScanCreated,
		getPage,
		setSelectedPage,
		clear,
		initializeWithMockData
	};
}
