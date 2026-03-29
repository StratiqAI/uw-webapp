import type { BrokerCardWidgetData } from './schema.js';
interface Props {
    data: BrokerCardWidgetData;
    widgetId?: string;
    topicOverride?: string;
    darkMode?: boolean;
}
declare const BrokerCardWidget: import("svelte").Component<Props, {}, "">;
type BrokerCardWidget = ReturnType<typeof BrokerCardWidget>;
export default BrokerCardWidget;
