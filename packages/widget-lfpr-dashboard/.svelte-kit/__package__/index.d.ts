export declare const lfprDashboardWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    adultPopulation: number;
    adultPopYoy: number;
    laborForce: number;
    laborForceYoy: number;
    lfpr: number;
    lfprDirection: "flat" | "up" | "down";
    trendData: {
        year: string;
        rate: number;
    }[];
    growthDrivers: {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }[];
    dragDrivers: {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }[];
    title?: string | undefined;
}>;
export type { LfprDashboardConfig, LfprTrendYear, LfprDriver } from './schema.js';
export { lfprDashboardConfigSchema, lfprTrendYearSchema, lfprDriverSchema } from './schema.js';
export { DEMO_LFPR_CONFIG } from './demoData.js';
