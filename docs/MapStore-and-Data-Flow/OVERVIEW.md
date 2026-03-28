Here is the comprehensive **Technical Specification Document (TSD)** for the Commercial Real Estate (CRE) Reactive Dashboard.

This document is designed to be handed directly to a Senior Software Engineer or an AI Coding Agent for implementation.

---

# Technical Specification: CRE Reactive Dashboard

**Version:** 1.0.0
**Status:** Draft
**Tech Stack:** Svelte 5 (Runes), TypeScript (Strict), Vite, Zod.

---

## 1. System Architecture Overview

### 1.1 High-Level Concept
The application creates a decoupled environment where data ingestion (Producers) and data visualization (Consumers/Widgets) operate independently via a central Pub/Sub Event Bus (`MapStore`). This eliminates prop-drilling and creates a reactive, real-time ecosystem suitable for high-frequency updates (e.g., WebSocket feeds, AI streams).

### 1.2 The Data Flow Pattern
1.  **Publishers** (Forms, WebSockets, AI Agents) push typed JSON data to a specific `topic` (string key).
2.  **MapStore** (Singleton) receives the data and notifies all active listeners.
3.  **Hooks** (Svelte 5 Runes) translate these events into fine-grained reactive signals (`$state`).
4.  **Universal Widgets** determine *how* to render the data based on a `schemaId` looked up in the `ComponentRegistry`.

### 1.3 Tech Stack Constraints
*   **Reactivity:** Must use Svelte 5 Runes (`$state`, `$effect`, `$derived`, `$props`). No legacy `export let` or `$:`.
*   **State Management:** No global Redux/Pinia. State is ephemeral in the `MapStore` singleton.
*   **Typing:** No `any`. All topics must be defined in the `TopicRegistry` interface.
*   **Validation:** Zod schemas are required for all editable data types to support runtime form generation.

---

## 2. Phase 1 Spec: Data Core & Reactivity

**Goal:** Establish the type-safe event bus and the Svelte 5 adapters (hooks) that allow components to interact with it.

### 2.1 Domain Data Models
**File:** `src/lib/types/topics.ts`

This file serves as the "Contract" between the backend, the store, and the UI.

```typescript
// src/lib/types/topics.ts

export type AssetClass = 'Office' | 'Industrial' | 'Multifamily' | 'Retail' | 'Hotel';

// 1. Property Data (Static/Slow moving)
export interface Property {
  id: string;
  name: string;
  address: string;
  assetClass: AssetClass;
  sqFt: number;
  yearBuilt: number;
  images?: string[];
}

// 2. Underwriting Data (Fast moving, user editable)
export interface Underwriting {
  propertyId: string;
  purchasePrice: number;
  noi: number;         // Net Operating Income
  capRate: number;     // Capitalization Rate %
  loanToValue: number; // LTV %
  interestRate: number;
  // Computed fields (optional in storage, often calculated in UI)
  valuation?: number;
}

// 3. Workflow/AI Status (Real-time streams)
export interface WorkflowStatus {
  jobId: string;
  type: 'market-analysis' | 'lease-abstraction';
  step: string;
  progress: number; // 0-100
  logs: string[];
  status: 'pending' | 'active' | 'completed' | 'failed';
}

// 4. System Messages
export interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

// --- TOPIC REGISTRY ---
// This mapped type enforces strict topic naming
export type TopicRegistry = {
  'sys:alerts': SystemAlert;
  [key: `prop:${string}`]: Property;        // e.g. "prop:101"
  [key: `fin:${string}`]: Underwriting;     // e.g. "fin:101"
  [key: `wf:${string}`]: WorkflowStatus;    // e.g. "wf:job-abc"
};

// Helper to extract type T from a topic string K
export type TopicValue<K extends keyof TopicRegistry | string> = 
  K extends keyof TopicRegistry ? TopicRegistry[K] : any;
```

### 2.2 The MapStore Engine
**File:** `src/lib/stores/MapStore.ts`

The engine is framework-agnostic. It uses standard `writable` stores internally but exposes controlled methods.

```typescript
// src/lib/stores/MapStore.ts
import { writable, type Writable, get } from 'svelte/store';

interface Entry<T = any> {
  store: Writable<T | undefined>;
  producers: Set<string>;
  consumers: Set<string>;
  lastValue: T | undefined;
}

export class MapStore {
  private registry = new Map<string, Entry>();

  // Internal: Ensure topic exists
  private ensure<T>(topic: string, initial?: T): Entry<T> {
    if (!this.registry.has(topic)) {
      this.registry.set(topic, {
        store: writable(initial),
        producers: new Set(),
        consumers: new Set(),
        lastValue: initial
      });
    }
    return this.registry.get(topic) as Entry<T>;
  }

  // API 1: Get Read-Only Stream
  getStream<T>(topic: string) {
    const entry = this.ensure<T>(topic);
    return {
      subscribe: entry.store.subscribe, // Standard Svelte subscribe
      get: () => get(entry.store)
    };
  }

  // API 2: Get Publisher Handle
  getPublisher<T>(topic: string, producerId: string) {
    const entry = this.ensure<T>(topic);
    entry.producers.add(producerId);

    return {
      publish: (val: T) => {
        entry.lastValue = val;
        entry.store.set(val);
      },
      dispose: () => {
        entry.producers.delete(producerId);
        // Optional: Garbage collect empty topics here
      }
    };
  }
  
  // Debugging / Inspection
  getInspectorData() {
    return Array.from(this.registry.entries()).map(([topic, entry]) => ({
      topic,
      producers: entry.producers.size,
      consumers: entry.consumers.size,
      hasValue: entry.lastValue !== undefined
    }));
  }
}

export const mapStore = new MapStore();
```

### 2.3 Svelte 5 Hooks (Runes Adapters)
**File:** `src/lib/hooks/mapStoreRunes.ts`

These hooks bridge the gap between the imperative `MapStore` and declarative Svelte 5 components.

```typescript
// src/lib/hooks/mapStoreRunes.ts
import { onDestroy } from 'svelte';
import { mapStore } from '$lib/stores/MapStore';
import type { TopicRegistry, TopicValue } from '$lib/types/topics';

/**
 * useTopic (Read Only)
 * Subscribes to a topic and returns a reactive getter.
 */
export function useTopic<K extends string>(topic: string) {
  type T = TopicValue<K>;
  
  // 1. Create Reactive Signal
  let current = $state<T | undefined>(undefined);
  
  // 2. Subscribe
  const stream = mapStore.getStream<T>(topic);
  const unsubscribe = stream.subscribe((val) => {
    current = val;
  });

  onDestroy(unsubscribe);

  // 3. Return Getter (Proxied read access)
  return {
    get current() { return current; }
  };
}

/**
 * useSync (Read/Write for Editors)
 * Implements "Echo Cancellation" to prevent infinite loops.
 */
export function useSync<K extends string>(topic: string, debounceMs = 200) {
  type T = TopicValue<K>;
  
  const stream = mapStore.getStream<T>(topic);
  const pub = mapStore.getPublisher<T>(topic, `sync-${crypto.randomUUID()}`);
  
  // Local Mutable State
  let localState = $state<T | undefined>(undefined);
  
  // Sync Flags
  let isRemoteUpdate = false;
  let timer: ReturnType<typeof setTimeout>;

  // 1. Remote -> Local
  const unsubscribe = stream.subscribe((remoteVal) => {
    if (remoteVal === undefined) return;
    
    // Flag ON: We are updating local from remote
    isRemoteUpdate = true;
    localState = structuredClone(remoteVal); // Deep clone to break reference
    // Flag OFF: Done updating
    isRemoteUpdate = false;
  });

  // 2. Local -> Remote (The Watcher)
  $effect(() => {
    // Snapshot creates a dependency on 'localState'
    const snapshot = $state.snapshot(localState);
    
    // Only publish if this change originated LOCALLY (isRemoteUpdate is false)
    if (snapshot && !isRemoteUpdate) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        pub.publish(snapshot as T);
      }, debounceMs);
    }
  });

  onDestroy(() => {
    unsubscribe();
    pub.dispose();
    clearTimeout(timer);
  });

  // Return Mutable Proxy
  return {
    get current() { return localState; },
    set current(v) { localState = v; }
  };
}
```

---

## 3. Phase 2 Spec: Ingestion & Bridges

**Goal:** Provide standardized mechanisms for external data (WebSocket/API) to enter the system and for data to be transformed automatically.

### 3.1 The Bridge Implementation
**File:** Add to `src/lib/stores/MapStore.ts`

A Bridge is an internal subscriber that immediately publishes to another topic.

```typescript
// Inside MapStore class

registerBridge<TIn, TOut>(
  sourceTopic: string,
  targetTopic: string,
  transformer: (val: TIn) => TOut,
  options: { filter?: (val: TIn) => boolean } = {}
) {
  const producerId = `bridge_${sourceTopic}_to_${targetTopic}`;
  const pub = this.getPublisher<TOut>(targetTopic, producerId);
  const stream = this.ensure<TIn>(sourceTopic).store;

  const unsubscribe = stream.subscribe(val => {
    if (val === undefined) return;
    if (options.filter && !options.filter(val)) return;

    try {
      const result = transformer(val);
      pub.publish(result);
    } catch (e) {
      console.error(`Bridge Error [${sourceTopic} -> ${targetTopic}]:`, e);
    }
  });

  // Return disposer
  return () => {
    unsubscribe();
    pub.dispose();
  };
}
```

### 3.2 WebSocket Ingestor Example
**File:** `src/lib/services/RealtimeIngestor.ts`

This service connects to your backend (e.g., AWS AppSync) and maps incoming events to MapStore topics.

```typescript
import { mapStore } from '$lib/stores/MapStore';

export class RealtimeIngestor {
  private socket: WebSocket | null = null;

  connect(url: string) {
    this.socket = new WebSocket(url);
    
    this.socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      // Expected payload: { topic: "prop:123", data: { ... } }
      
      if (payload.topic && payload.data) {
        // Ephemeral producer for incoming message
        const pub = mapStore.getPublisher(payload.topic, 'ws-client');
        pub.publish(payload.data);
        pub.dispose();
      }
    };
  }
}
```

---

## 4. Phase 3 Spec: UI Registry & Universal Widgets

**Goal:** Implement the "Open-Closed Principle". The dashboard container is generic; the Registry defines what gets rendered.

### 4.1 Zod Schemas (Runtime Validation)
**File:** `src/lib/types/schemas.ts`

Directly mirror the interfaces from Phase 1, but with Zod for form generation/validation.

```typescript
import { z } from 'zod';

export const UnderwritingSchema = z.object({
  propertyId: z.string(),
  purchasePrice: z.number().min(0),
  noi: z.number(),
  capRate: z.number().min(0).max(100),
  loanToValue: z.number().min(0).max(100),
  interestRate: z.number().min(0).max(20),
  valuation: z.number().optional()
});

export const PropertySchema = z.object({
  id: z.string(),
  name: z.string(),
  assetClass: z.enum(['Office', 'Retail', 'Industrial', 'Multifamily']),
  sqFt: z.number()
});
```

### 4.2 Component Registry
**File:** `src/lib/stores/ComponentRegistry.ts`

```typescript
import type { Component } from 'svelte';
import type { ZodSchema } from 'zod';
// Import Widgets
import PropertyCard from '$components/widgets/PropertyCard.svelte';
import ProFormaEditor from '$components/widgets/ProFormaEditor.svelte';
import JsonFallback from '$components/widgets/JsonFallback.svelte';
// Import Schemas
import { PropertySchema, UnderwritingSchema } from '$lib/types/schemas';

interface RegistryEntry {
  label: string;
  schema: ZodSchema;
  component: Component<any>; // Svelte 5 Component type
  defaultHeight?: number; // Grid layout hint
}

class Registry {
  private map = new Map<string, RegistryEntry>();

  register(typeId: string, entry: RegistryEntry) {
    this.map.set(typeId, entry);
  }

  get(typeId: string): RegistryEntry {
    return this.map.get(typeId) || {
      label: 'Raw Data',
      schema: z.any(),
      component: JsonFallback
    };
  }
}

export const uiRegistry = new Registry();

// Bootstrap
uiRegistry.register('cre:property', {
  label: 'Property Details',
  schema: PropertySchema,
  component: PropertyCard
});

uiRegistry.register('cre:financials', {
  label: 'Underwriting Model',
  schema: UnderwritingSchema,
  component: ProFormaEditor
});
```

### 4.3 The Universal Widget Component
**File:** `src/components/UniversalWidget.svelte`

This is the generic container placed on the dashboard grid.

```svelte
<script lang="ts">
  import { useTopic } from '$lib/hooks/mapStoreRunes';
  import { uiRegistry } from '$lib/stores/ComponentRegistry';

  // Props
  let { topic, typeId }: { topic: string, typeId: string } = $props();

  // 1. Resolve Component Strategy
  let entry = $derived(uiRegistry.get(typeId));
  let WidgetComponent = $derived(entry.component);

  // 2. Resolve Data
  const data = useTopic(topic);
</script>

<div class="widget-wrapper border rounded-lg shadow-sm bg-white overflow-hidden">
  <header class="px-4 py-2 bg-gray-50 border-b flex justify-between items-center">
    <span class="font-semibold text-gray-700">{entry.label}</span>
    <span class="text-xs text-gray-400 font-mono">{topic}</span>
  </header>

  <div class="p-4">
    {#if data.current}
      <!-- Dynamic Rendering -->
      <WidgetComponent data={data.current} />
    {:else}
      <!-- Skeleton Loader -->
      <div class="animate-pulse space-y-3">
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    {/if}
  </div>
</div>
```

---

## 5. Phase 4 Spec: Bi-Directional Editing & Logic

**Goal:** Create interactive widgets that can safely modify the state they consume, and background logic that validates this state.

### 5.1 Interactive Widget: `ProFormaEditor.svelte`
**Location:** `src/components/widgets/ProFormaEditor.svelte`

This widget must demonstrate optimistic updates with loop protection.

```svelte
<script lang="ts">
  import { useSync } from '$lib/hooks/mapStoreRunes';
  import type { Underwriting } from '$lib/types/topics';

  // Props: UniversalWidget passes 'data', but for editing we use the topic
  // Note: In a real app, we might pass the topic down or derive it.
  // Here assuming we reconstruct the topic or pass it via context.
  let { data }: { data: Underwriting } = $props(); 
  
  // We need the topic string to bind the editor. 
  // Assumption: The parent passes the topic OR the data object contains the ID.
  const topic = `fin:${data.propertyId}`; 

  // Use the Write-Capable Hook
  const model = useSync<Underwriting>(topic);

  // Computed View Logic
  let valuation = $derived.by(() => {
    if (!model.current) return 0;
    const { noi, capRate } = model.current;
    return capRate > 0 ? noi / (capRate / 100) : 0;
  });

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
</script>

<div class="space-y-4">
  {#if model.current}
    <!-- NOI Input -->
    <div>
      <label class="block text-sm font-medium">Net Operating Income</label>
      <input 
        type="number" 
        bind:value={model.current.noi}
        class="w-full border rounded p-2"
      />
    </div>

    <!-- Cap Rate Input -->
    <div>
      <label class="block text-sm font-medium">Cap Rate (%)</label>
      <div class="flex gap-2">
        <input 
          type="range" min="3" max="15" step="0.1"
          bind:value={model.current.capRate}
          class="flex-1" 
        />
        <input 
          type="number" 
          bind:value={model.current.capRate}
          class="w-20 border rounded p-2 text-right"
        />
      </div>
    </div>

    <!-- Calculated Result -->
    <div class="bg-blue-50 p-3 rounded text-right">
      <div class="text-xs text-blue-600">Implied Value</div>
      <div class="text-xl font-bold text-blue-900">
        {currency.format(valuation)}
      </div>
    </div>
  {/if}
</div>
```

### 5.2 Headless Logic: `ValuationMonitor.svelte`
**Location:** `src/components/logic/ValuationMonitor.svelte`

A logic component that enforces business rules. It has no HTML, only script.

```svelte
<script lang="ts">
  import { useTopic, usePublisher } from '$lib/hooks/mapStoreRunes';
  import type { Underwriting } from '$lib/types/topics';

  let { propId }: { propId: string } = $props();

  // Listen to Financials
  const data = useTopic<Underwriting>(`fin:${propId}`);
  
  // Prepare to Alert
  const alerts = usePublisher('sys:alerts', 'valuation-monitor');

  $effect(() => {
    const val = data.current;
    if (!val) return;

    // Rule: Alert if Cap Rate is suspicious
    if (val.capRate < 3.0) {
      alerts.emit({
        id: crypto.randomUUID(),
        level: 'warning',
        message: `Property ${propId}: Cap Rate ${val.capRate}% is below market standard (3.0%)`,
        timestamp: Date.now()
      });
    }
  });
</script>
```

---

## 6. Implementation Roadmap

1.  **Core Foundation**: Implement `MapStore.ts` and `mapStoreRunes.ts`. Write unit tests to verify subscription and unsubscription cleanup.
2.  **Registry Setup**: Define `Property` and `Underwriting` interfaces and their Zod schemas. Create the `ComponentRegistry`.
3.  **Basic Widgets**: Build read-only `PropertyCard`.
4.  **Editor Integration**: Build `ProFormaEditor` using `useSync`. Verify that typing in the input updates the store, but store updates don't reset the cursor position (echo cancellation).
5.  **Dashboard Grid**: Create a layout that iterates over a list of `{ topic, typeId }` configs and renders `UniversalWidget` for each.