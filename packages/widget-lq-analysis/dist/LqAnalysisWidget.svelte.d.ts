import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const LqAnalysisWidget: import("svelte").Component<StandardWidgetProps<{
    city: string;
    state: string;
    year: number;
    regionLabel: string;
    sortOrder: "lq_desc" | "lq_asc" | "name_asc";
    exportBaseThreshold: number;
    zip?: string | undefined;
    areaFips?: string | undefined;
    localBandLow?: number | undefined;
    localBandHigh?: number | undefined;
}>, {}, "">;
type LqAnalysisWidget = ReturnType<typeof LqAnalysisWidget>;
export default LqAnalysisWidget;
