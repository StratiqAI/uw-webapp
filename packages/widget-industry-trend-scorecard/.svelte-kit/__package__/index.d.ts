export declare const industryTrendScorecardWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    quarters: string[];
    industries: {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }[];
    weights: {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    };
}>;
export type { IndustryTrendScorecardConfig, IndustryData, QuarterMetrics, ScoreWeights, LqTrend } from './schema.js';
export { industryTrendScorecardConfigSchema, industryDataSchema, quarterMetricsSchema, scoreWeightsSchema } from './schema.js';
export { DEMO_INDUSTRIES, DEMO_QUARTERS, DEMO_WEIGHTS } from './demoData.js';
