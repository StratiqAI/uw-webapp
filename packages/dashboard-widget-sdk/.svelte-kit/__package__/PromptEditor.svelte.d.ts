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
    hideResponseFormat?: boolean;
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
declare const PromptEditor: import("svelte").Component<Props, {}, "promptName" | "promptDescription" | "userPrompt" | "systemInstruction" | "model" | "responseFormatType" | "schemaProperties" | "schemaRequired" | "fieldOrder" | "temperature" | "maxTokens" | "topP" | "frequencyPenalty" | "stopSequences">;
type PromptEditor = ReturnType<typeof PromptEditor>;
export default PromptEditor;
