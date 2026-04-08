import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { locationQuotientWidgetDataSchema, locationQuotientAiOutputSchema } from './schema.js';
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
	palette: { icon: '📍', category: 'data' },
	entityDefinition: { name: 'Location Quotient Output', description: 'Structured output for location quotient widgets', outputSchema: locationQuotientAiOutputSchema },
	promptConfig: {
		defaultPrompt: 'Determine the area FIPS code and year for location quotient analysis',
		systemInstruction:
			'You are a geographic data assistant. Return the area FIPS code, data year, and region label for a location quotient analysis.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: locationQuotientAiOutputSchema,
		mapAiOutput: (out) => ({
			areaFips: out.areaFips,
			year: out.year,
			regionLabel: out.regionLabel,
			sortOrder: 'lq_desc',
			exportBaseThreshold: 1.08,
			localBandLow: 0.92,
			localBandHigh: 1.08
		})
	}
});

export { locationQuotientWidgetDataSchema, locationQuotientAiOutputSchema } from './schema.js';
export type { LocationQuotientWidgetData, LocationQuotientAiOutput, LocationQuotientSortOrder, QcewSectorAggregate } from './schema.js';
export { default as LocationQuotientWidget } from './LocationQuotientWidget.svelte';
