import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const HeatmapWidget: import("svelte").Component<StandardWidgetProps<{
    rows: string[];
    values: number[][];
    cols: string[];
}>, {}, "">;
type HeatmapWidget = ReturnType<typeof HeatmapWidget>;
export default HeatmapWidget;
