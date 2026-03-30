import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const ProFormaRevenueWidget: import("svelte").Component<StandardWidgetProps<{
    totalUnits: number;
    totalSqFt: number;
    marketRentPerUnit: number;
    otherIncomeAnnual: number;
    unitType: "units" | "sqft";
    rentGrowthRate: number;
    vacancyRate: number;
    otherIncomeGrowthRate: number;
    projectionYears: number;
    propertyName?: string | undefined;
}>, {}, "">;
type ProFormaRevenueWidget = ReturnType<typeof ProFormaRevenueWidget>;
export default ProFormaRevenueWidget;
