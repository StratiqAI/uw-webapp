import type { TitleWidgetData } from './schema.js';
interface Props {
    data: TitleWidgetData;
    widgetId?: string;
    topicOverride?: string;
    darkMode?: boolean;
}
declare const TitleWidget: import("svelte").Component<Props, {}, "">;
type TitleWidget = ReturnType<typeof TitleWidget>;
export default TitleWidget;
