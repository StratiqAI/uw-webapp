import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaNoiConfigSchema, proFormaNoiInputSchema } from './schema.js';
import ProFormaNoiWidget from './ProFormaNoiWidget.svelte';

export const proFormaNoiWidget = defineWidget({
	kind: 'proFormaNoi',
	displayName: 'Pro Forma NOI',
	zodSchema: proFormaNoiConfigSchema,
	inputSchema: proFormaNoiInputSchema,
	component: ProFormaNoiWidget,
	defaultData: {
		egiYear1: 1734000,
		egiGrowthRate: 0.03,
		totalOpexYear1: 920000,
		opexGrowthRate: 0.03,
		projectionYears: 5,
		propertyName: '',
		showBreakdown: false
	},
	defaultSize: { colSpan: 12, rowSpan: 2 }
});

export type { ProFormaNoiConfig, ProFormaNoiInput } from './schema.js';
export { proFormaNoiConfigSchema, proFormaNoiInputSchema } from './schema.js';
export { computeNoiProjections, type NoiYearProjection } from './calculations.js';
