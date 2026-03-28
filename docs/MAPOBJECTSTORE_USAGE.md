# mapObjectStore Usage Guide

## Overview

`mapObjectStore` is a **producer-consumer pattern store** that manages typed data channels. It's currently used in several places but **should be migrated to `MapStore.ts`** for consistency.

## Current Usage

### ⚠️ Status: Legacy Store (Deprecated)

**Recommendation:** Migrate all usages to `MapStore.ts` (topic-based store with schema validation and multi-tab sync).

---

## Where It's Used

### 1. **Dashboard Controls** (`DashboardControls.svelte`)

**Location:** Line 84-135

**Purpose:** Demo/test function to update paragraph widget content

```typescript
function handleUpdateParagraphWidget() {
  let contentProducer = mapStore.registerProducer<ParagraphWidget['data']>(
    'paragraph-content',
    'content-generator-agent'
  );
  
  // Generate random content
  const data: ParagraphWidget['data'] = {
    title: topic.title,
    content: contentWithTime,
    markdown: topic.markdown
  };
  
  contentProducer.publish(data);
}
```

**Usage Pattern:**
- Creates a producer for `'paragraph-content'` channel
- Publishes paragraph widget data
- Widgets consuming this channel receive updates

**Migration Path:**
```typescript
// Should use MapStore instead:
import { mapStore } from '$lib/stores/MapStore';

const publisher = mapStore.getPublisher('paragraph-content', 'content-generator-agent');
publisher.publish(data);
```

---

### 2. **Dashboard Storage** (`storage.ts`)

**Location:** Lines 85-123, 234-243

**Purpose:** Save/restore widget data to/from localStorage

#### Saving Widget Data

```typescript
static saveDashboard(widgets: Widget[], config: DashboardConfig, projectId: string | null = null): boolean {
  // Capture current widget data from mapObjectStore
  const allData = mapStore.getAllData();
  const widgetData: WidgetDataSnapshot = {};
  
  allData.forEach(item => {
    if (item.value !== undefined) {
      widgetData[item.typeId] = item.value;
    }
  });
  
  // Save to localStorage
  localStorage.setItem(widgetDataKey, JSON.stringify(widgetData));
}
```

#### Restoring Widget Data

```typescript
private static restoreWidgetData(widgetData: WidgetDataSnapshot): void {
  Object.entries(widgetData).forEach(([channelId, data]) => {
    // Register a temporary producer to restore the data
    const producer = mapStore.registerProducer(
      channelId,
      'dashboard-storage-restore'
    );
    
    producer.publish(data);
    
    // Unregister the temporary producer
    mapStore.unregister('dashboard-storage-restore');
  });
}
```

**Usage Pattern:**
- Uses `getAllData()` to capture all widget data
- Saves to localStorage for persistence
- Restores data by creating temporary producers

**Migration Path:**
```typescript
// Should use MapStore instead:
import { mapStore } from '$lib/stores/MapStore';

// Get all data (MapStore doesn't have getAllData, need to track topics)
// Or use a different approach for persistence
```

**Note:** `MapStore` doesn't have `getAllData()`, so this would need a different approach.

---

### 3. **Dashboard Store** (`dashboard.svelte.ts`)

**Location:** Lines 396, 407

**Purpose:** Clear widget data when resetting dashboard

```typescript
resetToDefault(): void {
  this.#widgets = [];
  this.#widgetZIndexMap.clear();
  this.#nextZIndex = 1;
  this.#config = structuredClone(DEFAULT_CONFIG);
  this.#hasUnsavedChanges = false;
  
  mapStore.clearData(); // Clear all mapObjectStore data
  this.clearSavedDashboard();
}

clearSavedDashboard(): boolean {
  const success = DashboardStorage.clearDashboard(this.#projectId);
  
  if (success) {
    mapStore.clearData(); // Clear all mapObjectStore data
    this.#hasUnsavedChanges = false;
  }
  
  return success;
}
```

**Usage Pattern:**
- Calls `clearData()` to clear all widget data
- Used during dashboard reset/clear operations

**Migration Path:**
```typescript
// MapStore doesn't have clearData() method
// Would need to track topics and clear them individually
// Or implement clearData() in MapStore
```

---

### 4. **Widget Bridge** (`widget-bridge.ts`)

**Location:** Lines 248-251, 272-275

**Purpose:** Create validated publishers/consumers for widget data

```typescript
function createWidgetPublisher<T extends WidgetType>(
  config: WidgetChannelConfig<T>,
  publisherId: string
): WidgetPublisher<WidgetDataTypeMap[T]> {
  const producer = mapStore.registerProducer<WidgetDataTypeMap[T]>(
    config.channelId,
    publisherId
  );
  
  return new WidgetPublisherImpl(
    config.channelId,
    publisherId,
    config.schema,
    producer
  );
}

function createWidgetConsumer<T extends WidgetType>(
  config: WidgetChannelConfig<T>,
  consumerId: string
): WidgetConsumer<WidgetDataTypeMap[T]> {
  const consumer = mapStore.registerConsumer<WidgetDataTypeMap[T]>(
    config.channelId,
    consumerId
  );
  
  return new WidgetConsumerImpl(
    config.channelId,
    consumerId,
    config.schema,
    consumer
  );
}
```

**Usage Pattern:**
- Creates typed producers/consumers for widget channels
- Wraps mapObjectStore with validation layer
- Used by widget system for data flow

**Migration Path:**
```typescript
// Should use MapStore with schema enforcement:
import { mapStore } from '$lib/stores/MapStore';

const publisher = mapStore.getPublisher(config.channelId, publisherId);
mapStore.enforceTopicSchema(config.channelId, config.schemaId);
```

---

### 5. **Debug Widget** (`MapStoreDebugWidget.svelte`)

**Location:** Entire file

**Purpose:** Admin/debug tool to inspect mapObjectStore state

```typescript
function logAllConsumers() {
  const consumers = mapStore.getAllConsumers();
  // Log all consumers grouped by channel
}

function logAllProducers() {
  const producers = mapStore.getAllProducers();
  // Log all producers grouped by channel
}

function logAllData() {
  const allData = mapStore.getAllData();
  // Log all data across all channels
}
```

**Usage Pattern:**
- Uses introspection methods (`getAllConsumers()`, `getAllProducers()`, `getAllData()`)
- Helps debug producer/consumer relationships
- Shows channel state

**Migration Path:**
```typescript
// MapStore has different introspection:
import { mapStore } from '$lib/stores/MapStore';

mapStore.dump(); // Dumps all topics, producers, consumers
mapStore.getInspectorData(); // Returns structured data
```

---

## API Comparison: mapObjectStore vs MapStore

### mapObjectStore (Current)

```typescript
// Producer
const producer = mapStore.registerProducer<T>('channel-id', 'producer-id');
producer.publish(data);

// Consumer
const consumer = mapStore.registerConsumer<T>('channel-id', 'consumer-id');
consumer.subscribe(data => { ... });

// Introspection
const allData = mapStore.getAllData();
const producers = mapStore.getAllProducers();
const consumers = mapStore.getAllConsumers();
const typeInfo = mapStore.getTypeInfo();

// Cleanup
mapStore.clearData();
mapStore.unregister('registration-id');
```

### MapStore (Recommended)

```typescript
// Publisher
const publisher = mapStore.getPublisher('topic-name', 'producer-id');
publisher.publish(data);
publisher.dispose(); // Cleanup

// Consumer
const stream = mapStore.getStream('topic-name', 'consumer-id');
stream.subscribe(data => { ... });
const unsubscribe = stream.subscribe(...);

// Schema Enforcement
mapStore.enforceTopicSchema('topic-name', 'schema-id');

// Introspection
mapStore.dump(); // Console dump
mapStore.getInspectorData(); // Structured data
mapStore.getTopicsBySchema('schema-id'); // Find topics by schema

// Multi-tab sync (automatic)
// BroadcastChannel integration built-in
```

---

## Key Differences

| Feature | mapObjectStore | MapStore |
|---------|----------------|----------|
| **Naming** | Type-based (`typeId`) | Topic-based (`topic`) |
| **Schema Validation** | ❌ No | ✅ Yes (via SchemaRegistry) |
| **Multi-tab Sync** | ❌ No | ✅ Yes (BroadcastChannel) |
| **Introspection** | ✅ Rich API | ✅ Different API |
| **Data Persistence** | ✅ `getAllData()` | ❌ Need custom tracking |
| **Type Safety** | ✅ Generic types | ✅ Generic types |
| **Producer/Consumer** | ✅ Full pattern | ✅ Publisher/Stream pattern |

---

## Migration Strategy

### Phase 1: Identify All Usages

✅ **Completed:** Found 5 main usage areas:
1. DashboardControls.svelte
2. storage.ts
3. dashboard.svelte.ts
4. widget-bridge.ts
5. MapStoreDebugWidget.svelte

### Phase 2: Create Migration Helpers

Create adapter functions to bridge the gap:

```typescript
// lib/stores/mapObjectStoreAdapter.ts
import { mapStore as topicStore } from '$lib/stores/MapStore';

// Adapter to maintain compatibility
export const mapStore = {
  registerProducer: (typeId: string, registrationId: string) => {
    const publisher = topicStore.getPublisher(typeId, registrationId);
    return {
      publish: (data: unknown) => publisher.publish(data),
      update: (updater: (current: unknown) => unknown) => {
        // Get current value and update
        const stream = topicStore.getStream(typeId, registrationId);
        const current = stream.get();
        publisher.publish(updater(current));
      },
      clear: () => publisher.publish(undefined)
    };
  },
  
  registerConsumer: (typeId: string, registrationId: string) => {
    const stream = topicStore.getStream(typeId, registrationId);
    return {
      subscribe: stream.subscribe,
      get: stream.get
    };
  },
  
  // ... other methods
};
```

### Phase 3: Migrate One by One

1. **DashboardControls.svelte** - Easy (just change import)
2. **widget-bridge.ts** - Medium (add schema enforcement)
3. **storage.ts** - Hard (need to track topics for persistence)
4. **dashboard.svelte.ts** - Medium (implement clearData equivalent)
5. **MapStoreDebugWidget.svelte** - Easy (use MapStore.dump())

### Phase 4: Remove mapObjectStore

After all usages migrated, remove `mapObjectStore.ts`.

---

## Current Issues

### 1. **Inconsistent Store Usage**

Some components use `mapObjectStore`, others use `MapStore`:
- Dashboard widgets → `MapStore` ✅
- Dashboard storage → `mapObjectStore` ❌
- Widget bridge → `mapObjectStore` ❌

### 2. **Missing Features**

`mapObjectStore` lacks:
- Schema validation
- Multi-tab synchronization
- Topic-based organization

### 3. **Data Persistence Challenge**

`storage.ts` relies on `getAllData()` which `MapStore` doesn't have. Need alternative approach:
- Track topics manually
- Use a different persistence strategy
- Extend `MapStore` with `getAllData()` equivalent

---

## Recommended Actions

### Immediate (Low Risk)

1. ✅ Document current usage (this document)
2. ✅ Create migration plan
3. 🔄 Update `DashboardControls.svelte` to use `MapStore`

### Short Term (Medium Risk)

1. 🔄 Migrate `widget-bridge.ts` to use `MapStore` with schema enforcement
2. 🔄 Update `MapStoreDebugWidget.svelte` to use `MapStore.dump()`
3. 🔄 Implement `clearData()` equivalent in `MapStore` or migrate dashboard reset logic

### Long Term (High Risk)

1. 🔄 Refactor `storage.ts` to work with `MapStore` (or new persistence strategy)
2. 🔄 Remove `mapObjectStore.ts` entirely
3. 🔄 Update all documentation

---

## Summary

**mapObjectStore** is currently used in:
- ✅ Dashboard controls (demo/test)
- ✅ Dashboard storage (persistence)
- ✅ Dashboard store (reset/clear)
- ✅ Widget bridge (data flow)
- ✅ Debug widget (introspection)

**Status:** Legacy store that should be migrated to `MapStore.ts` for:
- ✅ Schema validation
- ✅ Multi-tab sync
- ✅ Consistency with rest of app
- ✅ Better architecture

**Priority:** Medium - Not blocking, but creates inconsistency and technical debt.
