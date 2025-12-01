# Migration Plan: Using Zod Schemas Directly in DynamicSchemaDefinition

## Overview
Modify `DynamicSchemaDefinition` to support Zod schemas directly while maintaining backward compatibility with FieldDefinition for UI-based schema building.

## Proposed Architecture

### Option A: Hybrid Approach (Recommended)
**Keep FieldDefinition for UI, add Zod support for code-defined schemas**

**Benefits:**
- ✅ UI-friendly FieldDefinition for Schema Builder
- ✅ Direct Zod support for code-defined schemas (widget schemas)
- ✅ JSON-serializable (FieldDefinition)
- ✅ Full Zod validation power
- ✅ Backward compatible

**Structure:**
```typescript
export interface DynamicSchemaDefinition {
  id: string;
  name: string;
  
  // Option 1: FieldDefinition (for UI-created schemas)
  fields?: FieldDefinition[];
  
  // Option 2: Zod Schema (for code-defined schemas)
  zodSchema?: z.ZodSchema;
  
  // Option 3: JSON Schema (for storage/serialization)
  jsonSchema?: Record<string, unknown>;
}
```

### Option B: Zod-Only Approach
**Replace FieldDefinition entirely with Zod schemas**

**Benefits:**
- ✅ Single source of truth (Zod)
- ✅ Full Zod feature set
- ✅ Type inference from Zod
- ✅ Better validation messages

**Challenges:**
- ❌ Zod schemas aren't JSON-serializable
- ❌ Schema Builder UI becomes complex (need to build Zod programmatically)
- ❌ Need serialization layer (zodToJsonSchema)

---

## Recommended: Hybrid Approach (Option A)

### Updated Type Definitions

```typescript
export interface DynamicSchemaDefinition {
  id: string;
  name: string;
  description?: string;
  
  // For UI-created schemas (JSON-serializable)
  fields?: FieldDefinition[];
  
  // For code-defined schemas (direct Zod)
  zodSchema?: z.ZodSchema;
  
  // For storage/serialization (derived from Zod)
  jsonSchema?: Record<string, unknown>;
  
  // Metadata
  version?: string;
  createdAt?: number;
  updatedAt?: number;
}
```

### Updated SchemaRegistry

```typescript
export class SchemaRegistry {
  private validators = new Map<string, Validator>();
  private definitions = new Map<string, DynamicSchemaDefinition>();
  private zodSchemas = new Map<string, z.ZodSchema>(); // NEW: Store Zod directly

  /**
   * Register a schema from FieldDefinition (UI-created)
   */
  register(def: DynamicSchemaDefinition) {
    if (def.fields) {
      // Compile FieldDefinition → Zod
      const zodSchema = this.buildZodFromFields(def.fields);
      this.registerZodSchema(def.id, zodSchema, def);
    } else if (def.zodSchema) {
      // Register Zod schema directly
      this.registerZodSchema(def.id, def.zodSchema, def);
    } else {
      throw new Error('Schema must have either fields or zodSchema');
    }
  }

  /**
   * Register a Zod schema directly (for code-defined schemas)
   */
  registerZodSchema(
    id: string,
    zodSchema: z.ZodSchema,
    metadata?: Partial<DynamicSchemaDefinition>
  ) {
    // Store Zod schema
    this.zodSchemas.set(id, zodSchema);
    
    // Create validator
    this.validators.set(id, (data) => zodSchema.safeParse(data));
    
    // Store definition with JSON Schema for serialization
    const jsonSchema = zodToJsonSchema(zodSchema, { name: id });
    this.definitions.set(id, {
      id,
      name: metadata?.name || id,
      jsonSchema: jsonSchema as Record<string, unknown>,
      zodSchema, // Store reference (not serializable, but available at runtime)
      ...metadata
    });
  }

  /**
   * Get Zod schema directly (for advanced use cases)
   */
  getZodSchema(schemaId: string): z.ZodSchema | undefined {
    return this.zodSchemas.get(schemaId);
  }

  // ... rest of methods
}
```

---

## Impact Analysis

### ✅ SchemaRegistry Changes

**What Changes:**
1. Add `zodSchemas` Map to store Zod schemas directly
2. Add `registerZodSchema()` method for direct Zod registration
3. Add `getZodSchema()` method to retrieve Zod schemas
4. Keep `buildZodType()` for FieldDefinition → Zod conversion
5. Use `zodToJsonSchema` for serialization

**What Stays the Same:**
- `register()` method (now handles both FieldDefinition and Zod)
- `getValidator()` method (unchanged)
- `getDefinition()` method (unchanged)
- Validation logic (unchanged)

### ✅ MapStore Changes

**Impact: MINIMAL** ✅

**What Changes:**
- Nothing! MapStore already uses validators from SchemaRegistry
- Validators are already Zod-based (via `safeParse`)
- No changes needed to MapStore

**Current Flow:**
```
MapStore.publish() 
  → schemaRegistry.getValidator(schemaId)
  → validator(data) (which calls zodSchema.safeParse)
  → Validation result
```

**After Migration:**
```
MapStore.publish() 
  → schemaRegistry.getValidator(schemaId) (same)
  → validator(data) (same - still Zod-based)
  → Validation result (same)
```

### ✅ Schema Builder UI Changes

**What Changes:**
- Keep FieldDefinition-based UI (no changes needed)
- Optionally add "Import from Zod" feature
- Optionally add "Export as Zod" feature

**What Stays the Same:**
- FieldRow component (unchanged)
- SchemaBuilder component (unchanged)
- FieldDefinition structure (unchanged)

### ✅ Widget Schema Migration

**What Changes:**
- Can now register Zod schemas directly:
  ```typescript
  schemaRegistry.registerZodSchema(
    'widget:paragraph-v1',
    ParagraphWidgetDataSchema,
    { name: 'Paragraph Widget Data' }
  );
  ```
- No need to convert Zod → FieldDefinition → Zod
- Direct registration preserves full Zod features

---

## Implementation Steps

### Step 1: Update Type Definitions
- [ ] Modify `DynamicSchemaDefinition` to support both `fields` and `zodSchema`
- [ ] Add `jsonSchema` field for serialization
- [ ] Keep `FieldDefinition` for backward compatibility

### Step 2: Update SchemaRegistry
- [ ] Add `zodSchemas` Map
- [ ] Add `registerZodSchema()` method
- [ ] Add `getZodSchema()` method
- [ ] Update `register()` to handle both formats
- [ ] Add serialization support (zodToJsonSchema)

### Step 3: Add Zod Utilities
- [ ] Create `zodToDynamicSchema()` helper
- [ ] Create `dynamicSchemaToZod()` helper (if needed)
- [ ] Add JSON Schema conversion utilities

### Step 4: Update Widget Schema Registration
- [ ] Create `registerWidgetSchemas()` function
- [ ] Register all 8 widget schemas using `registerZodSchema()`
- [ ] Test registration and validation

### Step 5: Testing
- [ ] Test FieldDefinition-based registration (UI)
- [ ] Test Zod-based registration (code)
- [ ] Test serialization/deserialization
- [ ] Test validation with both approaches

---

## Benefits of This Approach

1. **Best of Both Worlds**
   - UI-friendly FieldDefinition for Schema Builder
   - Direct Zod support for code-defined schemas
   - Full Zod validation power

2. **Backward Compatible**
   - Existing FieldDefinition schemas still work
   - Schema Builder UI unchanged
   - Gradual migration possible

3. **Type Safety**
   - Zod schemas provide TypeScript types
   - Can infer types from registered schemas
   - Compile-time + runtime validation

4. **Serialization**
   - FieldDefinition is JSON-serializable
   - JSON Schema for Zod schemas (via zodToJsonSchema)
   - Can store schemas in database/API

5. **Performance**
   - Zod schemas compiled once at registration
   - No runtime conversion overhead
   - Cached validators

---

## Example Usage

### Registering from Code (Widget Schemas)
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
```

### Registering from UI (Schema Builder)
```typescript
// Uses FieldDefinition (unchanged)
const schema: DynamicSchemaDefinition = {
  id: 'my:schema-v1',
  name: 'My Schema',
  fields: [
    { name: 'title', type: 'string', required: true },
    { name: 'count', type: 'number', required: false, min: 0 }
  ]
};

schemaRegistry.register(schema); // Works as before
```

### Using in MapStore
```typescript
// Same as before - no changes needed
mapStore.enforceTopicSchema('my:topic', 'widget:paragraph-v1');
const pub = mapStore.getPublisher('my:topic', 'producer');
pub.publish({ title: 'Hello', content: 'World' }); // Validated with Zod
```

---

## Migration Path

1. **Phase 1**: Add Zod support alongside FieldDefinition (backward compatible)
2. **Phase 2**: Migrate widget schemas to use `registerZodSchema()`
3. **Phase 3**: Keep FieldDefinition for UI, use Zod for code-defined schemas
4. **Phase 4**: (Optional) Add UI features to import/export Zod schemas

---

## Conclusion

**Recommendation: Hybrid Approach (Option A)**

This approach:
- ✅ Leverages Zod's power for code-defined schemas
- ✅ Maintains UI-friendly FieldDefinition
- ✅ Requires minimal changes to MapStore (none!)
- ✅ Backward compatible
- ✅ Best of both worlds

**MapStore Impact: ZERO** - No changes needed! ✅

The MapStore already uses Zod validators internally, so this change is transparent to it.

