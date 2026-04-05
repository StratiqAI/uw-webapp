import type { TableWidgetData } from './schema.js';
import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
type Props = StandardWidgetProps<TableWidgetData>;
declare const TableWidget: import("svelte").Component<Props, {}, "">;
type TableWidget = ReturnType<typeof TableWidget>;
export default TableWidget;
