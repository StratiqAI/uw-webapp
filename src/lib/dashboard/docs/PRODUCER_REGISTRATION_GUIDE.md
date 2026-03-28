# Producer Registration Guide

## Overview

Producers are components that **publish data** to the mapObjectStore. The location where you define and register producers depends on the data source and use case.

## Architecture Principles

### 1. **Producers should be close to the data source**
- Register where data originates
- Keep registration near data fetching/generation logic

### 2. **One producer per data source**
- Avoid multiple producers for the same channel from same source
- Multiple producers for same channel from different sources is OK

### 3. **Register early, publish when ready**
- Register producer during component/service initialization
- Publish data when it becomes available

---

## Registration Patterns by Use Case

### 1. **AI Job → Widget (Recommended: Use Bridge)**

**❌ DON'T manually create producer:**
```typescript
// BAD: Manual producer in component
const producer = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'my-component'
);
```

**✅ DO use bridge (automatic producer):**
```typescript
// GOOD: Bridge creates and manages producer automatically
import { createJobWidgetBridge } from '$lib/dashboard/types/widgetBridge';

function handleJobComplete(jobId: string) {
  const bridge = createJobWidgetBridge({
    jobId,
    channel: WidgetChannels.paragraphContent
    // Bridge internally creates and registers producer
  });
}
```

**Where:** In the component that handles job completion
**File examples:**
- `src/lib/dashboard/examples/WidgetJobIntegration.svelte`
- `src/routes/ai/+page.svelte` (or wherever you submit jobs)

**Why:** Bridge handles:
- Producer creation and registration
- Job update subscription
- Data transformation
- Validation
- Cleanup on disconnect

---

### 2. **API/Service → Widget**

**✅ Create producer in service layer:**

```typescript
// src/lib/services/marketDataService.ts
import { createWidgetPublisher } from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';

class MarketDataService {
  private producer;

  constructor() {
    // Register producer when service initializes
    this.producer = createWidgetPublisher(
      WidgetChannels.tableData,
      'market-data-service'
    );
  }

  async fetchMarketData() {
    const data = await fetch('/api/market-data');
    const json = await data.json();
    
    // Transform to widget format
    const tableData = {
      title: 'Market Data',
      headers: json.headers,
      rows: json.rows
    };

    // Publish when data is ready
    this.producer.publish(tableData);
  }

  cleanup() {
    this.producer.clear();
  }
}

export const marketDataService = new MarketDataService();
```

**Where to register:**
- Service class constructor
- Service initialization function
- Module-level singleton

**Where to use:**
```typescript
// In your component
import { marketDataService } from '$lib/services/marketDataService';

onMount(async () => {
  await marketDataService.fetchMarketData();
});
```

---

### 3. **Real-time Data Stream → Widget**

**✅ Create producer with WebSocket/EventSource:**

```typescript
// src/lib/services/realtimeService.ts
import { createWidgetPublisher } from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';

class RealtimeService {
  private producer;
  private ws: WebSocket | null = null;

  connect() {
    // Register producer when connecting
    this.producer = createWidgetPublisher(
      WidgetChannels.metricData,
      'realtime-service'
    );

    this.ws = new WebSocket('wss://api.example.com/stream');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Publish each update
      this.producer.publish({
        label: data.label,
        value: data.value,
        change: data.change,
        changeType: data.changeType
      });
    };
  }

  disconnect() {
    this.ws?.close();
    this.producer.clear();
  }
}

export const realtimeService = new RealtimeService();
```

**Where:** Service that manages the connection

---

### 4. **User Action → Widget**

**✅ Create producer in action handler:**

```typescript
// src/lib/components/UserInputForm.svelte
<script lang="ts">
import { createWidgetPublisher } from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';
import { onMount, onDestroy } from 'svelte';

let producer;

onMount(() => {
  // Register when component mounts
  producer = createWidgetPublisher(
    WidgetChannels.paragraphContent,
    'user-input-form'
  );
});

function handleSubmit(formData) {
  // Publish when user submits
  producer.publish({
    title: 'User Input',
    content: formData.text,
    markdown: false
  });
}

onDestroy(() => {
  // Clean up when component unmounts
  producer.clear();
});
</script>

<form onsubmit={handleSubmit}>
  <!-- form fields -->
</form>
```

**Where:** In the component that handles user input

---

### 5. **Periodic Updates (Polling)**

**✅ Create producer with interval:**

```typescript
// src/lib/services/pollingService.ts
import { createWidgetPublisher } from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';

class PollingService {
  private producer;
  private interval: ReturnType<typeof setInterval> | null = null;

  start() {
    // Register producer
    this.producer = createWidgetPublisher(
      WidgetChannels.metricData,
      'polling-service'
    );

    // Poll every 30 seconds
    this.interval = setInterval(async () => {
      const data = await this.fetchData();
      this.producer.publish(data);
    }, 30000);
  }

  async fetchData() {
    const response = await fetch('/api/metrics');
    return response.json();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.producer.clear();
  }
}

export const pollingService = new PollingService();
```

**Where:** Service that manages the polling

---

## File Organization

### Recommended Structure

```
src/lib/
├── services/
│   ├── marketDataService.ts      ← Producer for API data
│   ├── realtimeService.ts        ← Producer for WebSocket data
│   └── pollingService.ts         ← Producer for polling data
│
├── components/
│   ├── AI/
│   │   └── JobSubmission.svelte  ← Creates bridge (which creates producer)
│   └── UserInputForm.svelte      ← Producer for user input
│
└── dashboard/
    ├── types/
    │   ├── widgetBridge.ts       ← Factory functions (createWidgetPublisher)
    │   └── widgetSchemas.ts      ← Schema definitions
    └── components/
        └── widgets/
            └── ParagraphWidget.svelte  ← Consumer only, no producer

```

---

## Best Practices

### ✅ DO

1. **Register in lifecycle hooks:**
   ```typescript
   onMount(() => {
     producer = createWidgetPublisher(...);
   });
   
   onDestroy(() => {
     producer.clear();
   });
   ```

2. **Use descriptive IDs:**
   ```typescript
   // GOOD
   createWidgetPublisher(channel, 'market-data-fetcher');
   createWidgetPublisher(channel, 'user-form-handler');
   
   // BAD
   createWidgetPublisher(channel, 'producer1');
   createWidgetPublisher(channel, 'temp');
   ```

3. **Clean up on unmount/disconnect:**
   ```typescript
   producer.clear();  // Clears data from store
   ```

4. **Use bridges for AI jobs:**
   ```typescript
   const bridge = createJobWidgetBridge({
     jobId,
     channel: WidgetChannels.paragraphContent
   });
   ```

5. **Keep producer reference:**
   ```typescript
   let producer;  // Store reference for cleanup
   ```

### ❌ DON'T

1. **Don't register in widgets:**
   ```typescript
   // BAD: Widget should consume, not produce
   // ParagraphWidget.svelte
   const producer = createWidgetPublisher(...);  // ❌
   ```

2. **Don't create multiple producers unnecessarily:**
   ```typescript
   // BAD: One source, multiple producers
   const producer1 = createWidgetPublisher(channel, 'id1');
   const producer2 = createWidgetPublisher(channel, 'id2');
   producer1.publish(data);  // Confusing!
   producer2.publish(data);
   ```

3. **Don't forget cleanup:**
   ```typescript
   // BAD: Memory leak
   onMount(() => {
     producer = createWidgetPublisher(...);
   });
   // Missing onDestroy!
   ```

4. **Don't register in render logic:**
   ```typescript
   // BAD: Creates new producer on every render
   {#if condition}
     {createWidgetPublisher(...)}  // ❌
   {/if}
   ```

---

## Common Patterns Summary

| Data Source | Where to Register | Example File |
|------------|------------------|--------------|
| AI Job Result | Job completion handler (via bridge) | `WidgetJobIntegration.svelte` |
| API/REST | Service class | `services/apiService.ts` |
| WebSocket | Connection manager | `services/realtimeService.ts` |
| User Input | Form component | `components/UserForm.svelte` |
| Polling | Polling service | `services/pollingService.ts` |
| Static/Initial | Page/layout component | `routes/+page.svelte` |

---

## Example: Complete Flow

### 1. Define Service (Producer)

```typescript
// src/lib/services/summaryService.ts
import { createWidgetPublisher } from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';

class SummaryService {
  private producer = createWidgetPublisher(
    WidgetChannels.paragraphContent,
    'summary-service'
  );

  async generateSummary(text: string) {
    const summary = await fetch('/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ text })
    }).then(r => r.json());

    this.producer.publish({
      title: 'Summary',
      content: summary.text,
      markdown: false
    });
  }
}

export const summaryService = new SummaryService();
```

### 2. Use in Component

```typescript
// src/routes/dashboard/+page.svelte
<script>
import { summaryService } from '$lib/services/summaryService';
import ParagraphWidget from '$lib/dashboard/components/widgets/ParagraphWidget.svelte';

async function handleGenerateSummary() {
  await summaryService.generateSummary(inputText);
}
</script>

<button onclick={handleGenerateSummary}>Generate Summary</button>

<!-- Widget automatically receives data via mapStore -->
<ParagraphWidget 
  data={{ title: 'Waiting...', content: 'Click button above' }}
/>
```

---

## Debugging

Use the MapStore Debug Panel to verify producer registration:

1. Click **"📤 Log Producers"** button
2. Look for your producer ID in the list
3. Verify it's registered for the correct channel

Expected output:
```
📤 Channel: paragraph-content
   Producers: 1
   1. summary-service (producer)
```

---

## Migration Guide

### From Direct mapStore to ValidatedPublisher

**Before:**
```typescript
import { mapStore } from '$lib/stores/mapObjectStore';

const producer = mapStore.registerProducer('paragraph-content', 'my-id');
producer.publish({ title: 'Test', content: 'Data' });  // No validation!
```

**After:**
```typescript
import { createWidgetPublisher } from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';

const producer = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'my-id'
);
producer.publish({ title: 'Test', content: 'Data' });  // ✅ Validated!
```

**Benefits:**
- Automatic validation against Zod schema
- Type safety
- Runtime error catching
- Consistent with widget bridge system

---

## Key Takeaway

**Producers should be registered where data originates:**

- **AI Jobs** → Use `createJobWidgetBridge()` (creates producer automatically)
- **APIs/Services** → Register in service class/module
- **User Input** → Register in form/input component
- **Real-time** → Register in connection manager
- **Widgets** → Usually only consume (use `createWidgetConsumer()`)

This keeps your architecture clean and makes data flow easy to trace!

