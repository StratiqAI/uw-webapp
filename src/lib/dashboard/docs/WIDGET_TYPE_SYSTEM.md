# Widget Type System: Complete Integration Guide

## Overview

This type system provides **end-to-end type safety** for the data flow from AI job submission to widget display:

```
AI Job (OpenAI) → Job Updates → mapObjectStore → Widget Components
        ↓                ↓              ↓              ↓
   Zod Schema    Validation     Type-safe     Validated Data
                               Publishing
```

All three components (JobSubmission, mapObjectStore, and Widgets) now share the **same Zod schema** for data validation and type checking.

## Architecture

### 1. Widget Schema Registry (`widgetSchemas.ts`)

**Purpose**: Single source of truth for widget data structures

**Key Features**:
- ✅ Zod schemas for all widget types
- ✅ TypeScript type inference from schemas
- ✅ OpenAI structured output configuration
- ✅ Runtime validation helpers

**Example**:
```typescript
import { ParagraphWidgetDataSchema } from '$lib/dashboard/types/widgetSchemas';

// Zod schema
const schema = ParagraphWidgetDataSchema;

// Inferred TypeScript type
type ParagraphData = z.infer<typeof ParagraphWidgetDataSchema>;

// Runtime validation
const result = schema.safeParse(data);
if (result.success) {
  // result.data is fully typed
}
```

### 2. Widget Bridge System (`widgetBridge.ts`)

**Purpose**: Type-safe bridge between job updates and widget channels

**Key Components**:

#### ValidatedPublisher
Publishes data to mapObjectStore with automatic validation:
```typescript
const publisher = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'my-publisher-id'
);

// Validates before publishing
publisher.publish({
  title: 'Hello',
  content: 'World',
  markdown: false
}); // ✅ Validated

publisher.publish({ invalid: 'data' }); // ❌ Throws ZodError
```

#### ValidatedConsumer
Subscribes to mapObjectStore with automatic validation:
```typescript
const consumer = createWidgetConsumer(
  WidgetChannels.paragraphContent,
  'my-consumer-id'
);

consumer.subscribe((data) => {
  // data is validated and fully typed
  if (data) {
    console.log(data.content); // TypeScript knows this exists
  }
});
```

#### Job-Widget Bridge
Automatically connects job updates to widget channels:
```typescript
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent,
  transformer: (result) => JSON.parse(result),
  filter: (update) => update.status === 'COMPLETED'
});

// Cleanup when done
bridge.disconnect();
```

### 3. Widget Components

Widgets now use the validated consumer system:

**Before**:
```typescript
// Unvalidated, no type safety
let consumer = mapStore.registerConsumer<any>('paragraph-content', 'widget-1');
```

**After**:
```typescript
// Validated, fully typed
const consumer = createWidgetConsumer(
  WidgetChannels.paragraphContent,
  'widget-1'
);
// consumer.subscribe receives validated ParagraphWidgetData
```

## Usage Guide

### Step 1: Define Widget Data Schema

Schemas are already defined in `widgetSchemas.ts` for all widget types:

```typescript
// Available schemas:
- ParagraphWidgetDataSchema
- TableWidgetDataSchema
- TitleWidgetDataSchema
- ImageWidgetDataSchema
- LineChartWidgetDataSchema
- BarChartWidgetDataSchema
- MetricWidgetDataSchema
- MapWidgetDataSchema
```

### Step 2: Configure OpenAI Job with Schema

```typescript
import { getWidgetOpenAIConfig } from '$lib/dashboard/types/widgetSchemas';

// Get OpenAI structured output config
const openAIConfig = getWidgetOpenAIConfig(
  'paragraph',
  'DocumentSummary',
  'Summary of a document with title and content'
);

// Use in job submission
const jobInput = {
  request: JSON.stringify({
    task: 'Generate summary',
    response_format: openAIConfig  // ← Ensures AI output matches widget schema
  }),
  priority: 'HIGH'
};

// Submit job
const response = await submitJob(jobInput);
```

**OpenAI Configuration Structure**:
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "DocumentSummary",
    "description": "Summary of a document with title and content",
    "schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "content": { "type": "string" },
        "markdown": { "type": "boolean" }
      },
      "required": ["content"],
      "additionalProperties": false
    },
    "strict": true
  }
}
```

### Step 3: Bridge Job to Widget

**Option A: Automatic Bridge (Recommended)**

```typescript
import { createJobWidgetBridge } from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';

const bridge = createJobWidgetBridge({
  jobId: submittedJob.id,
  channel: WidgetChannels.paragraphContent,
  
  // Optional: Transform job result
  transformer: (result) => {
    const parsed = JSON.parse(result);
    return {
      title: parsed.title,
      content: parsed.content,
      markdown: true
    };
  },
  
  // Optional: Filter which updates to process
  filter: (update) => {
    return update.status === 'COMPLETED' && update.result !== null;
  }
});

// Monitor bridge status
const status = bridge.getStatus();
console.log('Connected:', status.connected);
console.log('Last Update:', status.lastUpdate);
console.log('Last Error:', status.lastError);

// Cleanup
onDestroy(() => {
  bridge.disconnect();
});
```

**Option B: Manual Publishing**

```typescript
import { createWidgetPublisher } from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';
import { jobUpdateStore } from '$lib/stores/jobUpdateStore';

const publisher = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'my-job-handler'
);

// Subscribe to job updates
const unsubscribe = jobUpdateStore.subscribeToJobUpdates(jobId).subscribe((updates) => {
  if (updates.length > 0) {
    const latest = updates[0];
    if (latest.status === 'COMPLETED' && latest.result) {
      const data = JSON.parse(latest.result);
      
      // Validated publish
      publisher.publish(data); // ✅ or ❌ ZodError
      
      // OR safe publish
      const result = publisher.safeParse(data);
      if (result.success) {
        console.log('Published:', result.data);
      } else {
        console.error('Validation failed:', result.error);
      }
    }
  }
});
```

### Step 4: Use in Widget Component

```svelte
<!-- ParagraphWidget.svelte -->
<script lang="ts">
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';
import { createWidgetConsumer } from '$lib/dashboard/types/widgetBridge';
import type { ParagraphWidgetData } from '$lib/dashboard/types/widgetSchemas';

interface Props {
  data: ParagraphWidgetData;
  widgetId?: string;
}

let { data, widgetId = 'paragraph-widget' }: Props = $props();
let widgetData = $state<ParagraphWidgetData>(data);

// Create validated consumer
const consumer = createWidgetConsumer(
  WidgetChannels.paragraphContent,
  widgetId
);

// Subscribe to updates
consumer.subscribe((validatedData) => {
  if (validatedData) {
    widgetData = validatedData;
    // validatedData is fully typed as ParagraphWidgetData
    console.log('Content:', validatedData.content);
  }
});
</script>

<div class="paragraph-widget">
  {#if widgetData.title}
    <h3>{widgetData.title}</h3>
  {/if}
  <p>{widgetData.content}</p>
</div>
```

## Data Flow Example

### Complete Flow:

```typescript
// 1. Define schema (already done in widgetSchemas.ts)
const schema = ParagraphWidgetDataSchema;

// 2. Get OpenAI config
const openAIConfig = getWidgetOpenAIConfig('paragraph');

// 3. Submit job with schema
const job = await submitJob({
  request: JSON.stringify({
    task: 'Summarize document',
    response_format: openAIConfig
  }),
  priority: 'HIGH'
});

// 4. Bridge job to widget
const bridge = createJobWidgetBridge({
  jobId: job.id,
  channel: WidgetChannels.paragraphContent
});

// 5. Widget automatically receives validated data
// <ParagraphWidget data={...} />

// Result:
// ✅ OpenAI response validated against schema
// ✅ Job result validated before publishing
// ✅ Widget receives fully typed, validated data
// ✅ TypeScript types match runtime validation
```

### Error Handling:

```typescript
// Invalid data is automatically caught and logged:

// [ValidatedPublisher:paragraph-content:my-publisher] Validation failed:
// ZodError: [
//   {
//     "code": "invalid_type",
//     "expected": "string",
//     "received": "number",
//     "path": ["content"],
//     "message": "Expected string, received number"
//   }
// ]

// Widget never receives invalid data!
```

## Available Widget Channels

Pre-configured channels in `WidgetChannels`:

```typescript
WidgetChannels.paragraphContent  // ParagraphWidgetData
WidgetChannels.tableData         // TableWidgetData
WidgetChannels.metricData        // MetricWidgetData
WidgetChannels.chartData         // LineChartWidgetData
```

### Custom Channels:

```typescript
const customChannel: WidgetChannelConfig<'paragraph'> = {
  channelId: 'custom-paragraph-1',
  widgetType: 'paragraph',
  schema: ParagraphWidgetDataSchema,
  description: 'Custom paragraph channel for specific use case'
};

const publisher = createWidgetPublisher(customChannel, 'custom-publisher');
const consumer = createWidgetConsumer(customChannel, 'custom-consumer');
```

## Advanced Features

### Multi-Widget Bridge

Connect one job to multiple widgets:

```typescript
import { createJobMultiWidgetBridge } from '$lib/dashboard/types/widgetBridge';

const bridge = createJobMultiWidgetBridge('job-123', [
  {
    config: WidgetChannels.paragraphContent,
    transformer: (result) => JSON.parse(result).summary
  },
  {
    config: WidgetChannels.metricData,
    transformer: (result) => JSON.parse(result).metrics
  },
  {
    config: WidgetChannels.tableData,
    transformer: (result) => JSON.parse(result).tableData
  }
]);
```

### Custom Transformers

```typescript
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent,
  transformer: (result) => {
    const parsed = JSON.parse(result);
    
    // Complex transformation logic
    return {
      title: parsed.metadata?.title || 'Untitled',
      content: marked(parsed.markdown_content), // Convert markdown to HTML
      markdown: true
    };
  }
});
```

### Conditional Filtering

```typescript
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent,
  filter: (update) => {
    // Only process completed jobs with non-empty results
    if (update.status !== 'COMPLETED') return false;
    if (!update.result) return false;
    
    // Additional custom logic
    const parsed = JSON.parse(update.result);
    return parsed.type === 'summary'; // Only process summaries
  }
});
```

### Direct Validation

```typescript
import { validateWidgetData, parseWidgetData } from '$lib/dashboard/types/widgetSchemas';

// Safe validation
const result = validateWidgetData('paragraph', someData);
if (result.success) {
  console.log('Valid:', result.data);
  // result.data is ParagraphWidgetData
} else {
  console.error('Invalid:', result.error);
  // result.error is ZodError
}

// Throw on error
try {
  const data = parseWidgetData('paragraph', someData);
  // data is ParagraphWidgetData
} catch (error) {
  // error is ZodError
}
```

## Testing

```typescript
import { ParagraphWidgetDataSchema } from '$lib/dashboard/types/widgetSchemas';

describe('Widget data validation', () => {
  it('validates correct data', () => {
    const validData = {
      title: 'Test',
      content: 'Content',
      markdown: false
    };
    
    const result = ParagraphWidgetDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
  
  it('rejects invalid data', () => {
    const invalidData = {
      content: 123 // Should be string
    };
    
    const result = ParagraphWidgetDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

## Benefits

### 1. Type Safety
- ✅ Single Zod schema ensures TypeScript types match runtime validation
- ✅ No manual type guards needed
- ✅ Autocomplete and IntelliSense throughout the flow

### 2. Runtime Validation
- ✅ Invalid data caught immediately
- ✅ Detailed error messages with Zod
- ✅ Widgets never receive invalid data

### 3. OpenAI Integration
- ✅ Structured output ensures AI responses match widget schema
- ✅ Automatic conversion from Zod to JSON Schema
- ✅ Reduces parsing errors

### 4. Maintainability
- ✅ Single source of truth for widget data structure
- ✅ Changes to schema automatically propagate
- ✅ Clear separation of concerns

### 5. Developer Experience
- ✅ Simple API for common use cases
- ✅ Flexible for advanced scenarios
- ✅ Comprehensive error logging

## Migration Guide

### Migrating Existing Widgets

**Before**:
```typescript
let consumer = mapStore.registerConsumer<ParagraphWidget['data']>(
  'paragraph-content',
  'paragraph-widget'
);

consumer.subscribe((data) => {
  if (data) {
    widgetData = data; // No validation
  }
});
```

**After**:
```typescript
const consumer = createWidgetConsumer(
  WidgetChannels.paragraphContent,
  'paragraph-widget'
);

consumer.subscribe((data) => {
  if (data) {
    widgetData = data; // Validated automatically
  }
});
```

### Migrating Job Handlers

**Before**:
```typescript
jobUpdateStore.subscribeToJobUpdates(jobId).subscribe((updates) => {
  if (updates[0]?.status === 'COMPLETED') {
    const data = JSON.parse(updates[0].result!);
    // Manual publishing, no validation
    mapStore.registerProducer('paragraph-content', 'job').publish(data);
  }
});
```

**After**:
```typescript
createJobWidgetBridge({
  jobId,
  channel: WidgetChannels.paragraphContent
});
// Automatic validation, subscription, and cleanup
```

## Files Created

1. **`widgetSchemas.ts`** - Schema definitions and OpenAI config
2. **`widgetBridge.ts`** - Bridge system implementation
3. **`WidgetJobIntegration.svelte`** - Complete working example
4. **`examples/README.md`** - Example documentation
5. **`WIDGET_TYPE_SYSTEM.md`** - This file

## Examples

See `src/lib/dashboard/examples/` for:
- `WidgetJobIntegration.svelte` - Complete working example
- `README.md` - Quick start guide and examples

## Support

For questions or issues:
1. Check `examples/WidgetJobIntegration.svelte` for complete example
2. Review this document for API reference
3. Check `widgetSchemas.ts` and `widgetBridge.ts` for implementation details

