# Execution Trace Guide

This guide explains the execution flow between AI Job Submission, Stores, and Widgets with detailed console logging.

## Overview

All major functions now include console.log statements to help you trace the data flow:

```
🔧 = Function call
📥 = Data received
📤 = Data sent
✅ = Success
❌ = Error/Failure
🔄 = Transform
🌉 = Bridge operation
📝 = Widget operation
```

## Complete Execution Flow

### 1. **Initialization Phase**

When the page loads or component mounts:

```
╔═══════════════════════════════════════════════════════════════╗
║  Widget Job Integration - Initialization                      ║
╚═══════════════════════════════════════════════════════════════╝

🔧 [getWidgetOpenAIConfig] Getting OpenAI config for widget type: paragraph

🔧 [zodSchemaToOpenAI] Converting Zod schema to OpenAI format
   Name: DocumentSummary
   Description: Summary of a document with title and content
   ✅ Conversion complete

📋 [WidgetJobIntegration] OpenAI Structured Output Config: {...}
```

**What's happening:**
- Widget schema is converted to OpenAI JSON Schema format
- This ensures AI responses match widget data structure

---

### 2. **Widget Initialization**

When the ParagraphWidget component mounts:

```
📝 [ParagraphWidget] Initializing widget
   Widget ID: paragraph-widget
   Channel ID: paragraph-content
   Initial data: { title: "...", content: "...", markdown: false }

🔧 [createWidgetConsumer] Called for channel: paragraph-content, consumer: paragraph-widget
   ↳ Registered consumer in mapStore

[ValidatedConsumer] Constructor called for channel: paragraph-content:paragraph-widget

📝 [ParagraphWidget:paragraph-widget] Consumer created, setting up subscription...

[ValidatedConsumer:paragraph-content:paragraph-widget] subscribe() called, setting up subscription
```

**What's happening:**
- Widget creates a validated consumer
- Consumer registers with mapStore
- Subscription is set up to receive data updates

---

### 3. **Job Completion**

When AI job completes:

```
═══════════════════════════════════════════════════════════════
🎉 [WidgetJobIntegration] handleJobComplete() called
   Job ID: job-abc123
═══════════════════════════════════════════════════════════════

[WidgetJobIntegration] Creating job-widget bridge...

🌉 [createJobWidgetBridge] Creating bridge: job-abc123-to-paragraph-content
   Job ID: job-abc123
   Target Channel: paragraph-content

🔧 [createWidgetPublisher] Called for channel: paragraph-content, publisher: job-abc123-to-paragraph-content
   ↳ Registered producer in mapStore

[ValidatedPublisher] Constructor called for channel: paragraph-content:job-abc123-to-paragraph-content

[JobWidgetBridge:job-abc123-to-paragraph-content] Subscribing to job updates...
✅ [JobWidgetBridge:job-abc123-to-paragraph-content] Bridge created and listening

[WidgetJobIntegration] ✅ Bridge created successfully
```

**What's happening:**
- Bridge is created between job and widget channel
- Publisher is registered with mapStore
- Bridge subscribes to job updates from jobUpdateStore

---

### 4. **Job Update Received**

When jobUpdateStore receives an update:

```
📨 [JobWidgetBridge:job-abc123-to-paragraph-content] Job update received, 1 updates in store
   Latest update status: COMPLETED
   Has result: true

[WidgetJobIntegration] Filter function called for status: COMPLETED
   Filter result: ✅ Pass

   ✅ Update passed filter, processing...
```

**What's happening:**
- Bridge receives job update from jobUpdateStore
- Filter function checks if update should be processed
- Update passes filter (status is COMPLETED)

---

### 5. **Data Transformation**

Transform job result to widget data:

```
   🔄 Transforming job result to widget data...

🔄 [WidgetJobIntegration] Custom transformer called
   Raw result: {"title":"Market Trends","content":"The market shows..."}
   Parsed result: { title: "Market Trends", content: "The market shows..." }
   ✅ Transformed to widget data: { title: "Market Trends", content: "...", markdown: true }

   ✅ Transform successful: { title: "Market Trends", content: "...", markdown: true }
```

**What's happening:**
- Raw job result (JSON string) is received
- Custom transformer parses and shapes data
- Data is formatted for widget consumption

---

### 6. **Data Validation & Publishing**

Validate and publish to mapStore:

```
   📤 Publishing to widget channel...

[ValidatedPublisher:paragraph-content:job-abc123-to-paragraph-content] publish() called with data: {...}
[ValidatedPublisher:paragraph-content:job-abc123-to-paragraph-content] ✅ Validation passed, publishing to mapStore

✅ [JobWidgetBridge:job-abc123-to-paragraph-content] Successfully published data to widget channel
```

**What's happening:**
- Data is validated against Zod schema
- If valid, data is published to mapStore
- mapStore notifies all subscribers

---

### 7. **Widget Receives Data**

Widget consumer receives validated data:

```
[ValidatedConsumer:paragraph-content:paragraph-widget] 📥 Data received from mapStore: {...}
[ValidatedConsumer:paragraph-content:paragraph-widget] ✅ Validation passed, calling callback with validated data

📝 [ParagraphWidget:paragraph-widget] 📥 Subscription callback triggered
   ✅ Received validated data: { title: "Market Trends", content: "...", markdown: true }
   ✅ Widget state updated
```

**What's happening:**
- Consumer receives data from mapStore
- Data is validated again (double validation for safety)
- Widget state is updated with validated data
- UI re-renders with new content

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Initialization                                           │
│    getWidgetOpenAIConfig() → zodSchemaToOpenAI()            │
│    Creates OpenAI structured output config                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Widget Setup                                             │
│    ParagraphWidget initializes                              │
│    → createWidgetConsumer()                                 │
│    → ValidatedConsumer registers with mapStore              │
│    → Subscription setup                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Job Completion                                           │
│    handleJobComplete(jobId)                                 │
│    → createJobWidgetBridge()                                │
│    → createWidgetPublisher()                                │
│    → ValidatedPublisher registers with mapStore             │
│    → Bridge subscribes to jobUpdateStore                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Job Update                                               │
│    jobUpdateStore emits update                              │
│    → Bridge receives update                                 │
│    → Filter function checks status                          │
│    → Update passes filter                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Data Transformation                                      │
│    Custom transformer function                              │
│    → Parse JSON                                             │
│    → Shape data for widget                                  │
│    → Return transformed data                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Validation & Publishing                                  │
│    ValidatedPublisher.publish(data)                         │
│    → Zod schema validation                                  │
│    → If valid, publish to mapStore                          │
│    → mapStore notifies subscribers                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Widget Update                                            │
│    ValidatedConsumer receives data                          │
│    → Validate data again                                    │
│    → Call subscription callback                             │
│    → Widget updates state                                   │
│    → UI re-renders                                          │
└─────────────────────────────────────────────────────────────┘
```

## Tracking Specific Operations

### OpenAI Config Generation
Look for:
```
🔧 [getWidgetOpenAIConfig] Getting OpenAI config for widget type: ...
🔧 [zodSchemaToOpenAI] Converting Zod schema to OpenAI format
```

### Widget-Store Connection
Look for:
```
🔧 [createWidgetConsumer] Called for channel: ...
[ValidatedConsumer] Constructor called for channel: ...
[ValidatedConsumer:...] subscribe() called, setting up subscription
```

### Job-Widget Bridge Creation
Look for:
```
🌉 [createJobWidgetBridge] Creating bridge: ...
🔧 [createWidgetPublisher] Called for channel: ...
[ValidatedPublisher] Constructor called for channel: ...
```

### Data Flow (Job → Widget)
Look for:
```
📨 [JobWidgetBridge:...] Job update received
🔄 [WidgetJobIntegration] Custom transformer called
[ValidatedPublisher:...] publish() called with data
[ValidatedConsumer:...] 📥 Data received from mapStore
📝 [ParagraphWidget:...] 📥 Subscription callback triggered
```

### Validation Success
Look for:
```
✅ Validation passed
✅ Transform successful
✅ Widget state updated
```

### Validation Failures
Look for:
```
❌ [ValidatedPublisher:...] Validation failed: ...
❌ [ValidatedConsumer:...] Invalid data received: ...
❌ [JobWidgetBridge:...] Transform error: ...
```

## Console Filtering

To focus on specific parts of the flow, filter console logs:

### See only Bridge operations:
```
Filter: JobWidgetBridge
```

### See only Widget operations:
```
Filter: ParagraphWidget
```

### See only Validation:
```
Filter: Validated
```

### See only Data flow:
```
Filter: 📥 | 📤
```

### See only Errors:
```
Filter: ❌
```

## Example Complete Trace

Here's what a successful execution looks like in order:

```
1. ╔═══════════════════════════════════════════════════════════════╗
   ║  Widget Job Integration - Initialization                      ║
   ╚═══════════════════════════════════════════════════════════════╝

2. 🔧 [getWidgetOpenAIConfig] Getting OpenAI config for widget type: paragraph

3. 📝 [ParagraphWidget] Initializing widget

4. 🔧 [createWidgetConsumer] Called for channel: paragraph-content, consumer: paragraph-widget

5. ═══════════════════════════════════════════════════════════════
   🎉 [WidgetJobIntegration] handleJobComplete() called

6. 🌉 [createJobWidgetBridge] Creating bridge: job-abc123-to-paragraph-content

7. 🔧 [createWidgetPublisher] Called for channel: paragraph-content

8. 📨 [JobWidgetBridge:...] Job update received, 1 updates in store

9. 🔄 [WidgetJobIntegration] Custom transformer called

10. [ValidatedPublisher:...] publish() called with data

11. [ValidatedConsumer:...] 📥 Data received from mapStore

12. 📝 [ParagraphWidget:...] 📥 Subscription callback triggered
    ✅ Widget state updated
```

## Debugging Tips

### Issue: Widget not updating

**Check for:**
1. Consumer registration: `createWidgetConsumer`
2. Bridge creation: `createJobWidgetBridge`
3. Job updates received: `Job update received`
4. Filter passing: `Filter result: ✅ Pass`
5. Validation passing: `✅ Validation passed`

### Issue: Validation errors

**Look for:**
```
❌ [ValidatedPublisher:...] Validation failed
```
This will include the Zod error details showing which fields failed validation.

### Issue: Data not transforming

**Check:**
```
🔄 [WidgetJobIntegration] Custom transformer called
   Raw result: ...
   ✅ Transform successful: ...
```
If you see the raw result but not the transform success, the transformer threw an error.

### Issue: Bridge not receiving updates

**Verify:**
```
[JobWidgetBridge:...] Subscribing to job updates...
✅ [JobWidgetBridge:...] Bridge created and listening
```
Then look for: `📨 [JobWidgetBridge:...] Job update received`

If you don't see "Job update received", the jobUpdateStore might not be emitting updates for that job ID.

## Testing the Flow

To manually test the complete flow:

1. Open browser console
2. Enable all log levels
3. Load the `WidgetJobIntegration` example
4. Submit a job
5. Watch the console logs in order
6. Verify each step completes successfully

You should see all 12 steps from the "Example Complete Trace" section above.

## Performance Note

All console.log statements are included for debugging. In production, you may want to:
- Remove or comment out the logs
- Use a logging library with log levels
- Only enable logs in development mode: `if (import.meta.env.DEV) { console.log(...) }`

