# OpenAI Structured Outputs - Schema Requirements

## Critical Requirement: Optional Fields Must Be Nullable

### ⚠️ Important Rule

When using OpenAI's structured outputs with `zodTextFormat`, **all optional fields must also be nullable**.

### ❌ Wrong

```typescript
// This will throw an error with OpenAI!
const schema = z.object({
  title: z.string().optional(),  // ❌ Error!
  content: z.string()
});
```

**Error:**
```
Error: Zod field at `properties/title` uses `.optional()` without `.nullable()` 
which is not supported by the API.
```

### ✅ Correct

```typescript
// This works correctly
const schema = z.object({
  title: z.string().nullable().optional(),  // ✅ Correct!
  content: z.string()
});
```

---

## Why This Requirement?

OpenAI's structured outputs API requires explicit handling of optional vs. nullable fields:

- **Required field**: Must always be present
- **Optional field**: May be omitted from the response
- **Nullable field**: Can be explicitly `null`

For OpenAI, **optional fields must be nullable** to handle cases where the AI doesn't have information for that field.

---

## All Widget Schemas Updated

All widget schemas now follow this pattern:

### ParagraphWidgetDataSchema ✅

```typescript
export const ParagraphWidgetDataSchema = z.object({
  title: z.string().nullable().optional(),     // ✅ Can be omitted or null
  content: z.string(),                         // ✅ Always required
  markdown: z.boolean().nullable().optional()  // ✅ Can be omitted or null
});
```

### TableWidgetDataSchema ✅

```typescript
export const TableWidgetDataSchema = z.object({
  title: z.string().nullable().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.any())),
  sortable: z.boolean().nullable().optional(),
  paginated: z.boolean().nullable().optional()
});
```

### All Other Schemas ✅

- `TitleWidgetDataSchema`
- `ImageWidgetDataSchema`
- `LineChartWidgetDataSchema`
- `BarChartWidgetDataSchema`
- `MetricWidgetDataSchema`
- `MapWidgetDataSchema`

All optional fields now include `.nullable().optional()`

---

## Creating New Widget Schemas

When creating a new widget schema for use with OpenAI:

### ✅ Correct Pattern

```typescript
export const MyWidgetDataSchema = z.object({
  // Required fields - no .optional()
  requiredField: z.string(),
  requiredNumber: z.number(),
  
  // Optional fields - MUST include .nullable()
  optionalField: z.string().nullable().optional(),
  optionalNumber: z.number().nullable().optional(),
  optionalEnum: z.enum(['a', 'b']).nullable().optional(),
  
  // Optional objects - MUST include .nullable()
  optionalObject: z.object({
    nested: z.string()
  }).nullable().optional(),
  
  // Optional arrays - MUST include .nullable()
  optionalArray: z.array(z.string()).nullable().optional()
});
```

### ❌ Common Mistakes

```typescript
// DON'T DO THIS:
const BadSchema = z.object({
  title: z.string().optional(),           // ❌ Missing .nullable()
  count: z.number().optional(),           // ❌ Missing .nullable()
  tags: z.array(z.string()).optional(),   // ❌ Missing .nullable()
  metadata: z.object({...}).optional()    // ❌ Missing .nullable()
});
```

---

## What This Means for AI Responses

### AI Response Examples

```json
// Valid response 1: All fields provided
{
  "title": "My Title",
  "content": "My content",
  "markdown": false
}

// Valid response 2: Optional fields omitted
{
  "content": "My content"
}

// Valid response 3: Optional fields explicitly null
{
  "title": null,
  "content": "My content",
  "markdown": null
}
```

All three responses are valid because optional fields can be:
1. Provided with a value
2. Omitted entirely
3. Explicitly set to `null`

---

## Testing Your Schema

### Test that it works with zodTextFormat:

```typescript
import { zodTextFormat } from 'openai/helpers/zod';

try {
  const textFormat = zodTextFormat(mySchema, 'MySchemaName');
  console.log('✅ Schema is compatible with OpenAI');
  console.log(textFormat);
} catch (error) {
  console.error('❌ Schema error:', error);
  // If you see "uses .optional() without .nullable()"
  // Add .nullable() before .optional()
}
```

### Validate Test Data

```typescript
// Test data variations
const testCases = [
  { content: 'Required only' },                    // ✅ Should pass
  { title: 'Title', content: 'Content' },          // ✅ Should pass
  { title: null, content: 'Content', markdown: null }, // ✅ Should pass
  {}                                               // ❌ Should fail (missing content)
];

testCases.forEach((testCase, i) => {
  const result = ParagraphWidgetDataSchema.safeParse(testCase);
  console.log(`Test ${i + 1}:`, result.success ? '✅ Pass' : '❌ Fail');
});
```

---

## Reference: OpenAI Documentation

From [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs):

> **All fields must be required**
> 
> In the Structured Outputs API, all fields must be required. 
> Fields that should be optional should use the `.nullable()` modifier.

Example from OpenAI:
```typescript
// ❌ Wrong
const schema = z.object({
  name: z.string().optional()
});

// ✅ Correct
const schema = z.object({
  name: z.string().nullable()
});
```

---

## Checklist for New Schemas

When creating a widget schema for OpenAI:

- [ ] Import `zodTextFormat` from `'openai/helpers/zod'`
- [ ] All optional fields use `.nullable().optional()`
- [ ] Test with `zodTextFormat(schema, 'name')`
- [ ] Verify no error about `.optional()` without `.nullable()`
- [ ] Test actual AI responses validate correctly
- [ ] Document expected response format

---

## Quick Fix Guide

If you get the `.optional()` without `.nullable()` error:

1. **Find the field** mentioned in the error
2. **Add `.nullable()`** before `.optional()`
3. **Test again**

```typescript
// Error says: "field at properties/title uses .optional() without .nullable()"

// Find:
title: z.string().optional(),

// Change to:
title: z.string().nullable().optional(),
```

---

## Summary

✅ **Rule:** All optional fields must include `.nullable().optional()`  
✅ **All widget schemas updated** to follow this rule  
✅ **Compatible with OpenAI** structured outputs API  
✅ **Matches backend pattern** (bestSearch.js)  

**Remember:** `.nullable().optional()` not just `.optional()` !

