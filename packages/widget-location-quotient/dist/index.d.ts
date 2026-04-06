export declare const locationQuotientWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    areaFips: string;
    year: number;
    regionLabel: string;
    sortOrder: "lq_desc" | "lq_asc" | "name_asc";
    exportBaseThreshold: number;
    localBandLow?: number | undefined;
    localBandHigh?: number | undefined;
}>;
export { locationQuotientWidgetDataSchema } from './schema.js';
export type { LocationQuotientWidgetData, LocationQuotientSortOrder, QcewSectorAggregate } from './schema.js';
export { default as LocationQuotientWidget } from './LocationQuotientWidget.svelte';
