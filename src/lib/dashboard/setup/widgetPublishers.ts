/**
 * Widget Data Publishers
 * 
 * Initializes publishers for widget topics using the TopicPublisher system.
 * This separates widget configuration from widget data and provides a flexible
 * way to manage data sources.
 */

import { publisherRegistry, StaticPublisher, type PublisherConfig } from '$lib/stores/TopicPublisher';
import { getWidgetTopic, getWidgetSchemaId } from './widgetSchemaRegistration';
import type { Widget } from '$lib/dashboard/types/widget';
import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';

/**
 * Initial data for each widget
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
			'Lone Oak Shopping Center sits in a robust urban economy in San Antonio, Texas—the state\'s second-most populous city with about 1.45 million residents and a diversified mix of industries, including health care and social assistance, retail trade, and food services, with some of the best-paying sectors in mining/oil and technical services. The immediate trade area benefits from a sizable daytime population, counting roughly 9,806 people within 1 mile, 69,885 within 3 miles, and 227,158 within 5 miles, which supports strong foot traffic potential for retailers and service providers around the center. Demographically, the five-mile radius shows a large Hispanic share (around 64.8%), with 2023 average household incomes near $69,740 and a 2023 median home value around $218,621, underscoring a solid, diverse consumer base with growing purchasing power. The property itself is fully occupied and anchored by long-tenured tenants, including H-E-B, with a nearby distribution center noted as a logistical asset, suggesting resilient demand and potential rent growth through renewals and inflation-driven escalations; local traffic on WW White Road is strong (about 21,888 vehicles per day in 2022), reinforcing visibility and access for customers. '
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
	}
};

/**
 * Create a publisher for a widget
 */
function createWidgetPublisher(widget: Widget): StaticPublisher {
	const topic = getWidgetTopic(widget.type, widget.id);
	const schemaId = getWidgetSchemaId(widget.type);
	const initialData = widgetInitialData[widget.id] || {};

	const config: PublisherConfig = {
		id: `widget-publisher-${widget.id}`,
		topic,
		schemaId,
		name: `${widget.type} Widget Publisher`,
		description: `Publishes initial data for ${widget.id}`,
		autoStart: true,
		metadata: {
			widgetId: widget.id,
			widgetType: widget.type
		}
	};

	return new StaticPublisher(config, initialData);
}

/**
 * Initialize publishers for all widgets
 * 
 * @param widgets - Array of widgets to create publishers for
 */
export function initializeWidgetPublishers(widgets: Widget[]): void {
	console.log('📡 [Widget Publishers] Initializing publishers for widgets...');

	for (const widget of widgets) {
		try {
			const publisher = createWidgetPublisher(widget);
			publisherRegistry.register(publisher);
			console.log(`   ✅ Registered publisher for ${widget.id} (${widget.type})`);
		} catch (error) {
			console.error(`   ❌ Failed to create publisher for ${widget.id}:`, error);
		}
	}

	const stats = publisherRegistry.getStats();
	console.log(`✅ [Widget Publishers] Initialized ${stats.total} publishers (${stats.running} running)`);
}

/**
 * Get publisher for a widget
 */
export function getWidgetPublisher(widgetId: string): ReturnType<typeof publisherRegistry.get> {
	return publisherRegistry.get(`widget-publisher-${widgetId}`);
}

/**
 * Update data for a widget publisher
 */
export async function updateWidgetData(widgetId: string, data: unknown): Promise<void> {
	const publisher = publisherRegistry.get(`widget-publisher-${widgetId}`);
	if (publisher instanceof StaticPublisher) {
		// For static publishers, we need to create a new one with updated data
		// In the future, we might add an updateData method
		console.warn(`[Widget Publishers] Cannot update StaticPublisher for ${widgetId}. Create a new publisher instead.`);
	} else {
		await publisher?.publish();
	}
}

