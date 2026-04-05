import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const MetricWidget: import("svelte").Component<StandardWidgetProps<{
    label: string;
    value: string | number;
    title?: string | null | undefined;
    description?: string | null | undefined;
    change?: number | null | undefined;
    changeType?: "increase" | "decrease" | null | undefined;
    unit?: string | null | undefined;
}>, {}, "">;
type MetricWidget = ReturnType<typeof MetricWidget>;
export default MetricWidget;
