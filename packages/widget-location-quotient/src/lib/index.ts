import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { locationQuotientWidgetDataSchema } from './schema.js';
import LocationQuotientWidget from './LocationQuotientWidget.svelte';

export const locationQuotientWidget = defineWidget({
	kind: 'locationQuotient',
	displayName: 'Location Quotient',
	zodSchema: locationQuotientWidgetDataSchema,
	component: LocationQuotientWidget,
	defaultData: {
		areaFips: 'C3890',
		year: 2025,
		regionLabel: 'Portland-Vancouver-Hillsboro, OR-WA',
		sortOrder: 'lq_desc' as const,
		exportBaseThreshold: 1.08,
		localBandLow: 0.92,
		localBandHigh: 1.08
	},
	defaultSize: { colSpan: 12, rowSpan: 4 },
	palette: { icon: '📍', category: 'data' }
});

export { locationQuotientWidgetDataSchema } from './schema.js';
export type { LocationQuotientWidgetData, LocationQuotientSortOrder, QcewSectorAggregate } from './schema.js';
export { default as LocationQuotientWidget } from './LocationQuotientWidget.svelte';
