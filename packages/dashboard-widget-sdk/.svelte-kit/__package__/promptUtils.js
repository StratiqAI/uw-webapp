/**
 * Pure utility functions for prompt editing and JSON Schema manipulation.
 * Extracted from PromptEditModal.svelte so they can be reused in the SDK's
 * PromptEditor component and by host-app services.
 *
 * All functions are side-effect-free and operate on plain objects.
 */
// ---------------------------------------------------------------------------
// Model options
// ---------------------------------------------------------------------------
export const DEFAULT_AI_MODEL = 'GEMINI_2_5_FLASH';
export const MODEL_OPTIONS = [
    { value: 'GEMINI_3_1_PRO_PREVIEW', label: 'Gemini 3.1 Pro' },
    { value: 'GEMINI_3_1_FLASH_PREVIEW', label: 'Gemini 3.1 Flash' },
    { value: 'GEMINI_3_PRO_PREVIEW', label: 'Gemini 3 Pro' },
    { value: 'GEMINI_3_FLASH_PREVIEW', label: 'Gemini 3 Flash' },
    { value: 'GEMINI_2_5_PRO', label: 'Gemini 2.5 Pro' },
    { value: 'GEMINI_2_5_FLASH', label: 'Gemini 2.5 Flash' },
    { value: 'GEMINI_2_5_FLASH_LITE', label: 'Gemini 2.5 Flash Lite' }
];
const VALID_MODEL_VALUES = new Set(MODEL_OPTIONS.map((o) => o.value));
export function normalizeToAIModel(value) {
    if (value && VALID_MODEL_VALUES.has(value))
        return value;
    if (value === 'gemini-3.1-pro-preview')
        return 'GEMINI_3_1_PRO_PREVIEW';
    if (value === 'gemini-3.1-flash-preview')
        return 'GEMINI_3_1_FLASH_PREVIEW';
    if (value === 'gemini-3-flash-preview')
        return 'GEMINI_3_FLASH_PREVIEW';
    if (value === 'gemini-3-pro-preview')
        return 'GEMINI_3_PRO_PREVIEW';
    return DEFAULT_AI_MODEL;
}
// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------
export function newNestedId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `nested_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
// ---------------------------------------------------------------------------
// Prompt variable extraction
// ---------------------------------------------------------------------------
export function extractPromptVariables(text) {
    if (!text?.trim())
        return [];
    const seen = new Set();
    const result = [];
    const doubleRegex = /\{\{([^}]+)\}\}/g;
    const singleRegex = /\{([^{}]+)\}/g;
    let m;
    while ((m = doubleRegex.exec(text)) !== null) {
        const name = m[1].trim();
        if (name && !seen.has(name)) {
            seen.add(name);
            result.push({ name, syntax: `{{${name}}}` });
        }
    }
    while ((m = singleRegex.exec(text)) !== null) {
        const name = m[1].trim();
        if (name && !seen.has(name)) {
            seen.add(name);
            result.push({ name, syntax: `{${name}}` });
        }
    }
    return result;
}
// ---------------------------------------------------------------------------
// Schema builder functions
// ---------------------------------------------------------------------------
/** Returns ordered entries: fieldOrder items first, then any remaining keys. */
export function getOrderedFieldEntries(properties, fieldOrder) {
    const entries = [];
    for (const fieldName of fieldOrder) {
        if (properties[fieldName]) {
            entries.push([fieldName, properties[fieldName]]);
        }
    }
    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
        if (!fieldOrder.includes(fieldName)) {
            entries.push([fieldName, fieldSchema]);
        }
    }
    return entries;
}
export function addSchemaField(state, isReasoning = false) {
    const fieldName = isReasoning
        ? 'reasoning'
        : `field_${Object.keys(state.properties).length + 1}`;
    if (isReasoning && state.properties[fieldName]) {
        return state;
    }
    const baseField = { type: 'string' };
    if (isReasoning) {
        baseField.description =
            'A step-by-step internal monologue explaining the logic and reasoning behind the values chosen for all other fields.';
    }
    let properties;
    let fieldOrder;
    if (isReasoning) {
        properties = { [fieldName]: baseField };
        for (const [key, value] of Object.entries(state.properties)) {
            properties[key] = value;
        }
        fieldOrder = [fieldName, ...state.fieldOrder];
    }
    else {
        properties = { ...state.properties, [fieldName]: baseField };
        fieldOrder = [...state.fieldOrder, fieldName];
    }
    const required = state.required.includes(fieldName)
        ? [...state.required]
        : [...state.required, fieldName];
    return { properties, fieldOrder, required };
}
export function removeSchemaField(state, fieldName) {
    const properties = { ...state.properties };
    delete properties[fieldName];
    return {
        properties,
        fieldOrder: state.fieldOrder.filter((name) => name !== fieldName),
        required: state.required.filter((r) => r !== fieldName)
    };
}
export function updateSchemaField(properties, fieldName, updates) {
    if (!properties[fieldName])
        return properties;
    return {
        ...properties,
        [fieldName]: { ...properties[fieldName], ...updates }
    };
}
export function updateSchemaFieldType(properties, fieldName, type) {
    if (!properties[fieldName])
        return properties;
    const current = properties[fieldName];
    const updated = { ...current, type };
    if (type !== 'string') {
        delete updated.enum;
        delete updated.pattern;
    }
    if (type !== 'number' && type !== 'integer') {
        delete updated.minimum;
        delete updated.maximum;
    }
    const t = type;
    if (t === 'object') {
        updated.objectChildren =
            current.objectChildren ?? [];
        delete updated.itemSchema;
    }
    else if (t === 'array') {
        updated.itemSchema =
            current.itemSchema ??
                { type: 'string' };
        delete updated.objectChildren;
    }
    else {
        delete updated.objectChildren;
        delete updated.itemSchema;
    }
    return { ...properties, [fieldName]: updated };
}
export function toggleSchemaFieldRequired(required, fieldName) {
    return required.includes(fieldName)
        ? required.filter((r) => r !== fieldName)
        : [...required, fieldName];
}
export function renameSchemaField(state, oldName, newName) {
    if (!newName || newName === oldName)
        return state;
    if (state.properties[newName]) {
        return { ...state, error: 'A field with this name already exists' };
    }
    const wasRequired = state.required.includes(oldName);
    const fieldData = state.properties[oldName];
    const oldIndex = state.fieldOrder.indexOf(oldName);
    const properties = { ...state.properties };
    delete properties[oldName];
    properties[newName] = fieldData;
    const filteredOrder = state.fieldOrder.filter((name) => name !== oldName);
    const fieldOrder = [...filteredOrder.slice(0, oldIndex), newName, ...filteredOrder.slice(oldIndex)];
    let required = state.required.filter((r) => r !== oldName);
    if (wasRequired) {
        required = [...required, newName];
    }
    return { properties, fieldOrder, required };
}
// ---------------------------------------------------------------------------
// Nested schema tree <-> JSON Schema converters
// ---------------------------------------------------------------------------
export function nestedNodeToJsonSchema(node) {
    const base = {
        type: node.type,
        ...(node.description && { description: node.description }),
        ...(node.enum && node.enum.length > 0 && { enum: node.enum }),
        ...(node.minimum !== undefined && { minimum: node.minimum }),
        ...(node.maximum !== undefined && { maximum: node.maximum })
    };
    if (node.type === 'object') {
        const properties = {};
        const required = [];
        for (const child of node.children ?? []) {
            if (child.name.trim()) {
                properties[child.name.trim()] = nestedNodeToJsonSchema(child);
                if (child.required)
                    required.push(child.name.trim());
            }
        }
        base.properties = properties;
        if (required.length > 0)
            base.required = required;
        base.additionalProperties = false;
    }
    else if (node.type === 'array' && node.itemSchema) {
        base.items = nestedItemSchemaToJsonSchema(node.itemSchema);
    }
    return base;
}
export function nestedItemSchemaToJsonSchema(item) {
    const base = {
        type: item.type,
        ...(item.description && { description: item.description }),
        ...(item.enum && item.enum.length > 0 && { enum: item.enum }),
        ...(item.minimum !== undefined && { minimum: item.minimum }),
        ...(item.maximum !== undefined && { maximum: item.maximum })
    };
    if (item.type === 'object') {
        const properties = {};
        const required = [];
        for (const child of item.properties ?? []) {
            if (child.name.trim()) {
                properties[child.name.trim()] = nestedNodeToJsonSchema(child);
                if (child.required)
                    required.push(child.name.trim());
            }
        }
        base.properties = properties;
        if (required.length > 0)
            base.required = required;
        base.additionalProperties = false;
    }
    else if (item.type === 'array' && item.items) {
        base.items = nestedItemSchemaToJsonSchema(item.items);
    }
    return base;
}
/** Convert a flat top-level field state (with objectChildren / itemSchema) to JSON Schema. */
export function topLevelFieldToJsonSchema(field) {
    const t = field.type || 'string';
    const description = field.description;
    const common = description ? { description } : {};
    if (t === 'object') {
        const nodes = field.objectChildren ?? [];
        const properties = {};
        const required = [];
        for (const child of nodes) {
            if (child.name?.trim()) {
                const nm = child.name.trim();
                properties[nm] = nestedNodeToJsonSchema(child);
                if (child.required)
                    required.push(nm);
            }
        }
        return {
            type: 'object',
            ...common,
            properties,
            ...(required.length > 0 ? { required } : {}),
            additionalProperties: false
        };
    }
    if (t === 'array') {
        const items = field.itemSchema
            ? nestedItemSchemaToJsonSchema(field.itemSchema)
            : { type: 'string' };
        return { type: 'array', ...common, items };
    }
    if (t === 'string') {
        const out = { type: 'string', ...common };
        const en = field.enum;
        if (en?.length)
            out.enum = en;
        if (field.pattern)
            out.pattern = field.pattern;
        return out;
    }
    if (t === 'number' || t === 'integer') {
        const out = { type: t, ...common };
        if (field.minimum !== undefined)
            out.minimum = field.minimum;
        if (field.maximum !== undefined)
            out.maximum = field.maximum;
        return out;
    }
    if (t === 'boolean') {
        return { type: 'boolean', ...common };
    }
    return { type: 'string', ...common };
}
/** Build the full JSON Schema preview object from the current field state. */
export function buildSchemaPreview(properties, required) {
    const schemaProperties = {};
    for (const [key, field] of Object.entries(properties)) {
        schemaProperties[key] = topLevelFieldToJsonSchema(field);
    }
    return {
        type: 'object',
        properties: schemaProperties,
        required,
        additionalProperties: false,
        $schema: 'http://json-schema.org/draft-07/schema#'
    };
}
// ---------------------------------------------------------------------------
// JSON Schema -> tree node converters (for loading saved schemas into the editor)
// ---------------------------------------------------------------------------
export function jsonSchemaToPropertyNode(id, name, def, required) {
    const nodeType = def.type || 'string';
    const node = {
        id,
        name,
        type: nodeType,
        required,
        description: def.description || '',
        enum: Array.isArray(def.enum) ? def.enum : undefined,
        minimum: def.minimum,
        maximum: def.maximum
    };
    if (nodeType === 'object' && def.properties && typeof def.properties === 'object') {
        const requiredList = def.required || [];
        node.children = Object.entries(def.properties).map(([n, d]) => jsonSchemaToPropertyNode(newNestedId(), n, d, requiredList.includes(n)));
    }
    else if (nodeType === 'array' && def.items && typeof def.items === 'object') {
        node.itemSchema = jsonSchemaToItemSchema(def.items);
    }
    return node;
}
export function jsonSchemaToItemSchema(def) {
    const type = def.type || 'string';
    const item = {
        type,
        description: def.description,
        enum: Array.isArray(def.enum) ? def.enum : undefined,
        minimum: def.minimum,
        maximum: def.maximum
    };
    if (type === 'object' && def.properties && typeof def.properties === 'object') {
        const requiredList = def.required || [];
        item.properties = Object.entries(def.properties).map(([n, d]) => jsonSchemaToPropertyNode(newNestedId(), n, d, requiredList.includes(n)));
    }
    else if (type === 'array' && def.items && typeof def.items === 'object') {
        item.items = jsonSchemaToItemSchema(def.items);
    }
    return item;
}
/** Convert a JSON Schema property definition into flat editor field state. */
export function flatFieldFromJsonSchemaFragment(def) {
    const node = jsonSchemaToPropertyNode(newNestedId(), '_', def, false);
    const base = {
        type: node.type,
        description: node.description || '',
        ...(node.enum?.length ? { enum: node.enum } : {}),
        ...(node.minimum !== undefined ? { minimum: node.minimum } : {}),
        ...(node.maximum !== undefined ? { maximum: node.maximum } : {})
    };
    if (node.type === 'object') {
        base.objectChildren = node.children ?? [];
    }
    if (node.type === 'array' && node.itemSchema) {
        base.itemSchema = node.itemSchema;
    }
    return base;
}
/**
 * Parse a full JSON Schema definition into SchemaBuilderState
 * (the inverse of buildSchemaPreview).
 */
export function parseJsonSchemaToBuilderState(schemaDefRaw) {
    const schema = typeof schemaDefRaw === 'string'
        ? (() => {
            try {
                return JSON.parse(schemaDefRaw);
            }
            catch {
                return {};
            }
        })()
        : schemaDefRaw;
    if (schema && typeof schema === 'object' && schema.properties) {
        const props = schema.properties;
        const properties = {};
        for (const [key, def] of Object.entries(props)) {
            properties[key] = flatFieldFromJsonSchemaFragment(def);
        }
        return {
            properties,
            required: Array.isArray(schema.required) ? [...schema.required] : [],
            fieldOrder: Object.keys(props)
        };
    }
    return { properties: {}, required: [], fieldOrder: [] };
}
