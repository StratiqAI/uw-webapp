import { defineWidget, HostServices } from '@stratiqai/dashboard-widget-sdk';
import { lqAnalysisConfigSchema, lqAnalysisInputSchema } from './schema.js';
import LqAnalysisWidget from './LqAnalysisWidget.svelte';

export const lqAnalysisWidget = defineWidget({
	kind: 'lqAnalysis',
	displayName: 'LQ Analysis',
	zodSchema: lqAnalysisConfigSchema,
	inputSchema: lqAnalysisInputSchema,
	component: LqAnalysisWidget,
	defaultData: {
		city: 'Portland',
		state: 'OR',
		year: 2025,
		regionLabel: 'Portland-Vancouver-Hillsboro, OR-WA',
		sortOrder: 'lq_desc' as const,
		exportBaseThreshold: 1.08,
		localBandLow: 0.92,
		localBandHigh: 1.08
	},
	defaultSize: { colSpan: 12, rowSpan: 4 },
	capabilities: [HostServices.SUPABASE]
});

export type { LqAnalysisConfig, LqAnalysisInput, LqAnalysisSortOrder } from './schema.js';
export { lqAnalysisConfigSchema, lqAnalysisInputSchema } from './schema.js';
export type { QcewSectorAggregate, LoadLocationQuotientParams } from './qcewSupabase.js';
