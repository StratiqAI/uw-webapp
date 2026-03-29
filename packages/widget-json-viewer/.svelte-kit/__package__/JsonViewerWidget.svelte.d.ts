import type { JsonViewerWidgetData } from './schema.js';
interface Props {
    data: JsonViewerWidgetData;
    widgetId?: string;
    topicOverride?: string;
    darkMode?: boolean;
}
declare const JsonViewerWidget: import("svelte").Component<Props, {}, "">;
type JsonViewerWidget = ReturnType<typeof JsonViewerWidget>;
export default JsonViewerWidget;
