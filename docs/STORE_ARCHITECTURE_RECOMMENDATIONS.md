# Store Architecture Recommendations

## Executive Summary

Your application currently uses **multiple overlapping store patterns** that create complexity and inconsistency. This document provides recommendations to simplify and standardize your state management approach.

## Current State Analysis

### Store Inventory

1. **Svelte 5 Runes Stores** (Modern, recommended):
   - `auth.svelte.ts` - Authentication state
   - `darkMode.svelte.ts` - Theme preference
   - `notifications.svelte.ts` - Notification queue
   - `ui.svelte.ts` - UI preferences

2. **Svelte Stores** (Traditional):
   - `appStateStore.ts` - Generic entity/collection store
   - `jobUpdateStore.ts` - Job tracking with subscriptions
   - `projectEntitiesStore.ts` - Project entities (texts, tables, images)

3. **Custom Store Systems** (Complex):
   - `mapObjectStore.ts` - Producer-consumer pattern
   - `mapStore.ts` - Topic-based with multi-tab sync

4. **Utility Stores**:
   - `appSyncClientStore.ts` - WebSocket client singleton
   - `ComponentRegistry.ts` - Component routing
   - `SchemaRegistry.ts` - Schema validation

### Key Issues Identified

1. **Pattern Inconsistency**: Mix of Svelte 5 runes, Svelte stores, and custom patterns
2. **Overlapping Functionality**: `mapObjectStore` and `mapStore` serve similar purposes
3. **Complexity**: Multiple store systems with different APIs
4. **Maintenance Burden**: Different patterns require different mental models

## Recommendations

### 1. Standardize on Svelte 5 Runes (Primary Pattern)

**Rationale**: Svelte 5 runes (`$state`, `$derived`) are the modern, recommended approach. They're simpler, more performant, and better integrated with Svelte.

**Action Items**:
- ✅ Keep existing rune-based stores (`auth`, `darkMode`, `notifications`, `ui`)
- 🔄 Migrate `appStateStore.ts` to runes pattern
- 🔄 Migrate `projectEntitiesStore.ts` to runes pattern
- 🔄 Migrate `jobUpdateStore.ts` to runes pattern

**Example Migration Pattern**:
```typescript
// Before (Svelte stores)
const entity = writable<TEntity | null>(null);
const loading = writable<boolean>(false);

// After (Svelte 5 runes)
class EntityStore<T> {
  entity = $state<T | null>(null);
  loading = $state(false);
  
  set(data: T) {
    this.entity = data;
    this.loading = false;
  }
}
```

### 2. Consolidate Map Stores

**Current Situation**: You have two similar systems:
- `mapObjectStore.ts` - Producer-consumer with type registry
- `mapStore.ts` - Topic-based with multi-tab sync and schema validation

**Recommendation**: **Keep `mapStore.ts`, deprecate `mapObjectStore.ts`**

**Rationale**:
- `mapStore.ts` has more features (multi-tab sync, schema validation)
- Topic-based approach is more flexible than type-based
- Better aligned with your component registry pattern

**Migration Path**:
1. Ensure `mapStore.ts` has all needed features from `mapObjectStore.ts`
2. Create migration guide for components using `mapObjectStore`
3. Gradually migrate components
4. Remove `mapObjectStore.ts` after migration

### 3. Simplify appStateStore

**Current Issues**:
- Generic factory function creates complexity
- Project-specific helpers mixed with generic code
- Too many abstraction layers

**Recommendation**: Split into two files:
- `appStateStore.ts` - Generic store factory (if still needed)
- `projectStore.ts` - Project-specific store using runes

**Proposed Structure**:
```typescript
// stores/projectStore.ts
class ProjectStore {
  project = $state<Project | null>(null);
  documents = $state<Document[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);
  
  // Simple, direct methods
  setProject(project: Project) { this.project = project; }
  addDocument(doc: Document) { this.documents = [...this.documents, doc]; }
  // ... etc
}

export const projectStore = new ProjectStore();
```

### 4. Consolidate Entity Stores

**Current**: `projectEntitiesStore.ts` uses Svelte stores with Map-based keying

**Recommendation**: Migrate to runes with simpler structure:
```typescript
// stores/projectEntitiesStore.ts
class ProjectEntitiesStore {
  // Use Map for project-keyed data
  private entities = $state(new Map<string, ProjectEntities>());
  
  getEntities(projectId: string): ProjectEntities {
    if (!this.entities.has(projectId)) {
      this.entities.set(projectId, { texts: [], tables: [], images: [] });
    }
    return this.entities.get(projectId)!;
  }
  
  addText(projectId: string, text: Text) {
    const entities = this.getEntities(projectId);
    entities.texts = [text, ...entities.texts.filter(t => t.id !== text.id)];
  }
  // ... etc
}

export const projectEntitiesStore = new ProjectEntitiesStore();
```

### 5. Keep Utility Stores As-Is

These are fine and serve specific purposes:
- ✅ `appSyncClientStore.ts` - WebSocket singleton (good pattern)
- ✅ `ComponentRegistry.ts` - Component routing (utility, not state)
- ✅ `SchemaRegistry.ts` - Schema validation (utility, not state)

### 6. Create Store Categories

Organize stores by purpose:

```
stores/
├── core/              # Core application state
│   ├── auth.svelte.ts
│   ├── projectStore.ts (migrated from appStateStore)
│   └── projectEntitiesStore.ts
├── ui/                # UI preferences
│   ├── darkMode.svelte.ts
│   └── ui.svelte.ts
├── features/          # Feature-specific state
│   ├── notifications.svelte.ts
│   └── jobUpdateStore.ts
├── realtime/          # Real-time communication
│   └── appSyncClientStore.ts
├── data/              # Data management
│   └── mapStore.ts
└── utilities/        # Non-state utilities
    ├── ComponentRegistry.ts
    └── SchemaRegistry.ts
```

## Migration Priority

### Phase 1: Low Risk (Immediate)
1. ✅ Document current state (this document)
2. ✅ Create new rune-based stores alongside old ones
3. ✅ Update new components to use new patterns

### Phase 2: Medium Risk (Next Sprint)
1. Migrate `projectEntitiesStore` to runes
2. Simplify `appStateStore` → split into `projectStore.ts`
3. Migrate components one by one

### Phase 3: High Risk (Future)
1. Consolidate `mapObjectStore` → `mapStore`
2. Remove deprecated stores
3. Update all documentation

## Best Practices Going Forward

### 1. Use Svelte 5 Runes for New Stores
```typescript
class MyStore {
  data = $state<Data | null>(null);
  loading = $state(false);
  
  // Computed values
  get isEmpty() {
    return this.data === null;
  }
  
  // Actions
  async load() {
    this.loading = true;
    this.data = await fetchData();
    this.loading = false;
  }
}

export const myStore = new MyStore();
```

### 2. Keep Stores Focused
- One store = one domain/feature
- Avoid generic factories unless truly needed
- Prefer composition over inheritance

### 3. Use Maps for Keyed Collections
```typescript
// Good: Map for keyed data
private items = $state(new Map<string, Item>());

// Avoid: Arrays with find operations
private items = $state<Item[]>([]);
```

### 4. Expose Reactive State, Not Stores
```typescript
// Good: Direct state access
export const authStore = new AuthStore();
// Usage: $authStore.user

// Avoid: Nested store access
export const auth = { store: writable(...) };
// Usage: $auth.store
```

### 5. Document Store Purpose
Each store should have:
- Clear purpose statement
- Usage examples
- Migration notes (if applicable)

## Example: Complete Store Refactor

### Before (appStateStore.ts)
```typescript
export function createAppStateStore<TEntity, TCollection>(
  initialEntity: TEntity | null = null,
  initialCollection: TCollection = [] as unknown as TCollection
): AppStateStore<TEntity, TCollection> {
  // Complex factory function...
}
```

### After (projectStore.ts)
```typescript
/**
 * Project Store
 * Manages the current project and its documents
 */
class ProjectStore {
  project = $state<Project | null>(null);
  documents = $state<Document[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);
  
  // Computed
  get hasProject() {
    return this.project !== null;
  }
  
  get documentCount() {
    return this.documents.length;
  }
  
  // Actions
  setProject(project: Project) {
    this.project = project;
    this.error = null;
  }
  
  addDocument(doc: Document) {
    if (!this.documents.find(d => d.id === doc.id)) {
      this.documents = [doc, ...this.documents];
    }
  }
  
  removeDocument(id: string) {
    this.documents = this.documents.filter(d => d.id !== id);
  }
  
  setLoading(loading: boolean) {
    this.loading = loading;
  }
  
  setError(error: string | null) {
    this.error = error;
    this.loading = false;
  }
  
  reset() {
    this.project = null;
    this.documents = [];
    this.loading = false;
    this.error = null;
  }
}

export const projectStore = new ProjectStore();

// Backward compatibility exports (deprecated)
export const project = {
  subscribe: (fn: (v: Project | null) => void) => {
    fn(projectStore.project);
    return () => {}; // No-op unsubscribe
  }
};
```

## Benefits of This Approach

1. **Simplicity**: One pattern (runes) instead of three
2. **Performance**: Runes are more efficient than stores
3. **Developer Experience**: Easier to understand and maintain
4. **Type Safety**: Better TypeScript inference with runes
5. **Future-Proof**: Aligned with Svelte's direction

## Questions to Consider

1. **Do you need `mapObjectStore`?** If `mapStore` covers all use cases, remove it.
2. **Do you need the generic `createAppStateStore`?** If only used for projects, simplify.
3. **Can you consolidate entity management?** Consider if project entities need separate store.
4. **What's your multi-tab sync requirement?** If not needed, simplify `mapStore`.

## Next Steps

1. Review these recommendations with your team
2. Prioritize migrations based on impact
3. Create migration tickets for each phase
4. Update component documentation as you migrate
5. Remove deprecated code after migration period

---

**Last Updated**: 2024
**Status**: Recommendations - Pending Review
