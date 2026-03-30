import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const ProFormaUnleveredCfWidget: import("svelte").Component<StandardWidgetProps<{
    egiYear1: number;
    totalOpexYear1: number;
    purchasePrice: number;
    projectionYears: number;
    acquisitionCosts: number;
    initialCapEx: number;
    egiGrowthRate: number;
    opexGrowthRate: number;
    terminalCapRate: number;
    costOfSalePercent: number;
    propertyName?: string | undefined;
}>, {}, "">;
type ProFormaUnleveredCfWidget = ReturnType<typeof ProFormaUnleveredCfWidget>;
export default ProFormaUnleveredCfWidget;
