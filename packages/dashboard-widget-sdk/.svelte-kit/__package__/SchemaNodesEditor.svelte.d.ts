/**
     * Recursive editor for JSON Schema object `properties` trees (name, type, nested object/array).
     * Used by PromptEditor for object and array item shapes.
     */
import type { NestedSchemaPropertyNode } from './promptSchemaTypes.js';
interface Props {
    nodes: NestedSchemaPropertyNode[];
    darkMode?: boolean;
    newNestedId: () => string;
    onNodesChange: (next: NestedSchemaPropertyNode[]) => void;
    sectionTitle?: string;
    addButtonLabel?: string;
}
declare const SchemaNodesEditor: import("svelte").Component<Props, {}, "">;
type SchemaNodesEditor = ReturnType<typeof SchemaNodesEditor>;
export default SchemaNodesEditor;
