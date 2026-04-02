import type { TableWidgetData } from './schema.js';
interface Props {
    data: TableWidgetData;
    widgetId?: string;
    topicOverride?: string;
    darkMode?: boolean;
}
declare const TableWidget: import("svelte").Component<Props, {}, "">;
type TableWidget = ReturnType<typeof TableWidget>;
export default TableWidget;
