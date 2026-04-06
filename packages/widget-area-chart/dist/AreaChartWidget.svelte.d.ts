import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const AreaChartWidget: import("svelte").Component<StandardWidgetProps<{
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
}>, {}, "">;
type AreaChartWidget = ReturnType<typeof AreaChartWidget>;
export default AreaChartWidget;
