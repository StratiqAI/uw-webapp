# SchemaRegistry Usage Guide

## Overview

`SchemaRegistry` is a **centralized schema management system** that:
1. **Stores** JSON Schema definitions (for UI/AI/DB compatibility)
2. **Compiles** JSON Schema → Zod schemas (for runtime validation)
3. **Validates** data at runtime using Zod
4. **Provides** schema metadata for UI rendering

## Core Purpose

The SchemaRegistry bridges two worlds:
- **JSON Schema** (for storage, AI, and UI generation)
- **Zod** (for runtime validation in TypeScript)

## Key Use Cases

### 1. **Runtime Validation** (Primary Use)

**Location:** `mapStore.ts` (lines 121-134)

When data is published to a topic with an enforced schema, `mapStore` uses SchemaRegistry to validate:

```typescript
// In mapStore.getPublisher()
if (entry.schemaId) {
  const validator = schemaRegistry.getValidator(entry.schemaId);
  if (validator) {
    const result = validator(data);
    
    if (!result.success) {
      console.error(`[MapStore] Validation Failed for ${topic}:`, result.error);
      return; // Reject invalid data
    }
    
    // Use sanitized/parsed data
    data = result.data;
  }
}
```

**Flow:**
1. Topic has schema enforced via `mapStore.enforceTopicSchema(topic, schemaId)`
2. When data is published, `mapStore` gets validator from SchemaRegistry
3. Validator runs Zod validation
4. Invalid data is rejected, valid data is sanitized and stored

---

### 2. **Widget Schema Registration**

**Location:** `widgetSchemaRegistration.ts`

All widget types register their schemas at app startup:

```typescript
// Registers schemas like:
// - widget:paragraph-v1
// - widget:table-v1
// - widget:title-v1
// etc.

schemaRegistry.registerZodSchema(schemaId, schema, {
  name: 'Paragraph Widget',
  description: 'Data schema for paragraph widget'
});
```

**Purpose:**
- Enables validation of widget data
- Allows widgets to enforce data structure
- Provides schema metadata for UI

**Usage in Widgets:**
- Widgets can enforce their schema on their topic
- Invalid data is automatically rejected
- Valid data is sanitized before storage

---

### 3. **Auto-Rendering UI** (AutoDataView)

**Location:** `AutoDataView.svelte`

Uses SchemaRegistry to get JSON Schema for automatic UI generation:

```typescript
// Get JSON Schema for rendering
let rootSchema = $derived(
  !fieldSchema && schemaId ? schemaRegistry.getJsonSchema(schemaId) : null
);
```

**How it works:**
1. Component receives `schemaId` prop
2. Gets JSON Schema from registry
3. Recursively renders fields based on schema structure
4. Handles objects, arrays, primitives automatically

**Rendering Logic:**
- **Objects** → Grid layout with property names and values
- **Arrays of Objects** → Table with columns from schema
- **Arrays of Primitives** → Bulleted list
- **Primitives** → Formatted display (dates, numbers, etc.)

---

### 4. **Schema Widget**

**Location:** `SchemaWidget.svelte`

A dynamic widget that renders any schema-based data:

```typescript
// Get schema definition (includes metadata)
let schemaDefinition = $derived(schemaRegistry.getDefinition(schemaId));

// Enforce schema on topic
onMount(() => {
  if (browser && schemaId) {
    mapStore.enforceTopicSchema(topic, schemaId);
  }
});
```

**Features:**
- Displays schema name and description
- Uses `AutoDataView` for rendering
- Automatically validates incoming data
- Works with any registered schema

---

### 5. **Schema Builder UI**

**Location:** `SchemaBuilder.svelte`

Admin tool for creating and registering schemas:

```typescript
function register() {
  const snapshot = JSON.parse(JSON.stringify(schema)) as DynamicSchemaDefinition;
  schemaRegistry.register(snapshot);
  alert(`Registered ${schema.id} successfully!`);
}
```

**Features:**
- Visual schema editor
- JSON Schema preview
- Register schemas to registry
- Load example schemas

---

### 6. **Schema Discovery & Inspection**

**Location:** Various admin components

**SchemaRegistryView.svelte:**
```typescript
registeredSchemas = schemaRegistry.getAllDefinitions();
```
- Lists all registered schemas
- Shows schema metadata
- Allows browsing schema structure

**StoreInspector.svelte:**
```typescript
let availableSchemas = $derived(schemaRegistry.getAllDefinitions());
```
- Shows which schemas are available
- Helps debug schema issues

**SchemaPublisher.svelte:**
```typescript
let availableSchemas = $derived(schemaRegistry.getAllDefinitions());
```
- Lists schemas for publishing test data
- Helps with development/testing

---

## Registration Methods

### Method 1: Register from JSON Schema

**Use Case:** Schemas created in UI, from AI, or from database

```typescript
const schema: DynamicSchemaDefinition = {
  id: 'my:schema-v1',
  name: 'My Schema',
  jsonSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name']
  },
  source: 'ui' // or 'ai' or 'db'
};

schemaRegistry.register(schema);
```

**What happens:**
1. JSON Schema is stored
2. JSON Schema → Zod compiler converts it
3. Zod validator is created and cached
4. Both formats available for use

---

### Method 2: Register from Zod Schema

**Use Case:** Code-defined schemas (like widget schemas)

```typescript
import { z } from 'zod';

const widgetSchema = z.object({
  title: z.string(),
  content: z.string(),
  markdown: z.boolean()
});

schemaRegistry.registerZodSchema(
  'widget:paragraph-v1',
  widgetSchema,
  {
    name: 'Paragraph Widget',
    description: 'Data schema for paragraph widget'
  }
);
```

**What happens:**
1. Zod schema is stored
2. Zod → JSON Schema converter creates JSON Schema
3. JSON Schema is stored for UI/AI compatibility
4. Both formats available for use

---

## API Reference

### Registration

```typescript
// Register from JSON Schema
schemaRegistry.register(def: DynamicSchemaDefinition): void

// Register from Zod Schema
schemaRegistry.registerZodSchema(
  id: string,
  zodSchema: z.ZodSchema,
  metadata?: { name: string; description?: string }
): void
```

### Retrieval

```typescript
// Get validator (for runtime validation)
getValidator(schemaId: string): Validator | undefined

// Get Zod schema (for programmatic use)
getZodSchema(schemaId: string): z.ZodSchema | undefined

// Get full definition (includes metadata)
getDefinition(schemaId: string): DynamicSchemaDefinition | undefined

// Get JSON Schema (for UI/AI)
getJsonSchema(schemaId: string): JsonSchemaDefinition | undefined

// Get all registered schemas
getAllDefinitions(): DynamicSchemaDefinition[]
```

---

## Integration with MapStore

### Enforcing Schema on Topics

```typescript
// Bind a topic to a schema
mapStore.enforceTopicSchema('widget:paragraph:abc123', 'widget:paragraph-v1');

// Now all data published to this topic is validated
const publisher = mapStore.getPublisher('widget:paragraph:abc123', 'myProducer');
publisher.publish({ title: 'Hello', content: 'World' }); // ✅ Valid
publisher.publish({ invalid: 'data' }); // ❌ Rejected
```

### Finding Topics by Schema

```typescript
// Get all topics using a specific schema
const topics = mapStore.getTopicsBySchema('widget:paragraph-v1');
// Returns: ['widget:paragraph:abc123', 'widget:paragraph:def456', ...]
```

---

## Data Flow Example

### Complete Flow: Widget Data Publishing

1. **Schema Registration** (App Startup)
   ```typescript
   schemaRegistry.registerZodSchema('widget:paragraph-v1', paragraphSchema);
   ```

2. **Widget Initialization**
   ```typescript
   const topic = 'widget:paragraph:abc123';
   mapStore.enforceTopicSchema(topic, 'widget:paragraph-v1');
   ```

3. **Data Publishing**
   ```typescript
   const publisher = mapStore.getPublisher(topic, 'producer');
   publisher.publish({ title: 'Hello', content: 'World', markdown: false });
   ```

4. **Validation** (Automatic)
   - `mapStore` gets validator from `schemaRegistry`
   - Validator checks data against Zod schema
   - If valid: data is sanitized and stored
   - If invalid: data is rejected, error logged

5. **Data Consumption**
   ```typescript
   const stream = mapStore.getStream(topic, 'consumer');
   stream.subscribe(data => {
     // data is guaranteed to match schema
     console.log(data.title, data.content);
   });
   ```

6. **UI Rendering** (Optional)
   ```svelte
   <AutoDataView data={data} schemaId="widget:paragraph-v1" />
   ```

---

## Use Cases Summary

| Use Case | Component | Method Used |
|----------|-----------|-------------|
| **Runtime Validation** | `mapStore.ts` | `getValidator()` |
| **Widget Schemas** | `widgetSchemaRegistration.ts` | `registerZodSchema()` |
| **Auto UI Rendering** | `AutoDataView.svelte` | `getJsonSchema()` |
| **Schema Widget** | `SchemaWidget.svelte` | `getDefinition()`, `enforceTopicSchema()` |
| **Schema Builder** | `SchemaBuilder.svelte` | `register()` |
| **Schema Discovery** | `SchemaRegistryView.svelte` | `getAllDefinitions()` |
| **Admin Tools** | `StoreInspector.svelte`, `SchemaPublisher.svelte` | `getAllDefinitions()` |

---

## Best Practices

### 1. Register Schemas Early

Register all schemas at app startup, before any data flows:

```typescript
// In app initialization
registerWidgetSchemas(); // Registers all widget schemas
registerCustomSchemas(); // Register your custom schemas
```

### 2. Use Consistent Schema IDs

Follow a naming convention:
- Widgets: `widget:{type}-v{version}` (e.g., `widget:paragraph-v1`)
- Custom: `{domain}:{name}-v{version}` (e.g., `cre:property-v1`)

### 3. Enforce Schemas on Topics

Always enforce schemas when setting up topics:

```typescript
// ✅ Good
const topic = 'widget:paragraph:abc123';
mapStore.enforceTopicSchema(topic, 'widget:paragraph-v1');

// ❌ Bad - no validation
const topic = 'widget:paragraph:abc123';
// Missing enforceTopicSchema call
```

### 4. Use TypeScript Types

Generate TypeScript types from Zod schemas:

```typescript
import { z } from 'zod';

const schema = z.object({
  title: z.string(),
  content: z.string()
});

type ParagraphData = z.infer<typeof schema>;
```

### 5. Handle Validation Errors

When publishing, handle potential validation failures:

```typescript
const publisher = mapStore.getPublisher(topic, 'producer');
try {
  publisher.publish(data); // May be rejected if invalid
} catch (error) {
  console.error('Validation failed:', error);
}
```

---

## Architecture Benefits

1. **Type Safety**: Zod schemas provide TypeScript type inference
2. **Runtime Validation**: Invalid data is rejected automatically
3. **UI Generation**: JSON Schema enables automatic UI rendering
4. **AI Compatibility**: JSON Schema works with AI tools
5. **Storage**: JSON Schema can be stored in databases
6. **Single Source of Truth**: One schema definition serves all purposes

---

## Common Patterns

### Pattern 1: Widget with Schema

```typescript
// 1. Define schema
const widgetSchema = z.object({ ... });

// 2. Register at startup
schemaRegistry.registerZodSchema('widget:mytype-v1', widgetSchema);

// 3. Enforce in widget
mapStore.enforceTopicSchema(topic, 'widget:mytype-v1');

// 4. Publish data (validated automatically)
publisher.publish(data);
```

### Pattern 2: Dynamic Schema Widget

```svelte
<script>
  const schemaId = 'my:schema-v1';
  const topic = 'my:topic';
  
  // Enforce schema
  onMount(() => {
    mapStore.enforceTopicSchema(topic, schemaId);
  });
  
  // Get schema for display
  const schema = $derived(schemaRegistry.getDefinition(schemaId));
  
  // Subscribe to data
  const data = useTopic(topic);
</script>

<AutoDataView data={data.current} {schemaId} />
```

### Pattern 3: Schema Builder

```typescript
// User creates schema in UI
const schema = {
  id: 'user:schema-v1',
  name: 'User Schema',
  jsonSchema: { ... }
};

// Register it
schemaRegistry.register(schema);

// Use it immediately
mapStore.enforceTopicSchema('user:data', 'user:schema-v1');
```

---

## Summary

**SchemaRegistry** is the **central nervous system** for schema management:

- ✅ **Validates** data at runtime (via Zod)
- ✅ **Stores** schemas in JSON format (for UI/AI)
- ✅ **Enables** automatic UI generation
- ✅ **Provides** type safety and validation
- ✅ **Bridges** JSON Schema and Zod worlds

It's used throughout the application for:
- Widget data validation
- Auto-rendering UI components
- Schema discovery and inspection
- Admin tools for schema management

The integration with `mapStore` ensures that all data flowing through topics can be validated and typed, creating a robust, type-safe data layer.
