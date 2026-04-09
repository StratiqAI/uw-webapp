import type { Text, Table, Image } from '@stratiqai/types-simple';
import type { ExtractedTable } from './types';
import type { Widget } from '$lib/dashboard/types/widget';
import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
import { generateWidgetId } from '$lib/dashboard/utils/idGenerator';
import { findAvailablePosition } from '$lib/dashboard/utils/grid';
import { createWidgetPublisher } from '$lib/dashboard/utils/widgetPublisher';
import { toastStore } from '$lib/stores/toastStore.svelte';

function makeWidget(
	type: string,
	data: Record<string, unknown>,
	size: { colSpan: number; rowSpan: number },
	title?: string
): Widget {
	return {
		id: generateWidgetId(),
		type,
		gridColumn: 1,
		gridRow: 1,
		colSpan: size.colSpan,
		rowSpan: size.rowSpan,
		minWidth: 1,
		minHeight: 1,
		title,
		data
	} as Widget;
}

function addAndPublish(widget: Widget, targetTabId?: string): boolean {
	let success: boolean;

	if (targetTabId && targetTabId !== dashboard.activeTabId) {
		success = dashboard.addWidgetToTab(widget, targetTabId);
	} else {
		const position = findAvailablePosition(
			widget.colSpan,
			widget.rowSpan,
			dashboard.config.gridColumns,
			dashboard.config.gridRows,
			dashboard.widgets
		);
		if (position) {
			widget = { ...widget, gridColumn: position.gridColumn, gridRow: position.gridRow };
		}
		success = dashboard.addWidget(widget);
	}

	if (success) {
		try {
			const publisher = createWidgetPublisher(widget.type, widget.id, 'entity-to-dashboard');
			publisher.publish((widget as Widget & { data: Record<string, unknown> }).data);
		} catch {
			// Non-fatal: widget is added but topic publish failed; dashboard init will republish
		}
	}
	return success;
}

function tabLabel(tabId?: string): string {
	if (!tabId || tabId === dashboard.activeTabId) return 'dashboard';
	const tab = dashboard.tabOrder.find((t) => t.id === tabId);
	return tab?.label ?? 'dashboard';
}

export function addTextToDashboard(text: Text, projectId: string, targetTabId?: string): boolean {
	const pageLabel = text.pageNum ? `Page ${text.pageNum}` : 'Text Block';
	const widget = makeWidget(
		'simpleParagraph',
		{ title: pageLabel, description: '', content: text.text ?? '' },
		{ colSpan: 6, rowSpan: 3 },
		pageLabel
	);
	const ok = addAndPublish(widget, targetTabId);
	if (ok) toastStore.success(`Added text block to ${tabLabel(targetTabId)}`);
	return ok;
}

export function addTableToDashboard(table: Table, projectId: string, targetTabId?: string): boolean {
	const pageLabel = table.pageNum ? `Table – Page ${table.pageNum}` : 'Table';
	const widget = makeWidget(
		'table',
		{
			title: pageLabel,
			description: table.description ?? '',
			rows: [],
			sortable: true,
			paginated: true,
			pageSize: 10,
			searchable: true
		},
		{ colSpan: 6, rowSpan: 4 },
		pageLabel
	);
	const ok = addAndPublish(widget, targetTabId);
	if (ok) toastStore.success(`Added table to ${tabLabel(targetTabId)}`);
	return ok;
}

export function addExtractedTableToDashboard(table: ExtractedTable, projectId: string, targetTabId?: string): boolean {
	const pageLabel = table.pageNum ? `Table – Page ${table.pageNum}` : 'Extracted Table';
	const columns = table.headers.map((h) => ({ key: h, label: h }));
	const rows = table.rows.map((row) =>
		Object.fromEntries(table.headers.map((h, i) => [h, row[i] ?? '']))
	);

	const widget = makeWidget(
		'table',
		{
			title: pageLabel,
			columns,
			rows,
			sortable: true,
			paginated: true,
			pageSize: 10,
			searchable: true
		},
		{ colSpan: 6, rowSpan: 4 },
		pageLabel
	);
	const ok = addAndPublish(widget, targetTabId);
	if (ok) toastStore.success(`Added table to ${tabLabel(targetTabId)}`);
	return ok;
}

export function addImageToDashboard(image: Image, projectId: string, targetTabId?: string): boolean {
	const pageLabel = image.pageNum ? `Image – Page ${image.pageNum}` : 'Document Image';
	const src =
		image.s3Bucket && image.s3Key
			? `https://${image.s3Bucket}.s3.us-west-2.amazonaws.com/${image.s3Key}`
			: '';

	const widget = makeWidget(
		'image',
		{
			src,
			alt: pageLabel,
			objectFit: 'contain'
		},
		{ colSpan: 4, rowSpan: 4 },
		pageLabel
	);
	const ok = addAndPublish(widget, targetTabId);
	if (ok) toastStore.success(`Added image to ${tabLabel(targetTabId)}`);
	return ok;
}

// ── Bulk-add helpers ─────────────────────────────────────────────────

export function addAllTextsToDashboard(texts: Text[], projectId: string, excludedIds?: Set<string>): number {
	const included = excludedIds ? texts.filter((t) => !excludedIds.has(t.id)) : texts;
	let count = 0;
	for (const text of included) {
		const pageLabel = text.pageNum ? `Page ${text.pageNum}` : 'Text Block';
		const widget = makeWidget(
			'simpleParagraph',
			{ title: pageLabel, description: '', content: text.text ?? '' },
			{ colSpan: 6, rowSpan: 3 },
			pageLabel
		);
		if (addAndPublish(widget)) count++;
	}
	if (count > 0) toastStore.success(`Added ${count} text block${count === 1 ? '' : 's'} to dashboard`);
	else toastStore.info('No space on dashboard for more widgets');
	return count;
}

export function addAllTablesToDashboard(
	tables: Table[],
	extractedTables: ExtractedTable[],
	projectId: string,
	excludedIds?: Set<string>
): number {
	let count = 0;
	const includedTables = excludedIds ? tables.filter((t) => !excludedIds.has(t.id)) : tables;
	for (const table of includedTables) {
		const pageLabel = table.pageNum ? `Table – Page ${table.pageNum}` : 'Table';
		const widget = makeWidget(
			'table',
			{
				title: pageLabel,
				description: table.description ?? '',
				rows: [],
				sortable: true,
				paginated: true,
				pageSize: 10,
				searchable: true
			},
			{ colSpan: 6, rowSpan: 4 },
			pageLabel
		);
		if (addAndPublish(widget)) count++;
	}
	const includedExtracted = excludedIds ? extractedTables.filter((t) => !excludedIds.has(t.id)) : extractedTables;
	for (const table of includedExtracted) {
		const pageLabel = table.pageNum ? `Table – Page ${table.pageNum}` : 'Extracted Table';
		const columns = table.headers.map((h) => ({ key: h, label: h }));
		const rows = table.rows.map((row) =>
			Object.fromEntries(table.headers.map((h, i) => [h, row[i] ?? '']))
		);
		const widget = makeWidget(
			'table',
			{ title: pageLabel, columns, rows, sortable: true, paginated: true, pageSize: 10, searchable: true },
			{ colSpan: 6, rowSpan: 4 },
			pageLabel
		);
		if (addAndPublish(widget)) count++;
	}
	if (count > 0) toastStore.success(`Added ${count} table${count === 1 ? '' : 's'} to dashboard`);
	else toastStore.info('No space on dashboard for more widgets');
	return count;
}

export function addAllImagesToDashboard(images: Image[], projectId: string, excludedIds?: Set<string>): number {
	const included = excludedIds ? images.filter((i) => !excludedIds.has(i.id)) : images;
	let count = 0;
	for (const image of included) {
		const pageLabel = image.pageNum ? `Image – Page ${image.pageNum}` : 'Document Image';
		const src =
			image.s3Bucket && image.s3Key
				? `https://${image.s3Bucket}.s3.us-west-2.amazonaws.com/${image.s3Key}`
				: '';
		const widget = makeWidget(
			'image',
			{ src, alt: pageLabel, objectFit: 'contain' },
			{ colSpan: 4, rowSpan: 4 },
			pageLabel
		);
		if (addAndPublish(widget)) count++;
	}
	if (count > 0) toastStore.success(`Added ${count} image${count === 1 ? '' : 's'} to dashboard`);
	else toastStore.info('No space on dashboard for more widgets');
	return count;
}
