import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const LineChartWidget: import("svelte").Component<StandardWidgetProps<{
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
    labels: string[];
    options?: {
        responsive?: boolean | null | undefined;
        maintainAspectRatio?: boolean | null | undefined;
    } | null | undefined;
}>, {}, "">;
type LineChartWidget = ReturnType<typeof LineChartWidget>;
export default LineChartWidget;
