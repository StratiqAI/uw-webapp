import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const DonutChartWidget: import("svelte").Component<StandardWidgetProps<{
    labels: string[];
    values: number[];
    colors?: string[] | null | undefined;
    centerLabel?: string | null | undefined;
}>, {}, "">;
type DonutChartWidget = ReturnType<typeof DonutChartWidget>;
export default DonutChartWidget;
