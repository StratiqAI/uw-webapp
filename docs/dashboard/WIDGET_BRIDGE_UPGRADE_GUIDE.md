# Widget Bridge Upgrade Guide

## 🎉 What's New in the Upgraded Widget Bridge System

The Widget Bridge has been upgraded with a cleaner, more intuitive API that makes it easier to connect AI jobs to widgets, publish data, and create reactive Svelte stores.

---

## ✨ New Features

### 1. **Preset Publishers & Consumers**

Instead of manually creating channel configs every time, you can now use preset factory functions:

```typescript
// OLD WAY ❌
const publisher = createWidgetPublisher(
  {
    channelId: 'my-channel',
    widgetType: 'paragraph',
    schema: ParagraphWidgetDataSchema,
    description: 'My channel'
  },
  'publisher-id'
);

// NEW WAY ✅
import { Publishers } from '$lib/dashboard/types/widgetBridge';
const publisher = Publishers.paragraph('my-channel', 'publisher-id');
```

**Available Presets:**
- `Publishers.paragraph(channelId, publisherId)`
- `Publishers.table(channelId, publisherId)`
- `Publishers.metric(channelId, publisherId)`
- `Publishers.lineChart(channelId, publisherId)`
- `Publishers.barChart(channelId, publisherId)`
- `Publishers.title(channelId, publisherId)`
- `Publishers.image(channelId, publisherId)`
- `Publishers.map(channelId, publisherId)`

Same for `Consumers`:
```typescript
import { Consumers } from '$lib/dashboard/types/widgetBridge';
const consumer = Consumers.paragraph('my-channel', 'consumer-id');
```

---

### 2. **Widget Stores for Svelte**

Create reactive Svelte stores with one line:

```typescript
import { WidgetStores } from '$lib/dashboard/types/widgetBridge';

// In your Svelte component
let dataStore = WidgetStores.paragraph('sales-summary', 'widget-1');

// Subscribe
const unsubscribe = dataStore.subscribe(data => {
  console.log('New data:', data);
});
```

**Available Widget Stores:**
- `WidgetStores.paragraph(channelId, widgetId)`
- `WidgetStores.table(channelId, widgetId)`
- `WidgetStores.metric(channelId, widgetId)`
- `WidgetStores.lineChart(channelId, widgetId)`
- `WidgetStores.barChart(channelId, widgetId)`
- `WidgetStores.title(channelId, widgetId)`
- `WidgetStores.image(channelId, widgetId)`
- `WidgetStores.map(channelId, widgetId)`

---

### 3. **Dynamic Channel Factory Functions**

Create channel configurations with dynamic IDs:

```typescript
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';

// Create custom channels
const channel1 = WidgetChannels.paragraph('user-summary');
const channel2 = WidgetChannels.table('sales-data-2024');
const channel3 = WidgetChannels.metric('cpu-usage');

// With optional description
const channel4 = WidgetChannels.paragraph('notes', 'User notes channel');
```

---

### 4. **Cleaner Job-to-Widget Bridge API**

```typescript
// OLD NAME (still works)
import { createJobWidgetBridge } from '$lib/dashboard/types/widgetBridge';

// NEW CLEANER NAME ✅
import { bridgeJobToWidget } from '$lib/dashboard/types/widgetBridge';

const bridge = bridgeJobToWidget({
  jobId,
  channel: WidgetChannels.paragraph('summary'),
  transformer: (result) => JSON.parse(result)
});
```

---

### 5. **Multi-Widget Bridge**

Bridge one AI job to multiple widgets at once:

```typescript
import { bridgeJobToMultipleWidgets, WidgetChannels } from '$lib/dashboard/types/widgetBridge';

const bridge = bridgeJobToMultipleWidgets(jobId, [
  {
    channel: WidgetChannels.metric('revenue'),
    transformer: (result) => {
      const data = JSON.parse(result);
      return { label: 'Revenue', value: data.revenue, unit: '$' };
    }
  },
  {
    channel: WidgetChannels.lineChart('trends'),
    transformer: (result) => {
      const data = JSON.parse(result);
      return { datasets: [...], labels: [...] };
    }
  },
  {
    channel: WidgetChannels.paragraph('analysis'),
    transformer: (result) => {
      const data = JSON.parse(result);
      return { content: data.summary, markdown: true };
    }
  }
]);
```

---

## 📖 Complete Usage Examples

### Example 1: Simple Paragraph Widget with AI Job

```typescript
import { bridgeJobToWidget, WidgetChannels } from '$lib/dashboard/types/widgetBridge';
import { submitJob } from '$lib/services/aiService';

async function setupWidget() {
  // Submit AI job
  const jobId = await submitJob({
    request: "Generate a summary of recent sales",
    priority: "HIGH"
  });
  
  // Bridge job to widget
  const bridge = bridgeJobToWidget({
    jobId,
    channel: WidgetChannels.paragraph('sales-summary'),
    transformer: (result) => {
      const data = JSON.parse(result);
      return {
        content: data.summary,
        markdown: true
      };
    }
  });
  
  return { jobId, bridge };
}
```

### Example 2: Direct Data Publishing (No AI Job)

```typescript
import { Publishers } from '$lib/dashboard/types/widgetBridge';

function updateCPUMetric() {
  const publisher = Publishers.metric('cpu-usage', 'system-monitor');
  
  setInterval(() => {
    const cpuUsage = Math.random() * 100;
    
    publisher.publish({
      label: 'CPU Usage',
      value: cpuUsage.toFixed(1),
      unit: '%',
      changeType: cpuUsage > 50 ? 'increase' : 'decrease',
      change: Math.random() * 10
    });
  }, 1000);
}
```

### Example 3: Reactive Svelte Component

```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { WidgetStores } from '$lib/dashboard/types/widgetBridge';
  
  // Create reactive store
  const store = WidgetStores.paragraph('sales-summary', 'widget-1');
  
  let content: string | undefined;
  let markdown: boolean = false;
  
  // Subscribe to updates
  const unsubscribe = store.subscribe(data => {
    if (data) {
      content = data.content;
      markdown = data.markdown ?? false;
    }
  });
  
  onDestroy(unsubscribe);
</script>

{#if content}
  <div class="widget-content">
    {#if markdown}
      {@html marked(content)}
    {:else}
      {content}
    {/if}
  </div>
{/if}
```

### Example 4: Dashboard with Multiple Widgets from One Job

```typescript
import { 
  bridgeJobToMultipleWidgets, 
  WidgetChannels 
} from '$lib/dashboard/types/widgetBridge';

async function setupDashboard() {
  // Submit comprehensive analysis job
  const jobId = await submitJob({
    request: "Analyze Q4 2024 performance with metrics, charts, and summary",
    priority: "HIGH"
  });
  
  // Bridge to multiple widgets
  const bridge = bridgeJobToMultipleWidgets(jobId, [
    // Revenue metric
    {
      channel: WidgetChannels.metric('q4-revenue'),
      transformer: (result) => {
        const data = JSON.parse(result);
        return {
          label: 'Q4 Revenue',
          value: data.revenue,
          change: data.revenueChange,
          changeType: data.revenueChange > 0 ? 'increase' : 'decrease',
          unit: '$'
        };
      }
    },
    
    // Revenue trend chart
    {
      channel: WidgetChannels.lineChart('revenue-trend'),
      transformer: (result) => {
        const data = JSON.parse(result);
        return {
          datasets: [{
            label: 'Monthly Revenue',
            data: data.monthlyRevenue,
            color: '#10b981'
          }],
          labels: ['Oct', 'Nov', 'Dec']
        };
      }
    },
    
    // Analysis paragraph
    {
      channel: WidgetChannels.paragraph('q4-analysis'),
      transformer: (result) => {
        const data = JSON.parse(result);
        return {
          title: 'Q4 Analysis',
          content: data.analysis,
          markdown: true
        };
      }
    },
    
    // Performance table
    {
      channel: WidgetChannels.table('performance-breakdown'),
      transformer: (result) => {
        const data = JSON.parse(result);
        return {
          title: 'Performance Breakdown',
          headers: ['Category', 'Value', 'Change'],
          rows: data.breakdown
        };
      }
    }
  ]);
  
  return { jobId, bridge };
}
```

### Example 5: Custom Service with Publisher

```typescript
import { Publishers } from '$lib/dashboard/types/widgetBridge';

class RealtimeDataService {
  private publisher: ReturnType<typeof Publishers.metric>;
  
  constructor(channelId: string) {
    this.publisher = Publishers.metric(channelId, 'realtime-service');
  }
  
  start() {
    // Connect to WebSocket or polling service
    this.subscribeToUpdates((data) => {
      this.publisher.publish({
        label: data.label,
        value: data.value,
        unit: data.unit,
        change: data.change,
        changeType: data.changeType
      });
    });
  }
  
  stop() {
    this.publisher.clear();
  }
}

// Usage
const service = new RealtimeDataService('stock-price');
service.start();
```

---

## 🔄 Migration Guide

### Before (Old API)

```typescript
import { 
  createWidgetPublisher, 
  createJobWidgetBridge,
  createWidgetConsumer 
} from '$lib/dashboard/types/widgetBridge';
import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';

// Creating publisher
const publisher = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'my-publisher'
);

// Creating bridge
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent,
  transformer: (result) => JSON.parse(result)
});

// Creating consumer
const consumer = createWidgetConsumer(
  WidgetChannels.paragraphContent,
  'my-consumer'
);
```

### After (New API)

```typescript
import { 
  Publishers,
  Consumers,
  WidgetStores,
  bridgeJobToWidget,
  WidgetChannels
} from '$lib/dashboard/types/widgetBridge';

// Creating publisher (easier!)
const publisher = Publishers.paragraph('my-channel', 'my-publisher');

// Creating bridge (cleaner name!)
const bridge = bridgeJobToWidget({
  jobId: 'job-123',
  channel: WidgetChannels.paragraph('my-channel'),
  transformer: (result) => JSON.parse(result)
});

// Creating consumer (simpler!)
const consumer = Consumers.paragraph('my-channel', 'my-consumer');

// Or use reactive store directly
const store = WidgetStores.paragraph('my-channel', 'widget-id');
```

---

## 📋 API Reference

### Publishers

```typescript
Publishers.paragraph(channelId: string, publisherId: string): ValidatedPublisher
Publishers.table(channelId: string, publisherId: string): ValidatedPublisher
Publishers.metric(channelId: string, publisherId: string): ValidatedPublisher
Publishers.lineChart(channelId: string, publisherId: string): ValidatedPublisher
Publishers.barChart(channelId: string, publisherId: string): ValidatedPublisher
Publishers.title(channelId: string, publisherId: string): ValidatedPublisher
Publishers.image(channelId: string, publisherId: string): ValidatedPublisher
Publishers.map(channelId: string, publisherId: string): ValidatedPublisher
```

### Consumers

```typescript
Consumers.paragraph(channelId: string, consumerId: string): ValidatedConsumer
Consumers.table(channelId: string, consumerId: string): ValidatedConsumer
Consumers.metric(channelId: string, consumerId: string): ValidatedConsumer
Consumers.lineChart(channelId: string, consumerId: string): ValidatedConsumer
Consumers.barChart(channelId: string, consumerId: string): ValidatedConsumer
Consumers.title(channelId: string, consumerId: string): ValidatedConsumer
Consumers.image(channelId: string, consumerId: string): ValidatedConsumer
Consumers.map(channelId: string, consumerId: string): ValidatedConsumer
```

### WidgetStores

```typescript
WidgetStores.paragraph(channelId: string, widgetId: string): SvelteStore
WidgetStores.table(channelId: string, widgetId: string): SvelteStore
WidgetStores.metric(channelId: string, widgetId: string): SvelteStore
WidgetStores.lineChart(channelId: string, widgetId: string): SvelteStore
WidgetStores.barChart(channelId: string, widgetId: string): SvelteStore
WidgetStores.title(channelId: string, widgetId: string): SvelteStore
WidgetStores.image(channelId: string, widgetId: string): SvelteStore
WidgetStores.map(channelId: string, widgetId: string): SvelteStore
```

### Bridge Functions

```typescript
bridgeJobToWidget<T>(config: {
  jobId: string;
  channel: WidgetChannelConfig<T>;
  transformer?: (result: string) => unknown;
  filter?: (update: JobUpdate) => boolean;
}): JobWidgetBridge

bridgeJobToMultipleWidgets(
  jobId: string,
  channels: Array<{
    channel: WidgetChannelConfig<any>;
    transformer?: (result: string) => unknown;
    filter?: (update: JobUpdate) => boolean;
  }>
): JobWidgetBridge
```

### WidgetChannels Factory Functions

```typescript
WidgetChannels.paragraph(channelId: string, description?: string): WidgetChannelConfig
WidgetChannels.table(channelId: string, description?: string): WidgetChannelConfig
WidgetChannels.metric(channelId: string, description?: string): WidgetChannelConfig
WidgetChannels.lineChart(channelId: string, description?: string): WidgetChannelConfig
WidgetChannels.barChart(channelId: string, description?: string): WidgetChannelConfig
WidgetChannels.title(channelId: string, description?: string): WidgetChannelConfig
WidgetChannels.image(channelId: string, description?: string): WidgetChannelConfig
WidgetChannels.map(channelId: string, description?: string): WidgetChannelConfig
```

---

## ✅ Backward Compatibility

All old APIs still work! The new API is **additive** and doesn't break existing code.

**Old functions still available:**
- `createWidgetPublisher()`
- `createWidgetConsumer()`
- `createJobWidgetBridge()`
- `createJobMultiWidgetBridge()`
- `WidgetChannels.paragraphContent` (static preset)
- `WidgetChannels.tableData` (static preset)

---

## 🎯 Best Practices

1. **Use Preset Publishers/Consumers** for cleaner code:
   ```typescript
   // ✅ Good
   const pub = Publishers.metric('cpu', 'monitor');
   
   // ❌ Verbose
   const pub = createWidgetPublisher(
     { channelId: 'cpu', widgetType: 'metric', schema: ... },
     'monitor'
   );
   ```

2. **Use WidgetStores in Svelte components** for reactivity:
   ```typescript
   // ✅ Good
   const store = WidgetStores.paragraph('summary', 'widget-1');
   
   // ❌ More boilerplate
   const consumer = createWidgetConsumer(...);
   let data;
   consumer.subscribe(d => data = d);
   ```

3. **Use bridgeJobToMultipleWidgets** when one job populates multiple widgets:
   ```typescript
   // ✅ Good - one bridge manages all
   const bridge = bridgeJobToMultipleWidgets(jobId, [...]);
   
   // ❌ Harder to manage
   const bridge1 = bridgeJobToWidget({...});
   const bridge2 = bridgeJobToWidget({...});
   const bridge3 = bridgeJobToWidget({...});
   ```

4. **Use dynamic channel IDs** to avoid conflicts:
   ```typescript
   // ✅ Good - unique per widget instance
   WidgetChannels.paragraph(`summary-${widgetId}`)
   
   // ❌ Risk of conflicts
   WidgetChannels.paragraph('summary')
   ```

---

## 🚀 What's Next?

The upgraded Widget Bridge system provides:
- ✅ Cleaner, more intuitive API
- ✅ Less boilerplate code
- ✅ Better TypeScript support
- ✅ Easier Svelte integration
- ✅ Full backward compatibility
- ✅ Dynamic channel creation
- ✅ Multi-widget bridge support

Start using the new API today for a better development experience!

