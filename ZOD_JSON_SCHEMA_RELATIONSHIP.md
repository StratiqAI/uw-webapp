# How Zod Fits Into the JSON Schema Approach

## The Relationship: JSON Schema → Zod → Validation

### The Three Formats

```
┌─────────────────────────────────────────────────────────┐
│  1. JSON Schema (Storage/Standard Format)               │
│     - Human-readable JSON                               │
│     - AI-compatible (OpenAI Structured Outputs)        │
│     - Database-friendly                                 │
│     - Standard format (JSON Schema Draft 07)            │
└─────────────────────────────────────────────────────────┘
                    ↓ Compile
┌─────────────────────────────────────────────────────────┐
│  2. Zod Schema (Runtime Validator)                      │
│     - JavaScript/TypeScript object                       │
│     - Powerful validation functions                     │
│     - Type inference                                    │
│     - Rich error messages                               │
└─────────────────────────────────────────────────────────┘
                    ↓ Use
┌─────────────────────────────────────────────────────────┐
│  3. Validation Result                                    │
│     - success: boolean                                  │
│     - data: validated/sanitized data                    │
│     - error: ZodError (detailed field-level errors)    │
└─────────────────────────────────────────────────────────┘
```

## Why We Need Both

### JSON Schema: The Standard Format
**Purpose:** Storage, AI compatibility, standard format

**Why JSON Schema?**
- ✅ **AI Compatibility**: OpenAI Structured Outputs use JSON Schema
- ✅ **Storage**: Can be stored in database as JSON
- ✅ **Standard**: Industry standard format (JSON Schema Draft 07)
- ✅ **Portable**: Can be shared/exported easily
- ✅ **Tooling**: Lots of tools understand JSON Schema

**Limitation:**
- ❌ Not executable - it's just data
- ❌ Can't validate directly - needs a validator library

### Zod: The Runtime Validator
**Purpose:** Actual validation, type safety, error handling

**Why Zod?**
- ✅ **Powerful Validation**: Rich validation functions
- ✅ **Type Inference**: TypeScript types from schemas
- ✅ **Error Messages**: Detailed, formatted error messages
- ✅ **Transformations**: Can transform data during validation
- ✅ **Well-Tested**: Battle-tested library
- ✅ **TypeScript**: First-class TypeScript support

**Limitation:**
- ❌ Not serializable - Zod schemas are JavaScript functions
- ❌ Can't be stored directly in database
- ❌ Not directly AI-compatible (needs conversion)

## The Solution: Compile JSON Schema → Zod

### How It Works

```typescript
// 1. Store as JSON Schema (standard format)
const jsonSchema: JsonSchemaDefinition = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    count: { type: 'number', minimum: 0 }
  },
  required: ['title']
};

// 2. Compile to Zod at runtime
const zodSchema = compileJsonSchemaToZod(jsonSchema);
// Result: z.object({ title: z.string(), count: z.number().min(0) })

// 3. Use Zod for validation
const result = zodSchema.safeParse(data);
if (result.success) {
  // Use validated data
} else {
  // Handle ZodError with detailed messages
}
```

## Architecture Flow

### Registration Flow

```
┌─────────────────────────────────────────┐
│  Registration (One-Time)                │
│                                         │
│  JSON Schema → Compile → Zod Schema    │
│  (stored)    (runtime)  (cached)       │
└─────────────────────────────────────────┘
```

**Example:**
```typescript
// Register schema
schemaRegistry.register({
  id: 'widget:paragraph-v1',
  name: 'Paragraph Widget',
  jsonSchema: { /* JSON Schema */ }
});

// Internally:
// 1. Store JSON Schema
// 2. Compile JSON Schema → Zod
// 3. Cache Zod schema for validation
```

### Validation Flow

```
┌─────────────────────────────────────────┐
│  Validation (Every Publish)             │
│                                         │
│  Data → Zod Schema → Validated Data    │
│        (cached)                        │
└─────────────────────────────────────────┘
```

**Example:**
```typescript
// Publish data
const pub = mapStore.getPublisher('my:topic', 'producer');
pub.publish({ title: 'Hello', count: 5 });

// Internally:
// 1. Get Zod schema from cache (compiled from JSON Schema)
// 2. Validate with Zod: zodSchema.safeParse(data)
// 3. If valid: use sanitized data
// 4. If invalid: log ZodError and reject
```

## Code Example: The Full Flow

### Step 1: Define Schema (JSON Schema)
```typescript
const schemaDef: DynamicSchemaDefinition = {
  id: 'widget:paragraph-v1',
  name: 'Paragraph Widget',
  jsonSchema: {
    type: 'object',
    properties: {
      title: { 
        type: 'string',
        description: 'Widget title'
      },
      content: { 
        type: 'string',
        minLength: 1  // JSON Schema constraint
      },
      markdown: { 
        type: 'boolean',
        default: false
      }
    },
    required: ['content']
  }
};
```

### Step 2: Register (Compile to Zod)
```typescript
schemaRegistry.register(schemaDef);

// Internally:
// jsonSchema → compileJsonSchemaToZod() → z.object({
//   title: z.string().optional(),
//   content: z.string().min(1),
//   markdown: z.boolean().optional().default(false)
// })
```

### Step 3: Use (Validate with Zod)
```typescript
// Enforce schema on topic
mapStore.enforceTopicSchema('widget:paragraph:123', 'widget:paragraph-v1');

// Publish data
const pub = mapStore.getPublisher('widget:paragraph:123', 'producer');
pub.publish({
  title: 'Hello',
  content: 'World',
  markdown: true
});

// Internally MapStore:
// 1. Gets Zod schema: schemaRegistry.getValidator('widget:paragraph-v1')
// 2. Validates: zodSchema.safeParse(data)
// 3. If valid: stores sanitized data
// 4. If invalid: logs ZodError and rejects
```

## Benefits of This Approach

### 1. **Best of Both Worlds**
- ✅ JSON Schema for storage/AI compatibility
- ✅ Zod for powerful runtime validation
- ✅ No compromise on either side

### 2. **AI Integration**
```typescript
// Get JSON Schema directly (no conversion!)
const def = schemaRegistry.getDefinition('widget:paragraph-v1');

// Use with OpenAI - JSON Schema is native format
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: def.id,
      schema: def.jsonSchema,  // Direct use!
      strict: true
    }
  }
});
```

### 3. **Code-Defined Schemas**
```typescript
// Can also register Zod directly (for code-defined schemas)
import { ParagraphWidgetDataSchema } from './widgetSchemas';

schemaRegistry.registerZodSchema(
  'widget:paragraph-v1',
  ParagraphWidgetDataSchema
);

// Internally:
// 1. Zod schema → zodToJsonSchema() → JSON Schema (for storage)
// 2. Store both Zod (for validation) and JSON Schema (for storage)
```

### 4. **Type Safety**
```typescript
// Get Zod schema for type inference
const zodSchema = schemaRegistry.getZodSchema('widget:paragraph-v1');
type ParagraphData = z.infer<typeof zodSchema>;

// Use in code with full type safety
function processParagraph(data: ParagraphData) {
  // TypeScript knows the structure!
  console.log(data.title); // ✅ Type-safe
}
```

## The Compilation Process

### JSON Schema → Zod Mapping

| JSON Schema | Zod Equivalent |
|------------|---------------|
| `{ type: 'string' }` | `z.string()` |
| `{ type: 'number', minimum: 0 }` | `z.number().min(0)` |
| `{ type: 'boolean' }` | `z.boolean()` |
| `{ type: 'string', enum: ['a', 'b'] }` | `z.enum(['a', 'b'])` |
| `{ type: 'object', properties: {...} }` | `z.object({...})` |
| `{ type: 'array', items: {...} }` | `z.array(...)` |
| `required: ['field']` | `.optional()` on non-required fields |

### Example Compilation

**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "number", "minimum": 0 },
    "email": { "type": "string", "format": "email" }
  },
  "required": ["name", "email"]
}
```

**Compiled Zod:**
```typescript
z.object({
  name: z.string(),
  age: z.number().min(0).optional(),
  email: z.string().email()
})
```

## Why Not Just Use Zod?

### If We Only Used Zod:
- ❌ Can't store in database (functions aren't serializable)
- ❌ Can't use with AI (OpenAI needs JSON Schema)
- ❌ Not portable (can't export/share schemas)
- ❌ Harder to generate from AI

### If We Only Used JSON Schema:
- ❌ Need a JSON Schema validator library
- ❌ Less powerful validation features
- ❌ No TypeScript type inference
- ❌ Less detailed error messages

### Our Approach: Both!
- ✅ JSON Schema for storage/AI compatibility
- ✅ Zod for powerful runtime validation
- ✅ Compile once, validate many times

## Summary

**Zod's Role:**
- Runtime validator (compiled from JSON Schema)
- Provides powerful validation functions
- Generates detailed error messages
- Enables TypeScript type inference

**JSON Schema's Role:**
- Storage format (standard, portable)
- AI compatibility (OpenAI Structured Outputs)
- Source of truth (what gets stored/shared)

**The Bridge:**
- `compileJsonSchemaToZod()` converts JSON Schema → Zod
- Happens once at registration time
- Zod schema cached for fast validation
- Best of both worlds!

