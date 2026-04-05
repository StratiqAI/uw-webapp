export declare const econBaseMultiplierWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    industries: {
        name: string;
        naicsCode: string;
        localEmp: number;
        nationalEmp: number;
    }[];
    regionLabel?: string | undefined;
}>;
export type { EconBaseMultiplierConfig, EconBaseIndustry } from './schema.js';
export { econBaseMultiplierConfigSchema, econBaseIndustrySchema } from './schema.js';
export { DEMO_INDUSTRIES } from './demoData.js';
