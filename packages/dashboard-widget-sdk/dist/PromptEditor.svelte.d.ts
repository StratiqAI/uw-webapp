interface Props {
    darkMode?: boolean;
    promptName?: string;
    promptDescription?: string;
    userPrompt?: string;
    systemInstruction?: string;
    model?: string;
    responseFormatType?: 'text' | 'json_object' | 'json_schema';
    schemaProperties?: Record<string, Record<string, unknown>>;
    schemaRequired?: string[];
    fieldOrder?: string[];
    googleSearchEnabled?: boolean;
    /** Label above the user prompt field (default “Prompt”). */
    userPromptLabel?: string;
    userPromptPlaceholder?: string;
    userPromptRows?: number;
    /** Hide the user prompt card (e.g. when the host renders prompt elsewhere). */
    hideUserPrompt?: boolean;
    hideResponseFormat?: boolean;
    /** Hide system instruction (e.g. when the host renders it in a tools panel). */
    hideSystemInstruction?: boolean;
    isGenerating?: boolean;
    generateError?: string;
    isSaving?: boolean;
    onGenerate?: () => void;
    onSave?: () => void | Promise<void>;
    onLoadSchemaFromLibrary?: () => void;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    stopSequences?: string;
}
declare const PromptEditor: import("svelte").Component<Props, {}, "promptName" | "promptDescription" | "userPrompt" | "systemInstruction" | "model" | "responseFormatType" | "schemaProperties" | "schemaRequired" | "fieldOrder" | "googleSearchEnabled" | "temperature" | "maxTokens" | "topP" | "frequencyPenalty" | "stopSequences">;
type PromptEditor = ReturnType<typeof PromptEditor>;
export default PromptEditor;
