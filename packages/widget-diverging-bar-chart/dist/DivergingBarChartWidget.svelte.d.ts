import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const DivergingBarChartWidget: import("svelte").Component<StandardWidgetProps<{
    labels: string[];
    values: number[];
    positiveColor?: string | null | undefined;
    negativeColor?: string | null | undefined;
}>, {}, "">;
type DivergingBarChartWidget = ReturnType<typeof DivergingBarChartWidget>;
export default DivergingBarChartWidget;
