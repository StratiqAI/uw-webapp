import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const ProFormaNoiWidget: import("svelte").Component<StandardWidgetProps<{
    egiYear1: number;
    totalOpexYear1: number;
    egiGrowthRate: number;
    opexGrowthRate: number;
    projectionYears: number;
    showBreakdown: boolean;
    propertyName?: string | undefined;
}>, {}, "">;
type ProFormaNoiWidget = ReturnType<typeof ProFormaNoiWidget>;
export default ProFormaNoiWidget;
