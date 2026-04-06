export declare const locationQuotientWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    areaFips: string;
    year: number;
    regionLabel: string;
    sortOrder: "lq_desc" | "lq_asc" | "name_asc";
    exportBaseThreshold: number;
    localBandLow?: number | undefined;
    localBandHigh?: number | undefined;
}>;
export { locationQuotientWidgetDataSchema, locationQuotientAiOutputSchema } from './schema.js';
export type { LocationQuotientWidgetData, LocationQuotientAiOutput, LocationQuotientSortOrder, QcewSectorAggregate } from './schema.js';
export { default as LocationQuotientWidget } from './LocationQuotientWidget.svelte';
