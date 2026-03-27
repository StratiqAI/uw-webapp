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
		labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
		datasets: [
			{ label: 'Series 1', data: [28, 35, 42, 38, 45, 52], color: '#3b82f6' }
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
	donutChart: {
		labels: ['A', 'B', 'C', 'D'],
		values: [28, 22, 35, 15],
		colors: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc'],
		centerLabel: 'Total'
	},
	areaChart: {
		labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
		datasets: [
			{ label: 'Series 1', data: [20, 35, 45, 40, 55, 60], color: '#06b6d4' },
			{ label: 'Series 2', data: [10, 25, 30, 35, 40, 50], color: '#8b5cf6' }
		]
	},
	gauge: {
		value: 72,
		min: 0,
		max: 100,
		label: 'Score',
		unit: '%',
		color: '#22c55e'
	},
	sparkline: {
		values: [12, 19, 15, 25, 22, 30, 28, 35, 32, 40],
		label: 'Trend',
		color: '#3b82f6'
	},
	heatmap: {
		rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
		cols: ['AM', 'PM'],
		values: [
			[4, 6],
			[3, 5],
			[5, 7],
			[2, 4],
			[6, 8]
		]
	},
	divergingBarChart: {
		labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
		values: [-24, -18, 12, 32, 42],
		positiveColor: '#3b82f6',
		negativeColor: '#ef4444'
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
	},
	locationQuotient: {
		// FIPS must match `qcew_quarterly_data.area_fips` (QCEW quarterly codes differ from annual).
		// Portland–Vancouver–Hillsboro MSA; Supabase extract is 2025 Q1–Q3.
		areaFips: 'C3890',
		year: 2025,
		regionLabel: 'Portland-Vancouver-Hillsboro, OR-WA',
		sortOrder: 'lq_desc',
		exportBaseThreshold: 1.08,
		localBandLow: 0.92,
		localBandHigh: 1.08
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
	donutChart: { colSpan: 4, rowSpan: 3 },
	areaChart: { colSpan: 6, rowSpan: 3 },
	gauge: { colSpan: 3, rowSpan: 2 },
	sparkline: { colSpan: 4, rowSpan: 1 },
	heatmap: { colSpan: 6, rowSpan: 4 },
	divergingBarChart: { colSpan: 6, rowSpan: 3 },
	schema: { colSpan: 6, rowSpan: 3 },
	locationQuotient: { colSpan: 12, rowSpan: 4 }
};

/**
 * Returns default data for a widget by its type. Used when there is no
 * override in widgetInitialData, so every widget gets valid store data.
 */
export function getDefaultDataForWidget(widget: Widget): Record<string, unknown> {
	const d = DEFAULT_WIDGET_DATA[widget.type] ?? DEFAULT_WIDGET_DATA.title;
	return { ...d };
}
