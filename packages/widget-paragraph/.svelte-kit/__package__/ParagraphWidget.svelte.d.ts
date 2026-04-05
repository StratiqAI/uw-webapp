import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const ParagraphWidget: import("svelte").Component<StandardWidgetProps<{
    content: string;
    markdown: boolean | null;
    title?: string | null | undefined;
}>, {}, "">;
type ParagraphWidget = ReturnType<typeof ParagraphWidget>;
export default ParagraphWidget;
