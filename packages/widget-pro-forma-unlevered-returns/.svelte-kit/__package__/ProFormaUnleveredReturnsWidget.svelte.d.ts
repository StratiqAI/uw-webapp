import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const ProFormaUnleveredReturnsWidget: import("svelte").Component<StandardWidgetProps<{
    egiYear1: number;
    purchasePrice: number;
    unleveredDiscountRate: number;
    projectionYears: number;
    acquisitionCosts: number;
    initialCapEx: number;
    egiGrowthRate: number;
    totalOpexYear1: number;
    opexGrowthRate: number;
    terminalCapRate: number;
    costOfSalePercent: number;
    propertyName?: string | undefined;
}>, {}, "">;
type ProFormaUnleveredReturnsWidget = ReturnType<typeof ProFormaUnleveredReturnsWidget>;
export default ProFormaUnleveredReturnsWidget;
