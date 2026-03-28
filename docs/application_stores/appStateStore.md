# App State Store - Usage Documentation

This document describes how `appStateStore` is currently used throughout the application. The store provides a generic, reactive state management solution for entities and collections with built-in support for loading states, errors, and nested property updates.

## Architecture Overview

The `appStateStore` is built on Svelte's writable stores and provides:
- Generic entity/collection state management
- Reactive updates across all components
- Built-in loading and error state handling
- Nested property update capabilities
- Collection manipulation (add, update, remove)

The store is currently instantiated for Project entities with Document[] collections, but the generic design allows for future expansion to other entity types.

## Current Usage Patterns

### 1. Reading Project State in Components

The most common pattern is importing the `project` store and deriving reactive values from it:

```typescript
// Import the store
import { project as projectStore } from '$lib/stores/appStateStore';

// Create a reactive derived value
let project = $derived($projectStore);

// Or access directly in templates
{#if $projectStore}
  <div>{$projectStore.name}</div>
{/if}
```

**Real Examples:**
- `src/routes/projects/workspace/[projectId]/+layout.svelte` (line 48)
- `src/routes/projects/workspace/[projectId]/document-analysis/+page.svelte` (line 44)
- `src/routes/projects/workspace/[projectId]/reports/+page.svelte` (line 7)
- `src/routes/projects/workspace/[projectId]/insights/+page.svelte` (line 7)
- `src/routes/projects/workspace/[projectId]/investment-analysis/+page.svelte` (line 7)

### 2. Setting Project Data from Server

When data is loaded server-side (e.g., in SvelteKit load functions), it's synced to the store client-side:

```typescript
import { setProject } from '$lib/stores/appStateStore';

// In a $effect or component initialization
if (projectFromServer && !isNewProject) {
  setProject(projectFromServer);
}
```

**Real Examples:**
- `src/routes/projects/workspace/[projectId]/+layout.svelte` (line 68)
  - Syncs project data from server-side load function
  - Happens in a $effect to ensure it runs client-side

### 3. Updating Project After Mutations

After GraphQL mutations, the store is updated with the response:

```typescript
import { setProject } from '$lib/stores/appStateStore';

const res = await gql<{ updateProject: Project }>(
  print(M_UPDATE_PROJECT),
  { id: projectId, input: { name: newName } },
  idToken
);

if (res.updateProject) {
  setProject(res.updateProject);
}
```

**Real Examples:**
- `src/lib/components/workspace/WorkspaceHeaderBar.svelte` (line 67)
  - Updates project name after successful mutation

### 4. Reactive Subscriptions (WebSocket Updates)

The store is updated reactively when WebSocket subscriptions receive updates:

```typescript
import { setProject, addProjectDocumentLink } from '$lib/stores/appStateStore';

// In WebSocket subscription handler
{
  query: print(S_ON_UPDATE_PROJECT),
  variables: { id: projectId },
  path: 'onUpdateProject',
  next: (updatedProject: Project) => {
    setProject(updatedProject);
  }
},
{
  query: print(S_ON_CREATE_DOCLINK),
  variables: { parentId: projectId },
  path: 'onCreateDoclink',
  next: (link: Doclink) => {
    addProjectDocumentLink(link);
  }
}
```

**Real Examples:**
- `src/routes/projects/workspace/[projectId]/+layout.svelte` (lines 136-161)
  - Subscribes to project updates via WebSocket
  - Adds new document links when created
  - All child components automatically react to changes

### 5. Accessing Nested Properties (projectDocumentLinks)

Components access nested properties reactively, handling both Connection and array formats:

```typescript
import { project as projectStore } from '$lib/stores/appStateStore';

const projectDocumentLinks = $derived.by(() => {
  const currentProject = $projectStore;
  if (!currentProject?.projectDocumentLinks) return [];
  
  const links = currentProject.projectDocumentLinks;
  if (Array.isArray(links)) {
    return links;
  }
  return (links as { items: ProjectDocumentLink[] }).items || [];
});
```

**Real Examples:**
- `src/lib/components/DocumentUpload/DocumentUpload.svelte` (lines 41-50)
  - Derives projectDocumentLinks for display in upload component
- `src/routes/projects/workspace/[projectId]/document-analysis/+page.svelte` (lines 47-57)
  - Displays document links in analysis page

### 6. Accessing Specific Project Properties

Components access specific properties for business logic:

```typescript
import { project as projectStore } from '$lib/stores/appStateStore';

// Access vectorStoreId for AI operations
const vectorStoreId = $projectStore?.vectorStoreId || 'default_id';
```

**Real Examples:**
- `src/lib/dashboard/components/widgets/ParagraphWidget.svelte` (line 231)
  - Accesses vectorStoreId for AI widget operations
- `src/lib/dashboard/components/widgets/BetterParagraphWidget.svelte` (line 62)
  - Uses vectorStoreId in widget configuration

## Available Functions

### Project Entity Operations
- `setProject(project: Project)` - Set/replace entire project
- `updateProject(updates: Partial<Project>)` - Update project properties
- `project` (store) - Reactive store for project entity

### Project Document Links Operations
- `setProjectDocumentLinks(links)` - Set entire collection
- `addProjectDocumentLink(link)` - Add a new link (handles duplicates)
- `updateProjectDocumentLink(id, updates)` - Update existing link
- `removeProjectDocumentLink(id)` - Remove a link

### Generic Nested Property Operations
- `updateProjectNestedProperty(key, value)` - Direct property update
- `updateProjectNestedPropertyWith(key, updater)` - Update with function

### Collection Operations (Currently Unused)
- `setDocuments(documents: Document[])` - Set document collection
- `addDocument(document: Document)` - Add to collection

### State Management
- `loading` (store) - Loading state (currently unused in most components)
- `error` (store) - Error state (currently unused in most components)

## Reactivity Patterns

All updates to the store are automatically reactive. Components using `$projectStore` or `$derived($projectStore)` will automatically re-render when the store updates.

**Key Points:**
- Use `$projectStore` directly in templates for simple access
- Use `$derived($projectStore)` for derived values in script sections
- Use `$derived.by(() => ...)` for computed values that depend on store
- All mutations (setProject, addProjectDocumentLink, etc.) trigger reactivity

## Best Practices

1. **Always use the exported functions** - Don't directly call store methods on `projectStore` unless necessary

2. **Handle null/undefined** - The project store can be null, always check:
   ```typescript
   if ($projectStore) {
     // Use project
   }
   ```

3. **Use derived values for computed properties**:
   ```typescript
   const projectName = $derived($projectStore?.name ?? 'Untitled');
   ```

4. **Update store after mutations** - Always sync GraphQL mutation responses back to the store to keep UI in sync

5. **Leverage WebSocket subscriptions** - Use subscriptions to keep store updated in real-time without polling

## Component Usage Summary

**Layout Components:**
- `+layout.svelte` - Initializes store from server data, sets up WebSocket subscriptions

**Page Components:**
- `get-started/+page.svelte` - Reads project for display
- `document-analysis/+page.svelte` - Reads projectDocumentLinks
- `reports/+page.svelte` - Reads project data
- `insights/+page.svelte` - Reads project data
- `investment-analysis/+page.svelte` - Reads project data

**UI Components:**
- `WorkspaceHeaderBar.svelte` - Updates project name via setProject
- `DocumentUpload.svelte` - Reads projectDocumentLinks reactively
- `ParagraphWidget.svelte` - Accesses vectorStoreId
- `BetterParagraphWidget.svelte` - Accesses vectorStoreId

## Future Enhancements

The generic `createAppStateStore` function allows for creating additional stores for other entity types (e.g., Document, User, etc.). The current implementation focuses on Project entities, but the architecture supports expansion.

Potential improvements:
- Use `loading` and `error` stores more consistently
- Create separate stores for Documents if needed
- Add optimistic updates for better UX
- Implement store persistence for offline support
