/**
 * Default Dashboard Values
 *
 * Type-based default data for each widget type. Used to seed ValidatedTopicStore
 * when a widget has no stored or override data, so the dashboard always displays
 * something valid.
 */

import type { Widget, WidgetType } from '$lib/dashboard/types/widget';
import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';

/**
 * Default data for each widget type. Values conform to the Zod schemas
 * in widgetSchemas.ts so they pass ValidatedTopicStore validation.
 */
export const DEFAULT_WIDGET_DATA: Record<WidgetType, Record<string, unknown>> = {
	title: {
		title: 'Untitled',
		subtitle: null,
		alignment: 'left'
	},
	table: {
		title: null,
		headers: ['Column 1', 'Column 2'],
		rows: [{ 'Column 1': '—', 'Column 2': '—' }],
		sortable: false,
		paginated: false
	},
	paragraph: {
		title: null,
		content: 'Add your content here.',
		markdown: false
	},
	image: {
		title: null,
		src: 'https://via.placeholder.com/400x300',
		alt: 'Image',
		objectFit: 'cover'
	},
	lineChart: {
		labels: ['A', 'B', 'C'],
		datasets: [
			{ label: 'Series 1', data: [10, 20, 15], color: '#3b82f6' }
		],
		options: { responsive: true, maintainAspectRatio: false }
	},
	barChart: {
		labels: ['A', 'B', 'C'],
		datasets: [
			{ label: 'Count', data: [10, 20, 15], backgroundColor: '#3b82f6' }
		],
		orientation: 'vertical'
	},
	metric: {
		label: '—',
		value: '—'
	},
	map: {
		title: null,
		description: null,
		lat: 37.7749,
		lon: -122.4194,
		zoom: 10,
		mapType: 'leaflet',
		apiKey: typeof PUBLIC_GEOAPIFY_API_KEY === 'string' ? PUBLIC_GEOAPIFY_API_KEY : ''
	},
	schema: {
		schemaId: 'example-schema',
		data: {}
	}
};

/**
 * Default grid size (colSpan, rowSpan) for each widget type when creating from
 * the topic store or "Add Widget". Kept in sync with DashboardControls.createDefaultWidget.
 */
export const DEFAULT_WIDGET_SIZES: Record<WidgetType, { colSpan: number; rowSpan: number }> = {
	title: { colSpan: 12, rowSpan: 1 },
	metric: { colSpan: 2, rowSpan: 1 },
	paragraph: { colSpan: 6, rowSpan: 2 },
	table: { colSpan: 6, rowSpan: 4 },
	image: { colSpan: 6, rowSpan: 4 },
	map: { colSpan: 8, rowSpan: 4 },
	lineChart: { colSpan: 6, rowSpan: 3 },
	barChart: { colSpan: 6, rowSpan: 3 },
	schema: { colSpan: 6, rowSpan: 3 }
};

/**
 * Returns default data for a widget by its type. Used when there is no
 * override in widgetInitialData, so every widget gets valid store data.
 */
export function getDefaultDataForWidget(widget: Widget): Record<string, unknown> {
	const d = DEFAULT_WIDGET_DATA[widget.type] ?? DEFAULT_WIDGET_DATA.title;
	return { ...d };
}
