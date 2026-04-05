import type { BrokerCardWidgetData } from './schema.js';
import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
type Props = StandardWidgetProps<BrokerCardWidgetData>;
declare const BrokerCardWidget: import("svelte").Component<Props, {}, "">;
type BrokerCardWidget = ReturnType<typeof BrokerCardWidget>;
export default BrokerCardWidget;
