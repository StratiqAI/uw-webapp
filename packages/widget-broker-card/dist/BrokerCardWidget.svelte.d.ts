import type { BrokerCardWidgetData } from './schema.js';
import { type DashboardAppTheme } from '@stratiqai/dashboard-widget-sdk';
interface Props {
    data: BrokerCardWidgetData;
    widgetId?: string;
    topicOverride?: string;
    darkMode?: boolean;
    theme?: DashboardAppTheme;
}
declare const BrokerCardWidget: import("svelte").Component<Props, {}, "">;
type BrokerCardWidget = ReturnType<typeof BrokerCardWidget>;
export default BrokerCardWidget;
