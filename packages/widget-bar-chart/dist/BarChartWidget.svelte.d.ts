import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const BarChartWidget: import("svelte").Component<StandardWidgetProps<{
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }[];
    labels: string[];
    orientation?: "vertical" | "horizontal" | null | undefined;
}>, {}, "">;
type BarChartWidget = ReturnType<typeof BarChartWidget>;
export default BarChartWidget;
