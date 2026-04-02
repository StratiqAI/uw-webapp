import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { lfprDashboardConfigSchema } from './schema.js';
import LfprDashboardWidget from './LfprDashboardWidget.svelte';
import { DEMO_LFPR_CONFIG } from './demoData.js';

export const lfprDashboardWidget = defineWidget({
	kind: 'lfprDashboard',
	displayName: 'LFPR Dashboard',
	zodSchema: lfprDashboardConfigSchema,
	component: LfprDashboardWidget,
	defaultData: DEMO_LFPR_CONFIG,
	defaultSize: { colSpan: 12, rowSpan: 5 },
	palette: { icon: '👥', category: 'financial' }
});

export type { LfprDashboardConfig, LfprTrendYear, LfprDriver } from './schema.js';
export { lfprDashboardConfigSchema, lfprTrendYearSchema, lfprDriverSchema } from './schema.js';
export { DEMO_LFPR_CONFIG } from './demoData.js';
