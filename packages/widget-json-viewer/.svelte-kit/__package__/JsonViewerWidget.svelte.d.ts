import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const JsonViewerWidget: import("svelte").Component<StandardWidgetProps<{
    title?: string | null | undefined;
    description?: string | null | undefined;
    json?: unknown;
}>, {}, "">;
type JsonViewerWidget = ReturnType<typeof JsonViewerWidget>;
export default JsonViewerWidget;
