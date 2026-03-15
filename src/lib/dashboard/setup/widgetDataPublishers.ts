/**
 * Widget Data Publishers
 *
 * Publishes initial and default data to widget topics using ValidatedTopicStore.
 * This separates widget configuration (layout, position) from widget data.
 *
 * - widgetInitialData: override values for specific widget IDs
 * - getDefaultDataForWidget: type-based defaults when no override exists
 *
 * Widgets subscribe to their topics and receive data reactively.
 */

import { createWidgetPublisher, getWidgetData } from '$lib/dashboard/utils/widgetPublisher';
import { getDefaultDataForWidget } from '$lib/dashboard/setup/defaultDashboardValues';
import type { Widget, WidgetType } from '$lib/dashboard/types/widget';
import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';

export interface PublishWidgetDataOptions {
	/** When true, skip widgets that already have data in the store (e.g. after restore from localStorage) */
	onlyIfMissing?: boolean;
}

/**
 * Returns true when the stored value should be treated as "missing" so we republish.
 * Handles undefined, null, {}, and common placeholder/empty values that would
 * render as an empty widget.
 */
function isEffectivelyEmpty(data: unknown, widgetType: WidgetType): boolean {
	if (data == null) return true;
	if (typeof data !== 'object') return true;
	const d = data as Record<string, unknown>;
	if (Object.keys(d).length === 0) return true;
	switch (widgetType) {
		case 'title':
			return !d.title;
		case 'metric':
			return (d.value === '—' || d.value === '' || d.value == null) && (d.label === '—' || d.label === '' || d.label == null);
		case 'paragraph':
			return !d.content;
		case 'table':
			return !Array.isArray(d.rows) || d.rows.length === 0;
		case 'image':
			return !d.src;
		case 'map':
			return (d.apiKey === '' || d.apiKey == null) && (d.lat == null || d.lon == null);
		case 'lineChart':
		case 'barChart':
		case 'areaChart':
			return !Array.isArray(d.labels) || d.labels.length === 0;
		case 'donutChart':
			return !Array.isArray(d.labels) || d.labels.length === 0 || !Array.isArray(d.values) || d.values.length === 0;
		case 'gauge':
			return d.value == null && d.label == null;
		case 'sparkline':
			return !Array.isArray(d.values) || d.values.length === 0;
		case 'heatmap':
			return !Array.isArray(d.rows) || d.rows.length === 0 || !Array.isArray(d.cols) || d.cols.length === 0 || !Array.isArray(d.values);
		case 'divergingBarChart':
			return !Array.isArray(d.labels) || d.labels.length === 0 || !Array.isArray(d.values) || d.values.length === 0;
		case 'schema':
			return !d.schemaId;
		default:
			return false;
	}
}

/**
 * Initial data for each widget type
 * This data will be published to the widget's topic
 */
const widgetInitialData: Record<string, unknown> = {
	'widget-1': {
		title: 'Market Analysis',
		subtitle: 'Real-time metrics and analytics',
		alignment: 'center'
	},
	'widget-4': {
		title: 'City Statistics',
		headers: ['Name', 'Value'],
		rows: [
			{
				Name: 'City',
				Value: 'San Antonio'
			},
			{
				Name: 'State',
				Value: 'Texas'
			},
			{
				Name: 'County',
				Value: 'Bexar'
			},
			{
				Name: 'Zip Codes',
				Value: '78220'
			},
			{
				Name: 'Asset Class',
				Value: 'Retail Shopping Center'
			}
		],
		sortable: true,
		paginated: false
	},
	'widget-5': {
		title: 'Map of Hillsboro',
		lat: 29.416775,
		lon: -98.406103,
		zoom: 15,
		mapType: 'leaflet',
		apiKey: PUBLIC_GEOAPIFY_API_KEY || ''
	},
	'widget-6': {
		title: 'Employment',
		content:
			'Lone Oak Shopping Center sits in a robust urban economy in San Antonio, Texas—the state\'s second-most populous city with about 1.45 million residents and a diversified mix of industries, including health care and social assistance, retail trade, and food services, with some of the best-paying sectors in mining/oil and technical services. The immediate trade area benefits from a sizable daytime population, counting roughly 9,806 people within 1 mile, 69,885 within 3 miles, and 227,158 within 5 miles, which supports strong foot traffic potential for retailers and service providers around the center. Demographically, the five-mile radius shows a large Hispanic share (around 64.8%), with 2023 average household incomes near $69,740 and a 2023 median home value around $218,621, underscoring a solid, diverse consumer base with growing purchasing power. The property itself is fully occupied and anchored by long-tenured tenants, including H-E-B, with a nearby distribution center noted as a logistical asset, suggesting resilient demand and potential rent growth through renewals and inflation-driven escalations; local traffic on WW White Road is strong (about 21,888 vehicles per day in 2022), reinforcing visibility and access for customers. ',
		markdown: false
	},
	'widget-8': {
		label: 'MANUFACTURING',
		value: '10%'
	},
	'widget-1760034441135': {
		label: 'BUSINESS SERVICES',
		value: '16%'
	},
	'widget-1760034444139': {
		label: 'GOVERNMENT',
		value: '10%'
	},
	'widget-1760034594067': {
		label: 'HOSPITALITY',
		value: '10%'
	},
	'widget-1760034597055': {
		label: 'FINANCIAL ACTIVITIES',
		value: '10%'
	},
	'widget-1760034608731': {
		label: 'UTILITIES',
		value: '10%'
	},
	'widget-1760034608732': {
		label: 'CONSTRUCTION',
		value: '10%'
	},
	'widget-1760034605935': {
		label: 'EDUCATION AND HEALTH SERVICES',
		value: '10%'
	},
	'widget-1760034612393': {
		label: 'INFORMATION',
		value: '10%'
	},
	'widget-1760034618243': {
		label: 'OTHER SERVICES',
		value: '10%'
	},
	'widget-1760034621635': {
		label: 'MANUFACTURING',
		value: '10%'
	},
	'widget-1760034624211': {
		label: 'Total Revenue',
		value: '$45,231',
		change: 12.5,
		changeType: 'increase'
	},
	'widget-linechart-1': {
		labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
		datasets: [
			{ label: 'Revenue', data: [28, 35, 42, 38, 45, 52], color: '#3b82f6' },
			{ label: 'Costs', data: [22, 28, 32, 30, 34, 40], color: '#ef4444' }
		],
		options: { responsive: true, maintainAspectRatio: false }
	},
	'widget-barchart-1': {
		labels: ['Manufacturing', 'Business Services', 'Government', 'Hospitality', 'Financial', 'Utilities'],
		datasets: [
			{
				label: 'Percentage',
				data: [10, 16, 10, 10, 10, 10],
				backgroundColor: '#3b82f6'
			}
		],
		orientation: 'vertical'
	},
	'widget-donut-1': {
		labels: ['Revenue', 'Costs', 'Ops', 'Other'],
		values: [42, 28, 18, 12],
		colors: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc'],
		centerLabel: 'Total'
	},
	'widget-area-1': {
		labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
		datasets: [
			{ label: 'Revenue', data: [24, 32, 38, 42, 48, 55], color: '#06b6d4' },
			{ label: 'Costs', data: [14, 20, 24, 26, 30, 34], color: '#8b5cf6' }
		]
	},
	'widget-gauge-1': {
		value: 78,
		min: 0,
		max: 100,
		label: 'Performance',
		unit: '%',
		color: '#22c55e'
	},
	'widget-sparkline-1': {
		values: [12, 19, 15, 25, 22, 30, 28, 35, 32, 40, 38, 45],
		label: 'Weekly trend',
		color: '#3b82f6'
	},
	'widget-heatmap-1': {
		rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
		cols: ['AM', 'PM'],
		values: [
			[4, 6],
			[3, 5],
			[5, 7],
			[2, 4],
			[6, 8]
		]
	}
};

/**
 * Publish initial or default data for all widgets into ValidatedTopicStore.
 * Uses widgetInitialData overrides when present, otherwise type-based defaults.
 *
 * @param widgets - Array of widgets to publish data for
 * @param options - onlyIfMissing: when true, skip widgets that already have data (preserves restored values)
 */
export function publishWidgetData(widgets: Widget[], options?: PublishWidgetDataOptions): void {
	const onlyIfMissing = options?.onlyIfMissing ?? false;
	console.log('📡 [Widget Data Publishers] Publishing to ValidatedTopicStore...', onlyIfMissing ? '(only if missing)' : '');

	let published = 0;
	for (const widget of widgets) {
		if (onlyIfMissing && getWidgetData(widget.type, widget.id) !== undefined) {
			continue;
		}
		const data = widgetInitialData[widget.id] ?? getDefaultDataForWidget(widget);
		try {
			const publisher = createWidgetPublisher(
				widget.type,
				widget.id,
				'widget-config-publisher'
			);
			const ok = publisher.publish(data);
			if (ok) {
				published++;
				console.log(`   ✅ ${widget.id} (${widget.type})`);
			} else {
				console.warn(`   ⚠️  Validation failed for ${widget.id} (${widget.type})`);
			}
		} catch (error) {
			console.error(`   ❌ Failed to publish for ${widget.id}:`, error);
		}
	}

	console.log(`✅ [Widget Data Publishers] Published ${published}/${widgets.length} widgets`);
}

