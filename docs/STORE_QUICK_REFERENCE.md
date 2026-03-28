# Store Quick Reference

## Decision Tree: Which Store Pattern to Use?

```
Need to manage state?
│
├─ Simple UI preference (theme, sidebar, etc.)?
│  └─> Use Svelte 5 Runes Store (class with $state)
│
├─ Domain entity (project, user, document)?
│  └─> Use Svelte 5 Runes Store (class with $state)
│
├─ Real-time pub/sub across components?
│  └─> Use mapStore (topic-based)
│
├─ WebSocket/API client singleton?
│  └─> Use singleton pattern (like appSyncClientStore)
│
└─ Component routing/validation?
   └─> Use utility class (not a store)
```

## Store Pattern Comparison

| Pattern | Use Case | Complexity | Performance | Migration Status |
|---------|----------|------------|-------------|------------------|
| **Svelte 5 Runes** | Most state management | Low | ⭐⭐⭐⭐⭐ | ✅ Recommended |
| **Svelte Stores** | Legacy compatibility | Medium | ⭐⭐⭐⭐ | 🔄 Migrate to runes |
| **mapStore** | Pub/sub, multi-tab sync | Medium | ⭐⭐⭐⭐ | ✅ Keep |
| **mapObjectStore** | Type-based pub/sub | High | ⭐⭐⭐ | ❌ Deprecate |

## Quick Patterns

### ✅ Simple State Store (Recommended)
```typescript
class MyStore {
  value = $state<Type | null>(null);
  loading = $state(false);
  
  set(value: Type) { this.value = value; }
  clear() { this.value = null; }
}

export const myStore = new MyStore();
```

### ✅ Collection Store
```typescript
class CollectionStore<T extends { id: string }> {
  items = $state<T[]>([]);
  
  add(item: T) {
    this.items = [...this.items.filter(i => i.id !== item.id), item];
  }
  
  remove(id: string) {
    this.items = this.items.filter(i => i.id !== id);
  }
}
```

### ✅ Keyed Collection Store
```typescript
class KeyedStore<T> {
  private items = $state(new Map<string, T>());
  
  get(id: string): T | undefined {
    return this.items.get(id);
  }
  
  set(id: string, value: T) {
    this.items.set(id, value);
    this.items = new Map(this.items); // Trigger reactivity
  }
}
```

### ✅ Async Store
```typescript
class AsyncStore<T> {
  data = $state<T | null>(null);
  loading = $state(false);
  error = $state<string | null>(null);
  
  async load(fetcher: () => Promise<T>) {
    this.loading = true;
    this.error = null;
    try {
      this.data = await fetcher();
    } catch (e) {
      this.error = e.message;
    } finally {
      this.loading = false;
    }
  }
}
```

## Current Store Status

### ✅ Keep As-Is (Good Patterns)
- `auth.svelte.ts` - Rune-based, simple
- `darkMode.svelte.ts` - Rune-based, simple
- `notifications.svelte.ts` - Rune-based, simple
- `ui.svelte.ts` - Rune-based, simple
- `appSyncClientStore.ts` - Singleton pattern, appropriate
- `ComponentRegistry.ts` - Utility, not state
- `SchemaRegistry.ts` - Utility, not state
- `mapStore.ts` - Keep, has unique features

### 🔄 Migrate to Runes
- `appStateStore.ts` → Split into `projectStore.ts` (runes)
- `projectEntitiesStore.ts` → Migrate to runes
- `jobUpdateStore.ts` → Migrate to runes

### ❌ Deprecate
- `mapObjectStore.ts` → Use `mapStore.ts` instead

## Component Usage Patterns

### Using Rune Stores
```svelte
<script lang="ts">
  import { projectStore } from '$lib/stores/projectStore';
  
  // Direct access - automatically reactive
  $effect(() => {
    console.log('Project:', projectStore.project);
  });
</script>

<div>
  {#if projectStore.project}
    <h1>{projectStore.project.name}</h1>
  {/if}
  
  {#if projectStore.loading}
    <p>Loading...</p>
  {/if}
</div>
```

### Using mapStore (Pub/Sub)
```svelte
<script lang="ts">
  import { mapStore } from '$lib/stores/mapStore';
  import { onMount, onDestroy } from 'svelte';
  
  let data: unknown;
  let unsubscribe: (() => void) | undefined;
  
  onMount(() => {
    const stream = mapStore.getStream('my:topic', 'myComponent');
    unsubscribe = stream.subscribe(value => {
      data = value;
    });
  });
  
  onDestroy(() => {
    unsubscribe?.();
  });
</script>
```

## File Organization

```
stores/
├── core/                    # Core application state
│   ├── auth.svelte.ts      ✅
│   ├── projectStore.ts     🔄 (migrate from appStateStore)
│   └── projectEntitiesStore.ts 🔄
│
├── ui/                      # UI preferences
│   ├── darkMode.svelte.ts  ✅
│   └── ui.svelte.ts        ✅
│
├── features/               # Feature-specific
│   ├── notifications.svelte.ts ✅
│   └── jobUpdateStore.ts   🔄
│
├── realtime/               # Real-time communication
│   └── appSyncClientStore.ts ✅
│
├── data/                   # Data management
│   └── mapStore.ts         ✅
│
└── utilities/              # Non-state utilities
    ├── ComponentRegistry.ts ✅
    └── SchemaRegistry.ts   ✅
```

## Migration Priority

1. **Phase 1** (Low Risk): Create new rune stores alongside old ones
2. **Phase 2** (Medium Risk): Migrate `projectEntitiesStore` and simplify `appStateStore`
3. **Phase 3** (High Risk): Consolidate map stores, remove deprecated code

## Key Principles

1. **One Pattern**: Prefer Svelte 5 runes for all new stores
2. **Simplicity**: Avoid generic factories unless truly needed
3. **Focus**: One store = one domain/feature
4. **Composition**: Use Maps for keyed collections
5. **Direct Access**: Expose state directly, not nested stores

## Common Mistakes to Avoid

❌ **Don't**: Mix store patterns in the same file
```typescript
// Bad
const store1 = writable(...);  // Svelte store
const store2 = $state(...);    // Rune
```

✅ **Do**: Use one consistent pattern
```typescript
// Good
class MyStore {
  value1 = $state(...);
  value2 = $state(...);
}
```

❌ **Don't**: Create overly generic factories
```typescript
// Bad - too abstract
function createStore<T>(...) { ... }
```

✅ **Do**: Create specific, focused stores
```typescript
// Good - clear purpose
class ProjectStore { ... }
```

❌ **Don't**: Nest stores unnecessarily
```typescript
// Bad
export const app = {
  project: { store: writable(...) }
};
```

✅ **Do**: Direct state access
```typescript
// Good
class AppStore {
  project = $state<Project | null>(null);
}
```

---

**Quick Links**:
- [Full Recommendations](./STORE_ARCHITECTURE_RECOMMENDATIONS.md)
- [Migration Examples](./STORE_MIGRATION_EXAMPLES.md)
