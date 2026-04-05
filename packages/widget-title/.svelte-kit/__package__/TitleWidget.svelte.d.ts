import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const TitleWidget: import("svelte").Component<StandardWidgetProps<{
    title: string;
    subtitle?: string | null | undefined;
    alignment?: "left" | "center" | "right" | null | undefined;
}>, {}, "">;
type TitleWidget = ReturnType<typeof TitleWidget>;
export default TitleWidget;
