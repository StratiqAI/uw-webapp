import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const SparklineWidget: import("svelte").Component<StandardWidgetProps<{
    values: number[];
    label?: string | null | undefined;
    color?: string | null | undefined;
}>, {}, "">;
type SparklineWidget = ReturnType<typeof SparklineWidget>;
export default SparklineWidget;
