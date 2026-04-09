interface Props {
    generating: boolean;
    error?: string;
    darkMode?: boolean;
    message?: string;
    status?: string;
}
declare const AiStatusOverlay: import("svelte").Component<Props, {}, "">;
type AiStatusOverlay = ReturnType<typeof AiStatusOverlay>;
export default AiStatusOverlay;
