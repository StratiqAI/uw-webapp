/**
 * Widget Data Publishers
 * 
 * Publishes initial data to widget topics using MapStore.
 * This separates widget configuration (layout, position) from widget data.
 * 
 * Widgets subscribe to their topics and receive data reactively.
 */

import { createWidgetPublisher } from '$lib/dashboard/utils/widgetPublisher';
import type { Widget } from '$lib/dashboard/types/widget';
import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';

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
 * Publish initial data for all widgets
 * 
 * @param widgets - Array of widgets to publish data for
 */
export function publishWidgetData(widgets: Widget[]): void {
	console.log('📡 [Widget Data Publishers] Publishing initial data for widgets...');

	const publishers: Array<{ dispose: () => void }> = [];

	for (const widget of widgets) {
		const initialData = widgetInitialData[widget.id];
		
		if (initialData) {
			try {
				const publisher = createWidgetPublisher(
					widget.type,
					widget.id,
					'widget-config-publisher'
				);
				
				publisher.publish(initialData);
				publishers.push(publisher);
				
				console.log(`   ✅ Published data for ${widget.id} (${widget.type})`);
			} catch (error) {
				console.error(`   ❌ Failed to publish data for ${widget.id}:`, error);
			}
		} else {
			console.warn(`   ⚠️  No initial data found for widget ${widget.id}`);
		}
	}

	console.log(`✅ [Widget Data Publishers] Published data for ${publishers.length} widgets`);
	
	// Note: We don't dispose publishers here because we want them to stay active
	// They will be cleaned up when the app unmounts or when explicitly disposed
}

