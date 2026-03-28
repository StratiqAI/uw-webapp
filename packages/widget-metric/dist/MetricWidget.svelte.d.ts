import type { MetricWidgetData } from './schema.js';
interface Props {
    data: MetricWidgetData;
    widgetId?: string;
    topicOverride?: string;
    darkMode?: boolean;
}
declare const MetricWidget: import("svelte").Component<Props, {}, "">;
type MetricWidget = ReturnType<typeof MetricWidget>;
export default MetricWidget;
