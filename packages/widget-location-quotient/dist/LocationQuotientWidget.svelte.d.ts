import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const LocationQuotientWidget: import("svelte").Component<StandardWidgetProps<{
    areaFips: string;
    year: number;
    regionLabel: string;
    sortOrder: "lq_desc" | "lq_asc" | "name_asc";
    exportBaseThreshold: number;
    localBandLow?: number | undefined;
    localBandHigh?: number | undefined;
}>, {}, "">;
type LocationQuotientWidget = ReturnType<typeof LocationQuotientWidget>;
export default LocationQuotientWidget;
