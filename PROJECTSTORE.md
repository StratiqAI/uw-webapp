# Application State Store Documentation

This document describes the generic application state store implementation and how to use it for managing Project state.

## Overview

The `appStateStore.ts` file implements a generic application state store pattern that can be used for any entity type. It provides:

- **Single entity management** - Store and update a single Project instance
- **Collection management** - Store and manage arrays of related entities (Documents)
- **Loading states** - Track async operation states
- **Error handling** - Manage error states
- **Type-safe operations** - Full TypeScript support

## Architecture

### AppStateStore Interface

The `AppStateStore<TEntity, TCollection>` interface defines the structure:

```typescript
interface AppStateStore<TEntity, TCollection = TEntity[]> {
  // Stores
  entity: Writable<TEntity | null>;
  collection: Writable<TCollection>;
  loading: Writable<boolean>;
  error: Writable<string | null>;

  // Entity operations
  set: (data: TEntity) => void;
  update: (updates: Partial<TEntity>) => void;
  clear: () => void;

  // Collection operations
  setCollection: (items: TCollection) => void;
  addToCollection: (item: TEntity, getId?: (item: TEntity) => string | number) => void;
  updateInCollection: (item: Partial<TEntity> & { id: string | number }, getId?: (item: TEntity) => string | number) => void;
  removeFromCollection: (id: string | number, getId?: (item: TEntity) => string | number) => void;

  // State operations
  setLoading: (loadingState: boolean) => void;
  setError: (errorMessage: string | null) => void;
  reset: () => void;
}
```

### Factory Function

The `createAppStateStore()` function creates a new store instance:

```typescript
function createAppStateStore<TEntity, TCollection extends Array<TEntity> = TEntity[]>(
  initialEntity: TEntity | null = null,
  initialCollection: TCollection = [] as unknown as TCollection
): AppStateStore<TEntity, TCollection>
```

## Project Store Instance

The project store is pre-configured and exported for use throughout the application:

```typescript
const projectStore = createAppStateStore<Project, Document[]>(null, []);

// Exported stores
export const project = projectStore.entity;
export const documents = projectStore.collection;
export const loading = projectStore.loading;
export const error = projectStore.error;

// Exported helper functions
export const setProject = projectStore.set;
export const updateProject = projectStore.update;
export const setDocuments = projectStore.setCollection;
export const addDocument = projectStore.addToCollection;
```

## Usage Examples

### 1. Setting a Project

Set the entire project entity:

```typescript
import { setProject, project } from '$lib/stores/appStateStore';
import type { Project } from '@stratiqai/types';

// Set the project
const projectData: Project = {
  id: 'proj-123',
  name: 'My Project',
  // ... other fields
};

setProject(projectData);

// Subscribe to project changes (Svelte reactive syntax)
$: if ($project) {
  console.log('Current project:', $project);
}
```

### 2. Updating a Project

Update specific fields of the current project:

```typescript
import { updateProject } from '$lib/stores/appStateStore';

// Update specific fields
updateProject({
  name: 'Updated Project Name',
  description: 'New description'
});

// The update merges with existing project data
// Only the specified fields are changed
```

### 3. Managing Documents Collection

#### Set All Documents

```typescript
import { setDocuments, documents } from '$lib/stores/appStateStore';
import type { Document } from '@stratiqai/types';

const docs: Document[] = [doc1, doc2, doc3];
setDocuments(docs);

// Subscribe to documents
$: console.log('Total documents:', $documents.length);
```

#### Add or Update a Document

```typescript
import { addDocument } from '$lib/stores/appStateStore';

// Add a new document (or update if ID exists)
const newDocument: Document = {
  id: 'doc-123',
  name: 'New Document',
  // ... other fields
};

addDocument(newDocument);
```

#### Update a Specific Document

```typescript
import { projectStore } from '$lib/stores/appStateStore';

// Update a document by ID
projectStore.updateInCollection({
  id: 'doc-123',
  name: 'Updated Document Name'
});

// With custom ID getter (if document uses different ID field)
projectStore.updateInCollection(
  { id: 'doc-123', name: 'Updated' },
  (doc) => doc.customIdField
);
```

#### Remove a Document

```typescript
import { projectStore } from '$lib/stores/appStateStore';

// Remove by ID
projectStore.removeFromCollection('doc-123');

// With custom ID getter
projectStore.removeFromCollection('doc-123', (doc) => doc.customIdField);
```

### 4. Loading States

Track async operations:

```typescript
import { loading, projectStore } from '$lib/stores/appStateStore';

// Set loading state
projectStore.setLoading(true);

// Perform async operation
try {
  const data = await fetchProjectData();
  setProject(data);
  projectStore.setLoading(false);
} catch (err) {
  projectStore.setError(err.message);
  // setError automatically sets loading to false
}

// Subscribe to loading state
$: if ($loading) {
  console.log('Loading project data...');
}
```

### 5. Error Handling

Manage error states:

```typescript
import { error, projectStore } from '$lib/stores/appStateStore';

// Set an error
projectStore.setError('Failed to load project');

// Clear error (also sets loading to false)
projectStore.setError(null);

// Subscribe to errors
$: if ($error) {
  console.error('Project error:', $error);
}
```

### 6. Complete Component Example

Full example showing all features:

```typescript
<script lang="ts">
  import { 
    project, 
    documents,
    loading,
    error,
    setProject,
    updateProject,
    setDocuments,
    addDocument,
    projectStore
  } from '$lib/stores/appStateStore';
  import type { Project, Document } from '@stratiqai/types';

  // Reactive access to stores
  $: currentProject = $project;
  $: currentDocuments = $documents;
  $: isLoading = $loading;
  $: currentError = $error;

  // Load project data
  async function loadProject(projectId: string) {
    projectStore.setLoading(true);
    projectStore.setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to load project');
      }
      const data: Project = await response.json();
      setProject(data);
    } catch (err) {
      projectStore.setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // Update project name
  function handleNameChange(newName: string) {
    updateProject({ name: newName });
  }

  // Upload new document
  async function handleDocumentUpload(file: File) {
    projectStore.setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });
      
      const document: Document = await response.json();
      addDocument(document);
    } catch (err) {
      projectStore.setError('Failed to upload document');
    }
  }

  // Delete document
  function handleDeleteDocument(docId: string) {
    projectStore.removeFromCollection(docId);
  }

  // Reset store
  function resetStore() {
    projectStore.reset();
  }
</script>

{#if $loading}
  <div class="loading">Loading...</div>
{/if}

{#if $error}
  <div class="error">Error: {$error}</div>
{/if}

{#if $project}
  <h1>{$project.name}</h1>
  <p>{$project.description}</p>
  
  <h2>Documents ({$documents.length})</h2>
  <ul>
    {#each $documents as doc}
      <li>
        {doc.name}
        <button on:click={() => handleDeleteDocument(doc.id)}>Delete</button>
      </li>
    {/each}
  </ul>
{/if}
```

### 7. Clearing and Resetting

```typescript
import { projectStore } from '$lib/stores/appStateStore';

// Clear only the entity (keeps collection)
projectStore.clear();

// Reset everything (entity, collection, loading, error)
projectStore.reset();
```

## Creating Custom Store Instances

You can create additional store instances for other entity types:

```typescript
import { createAppStateStore } from '$lib/stores/appStateStore';
import type { User, Notification } from '@stratiqai/types';

// Create a user store
const userStore = createAppStateStore<User, User[]>(null, []);

// Create a notification store
const notificationStore = createAppStateStore<Notification, Notification[]>(null, []);

// Use the stores
userStore.set(userData);
notificationStore.addToCollection(newNotification);
```

## API Reference

### Stores

- `project: Writable<Project | null>` - The current project entity
- `documents: Writable<Document[]>` - Collection of documents
- `loading: Writable<boolean>` - Loading state
- `error: Writable<string | null>` - Error message

### Entity Operations

- `setProject(data: Project)` - Set the entire project
- `updateProject(updates: Partial<Project>)` - Update specific fields
- `projectStore.clear()` - Clear the project entity

### Collection Operations

- `setDocuments(items: Document[])` - Set all documents
- `addDocument(item: Document)` - Add or update a document
- `projectStore.updateInCollection(updates, getId?)` - Update a document by ID
- `projectStore.removeFromCollection(id, getId?)` - Remove a document by ID

### State Operations

- `projectStore.setLoading(state: boolean)` - Set loading state
- `projectStore.setError(message: string | null)` - Set error message
- `projectStore.reset()` - Reset all state

## Notes

- The store automatically handles ID-based deduplication for collections
- When adding a document with an existing ID, it updates instead of duplicating
- Setting an error automatically sets loading to false
- All operations are reactive and work with Svelte's reactivity system
- The store maintains backward compatibility with existing code

