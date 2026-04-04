# Architecture Overview: Producers, Consumers & Data Flow

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                               │
│  (Where Producers Should Be Registered)                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────┬─────────────────┬─────────────────┬───────────┐
│   AI Jobs       │   API/Services  │   User Input    │  Real-time│
│                 │                 │                 │           │
│ createJob       │ fetch('/api')   │ form.submit()   │ WebSocket │
│ Widget          │ Service.ts      │ Component.svelte│ Service.ts│
│ Bridge ✅       │                 │                 │           │
└────────┬────────┴────────┬────────┴────────┬────────┴─────┬─────┘
         │                 │                 │              │
         │ [Bridge creates │ [Manual         │ [Manual      │
         │  producer auto] │  producer]      │  producer]   │
         ↓                 ↓                 ↓              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCERS                                    │
│  createWidgetPublisher() / createJobWidgetBridge()             │
│                                                                 │
│  - Validates data against Zod schema                           │
│  - Transforms data to widget format                            │
│  - Publishes to mapObjectStore                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    [Publish validated data]
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   mapObjectStore                                │
│  (Central State Management)                                     │
│                                                                 │
│  Channels:                                                      │
│  - paragraph-content                                            │
│  - table-data                                                   │
│  - metric-data                                                  │
│  - chart-data                                                   │
│  - custom channels...                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    [Notify subscribers]
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CONSUMERS                                    │
│  createWidgetConsumer()                                         │
│                                                                 │
│  - Subscribes to channel                                        │
│  - Validates received data                                      │
│  - Updates component state                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    [Pass validated data]
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                       WIDGETS                                   │
│  (Display Layer)                                                │
│                                                                 │
│  ParagraphWidget • TableWidget • MetricWidget • ChartWidget    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Producer Registration Locations

### ✅ Correct Locations

```
src/lib/
│
├── 🎯 services/
│   │   ↑
│   │   └─ REGISTER PRODUCERS HERE for API/external data
│   │
│   ├── marketDataService.ts      ← createWidgetPublisher()
│   ├── realtimeService.ts        ← createWidgetPublisher()
│   └── pollingService.ts         ← createWidgetPublisher()
│
├── 🎯 components/
│   │   ↑
│   │   └─ REGISTER PRODUCERS HERE for user input
│   │
│   ├── AI/
│   │   └── JobSubmission.svelte  ← createJobWidgetBridge() [auto producer]
│   └── UserInputForm.svelte      ← createWidgetPublisher()
│
└── 🎯 routes/
    │   ↑
    │   └─ REGISTER BRIDGES HERE for AI jobs
    │
    └── ai/
        └── +page.svelte          ← createJobWidgetBridge()
```

### ❌ Wrong Locations

```
src/lib/
│
└── dashboard/
    └── components/
        └── widgets/
            └── ParagraphWidget.svelte  ← ❌ NO PRODUCERS IN WIDGETS!
                                           Only createWidgetConsumer()
```

---

## Data Flow Example

### Example 1: AI Job → Widget

```
Step 1: User submits AI job
   ↓
[JobSubmission Component]
   ↓
Step 2: Job completes, handleJobComplete() called
   ↓
[Create Bridge]
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent
});
   ↓
Step 3: Bridge creates ValidatedPublisher internally
   ↓
[Producer Registered]
   typeId: 'paragraph-content'
   producerId: 'job-123-to-paragraph-content'
   ↓
Step 4: Job updates arrive from jobUpdateStore
   ↓
[Transform & Validate]
   transformer: (result) => JSON.parse(result)
   validation: ParagraphWidgetDataSchema.parse(data)
   ↓
Step 5: Publish to mapStore
   ↓
[mapObjectStore]
   Channel: 'paragraph-content'
   Data: { title: "...", content: "...", markdown: true }
   ↓
Step 6: Notify all consumers
   ↓
[ParagraphWidget Consumer]
   subscription callback triggered
   validation: ParagraphWidgetDataSchema.parse(data)
   ↓
Step 7: Update widget state
   ↓
[Widget Renders]
   Display updated content
```

### Example 2: API Service → Widget

```
Step 1: Component calls service
   ↓
[Component]
await marketDataService.fetchData();
   ↓
Step 2: Service fetches from API
   ↓
[Service with Producer]
class MarketDataService {
  private producer = createWidgetPublisher(
    WidgetChannels.tableData,
    'market-data-service'  ← Registered in constructor
  );
  
  async fetchData() {
    const data = await fetch('/api/market');
    this.producer.publish(data);  ← Publish when ready
  }
}
   ↓
Step 3: Producer validates & publishes
   ↓
[mapObjectStore]
   Channel: 'table-data'
   Data: { headers: [...], rows: [...] }
   ↓
Step 4: TableWidget receives data
   ↓
[Widget Renders]
```

---

## Component Responsibilities

### Producers (Data Sources)

**Responsibilities:**
- ✅ Fetch/generate data
- ✅ Transform to widget format
- ✅ Publish to mapStore via ValidatedPublisher
- ✅ Handle errors
- ✅ Clean up on unmount

**Location:**
- Services (for external data)
- Components (for user input)
- Bridges (for AI jobs - auto-created)

**Code:**
```typescript
// In service/component
const producer = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'my-producer-id'
);

// When data is ready
producer.publish(data);

// On cleanup
producer.clear();
```

---

### Consumers (Widgets)

**Responsibilities:**
- ✅ Subscribe to mapStore channel
- ✅ Receive validated data
- ✅ Update display
- ❌ Never publish data (use producer for that)

**Location:**
- Widget components only

**Code:**
```typescript
// In widget component
const consumer = createWidgetConsumer(
  WidgetChannels.paragraphContent,
  'my-widget-id'
);

consumer.subscribe((data) => {
  if (data) {
    widgetData = data;  // Update state
  }
});
```

---

### Bridges (AI Jobs)

**Responsibilities:**
- ✅ Create producer automatically
- ✅ Subscribe to job updates
- ✅ Transform job results
- ✅ Validate and publish
- ✅ Clean up on disconnect

**Location:**
- Job completion handlers

**Code:**
```typescript
// In job completion handler
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent,
  transformer: (result) => JSON.parse(result)
});

// Cleanup
bridge.disconnect();
```

---

## Registration Lifecycle

### Service-based Producer

```typescript
// Service created (app start or lazy load)
class MyService {
  constructor() {
    // ✅ Register producer in constructor
    this.producer = createWidgetPublisher(...);
  }
}

// Data available
service.fetchData() {
  // ✅ Publish when ready
  this.producer.publish(data);
}

// Service destroyed (rare)
service.cleanup() {
  // ✅ Clear data
  this.producer.clear();
}
```

### Component-based Producer

```typescript
// Component mounts
onMount(() => {
  // ✅ Register producer when component mounts
  producer = createWidgetPublisher(...);
});

// User action
function handleAction() {
  // ✅ Publish when action occurs
  producer.publish(data);
}

// Component unmounts
onDestroy(() => {
  // ✅ Clean up
  producer.clear();
});
```

### Bridge-based Producer (AI Jobs)

```typescript
// Job completes
function handleJobComplete(jobId) {
  // ✅ Create bridge (auto-registers producer)
  bridge = createJobWidgetBridge({
    jobId,
    channel: WidgetChannels.paragraphContent
  });
  // Producer is registered as 'job-{jobId}-to-{channelId}'
}

// Job widget flow complete
onDestroy(() => {
  // ✅ Disconnect bridge (cleans up producer)
  bridge?.disconnect();
});
```

---

## Quick Decision Tree

**Where should I register my producer?**

```
Is the data from an AI job?
├─ YES → Use createJobWidgetBridge() in job completion handler
│         (Producer created automatically)
│
└─ NO → Is it from an API/external service?
    ├─ YES → Register in service class
    │         Use createWidgetPublisher() in constructor
    │
    └─ NO → Is it from user input?
        ├─ YES → Register in form/input component
        │         Use createWidgetPublisher() in onMount()
        │
        └─ NO → Is it from real-time stream?
            ├─ YES → Register in connection manager
            │         Use createWidgetPublisher() in connect()
            │
            └─ NO → Is it a widget displaying data?
                └─ YES → ❌ DON'T register producer!
                           Use createWidgetConsumer() instead
```

---

## Summary Table

| Component Type | Producer? | Consumer? | Where to Register |
|----------------|-----------|-----------|-------------------|
| **Widget** | ❌ Never | ✅ Always | Widget component |
| **Service** | ✅ Yes | ❌ No | Service class |
| **AI Job Handler** | ✅ Via Bridge | ❌ No | Completion handler |
| **Input Form** | ✅ Optional | ❌ No | Form component |
| **Real-time Service** | ✅ Yes | ❌ No | Connection manager |
| **API Service** | ✅ Yes | ❌ No | Service class |

---

## Key Principles

1. **Separation of Concerns**
   - Producers fetch/generate data
   - Consumers display data
   - Never mix both in same component (except rare cases)

2. **Single Responsibility**
   - One producer per data source
   - One consumer per display location

3. **Lifecycle Management**
   - Register early (constructor/onMount)
   - Publish when ready
   - Clean up properly (clear/disconnect)

4. **Type Safety**
   - Use ValidatedPublisher (with Zod validation)
   - Use ValidatedConsumer (with Zod validation)
   - Let TypeScript guide you

5. **Traceability**
   - Use descriptive IDs: `'market-data-service'`, `'user-input-form'`
   - Use debug panel to verify registration
   - Follow execution trace logs

---

## Next Steps

1. **Read:** `PRODUCER_REGISTRATION_GUIDE.md` for detailed patterns
2. **Use:** MapStore Debug Panel to verify your producers
3. **Check:** `EXECUTION_TRACE_GUIDE.md` to follow data flow
4. **Debug:** Use console logs and debug buttons

**Remember:** Producers are for data sources, not for data display!

