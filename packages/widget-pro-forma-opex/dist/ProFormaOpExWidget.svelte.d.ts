import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const ProFormaOpExWidget: import("svelte").Component<StandardWidgetProps<{
    egiYear1: number;
    totalUnits: number;
    totalSqFt: number;
    unitType: "units" | "sqft";
    egiGrowthRate: number;
    baseOperatingExpenses: number;
    expenseGrowthRate: number;
    managementFeeRate: number;
    reservePerUnit: number;
    applyGrowthToReserves: boolean;
    customExpenses: {
        label: string;
        baseAmount: number;
        growthRate: number;
    }[];
    projectionYears: number;
    propertyName?: string | undefined;
}>, {}, "">;
type ProFormaOpExWidget = ReturnType<typeof ProFormaOpExWidget>;
export default ProFormaOpExWidget;
