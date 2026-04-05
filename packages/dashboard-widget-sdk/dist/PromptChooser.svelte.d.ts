/**
 * Searchable list of compatible prompts from the cloud library.
 * Pure UI — the host provides pre-filtered prompts via props.
 */
interface CompatiblePrompt {
    id: string;
    name: string;
    description?: string;
    prompt: string;
    model: string;
    updatedAt: string;
    isTemplate?: boolean;
}
interface Props {
    darkMode?: boolean;
    currentPromptId?: string;
    compatiblePrompts?: CompatiblePrompt[];
    isLoading?: boolean;
    onSelect?: (promptId: string) => void;
    onCreateNew?: () => void;
    onCloneFromSelected?: (promptId: string) => void;
}
declare const PromptChooser: import("svelte").Component<Props, {}, "">;
type PromptChooser = ReturnType<typeof PromptChooser>;
export default PromptChooser;
