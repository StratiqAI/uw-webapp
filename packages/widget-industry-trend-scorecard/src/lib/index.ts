import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { industryTrendScorecardConfigSchema } from './schema.js';
import IndustryTrendScorecardWidget from './IndustryTrendScorecardWidget.svelte';
import { DEMO_INDUSTRIES, DEMO_QUARTERS, DEMO_WEIGHTS } from './demoData.js';

export const industryTrendScorecardWidget = defineWidget({
	kind: 'industryTrendScorecard',
	displayName: 'Industry Trend Scorecard',
	zodSchema: industryTrendScorecardConfigSchema,
	component: IndustryTrendScorecardWidget,
	defaultData: {
		quarters: DEMO_QUARTERS,
		industries: DEMO_INDUSTRIES,
		weights: DEMO_WEIGHTS
	},
	defaultSize: { colSpan: 12, rowSpan: 6 },
	palette: { icon: '📈', category: 'financial' }
});

export type {
	IndustryTrendScorecardConfig,
	IndustryData,
	QuarterMetrics,
	ScoreWeights,
	LqTrend
} from './schema.js';
export {
	industryTrendScorecardConfigSchema,
	industryDataSchema,
	quarterMetricsSchema,
	scoreWeightsSchema
} from './schema.js';
export { DEMO_INDUSTRIES, DEMO_QUARTERS, DEMO_WEIGHTS } from './demoData.js';
