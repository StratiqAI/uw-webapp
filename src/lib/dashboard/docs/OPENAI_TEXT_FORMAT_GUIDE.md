# OpenAI Text Format Guide

## Overview

This guide explains how to use OpenAI's **text format** for structured outputs with widgets. This is the **recommended approach** by OpenAI for ensuring AI responses match your expected data structure.

## What Changed?

### ❌ Old Approach (Deprecated)

```typescript
import { getWidgetOpenAIConfig } from '$lib/dashboard/types/widgetSchemas';

const openAIConfig = getWidgetOpenAIConfig('paragraph');

const jobInput = {
  request: JSON.stringify({
    prompt: 'Generate content',
    response_format: openAIConfig  // ❌ Not the recommended approach
  }),
  priority: 'HIGH'
};
```

### ✅ New Approach (Recommended)

```typescript
import { getWidgetTextFormat } from '$lib/dashboard/types/widgetSchemas';

const textFormat = getWidgetTextFormat('paragraph');

const jobInput = {
  request: JSON.stringify({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: 'Generate content' }
    ],
    text: {
      format: textFormat  // ✅ Correct OpenAI text format
    }
  }),
  priority: 'HIGH'
};
```

---

## Why Use Text Format?

1. **✅ Official OpenAI Recommendation**: This is the standard way to use structured outputs
2. **✅ Better Integration**: Uses `zodTextFormat` which OpenAI provides
3. **✅ Cleaner Schema**: No nested `$ref` and `definitions` in the schema
4. **✅ Strict Mode**: Automatically sets `strict: true` for reliable outputs
5. **✅ Type Safety**: Full TypeScript support with Zod schemas

---

## How It Works

### Step 1: Widget Zod Schema

```typescript
// Already defined in widgetSchemas.ts
export const ParagraphWidgetDataSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  markdown: z.boolean().optional()
});
```

### Step 2: Get Text Format

```typescript
import { getWidgetTextFormat } from '$lib/dashboard/types/widgetSchemas';

const textFormat = getWidgetTextFormat('paragraph', 'ParagraphContent');
```

This generates:

```json
{
  "type": "json_schema",
  "name": "ParagraphContent",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "content": { "type": "string" },
      "markdown": { "type": "boolean" }
    },
    "required": ["content"],
    "additionalProperties": false
  }
}
```

### Step 3: Use in Job Input

```typescript
const jobInput = {
  request: JSON.stringify({
    model: 'gpt-4o-mini',
    input: [
      { 
        role: 'system', 
        content: 'You are a helpful assistant that generates widget content.' 
      },
      { 
        role: 'user', 
        content: 'Generate a paragraph about AI developments' 
      }
    ],
    text: {
      format: textFormat  // ← Use text format here
    }
  }),
  priority: 'HIGH'
};
```

### Step 4: AI Returns Structured Data

The AI will return data matching your schema:

```json
{
  "title": "AI Developments in 2024",
  "content": "Artificial Intelligence has seen significant advancements...",
  "markdown": false
}
```

---

## Complete Example

```typescript
import { onDestroy } from 'svelte';
import JobSubmission from '$lib/components/AI/JobSubmission.svelte';
import ParagraphWidget from '$lib/dashboard/components/widgets/ParagraphWidget.svelte';
import { WidgetChannels, getWidgetTextFormat } from '$lib/dashboard/types/widgetSchemas';
import { createJobWidgetBridge } from '$lib/dashboard/types/widgetBridge';

interface Props {
  idToken: string;
}

let { idToken }: Props = $props();
let bridge = $state(null);

// Get text format for paragraph widget
const textFormat = getWidgetTextFormat('paragraph', 'ParagraphContent');

// Create job input with text format
const jobInput = {
  request: JSON.stringify({
    model: 'gpt-4o-mini',
    input: [
      { 
        role: 'system', 
        content: 'Write informative paragraphs with a title and clear content.' 
      },
      { 
        role: 'user', 
        content: 'Explain quantum computing in simple terms' 
      }
    ],
    text: {
      format: textFormat  // ← Text format ensures structured output
    }
  }),
  priority: 'HIGH'
};

// Initial widget data
const initialData = {
  title: 'Loading...',
  content: 'AI is generating content...',
  markdown: false
};

// Create bridge when job completes
function handleJobComplete(update: any) {
  bridge = createJobWidgetBridge({
    jobId: update.id,
    channel: WidgetChannels.paragraphContent
  });
}

// Cleanup
onDestroy(() => bridge?.disconnect());

// In template:
<JobSubmission {idToken} {jobInput} onJobComplete={handleJobComplete} />
<ParagraphWidget data={initialData} />
```

---

## Available Widget Types

You can use text format with any widget type:

```typescript
// Paragraph
const paragraphFormat = getWidgetTextFormat('paragraph', 'ParagraphContent');

// Table
const tableFormat = getWidgetTextFormat('table', 'TableData');

// Metric
const metricFormat = getWidgetTextFormat('metric', 'MetricData');

// Chart
const chartFormat = getWidgetTextFormat('lineChart', 'ChartData');

// And all other widget types...
```

---

## Comparison: Old vs New Format

### Old Format (response_format)

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "ParagraphContent",
    "description": "Content for a paragraph widget",
    "schema": {
      "$ref": "#/definitions/ParagraphContent",
      "definitions": {
        "ParagraphContent": {
          "type": "object",
          "properties": { ... }
        }
      }
    },
    "strict": true
  }
}
```

**Issues:**
- ❌ Nested `$ref` and `definitions`
- ❌ More complex structure
- ❌ Not the official OpenAI recommendation

### New Format (text.format)

```json
{
  "type": "json_schema",
  "name": "ParagraphContent",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "content": { "type": "string" },
      "markdown": { "type": "boolean" }
    },
    "required": ["content"],
    "additionalProperties": false
  }
}
```

**Benefits:**
- ✅ Clean, flat structure
- ✅ Official OpenAI approach
- ✅ Uses `zodTextFormat` helper
- ✅ Strict mode built-in

---

## Using with Backend (bestSearch.js example)

Your backend code already uses this approach correctly:

```javascript
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const schemaRegistry = {
  projectDetails: z.object({
    name: z.string(),
    description: z.string(),
    // ... more fields
  })
};

const parsedInput = {
  model: "gpt-4o-mini",
  input: [{ role: "system", content: "Extract the details from the file" }],
  tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
  tool_choice: "auto",
  text: {
    format: zodTextFormat(schemaRegistry.projectDetails, "projectDetails")
  }
};
```

Now the frontend matches this pattern!

---

## Migration Checklist

If you have existing code using the old approach:

- [ ] Replace `getWidgetOpenAIConfig` with `getWidgetTextFormat`
- [ ] Remove `response_format` from job input
- [ ] Add `text: { format: textFormat }` to job input
- [ ] Add `model` to job input (e.g., `'gpt-4o-mini'`)
- [ ] Change `input` structure to use message format: `[{ role, content }]`
- [ ] Test that AI still returns correct data

---

## Debugging

### Check Generated Format

```typescript
const textFormat = getWidgetTextFormat('paragraph');
console.log('Text Format:', JSON.stringify(textFormat, null, 2));
```

Should output:
```json
{
  "type": "json_schema",
  "name": "paragraphWidgetData",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": { ... },
    "required": [ ... ],
    "additionalProperties": false
  }
}
```

### Verify Job Input Structure

```typescript
console.log('Job Input:', JSON.stringify(jobInput, null, 2));
```

Should have this structure:
```json
{
  "request": "{\"model\":\"gpt-4o-mini\",\"input\":[...],\"text\":{\"format\":{...}}}",
  "priority": "HIGH"
}
```

### Check AI Response

The AI should return data matching your Zod schema exactly:

```json
{
  "title": "Some Title",
  "content": "Some content",
  "markdown": false
}
```

---

## Common Issues

### Issue: AI not returning structured data

**Cause**: Text format not included in job input

**Fix**: Ensure `text: { format: textFormat }` is in your job request

---

### Issue: Validation errors after AI response

**Cause**: Schema mismatch between AI output and widget schema

**Fix**: 
1. Check AI response in console
2. Verify it matches your Zod schema
3. Use custom transformer if needed:

```typescript
createJobWidgetBridge({
  jobId,
  channel: WidgetChannels.paragraphContent,
  transformer: (result) => {
    const parsed = JSON.parse(result);
    return {
      title: parsed.title || 'Untitled',
      content: parsed.content || parsed.text || result,
      markdown: false
    };
  }
});
```

---

### Issue: "zodTextFormat is not a function"

**Cause**: Missing OpenAI package or wrong version

**Fix**: Ensure you have OpenAI SDK installed:
```bash
npm install openai@latest
```

---

## References

- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [zodTextFormat API](https://github.com/openai/openai-node#structured-outputs)
- Example: `uw-aws-infrastructure/functions/src/events/.../bestSearch.js`

---

## Summary

**Use `getWidgetTextFormat()` with `text.format` structure:**

```typescript
// ✅ Correct
const textFormat = getWidgetTextFormat('paragraph');
const jobInput = {
  request: JSON.stringify({
    model: 'gpt-4o-mini',
    input: [{ role: 'system', content: '...' }],
    text: { format: textFormat }
  }),
  priority: 'HIGH'
};
```

This ensures your AI jobs produce structured output that matches your widget schemas perfectly! 🎯

