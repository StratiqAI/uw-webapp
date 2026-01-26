# Entity Sync Manager Usage Guide

The `EntitySyncManager` class simplifies querying entities and managing update/delete subscriptions.

## Quick Start

```typescript
import { EntitySyncManager, createProjectSyncConfig } from '$lib/realtime/store';
import { Q_LIST_PROJECTS, Q_GET_PROJECT } from '@agnathan/types-simple';
import { S_ON_UPDATE_PROJECT, S_ON_DELETE_PROJECT } from '@agnathan/types-simple';
import type { Project } from '@agnathan/types-simple';

// Create configuration
const config = createProjectSyncConfig(
  Q_LIST_PROJECTS,
  Q_GET_PROJECT,
  S_ON_UPDATE_PROJECT,
  S_ON_DELETE_PROJECT
);

// Create manager
const manager = new EntitySyncManager<Project>({
  queryClient,
  subscriptionClient,
  store,
  config
});

// Sync list of projects
const result = await manager.syncList({
  queryVariables: { limit: 50, scope: 'OWNED_BY_ME' },
  setupSubscriptions: true,
  clearExisting: true
});

// Sync single project
await manager.syncOne('project-123', { setupSubscriptions: true });

// Cleanup when done
manager.cleanup();
```

## Custom Configuration

```typescript
import { EntitySyncManager, createEntitySyncConfig } from '$lib/realtime/store';

const config = createEntitySyncConfig<Project>({
  entityType: 'projects',
  listQuery: Q_LIST_PROJECTS,
  getQuery: Q_GET_PROJECT,
  updateSubscription: S_ON_UPDATE_PROJECT,
  deleteSubscription: S_ON_DELETE_PROJECT,
  listResponsePath: 'listProjects.items',
  getResponsePath: 'getProject',
  updateSubscriptionPath: 'onUpdateProject',
  deleteSubscriptionPath: 'onDeleteProject',
  onUpdate: (project) => {
    console.log('Project updated:', project);
  },
  onDelete: (project) => {
    console.log('Project deleted:', project);
  }
});
```

## API Reference

### EntitySyncManager

#### Methods

- `syncList(options?)` - Query and sync a list of entities
- `syncOne(entityId, options?)` - Query and sync a single entity
- `setupSubscriptionsForEntities(entities)` - Set up subscriptions for entities
- `removeSubscriptionsForEntities(entityIds)` - Remove subscriptions for entities
- `cleanup()` - Clean up all subscriptions
- `getActiveSubscriptionCount()` - Get count of active subscriptions
- `hasSubscriptionsForEntity(entityId)` - Check if subscriptions exist for entity

#### Options

```typescript
interface EntitySyncOptions {
  queryVariables?: Record<string, any>;
  setupSubscriptions?: boolean;
  clearExisting?: boolean;
}
```
