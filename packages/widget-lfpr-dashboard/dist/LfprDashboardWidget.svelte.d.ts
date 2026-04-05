import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const LfprDashboardWidget: import("svelte").Component<StandardWidgetProps<{
    adultPopulation: number;
    adultPopYoy: number;
    laborForce: number;
    laborForceYoy: number;
    lfpr: number;
    lfprDirection: "flat" | "up" | "down";
    trendData: {
        year: string;
        rate: number;
    }[];
    growthDrivers: {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }[];
    dragDrivers: {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }[];
    title?: string | undefined;
}>, {}, "">;
type LfprDashboardWidget = ReturnType<typeof LfprDashboardWidget>;
export default LfprDashboardWidget;
