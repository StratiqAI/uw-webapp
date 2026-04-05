import type { Snippet } from 'svelte';
import type { DashboardAppTheme } from './types.js';
interface Props {
    kind: string;
    widgetId: string;
    darkMode?: boolean;
    theme?: DashboardAppTheme;
    topicOverride?: string;
    schemaId?: string;
    externalData?: {
        isLoading: boolean;
        error: string | null;
        refresh?: () => void;
    };
    onApply: () => void;
    onCancel: () => void;
    userFields?: Snippet;
}
declare const WidgetConfigureBack: import("svelte").Component<Props, {}, "">;
type WidgetConfigureBack = ReturnType<typeof WidgetConfigureBack>;
export default WidgetConfigureBack;
