import AutoDataView from './AutoDataView.svelte';
interface Props {
    data: unknown;
    schemaId?: string;
    fieldSchema?: Record<string, unknown>;
    darkMode?: boolean;
}
declare const AutoDataView: import("svelte").Component<Props, {}, "">;
type AutoDataView = ReturnType<typeof AutoDataView>;
export default AutoDataView;
