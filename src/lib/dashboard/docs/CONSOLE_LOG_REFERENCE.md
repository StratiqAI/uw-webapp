# Console Log Reference - Quick Guide

Quick reference for tracing execution between AI Jobs, Stores, and Widgets.

## Log Format Key

| Icon | Meaning |
|------|---------|
| 🔧 | Function called |
| 📥 | Data received |
| 📤 | Data sent/published |
| ✅ | Success/Validation passed |
| ❌ | Error/Failure |
| 🔄 | Data transformation |
| 🌉 | Bridge operation |
| 📝 | Widget operation |
| 📋 | Configuration |

## Execution Order

### 1️⃣ OpenAI Config Generation
```
🔧 [getWidgetOpenAIConfig] Getting OpenAI config for widget type: paragraph
  🔧 [zodSchemaToOpenAI] Converting Zod schema to OpenAI format
     ✅ Conversion complete
```

### 2️⃣ Widget Initialization
```
📝 [ParagraphWidget] Initializing widget
  Widget ID: paragraph-widget
  Channel ID: paragraph-content
  
🔧 [createWidgetConsumer] Called for channel: paragraph-content
  ↳ Registered consumer in mapStore
  
[ValidatedConsumer] Constructor called for channel: paragraph-content:paragraph-widget
[ValidatedConsumer:...] subscribe() called, setting up subscription
```

### 3️⃣ Job Completion Handler
```
🎉 [WidgetJobIntegration] handleJobComplete() called
  Job ID: job-abc123

🌉 [createJobWidgetBridge] Creating bridge: job-abc123-to-paragraph-content
  Job ID: job-abc123
  Target Channel: paragraph-content
  
🔧 [createWidgetPublisher] Called for channel: paragraph-content
  ↳ Registered producer in mapStore
  
[ValidatedPublisher] Constructor called for channel: paragraph-content:job-abc123-to-paragraph-content
[JobWidgetBridge:...] Subscribing to job updates...
✅ [JobWidgetBridge:...] Bridge created and listening
```

### 4️⃣ Job Update Received
```
📨 [JobWidgetBridge:...] Job update received, 1 updates in store
  Latest update status: COMPLETED
  Has result: true
  
[WidgetJobIntegration] Filter function called for status: COMPLETED
  Filter result: ✅ Pass
  
  ✅ Update passed filter, processing...
```

### 5️⃣ Data Transformation
```
  🔄 Transforming job result to widget data...
  
🔄 [WidgetJobIntegration] Custom transformer called
  Raw result: {"title":"...","content":"..."}
  Parsed result: {...}
  ✅ Transformed to widget data: {...}
```

### 6️⃣ Validation & Publishing
```
  📤 Publishing to widget channel...
  
[ValidatedPublisher:...] publish() called with data: {...}
[ValidatedPublisher:...] ✅ Validation passed, publishing to mapStore

✅ [JobWidgetBridge:...] Successfully published data to widget channel
```

### 7️⃣ Widget Receives Update
```
[ValidatedConsumer:...] 📥 Data received from mapStore: {...}
[ValidatedConsumer:...] ✅ Validation passed, calling callback with validated data

📝 [ParagraphWidget:...] 📥 Subscription callback triggered
  ✅ Received validated data: {...}
  ✅ Widget state updated
```

## Common Issues & What to Look For

### ❌ Widget Not Updating

**Missing consumer registration:**
```
❌ NO: 🔧 [createWidgetConsumer] Called for channel: paragraph-content
```
**Solution:** Check widget component initialization

**Missing bridge:**
```
❌ NO: 🌉 [createJobWidgetBridge] Creating bridge
```
**Solution:** Check handleJobComplete is being called

**Filter rejecting updates:**
```
[WidgetJobIntegration] Filter function called for status: PENDING
  Filter result: ❌ Skip
```
**Solution:** Check filter logic or wait for COMPLETED status

---

### ❌ Validation Errors

**Publisher validation fails:**
```
[ValidatedPublisher:...] publish() called with data: {...}
❌ [ValidatedPublisher:...] Validation failed: ZodError [...]
```
**Solution:** Check data structure matches schema

**Consumer validation fails:**
```
[ValidatedConsumer:...] 📥 Data received from mapStore: {...}
❌ [ValidatedConsumer:...] Invalid data received: ZodError [...]
```
**Solution:** Data in store doesn't match schema

---

### ❌ Transform Errors

**Transform fails:**
```
🔄 [WidgetJobIntegration] Custom transformer called
  Raw result: "invalid json"
❌ [JobWidgetBridge:...] Transform error: SyntaxError: Unexpected token
```
**Solution:** Check job result format and transformer logic

---

### ❌ No Job Updates

**Bridge created but no updates:**
```
✅ [JobWidgetBridge:...] Bridge created and listening
... (no updates received)
```
**Solution:** Check jobUpdateStore is receiving updates for this job ID

---

## Console Filters

Copy these into your browser console filter to focus on specific parts:

| What to See | Filter String |
|-------------|---------------|
| All widget operations | `ParagraphWidget` |
| All bridge operations | `JobWidgetBridge` |
| All validation | `Validated` |
| All data flow | `📥\|📤` |
| All errors | `❌` |
| All successes | `✅` |
| Specific channel | `paragraph-content` |
| Specific job | `job-abc123` |

## Typical Successful Flow

Count the key steps:

1. ✅ `getWidgetOpenAIConfig` called
2. ✅ `ParagraphWidget` initialized
3. ✅ `createWidgetConsumer` called
4. ✅ `createJobWidgetBridge` called
5. ✅ `createWidgetPublisher` called
6. ✅ `Job update received`
7. ✅ `Filter result: ✅ Pass`
8. ✅ `Transform successful`
9. ✅ `Validation passed, publishing to mapStore`
10. ✅ `Data received from mapStore`
11. ✅ `Validation passed, calling callback`
12. ✅ `Widget state updated`

If you see all 12 ✅ checkpoints, the system is working correctly!

## Function Call Stack

```
User Action: Submit Job
    ↓
handleJobComplete(jobId)
    ↓
createJobWidgetBridge({...})
    ↓
createWidgetPublisher(config, publisherId)
    ↓
new ValidatedPublisher(schema, publisher, channelId)
    ↓
jobUpdateStore.subscribe(callback)
    ↓
[Job completes and emits update]
    ↓
Bridge callback receives update
    ↓
filter(update) → true
    ↓
transformer(result) → widgetData
    ↓
ValidatedPublisher.publish(widgetData)
    ↓
schema.safeParse(widgetData) → success
    ↓
mapStore.publish(validatedData)
    ↓
[mapStore notifies subscribers]
    ↓
ValidatedConsumer receives data
    ↓
schema.safeParse(data) → success
    ↓
Widget callback(validatedData)
    ↓
Widget updates state
    ↓
UI re-renders
```

## Quick Debugging Checklist

When things don't work, check in order:

- [ ] Widget initialized? → Look for `📝 [ParagraphWidget] Initializing widget`
- [ ] Consumer created? → Look for `🔧 [createWidgetConsumer]`
- [ ] Bridge created? → Look for `🌉 [createJobWidgetBridge]`
- [ ] Publisher created? → Look for `🔧 [createWidgetPublisher]`
- [ ] Job updates received? → Look for `📨 [JobWidgetBridge:...] Job update received`
- [ ] Filter passing? → Look for `Filter result: ✅ Pass`
- [ ] Transform working? → Look for `✅ Transform successful`
- [ ] Validation passing? → Look for `✅ Validation passed`
- [ ] Data received? → Look for `📥 Data received from mapStore`
- [ ] Widget updating? → Look for `✅ Widget state updated`

## Performance Impact

Each function call generates 1-5 console logs. For a typical job→widget flow:
- ~30-40 total log statements
- Minimal performance impact in development
- Consider removing logs in production

To disable logs, search for:
```typescript
console.log
console.error
```
And wrap in:
```typescript
if (import.meta.env.DEV) {
  console.log(...);
}
```

