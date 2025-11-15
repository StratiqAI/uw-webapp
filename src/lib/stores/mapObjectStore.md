# MapObjectStore Documentation

## Overview

`mapObjectStore` is a centralized store management system that implements a producer-consumer pattern for managing multiple typed stores in a Svelte application. Instead of creating individual stores for each data type, you register producers and consumers with type identifiers, allowing multiple components to share and react to the same data streams.

### Key Benefits

- **Centralized Management**: Single store instance manages all data types
- **Type Safety**: Full TypeScript support with generic types
- **Loose Coupling**: Components don't need direct references to each other
- **Automatic Cleanup**: Types are automatically cleaned up when no longer used
- **Flexible Patterns**: Support for producers, consumers, derived data, and bridges

## Core Concepts

### Types (`typeId`)

A type is identified by a unique string (`typeId`). Each type can have:
- Multiple **producers** that publish values
- Multiple **consumers** that subscribe to values
- A single current value (or `undefined`)

### Producers

Producers can publish, update, and clear values for a specific type. They are typically used by services or components that own or manage data.

### Consumers

Consumers can subscribe to and read values for a specific type. They are typically used by components that need to react to data changes.

### Registration IDs (`registrationId`)

Each producer/consumer registration requires a unique `registrationId`. This allows:
- Multiple components to register for the same type
- Proper cleanup when components unmount
- Debugging and introspection of the store state

## Basic Usage

### Import

```typescript
import { mapStore, createProducer, createConsumer, createProducerConsumer } from '$lib/stores/mapObjectStore';
```

### Registering a Producer

Producers can publish values to a type:

```typescript
interface UserData {
  id: string;
  name: string;
  email: string;
}

// Register as a producer
const userService = mapStore.registerProducer<UserData>(
  'user',           // typeId
  'userService',    // registrationId
  { id: '', name: '', email: '' }  // optional initial value
);

// Publish a value
userService.publish({ id: '1', name: 'John Doe', email: 'john@example.com' });

// Update using a function
userService.update(current => ({
  ...current!,
  name: 'Jane Doe'
}));

// Clear the value
userService.clear();
```

**Convenience function:**
```typescript
const userService = createProducer<UserData>('user', 'userService');
```

### Registering a Consumer

Consumers can subscribe to and read values:

```typescript
// Register as a consumer
const userConsumer = mapStore.registerConsumer<UserData>('user', 'headerComponent');

// Subscribe to changes
const unsubscribe = userConsumer.subscribe(user => {
  if (user) {
    console.log('User updated:', user.name);
  }
});

// Get current value synchronously
const currentUser = userConsumer.get();

// Don't forget to unsubscribe when done
unsubscribe();
```

**Convenience function:**
```typescript
const userConsumer = createConsumer<UserData>('user', 'headerComponent');
```

### Registering as Both Producer and Consumer

Some components need to both publish and consume:

```typescript
// Register as both producer and consumer
const notificationSystem = mapStore.register<Notification>(
  'notification',
  'notificationSystem',
  { message: '', type: 'info' }
);

// Can publish
notificationSystem.publish({ message: 'Hello!', type: 'info' });

// Can subscribe
notificationSystem.subscribe(notification => {
  console.log('Notification:', notification);
});
```

**Convenience function:**
```typescript
const notificationSystem = createProducerConsumer<Notification>(
  'notification',
  'notificationSystem'
);
```

## Advanced Patterns

### Derived Consumers

Create a consumer that transforms data from another type:

```typescript
interface UserData {
  id: string;
  name: string;
  role: string;
}

interface UserDisplayName {
  displayName: string;
  isAdmin: boolean;
}

// Create a derived consumer that transforms UserData to UserDisplayName
const userDisplay = mapStore.registerDerivedConsumer<UserData, UserDisplayName>(
  'user',                    // source typeId
  'userDisplayTransformer',  // registrationId
  (user) => user ? {
    displayName: user.name,
    isAdmin: user.role === 'admin'
  } : undefined
);

// Subscribe to the transformed data
userDisplay.subscribe(display => {
  console.log(display?.displayName);
});
```

### Bridges

Bridges automatically transform data from one type to another:

```typescript
interface AuthState {
  isAuthenticated: boolean;
  token?: string;
}

interface Notification {
  message: string;
  type: 'info' | 'warning' | 'error';
}

// Create a bridge that converts auth state changes to notifications
const loginNotificationBridge = mapStore.registerBridge<AuthState, Notification>(
  'auth',                      // source typeId
  'notification',             // target typeId
  'loginNotificationBridge',   // registrationId
  (auth) => ({                 // transformer function
    message: auth.isAuthenticated ? 'Logged in successfully' : 'Logged out',
    type: 'info' as const
  }),
  {
    filter: (auth) => auth.isAuthenticated !== undefined,  // optional filter
    debounceMs: 300  // optional debounce (milliseconds)
  }
);

// The bridge returns an Unsubscriber - call it to stop the bridge
// loginNotificationBridge();
```

**Bridge Options:**
- `filter`: Function that determines if a value should be transformed
- `debounceMs`: Debounce delay in milliseconds before publishing

## Cleanup and Management

### Unregistering

When a component unmounts, unregister to clean up:

```typescript
// In your component's onDestroy
import { onDestroy } from 'svelte';

onDestroy(() => {
  mapStore.unregister('myComponent');
});
```

### Clearing Data

Clear all data while keeping registrations:

```typescript
mapStore.clearData();
```

### Resetting Everything

Reset the entire store (clears all data and registrations):

```typescript
mapStore.reset();
```

## Debugging and Introspection

### Get Type Information

Get information about all registered types:

```typescript
const typeInfo = mapStore.getTypeInfo();
// Returns:
// [
//   {
//     typeId: 'user',
//     producerCount: 1,
//     consumerCount: 2,
//     hasValue: true
//   },
//   ...
// ]
```

### Get Type Registrations

Get all producers and consumers for a specific type:

```typescript
const registrations = mapStore.getTypeRegistrations('user');
// Returns:
// {
//   producers: ['userService'],
//   consumers: ['headerComponent', 'sidebarComponent']
// }
```

### Get All Producers/Consumers

```typescript
const allProducers = mapStore.getAllProducers();
const allConsumers = mapStore.getAllConsumers();
```

### Get All Data

Get all stored values across all types:

```typescript
const allData = mapStore.getAllData();
// Returns:
// [
//   {
//     typeId: 'user',
//     value: { id: '1', name: 'John' },
//     producerCount: 1,
//     consumerCount: 2
//   },
//   ...
// ]
```

## Complete Example

Here's a complete example showing how to use `mapObjectStore` in a Svelte application:

```typescript
// stores/userStore.ts
import { createProducer } from '$lib/stores/mapObjectStore';

interface User {
  id: string;
  name: string;
  email: string;
}

export const userProducer = createProducer<User>('user', 'userService');

// services/authService.ts
import { createProducer } from '$lib/stores/mapObjectStore';

interface AuthState {
  isAuthenticated: boolean;
  token?: string;
}

export const authProducer = createProducer<AuthState>(
  'auth',
  'authService',
  { isAuthenticated: false }
);

// components/Header.svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createConsumer } from '$lib/stores/mapObjectStore';
  import type { User } from '$lib/stores/userStore';
  import type { AuthState } from '$lib/services/authService';

  const userConsumer = createConsumer<User>('user', 'header');
  const authConsumer = createConsumer<AuthState>('auth', 'header');

  let user: User | undefined;
  let auth: AuthState | undefined;

  const unsubscribeUser = userConsumer.subscribe(value => {
    user = value;
  });

  const unsubscribeAuth = authConsumer.subscribe(value => {
    auth = value;
  });

  onDestroy(() => {
    unsubscribeUser();
    unsubscribeAuth();
    mapStore.unregister('header');
  });
</script>

<header>
  {#if auth?.isAuthenticated && user}
    <span>Welcome, {user.name}</span>
  {:else}
    <span>Not logged in</span>
  {/if}
</header>
```

## API Reference

### `mapStore.registerProducer<T>(typeId, registrationId, initialValue?)`

Register as a producer for a type.

**Returns:** `Producer<T>` with methods:
- `publish(value: T): void` - Set a new value
- `update(updater: (current: T | undefined) => T): void` - Update using a function
- `clear(): void` - Clear the value

### `mapStore.registerConsumer<T>(typeId, registrationId)`

Register as a consumer for a type.

**Returns:** `Consumer<T>` with methods:
- `subscribe(callback: (value: T | undefined) => void): Unsubscriber` - Subscribe to changes
- `get(): T | undefined` - Get current value synchronously

### `mapStore.register<T>(typeId, registrationId, initialValue?)`

Register as both producer and consumer.

**Returns:** `ProducerConsumer<T>` (combines Producer and Consumer methods)

### `mapStore.registerDerivedConsumer<TSource, TDerived>(sourceTypeId, registrationId, transformer)`

Create a derived consumer that transforms data.

**Returns:** `Consumer<TDerived>`

### `mapStore.registerBridge<TSource, TTarget>(sourceTypeId, targetTypeId, registrationId, transformer, options?)`

Create a bridge between two types.

**Returns:** `Unsubscriber` - call to stop the bridge

**Options:**
- `filter?: (value: TSource) => boolean` - Filter values before transforming
- `debounceMs?: number` - Debounce delay in milliseconds

### `mapStore.unregister(registrationId)`

Unregister a producer/consumer and clean up if no longer needed.

### `mapStore.getTypeInfo()`

Get information about all registered types.

### `mapStore.getTypeRegistrations(typeId)`

Get all registrations for a specific type.

### `mapStore.clearData()`

Clear all data but keep registrations.

### `mapStore.reset()`

Reset everything (clear all data and registrations).

### `mapStore.getAllProducers()`

Get all producers across all types.

### `mapStore.getAllConsumers()`

Get all consumers across all types.

### `mapStore.getAllData()`

Get all stored values across all types.

## Best Practices

1. **Use descriptive type IDs**: Use clear, consistent naming like `'user'`, `'auth'`, `'project'`
2. **Use unique registration IDs**: Include component/service name in registration IDs
3. **Always unregister**: Clean up registrations in `onDestroy` hooks
4. **Type your data**: Always provide TypeScript types for type safety
5. **Use bridges for transformations**: Don't manually subscribe and publish - use bridges
6. **Debounce expensive operations**: Use `debounceMs` option in bridges for performance
7. **Filter when needed**: Use filter functions to avoid unnecessary updates

## Common Patterns

### Service Pattern

Services act as producers:

```typescript
// services/apiService.ts
export const apiService = createProducer<ApiResponse>('api', 'apiService');
```

### Component Pattern

Components consume data:

```typescript
// components/MyComponent.svelte
const dataConsumer = createConsumer<Data>('data', 'myComponent');
```

### Shared State Pattern

Multiple components share state:

```typescript
// Both components use the same typeId but different registrationIds
const component1 = createProducerConsumer<State>('sharedState', 'component1');
const component2 = createProducerConsumer<State>('sharedState', 'component2');
```

