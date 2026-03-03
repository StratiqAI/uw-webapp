// src/lib/components/DocumentProcessing/mockData.ts

import type {
	Notification,
	Text,
	Table,
	Image,
	Scan
} from '@stratiqai/types-simple';
import type { DocumentProcessingState } from './types';

/**
 * Generates mock data for testing the document processing UI
 */
export function generateMockProcessingState(
	documentId: string,
	projectId: string,
	filename: string
): DocumentProcessingState {
	const totalPages = 15;
	const pages = Array.from({ length: totalPages }, (_, i) => {
		const pageNum = i + 1;
		const isComplete = pageNum <= 10;
		const isProcessing = pageNum === 11;

		return {
			pageNumber: pageNum,
			status: (isComplete
				? 'complete'
				: isProcessing
					? 'processing'
					: 'pending') as 'pending' | 'processing' | 'complete' | 'error',
			textBlocks: isComplete
				? Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
						id: `text-${pageNum}-${j}`,
						entityType: 'TEXT' as const,
						tenantId: 'test-tenant',
						ownerId: 'test-owner',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						deletedAt: null,
						parentId: documentId,
						pageNum,
						text: `Sample text block ${j + 1} on page ${pageNum}...`
					}))
				: [],
			tables: isComplete && pageNum % 3 === 0
				? [
						{
							id: `table-${pageNum}`,
							entityType: 'TABLE' as const,
							tenantId: 'test-tenant',
							ownerId: 'test-owner',
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
							deletedAt: null,
							parentId: documentId,
							pageNum,
							description: `Table with ${Math.floor(Math.random() * 10) + 5} rows`
						}
					]
				: [],
			images: isComplete && pageNum % 2 === 0
				? Array.from({ length: Math.floor(Math.random() * 2) + 1 }, (_, j) => ({
						id: `image-${pageNum}-${j}`,
						entityType: 'IMAGE' as const,
						tenantId: 'test-tenant',
						ownerId: 'test-owner',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						deletedAt: null,
						s3Bucket: 'test-bucket',
						s3Key: `images/image-${pageNum}-${j}.png`,
						mimeType: 'image/png',
						sizeBytes: Math.floor(Math.random() * 100000) + 10000,
						parentId: documentId,
						pageNum,
						imageId: `img-${pageNum}-${j}`,
						topLeftX: Math.random() * 100,
						topLeftY: Math.random() * 100,
						bottomRightX: Math.random() * 100 + 200,
						bottomRightY: Math.random() * 100 + 200,
						imageAnnotation: null
					}))
				: []
		};
	});

	const textBlocksCount = pages.reduce((sum, p) => sum + p.textBlocks.length, 0);
	const tablesCount = pages.reduce((sum, p) => sum + p.tables.length, 0);
	const imagesCount = pages.reduce((sum, p) => sum + p.images.length, 0);

	return {
		documentId,
		projectId,
		filename,
		status: 'processing',
		pages,
		statistics: {
			totalPages,
			processedPages: 10,
			textBlocks: textBlocksCount,
			tables: tablesCount,
			images: imagesCount,
			scans: 1
		},
		workflows: [
			{
				id: 'workflow-1',
				name: 'Extract Tables',
				status: 'complete',
				progress: 100,
				message: 'Completed successfully',
				startedAt: new Date(Date.now() - 30000).toISOString(),
				completedAt: new Date(Date.now() - 10000).toISOString()
			},
			{
				id: 'workflow-2',
				name: 'Classify Images',
				status: 'running',
				progress: 65,
				message: 'Processing 15 of 23 images...',
				startedAt: new Date(Date.now() - 20000).toISOString()
			}
		],
		feedEntries: [
			{
				id: 'entry-1',
				timestamp: new Date(Date.now() - 60000).toISOString(),
				type: 'notification',
				message: '✓ Upload complete',
				pageNumber: undefined
			},
			{
				id: 'entry-2',
				timestamp: new Date(Date.now() - 55000).toISOString(),
				type: 'notification',
				message: '🔍 Analyzing document structure...',
				pageNumber: undefined
			},
			...pages
				.filter((p) => p.status === 'complete')
				.flatMap((p) => [
					{
						id: `entry-text-${p.pageNumber}`,
						timestamp: new Date(Date.now() - 50000 + p.pageNumber * 1000).toISOString(),
						type: 'text' as const,
						pageNumber: p.pageNumber,
						message: `📄 Page ${p.pageNumber}: ${p.textBlocks.length} text blocks`
					},
					...(p.tables.length > 0
						? [
								{
									id: `entry-table-${p.pageNumber}`,
									timestamp: new Date(Date.now() - 49000 + p.pageNumber * 1000).toISOString(),
									type: 'table' as const,
									pageNumber: p.pageNumber,
									message: `📊 Page ${p.pageNumber}: ${p.tables.length} table(s)`
								}
							]
						: []),
					...(p.images.length > 0
						? [
								{
									id: `entry-image-${p.pageNumber}`,
									timestamp: new Date(Date.now() - 48000 + p.pageNumber * 1000).toISOString(),
									type: 'image' as const,
									pageNumber: p.pageNumber,
									message: `🖼️ Page ${p.pageNumber}: ${p.images.length} image(s)`
								}
							]
						: [])
				])
		].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
		selectedPage: 1,
		classification: {
			documentType: 'financial_report',
			confidence: 0.92
		}
	};
}

/**
 * Simulates an event for testing
 */
export function simulateEvent(
	store: ReturnType<typeof import('./processing.store.svelte').createProcessingStore>,
	eventType: 'notification' | 'text' | 'table' | 'image' | 'scan',
	data: any
) {
	switch (eventType) {
		case 'notification':
			store.handleNotificationCreated(data as Notification);
			break;
		case 'text':
			store.handleTextCreated(data as Text);
			break;
		case 'table':
			store.handleTableCreated(data as Table);
			break;
		case 'image':
			store.handleImageCreated(data as Image);
			break;
		case 'scan':
			store.handleScanCreated(data as Scan);
			break;
	}
}
