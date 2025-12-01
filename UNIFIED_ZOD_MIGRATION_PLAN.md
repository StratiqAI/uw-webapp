# Unified Migration Plan: Zod + JSON Schema Hybrid Architecture

## Evaluation of Both Approaches

### My Original Approach
**Strengths:**
- ✅ FieldDefinition is UI-friendly (simple, intuitive)
- ✅ Backward compatible with existing Schema Builder
- ✅ Direct Zod support for code-defined schemas

**Weaknesses:**
- ❌ Custom format (not standard)
- ❌ Requires conversion for AI (FieldDefinition → JSON Schema)
- ❌ Not directly compatible with OpenAI Structured Outputs

### Other AI's Approach
**Strengths:**
- ✅ JSON Schema is industry standard (Draft 07)
- ✅ Direct compatibility with OpenAI Structured Outputs
- ✅ Well-documented and tooling support
- ✅ Can be stored in database easily
- ✅ Better error handling with ZodError

**Weaknesses:**
- ❌ JSON Schema is more complex for UI building
- ❌ Requires compilation step (JSON Schema → Zod)

### Best Combined Approach
**Use JSON Schema as storage format, FieldDefinition as UI abstraction layer, Zod as runtime validator**

---

## Unified Architecture

### Core Principle: Simplified Two-Layer System

```
┌─────────────────────────────────────────┐
│  UI Layer: JSON Schema Builder          │  (Build JSON Schema directly)
│  ↓ Store                                │
│  Storage Layer: JSON Schema             │  (Standard, AI-compatible)
│  ↓ Compile                              │
│  Runtime Layer: Zod Schema              │  (Powerful validation)
└─────────────────────────────────────────┘
```

**Decision: Use JSON Schema directly - no FieldDefinition abstraction needed!**

### Why JSON Schema Direct?
- ✅ **Simpler** - No conversion layer (FieldDefinition → JSON Schema)
- ✅ **Standard** - Industry standard format (JSON Schema Draft 07)
- ✅ **AI-ready** - Direct compatibility with OpenAI Structured Outputs
- ✅ **More features** - Full JSON Schema feature set (format, default, examples)
- ✅ **Less code** - Fewer abstractions to maintain
- ✅ **Future-proof** - Works with any JSON Schema tooling

**Trade-off:** Slightly more nested structure (`properties.title` vs `fields[0].name`), but this is minor and actually more explicit.

### 1. Updated Type Definitions

**File:** `src/lib/types/models.ts`

```typescript
import { z } from 'zod';

// ===== JSON Schema (Standard Format) =====
// JSON Schema Draft 07 - compatible with OpenAI Structured Outputs
// This is the ONLY format we use - no FieldDefinition abstraction needed!
export interface JsonSchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';
  description?: string;
  properties?: Record<string, JsonSchemaDefinition>; // For objects
  required?: string[];                               // For objects
  items?: JsonSchemaDefinition;                      // For arrays
  enum?: string[];                                   // For enums
  minimum?: number;                                  // For numbers
  maximum?: number;
  default?: unknown;                                 // Default values
  format?: string;                                   // e.g., 'date-time', 'email', 'uri'
  examples?: unknown[];                              // Example values
  title?: string;                                    // Human-readable title
}

// ===== DynamicSchemaDefinition =====
// Simple wrapper around JSON Schema with metadata
export interface DynamicSchemaDefinition {
  id: string;                    // e.g., "widget:paragraph-v1"
  name: string;                  // Human-readable name
  description?: string;
  
  // Storage: JSON Schema (standard format) - root must be type: 'object'
  jsonSchema: JsonSchemaDefinition;
  
  // Metadata
  version?: string;
  createdAt?: number;
  updatedAt?: number;
  source?: 'ui' | 'code' | 'ai';  // How was this schema created?
}

// ===== Envelope (unchanged) =====
export interface Envelope<T = unknown> {
  topic: string;
  schemaId?: string;
  timestamp: number;
  data: T;
}
```

---

## Updated SchemaRegistry

**File:** `src/lib/stores/SchemaRegistry.ts`

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { DynamicSchemaDefinition, JsonSchemaDefinition, FieldDefinition } from '$lib/types/models';

type Validator = (data: unknown) => { success: boolean; data?: any; error?: any };

export class SchemaRegistry {
  // Runtime: Store Zod schemas for validation
  private zodSchemas = new Map<string, z.ZodSchema>();
  private validators = new Map<string, Validator>();
  
  // Storage: Keep JSON Schema for serialization/UI
  private definitions = new Map<string, DynamicSchemaDefinition>();

  // ===== JSON Schema → Zod Compiler =====
  /**
   * Recursively compile JSON Schema to Zod schema
   */
  private compileJsonSchemaToZod(node: JsonSchemaDefinition): z.ZodTypeAny {
    let schema: z.ZodTypeAny;

    switch (node.type) {
      case 'string':
        schema = node.enum 
          ? z.enum(node.enum as [string, ...string[]])
          : z.string();
        
        // Handle format constraints
        if (node.format === 'date-time') {
          schema = z.string().datetime();
        } else if (node.format === 'email') {
          schema = z.string().email();
        }
        break;

      case 'number':
      case 'integer':
        let numSchema = z.number();
        if (node.minimum !== undefined) numSchema = numSchema.min(node.minimum);
        if (node.maximum !== undefined) numSchema = numSchema.max(node.maximum);
        schema = numSchema;
        break;

      case 'boolean':
        schema = z.boolean();
        break;

      case 'object':
        const shape: Record<string, z.ZodTypeAny> = {};
        if (node.properties) {
          for (const [key, propDef] of Object.entries(node.properties)) {
            let propSchema = this.compileJsonSchemaToZod(propDef);
            
            // Handle required/optional
            if (!node.required?.includes(key)) {
              propSchema = propSchema.optional();
            }
            
            shape[key] = propSchema;
          }
        }
        schema = z.object(shape).passthrough(); // Allow extra keys for forward compatibility
        break;

      case 'array':
        schema = node.items 
          ? z.array(this.compileJsonSchemaToZod(node.items))
          : z.array(z.any());
        break;

      default:
        schema = z.any();
    }

    // Add description if present
    if (node.description) {
      schema = schema.describe(node.description);
    }

    return schema;
  }

  // ===== Registration Methods =====

  /**
   * Method 1: Register from JSON Schema (UI/AI/DB-created schemas)
   * Compiles: JSON Schema → Zod
   */
  register(def: DynamicSchemaDefinition) {
    // Store definition
    this.definitions.set(def.id, def);
    
    // Compile JSON Schema → Zod
    const zodSchema = this.compileJsonSchemaToZod(def.jsonSchema);
    
    // Store Zod schema and validator
    this.zodSchemas.set(def.id, zodSchema);
    this.validators.set(def.id, (data) => zodSchema.safeParse(data));
  }

  /**
   * Method 3: Register Zod schema directly (code-defined schemas)
   * Converts: Zod → JSON Schema (for storage)
   */
  registerZodSchema(
    id: string,
    zodSchema: z.ZodSchema,
    metadata?: { name: string; description?: string }
  ) {
    // Convert Zod → JSON Schema (for storage/serialization)
    const jsonSchema = zodToJsonSchema(zodSchema, {
      name: id,
      $refStrategy: 'none'
    }) as JsonSchemaDefinition;

    // Remove $schema property if present
    const { $schema, ...cleanJsonSchema } = jsonSchema as any;

    // Store definition
    const def: DynamicSchemaDefinition = {
      id,
      name: metadata?.name || id,
      description: metadata?.description,
      jsonSchema: cleanJsonSchema,
      source: 'code'
    };
    
    this.definitions.set(id, def);
    
    // Store Zod schema and validator
    this.zodSchemas.set(id, zodSchema);
    this.validators.set(id, (data) => zodSchema.safeParse(data));
  }

  // ===== Retrieval Methods =====

  getValidator(schemaId: string): Validator | undefined {
    return this.validators.get(schemaId);
  }

  getZodSchema(schemaId: string): z.ZodSchema | undefined {
    return this.zodSchemas.get(schemaId);
  }

  getDefinition(schemaId: string): DynamicSchemaDefinition | undefined {
    return this.definitions.get(schemaId);
  }

  getJsonSchema(schemaId: string): JsonSchemaDefinition | undefined {
    return this.definitions.get(schemaId)?.jsonSchema;
  }

  getAllDefinitions(): DynamicSchemaDefinition[] {
    return Array.from(this.definitions.values());
  }
}

export const schemaRegistry = new SchemaRegistry();
```

---

## Updated MapStore (Enhanced Error Handling)

**File:** `src/lib/stores/MapStore.ts`

```typescript
// ... existing imports ...
import { ZodError } from 'zod';

// ... existing code ...

getPublisher(topic: string, producerId: string) {
  const entry = this.ensure(topic);
  entry.producers.add(producerId);

  return {
    publish: (data: unknown) => {
      // Validation Gate
      if (entry.schemaId) {
        const validator = schemaRegistry.getValidator(entry.schemaId);
        if (validator) {
          const result = validator(data);

          if (!result.success) {
            const zodError = result.error as ZodError;
            
            // Enhanced error logging with Zod's formatted errors
            console.error(`[MapStore] Validation Failed for ${topic}:`, zodError.format());
            console.error(`[MapStore] Error details:`, zodError.errors);
            
            // Future: Publish to 'sys:errors' topic for UI error handling
            // const errorPub = this.getPublisher('sys:errors', 'mapstore');
            // errorPub.publish({
            //   topic,
            //   schemaId: entry.schemaId,
            //   error: zodError.format(),
            //   timestamp: Date.now()
            // });
            
            return;
          }

          // Use sanitized/parsed data from Zod
          data = result.data;
        }
      }

      // Update Local Store
      entry.lastValue = data;
      entry.store.set(data);

      // Broadcast to other tabs
      if (this.channel) {
        try {
          this.channel.postMessage({
            topic,
            data,
            originId: this.instanceId
          } as BroadcastMessage);
        } catch (e) {
          console.warn(`[MapStore] Data not serializable for topic ${topic}, skipping tab sync:`, e);
        }
      }
    },
    dispose: () => {
      entry.producers.delete(producerId);
    }
  };
}
```

---

## Updated Schema Builder UI

**File:** `src/lib/components/admin/SchemaBuilder.svelte`

The Schema Builder now builds JSON Schema directly:

```typescript
let schema: DynamicSchemaDefinition = $state({
  id: 'my:schema-v1',
  name: 'My Schema',
  jsonSchema: {
    type: 'object',
    properties: {},
    required: []
  }
});

function addField(name: string, type: string, required: boolean) {
  schema.jsonSchema.properties[name] = { type };
  if (required && !schema.jsonSchema.required) {
    schema.jsonSchema.required = [];
  }
  if (required) {
    schema.jsonSchema.required.push(name);
  }
}

function register() {
  try {
    schemaRegistry.register(schema);
    alert(`Registered ${schema.id} successfully!`);
  } catch (e: any) {
    alert('Error compiling schema: ' + (e?.message || String(e)));
  }
}
```

**Complexity: About the same!** The form inputs are identical, we just store in JSON Schema format directly.

---

## Implementation Plan

### Phase 1: Core Infrastructure

#### Step 1.1: Update Type Definitions
- [ ] Add `JsonSchemaDefinition` interface (JSON Schema Draft 07)
- [ ] Update `DynamicSchemaDefinition` to use `jsonSchema` as primary storage
- [ ] Remove `FieldDefinition` (no longer needed - use JSON Schema directly)
- [ ] Add `source` field to track schema origin

#### Step 1.2: Update SchemaRegistry
- [ ] Add `compileJsonSchemaToZod()` method
- [ ] Add `registerZodSchema()` for direct Zod registration
- [ ] Update `register()` to accept JSON Schema directly
- [ ] Add `getZodSchema()` method
- [ ] Add `getJsonSchema()` method
- [ ] Remove `fieldDefinitionToJsonSchema()` converter (no longer needed)

#### Step 1.3: Update MapStore
- [ ] Import `ZodError` from 'zod'
- [ ] Enhance error logging with `zodError.format()`
- [ ] Add detailed error information
- [ ] (Optional) Add error publishing to 'sys:errors' topic

### Phase 2: Widget Schema Migration

#### Step 2.1: Register Widget Schemas
- [ ] Create `registerWidgetSchemas()` function
- [ ] Register all 8 widget schemas using `registerZodSchema()`
- [ ] Test registration and validation
- [ ] Verify JSON Schema conversion works

#### Step 2.2: Test Validation
- [ ] Test each widget type with valid data
- [ ] Test each widget type with invalid data
- [ ] Verify ZodError messages are helpful
- [ ] Test schema enforcement in MapStore

### Phase 3: UI Updates

#### Step 3.1: Update Schema Builder
- [ ] Update Schema Builder to build JSON Schema directly
- [ ] Update FieldRow component to work with JSON Schema structure
- [ ] Update field addition/removal logic for JSON Schema
- [ ] Test registration flow

#### Step 3.2: Update Schema Registry View
- [ ] Display JSON Schema in addition to FieldDefinition
- [ ] Show schema source (ui/code/ai)
- [ ] Add "Export JSON Schema" button

### Phase 4: AI Integration (Future)

#### Step 4.1: Direct OpenAI Integration
- [ ] Use `jsonSchema` directly for OpenAI Structured Outputs
- [ ] No conversion needed (already JSON Schema!)
- [ ] Test AI-generated schemas

---

## Benefits of This Unified Approach

### 1. **Simplified Architecture**
- ✅ JSON Schema directly in UI (no abstraction layer)
- ✅ Standard JSON Schema for storage/AI compatibility
- ✅ Powerful Zod validation at runtime
- ✅ Direct Zod support for code-defined schemas

### 2. **AI-Ready**
- ✅ JSON Schema is native format for OpenAI Structured Outputs
- ✅ No conversion needed: `def.jsonSchema` → OpenAI API
- ✅ AI-generated schemas can be registered directly

### 3. **Standard & Future-Proof**
- ✅ JSON Schema Draft 07 is industry standard
- ✅ Tooling support (validators, generators, etc.)
- ✅ Database-friendly (can store JSON Schema as JSON)

### 4. **Better Error Handling**
- ✅ ZodError provides detailed, formatted error messages
- ✅ Field-level error reporting
- ✅ Better debugging experience

### 5. **Simpler Codebase**
- ✅ One format (JSON Schema) instead of two
- ✅ No conversion logic needed
- ✅ Less code to maintain
- ✅ Fewer potential bugs

---

## Example Usage

### Registering Widget Schema (Code-Defined)
```typescript
import { schemaRegistry } from '$lib/stores/SchemaRegistry';
import { ParagraphWidgetDataSchema } from '$lib/dashboard/types/widgetSchemas';

// Direct Zod registration
schemaRegistry.registerZodSchema(
  'widget:paragraph-v1',
  ParagraphWidgetDataSchema,
  {
    name: 'Paragraph Widget Data',
    description: 'Schema for paragraph widget content'
  }
);

// Automatically:
// 1. Stores Zod schema for validation
// 2. Converts to JSON Schema for storage
// 3. Available for OpenAI Structured Outputs
```

### Registering from UI (JSON Schema)
```typescript
// Schema Builder creates JSON Schema directly
const schema: DynamicSchemaDefinition = {
  id: 'my:schema-v1',
  name: 'My Schema',
  jsonSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      count: { type: 'number', minimum: 0 }
    },
    required: ['title']
  }
};

schemaRegistry.register(schema);
// Compiles: JSON Schema → Zod
```

### Using with OpenAI
```typescript
// Get JSON Schema directly (no conversion needed!)
const def = schemaRegistry.getDefinition('widget:paragraph-v1');
const jsonSchema = def.jsonSchema;

// Use with OpenAI Structured Outputs
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: def.id,
      schema: jsonSchema,
      strict: true
    }
  }
});
```

### Enhanced Error Handling
```typescript
// MapStore automatically uses ZodError
const pub = mapStore.getPublisher('my:topic', 'producer');
pub.publish({ invalid: 'data' }); // Invalid!

// Console shows:
// [MapStore] Validation Failed for my:topic: {
//   title: { _errors: ['Required'] },
//   count: { _errors: ['Expected number, received string'] }
// }
```

---

## Migration Checklist Update

Update `MIGRATION_CHECKLIST.md` Phase 1.1 to reflect this unified approach:

- [x] Create `JsonSchemaDefinition` interface (JSON Schema Draft 07)
- [ ] Create `compileJsonSchemaToZod()` compiler
- [ ] Create `registerZodSchema()` method
- [ ] Update `register()` to accept JSON Schema directly
- [ ] Remove `FieldDefinition` abstraction (use JSON Schema directly)
- [ ] Update Schema Builder UI to build JSON Schema
- [ ] Add enhanced error handling with ZodError
- [ ] Test both registration methods (JSON Schema and Zod)

---

## Conclusion

This unified approach uses:
- **JSON Schema** directly (no abstraction layer)
- **Zod** for powerful runtime validation

**Result**: A simple, standard-compliant, AI-ready schema system with minimal complexity.

### Key Decision: **No FieldDefinition Abstraction**

**Why?**
- JSON Schema is not significantly harder to build in UI
- Eliminates conversion layer (simpler codebase)
- Direct AI compatibility (no conversion needed)
- Standard format (better tooling support)
- More features available (format, default, examples)

**Trade-off:** Slightly more nested structure, but this is minor and actually more explicit.

