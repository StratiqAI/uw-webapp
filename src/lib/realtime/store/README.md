# GraphQL Store Publisher

A system for synchronizing GraphQL data (queries + subscriptions) with ValidatedTopicStore.

## Architecture

The system consists of several components:

- **GraphQLStorePublisher**: Main orchestrator that coordinates queries, subscriptions, and store operations
- **GraphQLQueryClient**: Wrapper around the `gql()` function for HTTP queries
- **TopicMapper**: Utility functions for mapping GraphQL entities to topic paths
- **Types**: Configuration interfaces for the publisher

## Usage Example

```typescript
import { GraphQLStorePublisher, GraphQLQueryClient } from '$lib/realtime/store';
import { AppSyncWsClient } from '$lib/realtime/websocket/AppSyncWsClient';
import { ValidatedTopicStore } from '$routes/(experiments)/(good)/vtStore/ValidatedTopicStore.svelte';
import { Q_GET_PROJECT_BY_ID_WITH_DOCLINKS } from '$lib/realtime/graphql/queries/Project';
import { S_ON_UPDATE_PROJECT, S_ON_DELETE_PROJECT } from '$lib/realtime/graphql/subscriptions/Project';

// Initialize components
const queryClient = new GraphQLQueryClient(idToken);
const subscriptionClient = new AppSyncWsClient({
  graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
  auth: { mode: 'cognito', idToken }
});
const store = new ValidatedTopicStore();

// Create publisher
const publisher = new GraphQLStorePublisher({
  queryClient,
  subscriptionClient,
  store
});

// Wait for subscription client to be ready
await subscriptionClient.ready();

// Sync a project
await publisher.syncProject('proj-123', {
  query: Q_GET_PROJECT_BY_ID_WITH_DOCLINKS,
  queryVariables: { id: 'proj-123' },
  subscriptions: [
    {
      query: S_ON_UPDATE_PROJECT,
      variables: { id: 'proj-123' },
      path: 'onUpdateProject',
      entityType: 'projects',
      onError: (error) => console.error('Update subscription error:', error)
    },
    {
      query: S_ON_DELETE_PROJECT,
      variables: { id: 'proj-123' },
      path: 'onDeleteProject',
      entityType: 'projects',
      onError: (error) => console.error('Delete subscription error:', error)
    }
  ],
  schemas: [
    {
      entityType: 'projects',
      pattern: 'projects/+',
      schema: projectSchema
    }
  ]
});

// Clear project when done
publisher.clearProject('proj-123');

// Disconnect when closing
publisher.disconnect();
```

## Topic Path Mapping

The system automatically maps GraphQL entities to topic paths:

- Project: `projects/{projectId}`
- Doclinks: `projects/{projectId}/doclinks/{doclinkId}`
- Tasks: `projects/{projectId}/tasks/{taskId}`

## Components

### GraphQLStorePublisher

Main orchestrator class that:
- Executes GraphQL queries for initial data load
- Sets up GraphQL subscriptions for real-time updates
- Maps data to topic paths
- Publishes to ValidatedTopicStore
- Manages subscription lifecycle

### GraphQLQueryClient

Simple wrapper around the `gql()` function that implements `IGraphQLQueryClient` interface for dependency injection and testability.

### TopicMapper

Utility functions for mapping:
- `toTopicPath(entityType, id)` - Convert entity to topic path
- `toNestedTopicPath(parentPath, childType, childId)` - Build nested paths
- `extractTopicPath(entity, entityType, parentPath?)` - Extract path from entity

## Configuration

### ProjectSyncConfig

```typescript
{
  query: string | DocumentNode;           // GraphQL query
  queryVariables?: Record<string, any>;   // Query variables
  subscriptions: SubscriptionConfig[];    // Subscriptions to set up
  schemas?: EntitySchemaConfig[];         // Optional schemas to register
}
```

### SubscriptionConfig

```typescript
{
  query: string | DocumentNode;           // GraphQL subscription
  variables?: Record<string, any>;        // Subscription variables
  path?: string;                          // Path to extract data (e.g., 'onUpdateProject')
  entityType: string;                     // Entity type (e.g., 'projects')
  parentEntityType?: string;              // Optional parent type for nested entities
  onData?: (data, topic) => void;         // Optional custom handler
  onError?: (error) => void;              // Error handler
}
```

## Best Practices

1. **Schema Registration**: Register schemas before syncing to ensure validation
2. **Error Handling**: Always provide error handlers for subscriptions
3. **Cleanup**: Call `clearProject()` or `disconnect()` when done
4. **Connection Ready**: Wait for `subscriptionClient.ready()` before syncing
5. **Topic Paths**: Use consistent entity type names for topic path mapping
