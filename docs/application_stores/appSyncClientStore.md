# AppSync Client Store - Usage Documentation

This document describes how `appSyncClientStore` is currently used throughout the application. The store provides a singleton AppSync WebSocket client instance that is shared across all components, ensuring efficient resource usage and centralized connection management.

## Architecture Overview

The `appSyncClientStore` provides:
- **Singleton WebSocket Connection** - Single shared connection to AWS AppSync
- **Dynamic Subscription Management** - Components can add/remove subscriptions as they mount/unmount
- **Automatic Connection Lifecycle** - Handles connection, reconnection, and cleanup
- **Token Management** - Automatically reconnects when authentication token changes
- **Resource Efficiency** - Prevents multiple WebSocket connections from being created

The store wraps the `AppSyncWsClient` class and provides a simplified API for managing subscriptions across the application.

## Current Usage Patterns

### 1. Basic Subscription Setup

The most common pattern is ensuring a connection and then adding subscriptions:

```typescript
import { ensureConnection, addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';

// Ensure connection is established
await ensureConnection(idToken);

// Create subscription spec
const subscription = {
  query: print(S_ON_UPDATE_PROJECT),
  variables: { id: projectId },
  path: 'onUpdateProject',
  next: (data: Project) => {
    // Handle update
    console.log('Project updated:', data);
  },
  error: (err: any) => {
    console.error('Subscription error:', err);
  }
};

// Add subscription
await addSubscription(idToken, subscription);

// Later, remove subscription on cleanup
removeSubscription(subscription);
```

**Real Examples:**
- `src/routes/projects/+page.svelte` (lines 103-193)
  - Sets up multiple subscriptions for project CRUD operations
  - Subscribes to project creation, updates, deletions, and notifications

### 2. Document Upload Subscriptions

The uploader store uses subscriptions to track document processing in real-time:

```typescript
import { ensureConnection, addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';

async function setupDocumentSubscriptions(documentId: string): Promise<void> {
  const currentToken = await getCurrentToken();
  if (!currentToken) return;

  // Ensure connection
  await ensureConnection(currentToken);

  // Create subscriptions for text, table, and image creation
  const subscriptions: SubscriptionSpec<any>[] = [
    {
      query: print(S_ON_CREATE_TEXT),
      variables: { parentId: documentId },
      path: 'onCreateText',
      next: (text: Text) => {
        // Update project entities store
        addProjectText(projectId, text);
      }
    },
    // ... more subscriptions
  ];

  // Add all subscriptions
  for (const spec of subscriptions) {
    await addSubscription(currentToken, spec);
  }

  // Store for cleanup
  activeSubscriptions.set(documentId, subscriptions);
}
```

**Real Examples:**
- `src/lib/components/DocumentUpload/uploader.store.svelte.ts` (lines 239-319)
  - Sets up subscriptions for text, table, and image creation events
  - Tracks subscriptions per document for proper cleanup
  - Removes subscriptions when uploader is destroyed

### 3. Job Status Subscriptions

Components use subscriptions to track AI job progress in real-time:

```typescript
import { ensureConnection, addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';

async function setupJobSubscription(jobId: string, token: string): Promise<void> {
  // Create subscription spec
  const subscriptionSpec: SubscriptionSpec<JobUpdate> = {
    query: print(S_JOB_UPDATE),
    variables: { id: jobId },
    path: 'onUpdateJob',
    next: (update: JobUpdate) => {
      // Update job state
      jobUpdateStore.addJobUpdate(jobId, update);
    },
    error: (err: any) => {
      console.error('Job subscription error:', err);
    }
  };

  // Ensure connection and add subscription
  await ensureConnection(token);
  await addSubscription(token, subscriptionSpec);

  // Store for cleanup
  networkState.currentSubscription = subscriptionSpec;
}

// On cleanup
function cleanup() {
  if (networkState.currentSubscription) {
    removeSubscription(networkState.currentSubscription);
  }
}
```

**Real Examples:**
- `src/lib/components/AI/JobSubmission.svelte` (lines 434-497)
  - Subscribes to job updates for real-time status tracking
  - Handles connection errors and reconnection logic
  - Cleans up subscriptions on component unmount

- `src/lib/dashboard/lib/JobManager.ts` (lines 440-553)
  - Uses dependency injection pattern to use appSyncClientStore functions
  - Manages subscription lifecycle with error handling and retries
  - Implements reconnection logic with exponential backoff

### 4. Dependency Injection Pattern

Some components use dependency injection to make the store functions testable:

```typescript
// In JobManager constructor
constructor(dependencies: {
  ensureConnection: (token: string) => Promise<void>;
  addSubscription: (token: string, spec: SubscriptionSpec<JobUpdate>) => Promise<void>;
  removeSubscription: (spec: SubscriptionSpec<JobUpdate>) => void;
}) {
  this.ensureConnection = dependencies.ensureConnection;
  this.addSubscription = dependencies.addSubscription;
  this.removeSubscription = dependencies.removeSubscription;
}

// When creating JobManager instance
import { ensureConnection, addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';

const jobManager = new JobManager({
  ensureConnection: async (token: string) => {
    await ensureConnection(token);
  },
  addSubscription,
  removeSubscription
});
```

**Real Examples:**
- `src/lib/dashboard/lib/JobManager.ts` (lines 584-657)
  - Uses dependency injection for better testability
  - Allows mocking of WebSocket functions in tests

### 5. Component Lifecycle Management

Components typically set up subscriptions in `$effect` and clean them up on unmount:

```typescript
import { addSubscription, removeSubscription, ensureConnection } from '$lib/stores/appSyncClientStore';

let currentSubscription: SubscriptionSpec<any> | null = null;

$effect(() => {
  if (!idToken || !projectId) return;

  // Setup subscription
  (async () => {
    await ensureConnection(idToken);
    
    const subscription = {
      query: print(S_ON_UPDATE_PROJECT),
      variables: { id: projectId },
      path: 'onUpdateProject',
      next: (data: Project) => {
        // Handle update
      }
    };

    await addSubscription(idToken, subscription);
    currentSubscription = subscription;
  })();

  // Cleanup function
  return () => {
    if (currentSubscription) {
      removeSubscription(currentSubscription);
      currentSubscription = null;
    }
  };
});
```

**Real Examples:**
- `src/lib/dashboard/examples/SimplifiedParagraphDisplay.svelte` (lines 238-356)
  - Sets up subscription in `$effect`
  - Properly cleans up on component unmount
  - Handles token changes reactively

## Available Functions

### Connection Management
- `ensureConnection(idToken: string): Promise<AppSyncWsClient>` - Ensures a connection is established. If a connection exists with the same token, returns it. If the token changed, disconnects old client and creates new one.
- `getAppSyncClient(): AppSyncWsClient | null` - Gets the current client instance (or null if not initialized)
- `getConnectionState()` - Returns connection state information
- `disconnectClient(): void` - Disconnects the shared client (typically only called on logout)

### Subscription Management
- `addSubscription<T>(idToken: string, spec: SubscriptionSpec<T>): Promise<void>` - Adds a subscription to the shared client. Ensures connection is established first.
- `removeSubscription<T>(spec: SubscriptionSpec<T>): void` - Removes a subscription from the shared client

## Subscription Specification

Subscriptions are defined using the `SubscriptionSpec<T>` interface:

```typescript
interface SubscriptionSpec<T> {
  query: string;           // GraphQL subscription query (printed)
  variables: Record<string, any>;  // Variables for the query
  path: string;            // Path to the data in the response (e.g., 'onUpdateProject')
  next: (data: T) => void; // Callback when data is received
  error?: (error: any) => void; // Optional error callback
}
```

## Best Practices

1. **Always ensure connection before adding subscriptions**:
   ```typescript
   await ensureConnection(idToken);
   await addSubscription(idToken, subscription);
   ```

2. **Clean up subscriptions on component unmount**:
   ```typescript
   $effect(() => {
     // Setup
     return () => {
       // Cleanup
       removeSubscription(subscription);
     };
   });
   ```

3. **Store subscription specs for cleanup**:
   ```typescript
   let currentSubscription: SubscriptionSpec<any> | null = null;
   
   currentSubscription = subscription;
   await addSubscription(idToken, subscription);
   
   // Later...
   if (currentSubscription) {
     removeSubscription(currentSubscription);
   }
   ```

4. **Handle token changes** - The store automatically handles token changes by disconnecting the old client and creating a new one. You don't need to manually handle this.

5. **Use error callbacks** - Always provide error callbacks in subscription specs to handle connection issues gracefully.

6. **Don't create multiple clients** - Always use the shared store functions instead of creating new `AppSyncWsClient` instances directly.

## Component Usage Summary

**Page Components:**
- `projects/+page.svelte` - Subscribes to project CRUD operations and notifications
  - Multiple subscriptions for different project events
  - Handles tenant-wide and user-specific subscriptions

**UI Components:**
- `DocumentUpload/uploader.store.svelte.ts` - Subscribes to document processing events
  - Tracks text, table, and image creation for uploaded documents
  - Manages subscriptions per document for cleanup

- `AI/JobSubmission.svelte` - Subscribes to job status updates
  - Real-time tracking of AI job progress
  - Handles reconnection and error states

- `dashboard/examples/SimplifiedParagraphDisplay.svelte` - Example subscription usage
  - Demonstrates proper lifecycle management
  - Shows reactive token handling

**Library Components:**
- `dashboard/lib/JobManager.ts` - Uses dependency injection pattern
  - Manages job subscriptions with retry logic
  - Implements exponential backoff for reconnections

## Connection Lifecycle

1. **Initial Connection**: First call to `ensureConnection()` creates the WebSocket client
2. **Token Changes**: If token changes, old client is disconnected and new one is created
3. **Subscription Management**: Subscriptions are added/removed dynamically as components mount/unmount
4. **Cleanup**: `disconnectClient()` should be called on app-level cleanup (e.g., logout)

## Error Handling

The store handles connection errors internally, but components should handle subscription errors:

```typescript
const subscription = {
  query: print(S_ON_UPDATE_PROJECT),
  variables: { id: projectId },
  path: 'onUpdateProject',
  next: (data: Project) => {
    // Handle success
  },
  error: (err: any) => {
    // Handle subscription-specific errors
    console.error('Subscription error:', err);
    // Optionally retry or show user notification
  }
};
```

## Performance Considerations

- **Single Connection**: The singleton pattern ensures only one WebSocket connection exists, reducing resource usage
- **Shared Subscriptions**: Multiple components can share the same connection
- **Automatic Cleanup**: Subscriptions are removed when components unmount, preventing memory leaks
- **Token Reuse**: If the same token is used, the existing connection is reused

## Future Enhancements

Potential improvements:
- Add connection state observables for reactive UI updates
- Implement subscription queuing for when connection is not yet established
- Add metrics/monitoring for connection health
- Support for multiple concurrent tokens (multi-user scenarios)
- Automatic reconnection with exponential backoff at the store level
