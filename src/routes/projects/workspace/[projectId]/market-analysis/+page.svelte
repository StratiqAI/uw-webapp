<script lang="ts">
	import type { PageData } from './$types';
	import Dashboard from '$lib/dashboard/components/Dashboard.svelte';
	import DashboardControls from '$lib/dashboard/components/DashboardControls.svelte';
	import MapStoreDebugPanel from '$lib/dashboard/components/widgets/MapStoreDebugWidget.svelte';
	import ParagraphDisplayParent from '$lib/dashboard/examples/ParagraphDisplayParent.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import type { Widget } from '$lib/dashboard/types/widget';
	import { onMount, setContext } from 'svelte';
	import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';
	import SimpleWidgetExample from '$lib/dashboard/examples/SimpleWidgetExample.svelte';
	import SimplifiedParagraphDisplay from '$lib/dashboard/examples/SimplifiedParagraphDisplay.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let isLoading = $state(true);

	// Set page data context for child components
	setContext('pageData', { currentUser: data.currentUser });

	const dashboardWidgets: Widget[] = [
		{
			id: 'widget-1',
			type: 'title',
			gridColumn: 1,
			gridRow: 1,
			colSpan: 12,
			rowSpan: 1,
			data: {
				title: 'Market Analysis',
				subtitle: 'Real-time metrics and analytics',
				alignment: 'center'
			}
		},
		{
			id: 'widget-4',
			type: 'table',
			gridColumn: 9,
			gridRow: 2,
			colSpan: 4,
			rowSpan: 4,
			minHeight: 2,
			data: {
				title: 'City Statistics',
				headers: ['Name', 'Value'],
				rows: [
					{Name: 'Address',
						Value: '907-1015 S. WW White Road'
					},
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
					},
					{
						Name: 'Total Population',
						Value: '1,450,000'
					},
					{
						Name: 'Average Household Income',
						Value: '$69,740'
					},
					{
						Name: 'Median Home Value',
						Value: '$270,621'
					},
					

				],
				sortable: true,
				paginated: false
			}
		},
		// {
		// 	id: 'widget-5',
		// 	type: 'image',
		// 	gridColumn: 1,
		// 	gridRow: 2,
		// 	colSpan: 8,
		// 	rowSpan: 4,
		// 	minWidth: 3,
		// 	minHeight: 2,
		// 	data: {
		// 		src: 'https://pti-demo-web-assets.s3.us-west-2.amazonaws.com/images/aaronmap.png',
		// 		alt: 'Image',
		// 		objectFit: 'cover'
		// 	}
		// },
		{
			id: 'widget-5',
			type: 'map',
			gridColumn: 1,
			gridRow: 2,
			colSpan: 8,
			rowSpan: 4,
			minWidth: 3,
			minHeight: 2,
			data: {
				title: 'Map of Hillsboro',
				lat: 29.416775,
				lon: -98.406103,
				zoom: 15,
				mapType: 'leaflet',
				apiKey: PUBLIC_GEOAPIFY_API_KEY
			}
		},
		{
			id: 'widget-6',
			type: 'paragraph',
			gridColumn: 1,
			gridRow: 6,
			colSpan: 12,
			rowSpan: 4,
			minWidth: 2,
			minHeight: 2,
			data: {
				title: 'Employment',
				content:
					'Lone Oak Shopping Center sits in a robust urban economy in San Antonio, Texas—the state’s second-most populous city with about 1.45 million residents and a diversified mix of industries, including health care and social assistance, retail trade, and food services, with some of the best-paying sectors in mining/oil and technical services. The immediate trade area benefits from a sizable daytime population, counting roughly 9,806 people within 1 mile, 69,885 within 3 miles, and 227,158 within 5 miles, which supports strong foot traffic potential for retailers and service providers around the center. Demographically, the five-mile radius shows a large Hispanic share (around 64.8%), with 2023 average household incomes near $69,740 and a 2023 median home value around $218,621, underscoring a solid, diverse consumer base with growing purchasing power. The property itself is fully occupied and anchored by long-tenured tenants, including H-E-B, with a nearby distribution center noted as a logistical asset, suggesting resilient demand and potential rent growth through renewals and inflation-driven escalations; local traffic on WW White Road is strong (about 21,888 vehicles per day in 2022), reinforcing visibility and access for customers. '
			}
		},
		{
			id: 'widget-8',
			type: 'metric',
			gridColumn: 1,
			gridRow: 11,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'MANUFACTURING',
				value: '10%'
			}
		},
		{
			id: 'widget-1760034441135',
			type: 'metric',
			gridColumn: 3,
			gridRow: 11,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'BUSINESS SERVICES',
				value: '16%'
			}
		},
		{
			id: 'widget-1760034444139',
			type: 'metric',
			gridColumn: 5,
			gridRow: 11,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'GOVERNMENT',
				value: '10%'
			}
		},
		{
			id: 'widget-1760034594067',
			type: 'metric',
			gridColumn: 7,
			gridRow: 11,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'HOSPITALITY',
				value: '10%'
			}
		},
		{
			id: 'widget-1760034597055',
			type: 'metric',
			gridColumn: 9,
			gridRow: 11,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'FINANCIAL ACTIVITIES',
				value: '10%'
			}
		},
		{
			id: 'widget-1760034608731',
			type: 'metric',
			gridColumn: 11,
			gridRow: 11,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'UTILITIES',
				value: '10%'
			}
		},
		{
			id: 'widget-1760034608732',
			type: 'metric',
			gridColumn: 1,
			gridRow: 13,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'CONSTRUCTION',
				value: '10%'
			}
		},
		{
			id: 'widget-1760034605935',
			type: 'metric',
			gridColumn: 3,
			gridRow: 13,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'EDUCATION AND HEALTH SERVICES',
				value: '10%'
			}
		},
		{
			id: 'widget-1760034612393',
			type: 'metric',
			gridColumn: 5,
			gridRow: 13,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'INFORMATION',
				value: '10%'
			}
		},
		{
			id: 'widget-1760034624211',
			type: 'metric',
			gridColumn: 7,
			gridRow: 13,
			colSpan: 2,
			rowSpan: 1,
			minWidth: 1,
			minHeight: 1,
			data: {
				label: 'Total Revenue',
				value: '$45,231',
				change: 12.5,
				changeType: 'increase'
			}
		}
	];

	onMount(() => {
		// Try to load saved dashboard
		const hasLoadedDashboard = dashboard.initialize();

		// If no saved dashboard, load defaults
		if (!hasLoadedDashboard) {
			console.info('No saved dashboard found, loading defaults');
			dashboardWidgets.forEach((widget) => {
				dashboard.addWidget(widget);
			});
		}

		// Handle responsive grid adjustment
		function updateGridSize() {
			const width = window.innerWidth;
			if (width < 640) {
				dashboard.updateGridConfig({ gridColumns: 4, gridRows: 12 });
			} else if (width < 1024) {
				dashboard.updateGridConfig({ gridColumns: 8, gridRows: 10 });
			} else {
				dashboard.updateGridConfig({ gridColumns: 12, gridRows: 8 });
			}
		}

		updateGridSize();
		window.addEventListener('resize', updateGridSize);

		// Save dashboard before page unload if there are unsaved changes
		window.addEventListener('beforeunload', (e) => {
			if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
				dashboard.save();
			}
		});

		isLoading = false;

		return () => {
			window.removeEventListener('resize', updateGridSize);
			// Save any pending changes
			if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
				dashboard.save();
			}
		};
	});

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Ctrl/Cmd + S to save
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			dashboard.save();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<DashboardControls />

<div class="mx-auto max-w-7xl px-4 pb-4">
	<MapStoreDebugPanel />
</div>

<main class="mx-auto max-w-7xl p-4">
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<div class="text-gray-600">Loading dashboard...</div>
		</div>
	{:else}
		<!-- Removed fixed height constraint to allow grid to extend fully -->
		<div class="min-h-[800px]">
			<Dashboard />
		</div>
	{/if}
</main>
