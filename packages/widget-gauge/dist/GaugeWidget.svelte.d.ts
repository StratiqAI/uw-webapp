import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const GaugeWidget: import("svelte").Component<StandardWidgetProps<{
    value: number;
    min?: number | null | undefined;
    max?: number | null | undefined;
    label?: string | null | undefined;
    unit?: string | null | undefined;
    color?: string | null | undefined;
}>, {}, "">;
type GaugeWidget = ReturnType<typeof GaugeWidget>;
export default GaugeWidget;
