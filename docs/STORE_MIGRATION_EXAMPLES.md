# Store Migration Examples

This document provides concrete examples of how to migrate from old store patterns to the recommended patterns.

## Example 1: Migrating appStateStore to rune-based projectStore

### Current Usage (appStateStore.ts)
```typescript
// Component usage
import { project, setProject, updateProject, documents, addDocument } from '$lib/stores/appStateStore';

// In component
$: if ($project) {
  console.log('Project loaded:', $project.name);
}

function handleProjectUpdate() {
  updateProject({ name: 'New Name' });
}

function handleAddDoc() {
  addDocument(newDoc);
}
```

### Recommended Pattern (projectStore.ts)
```typescript
// Component usage
import { projectStore } from '$lib/stores/projectStore';

// In component (Svelte 5)
<script lang="ts">
  // Direct reactive access - no $ prefix needed in runes mode
  $effect(() => {
    if (projectStore.project) {
      console.log('Project loaded:', projectStore.project.name);
    }
  });
  
  function handleProjectUpdate() {
    projectStore.updateProject({ name: 'New Name' });
  }
  
  function handleAddDoc() {
    projectStore.addDocument(newDoc);
  }
</script>

<!-- Template -->
{#if projectStore.project}
  <h1>{projectStore.project.name}</h1>
{/if}

<!-- Or with reactive statement for Svelte 4 compatibility -->
<script lang="ts">
  let project = $state(projectStore.project);
  $effect(() => {
    project = projectStore.project;
  });
</script>
```

## Example 2: Migrating projectEntitiesStore

### Current Pattern
```typescript
// Store definition
const projectEntitiesMap = new Map<string, Writable<ProjectEntities>>();

export function getProjectEntitiesStore(projectId: string): Writable<ProjectEntities> {
  if (!projectEntitiesMap.has(projectId)) {
    projectEntitiesMap.set(projectId, writable<ProjectEntities>({
      texts: [],
      tables: [],
      images: []
    }));
  }
  return projectEntitiesMap.get(projectId)!;
}

// Component usage
import { getProjectTextsStore } from '$lib/stores/projectEntitiesStore';

const textsStore = getProjectTextsStore(projectId);
$: texts = $textsStore;
```

### Recommended Pattern
```typescript
// Store definition
class ProjectEntitiesStore {
  private entities = $state(new Map<string, ProjectEntities>());
  
  private getOrCreate(projectId: string): ProjectEntities {
    if (!this.entities.has(projectId)) {
      this.entities.set(projectId, {
        texts: [],
        tables: [],
        images: []
      });
    }
    return this.entities.get(projectId)!;
  }
  
  getTexts(projectId: string): Text[] {
    return this.getOrCreate(projectId).texts;
  }
  
  getTables(projectId: string): Table[] {
    return this.getOrCreate(projectId).tables;
  }
  
  getImages(projectId: string): Image[] {
    return this.getOrCreate(projectId).images;
  }
  
  addText(projectId: string, text: Text) {
    const entities = this.getOrCreate(projectId);
    const existingIndex = entities.texts.findIndex(t => t.id === text.id);
    if (existingIndex >= 0) {
      entities.texts[existingIndex] = text;
    } else {
      entities.texts = [text, ...entities.texts];
    }
  }
  
  // Similar for addTable, addImage, etc.
}

export const projectEntitiesStore = new ProjectEntitiesStore();

// Component usage
import { projectEntitiesStore } from '$lib/stores/projectEntitiesStore';

// Direct access - reactive automatically
const texts = $derived(projectEntitiesStore.getTexts(projectId));
```

## Example 3: Migrating from mapObjectStore to mapStore

### Current Pattern (mapObjectStore)
```typescript
import { createProducer, createConsumer } from '$lib/stores/mapObjectStore';

// Producer
const userProducer = createProducer<UserData>('user', 'userService');
userProducer.publish({ id: '1', name: 'John' });

// Consumer
const userConsumer = createConsumer<UserData>('user', 'headerComponent');
userConsumer.subscribe(user => {
  console.log('User:', user);
});
```

### Recommended Pattern (mapStore)
```typescript
import { mapStore } from '$lib/stores/mapStore';

// Publisher
const userPublisher = mapStore.getPublisher('user:current', 'userService');
userPublisher.publish({ id: '1', name: 'John' });

// Consumer
const userStream = mapStore.getStream('user:current', 'headerComponent');
userStream.subscribe(user => {
  console.log('User:', user);
});
```

## Example 4: Creating a New Store (Best Practice)

### ✅ Good: Simple, focused store
```typescript
/**
 * User Preferences Store
 * Manages user-specific UI preferences
 */
class UserPreferencesStore {
  // State
  theme = $state<'light' | 'dark' | 'auto'>('auto');
  language = $state<string>('en');
  compactMode = $state(false);
  
  // Computed
  get isDark() {
    return this.theme === 'dark' || 
           (this.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  
  // Actions
  setTheme(theme: 'light' | 'dark' | 'auto') {
    this.theme = theme;
    this.save();
  }
  
  toggleCompactMode() {
    this.compactMode = !this.compactMode;
    this.save();
  }
  
  // Persistence
  private save() {
    localStorage.setItem('userPreferences', JSON.stringify({
      theme: this.theme,
      language: this.language,
      compactMode: this.compactMode
    }));
  }
  
  load() {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      const prefs = JSON.parse(saved);
      this.theme = prefs.theme || 'auto';
      this.language = prefs.language || 'en';
      this.compactMode = prefs.compactMode || false;
    }
  }
}

export const userPreferencesStore = new UserPreferencesStore();
```

### ❌ Avoid: Over-engineered generic factory
```typescript
// Don't do this - too abstract
export function createPreferenceStore<T>(key: string, defaultValue: T) {
  const store = writable<T>(defaultValue);
  // Complex generic logic...
  return store;
}
```

## Example 5: Store Composition

### When you need related stores
```typescript
// stores/project/projectStore.ts
class ProjectStore {
  project = $state<Project | null>(null);
  // ... project methods
}

// stores/project/projectDocumentsStore.ts
class ProjectDocumentsStore {
  documents = $state<Document[]>([]);
  // ... document methods
}

// stores/project/index.ts
export const projectStore = new ProjectStore();
export const projectDocumentsStore = new ProjectDocumentsStore();

// Or compose if they're tightly coupled
class ProjectContext {
  project = new ProjectStore();
  documents = new ProjectDocumentsStore();
  
  reset() {
    this.project.reset();
    this.documents.reset();
  }
}

export const projectContext = new ProjectContext();
```

## Migration Checklist

When migrating a component:

- [ ] Identify all store imports
- [ ] Determine if store needs migration or can stay
- [ ] Update imports to new store location
- [ ] Update component to use new API
- [ ] Test reactive updates still work
- [ ] Remove old store usage
- [ ] Update any related tests

## Common Patterns

### Pattern 1: Simple State Store
```typescript
class SimpleStore<T> {
  value = $state<T | null>(null);
  set(value: T) { this.value = value; }
  clear() { this.value = null; }
}
```

### Pattern 2: Collection Store
```typescript
class CollectionStore<T extends { id: string }> {
  items = $state<T[]>([]);
  
  add(item: T) {
    if (!this.items.find(i => i.id === item.id)) {
      this.items = [...this.items, item];
    }
  }
  
  remove(id: string) {
    this.items = this.items.filter(i => i.id !== id);
  }
  
  update(id: string, updates: Partial<T>) {
    this.items = this.items.map(i => 
      i.id === id ? { ...i, ...updates } : i
    );
  }
}
```

### Pattern 3: Async State Store
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
      this.error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      this.loading = false;
    }
  }
}
```

## Backward Compatibility

During migration, you can provide backward compatibility:

```typescript
// New store
class ProjectStore {
  project = $state<Project | null>(null);
  // ...
}

export const projectStore = new ProjectStore();

// Backward compatibility layer (temporary)
import { writable } from 'svelte/store';

export const project = {
  subscribe: (fn: (value: Project | null) => void) => {
    // Subscribe to rune state
    let current = projectStore.project;
    fn(current);
    
    // Simple polling for compatibility (or use proper reactivity)
    const interval = setInterval(() => {
      if (projectStore.project !== current) {
        current = projectStore.project;
        fn(current);
      }
    }, 0);
    
    return () => clearInterval(interval);
  }
};
```

---

**Note**: These examples show the recommended patterns. Adjust based on your specific needs and migration timeline.
