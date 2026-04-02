import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { econBaseMultiplierConfigSchema } from './schema.js';
import EconBaseMultiplierWidget from './EconBaseMultiplierWidget.svelte';
import { DEMO_INDUSTRIES } from './demoData.js';

export const econBaseMultiplierWidget = defineWidget({
	kind: 'econBaseMultiplier',
	displayName: 'Economic Base Multiplier',
	zodSchema: econBaseMultiplierConfigSchema,
	component: EconBaseMultiplierWidget,
	defaultData: {
		regionLabel: 'Sample Region',
		industries: DEMO_INDUSTRIES
	},
	defaultSize: { colSpan: 8, rowSpan: 4 },
	palette: { icon: '📊', category: 'financial' }
});

export type { EconBaseMultiplierConfig, EconBaseIndustry } from './schema.js';
export { econBaseMultiplierConfigSchema, econBaseIndustrySchema } from './schema.js';
export { DEMO_INDUSTRIES } from './demoData.js';
