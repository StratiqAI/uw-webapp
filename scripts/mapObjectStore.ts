// stores/MapStore.ts
import { 
  writable, 
  derived, 
  get as getStoreValue, 
  type Writable, 
  type Readable, 
  type Unsubscriber 
} from 'svelte/store';
import { setContext, getContext, onDestroy } from 'svelte';

// --- Types ---

export interface Producer<T> {
  publish: (value: T) => void;
  update: (updater: (current: T | undefined) => T) => void;
  clear: () => void;
  /** Unregister this producer and clean up resources */
  dispose: () => void;
}

export interface Consumer<T> {
  subscribe: Readable<T | undefined>['subscribe'];
  /** Get current value synchronously (not reactive) */
  get: () => T | undefined;
  /** Unregister this consumer */
  dispose: () => void;
}

export interface ProducerConsumer<T> extends Producer<T>, Consumer<T> {}

interface TypeEntry<T = any> {
  store: Writable<T | undefined>;
  readonlyStore: Readable<T | undefined>;
  producers: Set<string>;
  consumers: Set<string>;
  lastValue?: T;
}

interface Registration {
  type: string;
  role: 'producer' | 'consumer' | 'both';
}

interface BridgeOptions<TSource> {
  filter?: (value: TSource) => boolean;
  debounceMs?: number;
}

// --- Context Key ---
const MAP_STORE_CONTEXT_KEY = Symbol('MAP_STORE');

// --- Main Class ---

export class MapStore {
  private typeRegistry = new Map<string, TypeEntry>();
  private registrations = new Map<string, Registration>();

  /**
   * Register as a producer.
   * @param typeId - The topic/type identifier
   * @param registrationId - Optional unique ID. If omitted, one is generated.
   * @param initialValue - Optional initial value to set if store is empty
   */
  registerProducer<T>(
    typeId: string, 
    registrationId: string = crypto.randomUUID(), 
    initialValue?: T
  ): Producer<T> {
    const entry = this.ensureType<T>(typeId, initialValue);
    this.addRegistration(typeId, registrationId, 'producer', entry);

    return {
      publish: (value: T) => {
        entry.store.set(value);
        entry.lastValue = value;
      },
      update: (updater) => {
        entry.store.update(curr => {
          const next = updater(curr);
          entry.lastValue = next;
          return next;
        });
      },
      clear: () => {
        entry.store.set(undefined);
        entry.lastValue = undefined;
      },
      dispose: () => this.unregister(registrationId)
    };
  }

  /**
   * Register as a consumer.
   */
  registerConsumer<T>(
    typeId: string, 
    registrationId: string = crypto.randomUUID()
  ): Consumer<T> {
    const entry = this.ensureType<T>(typeId);
    this.addRegistration(typeId, registrationId, 'consumer', entry);

    return {
      subscribe: entry.readonlyStore.subscribe,
      get: () => getStoreValue(entry.readonlyStore),
      dispose: () => this.unregister(registrationId)
    };
  }

  /**
   * Register as both producer and consumer.
   */
  register<T>(
    typeId: string, 
    registrationId: string = crypto.randomUUID(), 
    initialValue?: T
  ): ProducerConsumer<T> {
    const entry = this.ensureType<T>(typeId, initialValue);
    this.addRegistration(typeId, registrationId, 'both', entry);

    return {
      // Producer methods
      publish: (value: T) => {
        entry.store.set(value);
        entry.lastValue = value;
      },
      update: (updater) => {
        entry.store.update(curr => {
          const next = updater(curr);
          entry.lastValue = next;
          return next;
        });
      },
      clear: () => {
        entry.store.set(undefined);
        entry.lastValue = undefined;
      },
      // Consumer methods
      subscribe: entry.readonlyStore.subscribe,
      get: () => getStoreValue(entry.readonlyStore),
      // Cleanup
      dispose: () => this.unregister(registrationId)
    };
  }

  /**
   * Create a derived consumer that transforms data from another type.
   */
  registerDerived<TSource, TDerived>(
    sourceTypeId: string,
    transformer: (value: TSource | undefined) => TDerived | undefined,
    registrationId: string = crypto.randomUUID()
  ): Consumer<TDerived> {
    const entry = this.ensureType<TSource>(sourceTypeId);
    this.addRegistration(sourceTypeId, registrationId, 'consumer', entry);

    const derivedStore = derived(entry.readonlyStore, $val => transformer($val));

    return {
      subscribe: derivedStore.subscribe,
      get: () => getStoreValue(derivedStore),
      dispose: () => this.unregister(registrationId)
    };
  }

  /**
   * Bridge two types automatically.
   * Returns a dispose function that cleans up subscriptions AND registrations.
   */
  registerBridge<TSource, TTarget>(
    sourceTypeId: string,
    targetTypeId: string,
    transformer: (value: TSource) => TTarget,
    options?: BridgeOptions<TSource>,
    baseId: string = 'bridge'
  ): Unsubscriber {
    // Generate IDs internally to avoid conflicts
    const consumerId = `${baseId}_${crypto.randomUUID()}_cons`;
    const producerId = `${baseId}_${crypto.randomUUID()}_prod`;

    const consumer = this.registerConsumer<TSource>(sourceTypeId, consumerId);
    const producer = this.registerProducer<TTarget>(targetTypeId, producerId);
    
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    const unsubscribe = consumer.subscribe(value => {
      if (value === undefined) return;
      if (options?.filter && !options.filter(value)) return;
      
      const run = () => producer.publish(transformer(value));

      if (options?.debounceMs && options.debounceMs > 0) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(run, options.debounceMs);
      } else {
        run();
      }
    });

    // Return a cleanup function that kills the sub, clears timeouts, 
    // AND unregisters the internal actors from the map
    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
      this.unregister(consumerId);
      this.unregister(producerId);
    };
  }

  unregister(registrationId: string): void {
    const reg = this.registrations.get(registrationId);
    if (!reg) return;
    
    const entry = this.typeRegistry.get(reg.type);
    if (!entry) {
      this.registrations.delete(registrationId);
      return;
    }
    
    // Clean up sets
    if (reg.role === 'producer' || reg.role === 'both') {
      entry.producers.delete(registrationId);
    }
    if (reg.role === 'consumer' || reg.role === 'both') {
      entry.consumers.delete(registrationId);
    }
    
    this.registrations.delete(registrationId);
    
    // Garbage collection: Remove type entry if empty
    if (entry.producers.size === 0 && entry.consumers.size === 0) {
      this.typeRegistry.delete(reg.type);
    }
  }

  getTypeInfo() {
    return Array.from(this.typeRegistry.entries()).map(([typeId, entry]) => ({
      typeId,
      producerCount: entry.producers.size,
      consumerCount: entry.consumers.size,
      hasValue: entry.lastValue !== undefined
    }));
  }

  reset(): void {
    this.typeRegistry.clear();
    this.registrations.clear();
  }

  // --- Private Helpers ---

  private ensureType<T>(typeId: string, initialValue?: T): TypeEntry<T> {
    let entry = this.typeRegistry.get(typeId) as TypeEntry<T>;

    if (!entry) {
      const store = writable<T | undefined>(initialValue);
      entry = {
        store,
        readonlyStore: derived(store, $s => $s), // Read-only view
        producers: new Set(),
        consumers: new Set(),
        lastValue: initialValue
      };
      this.typeRegistry.set(typeId, entry);
    } else if (initialValue !== undefined && entry.lastValue === undefined) {
      // Late initialization: Set value if one is provided and store is empty
      entry.store.set(initialValue);
      entry.lastValue = initialValue;
    }

    return entry;
  }

  private addRegistration(typeId: string, regId: string, role: Registration['role'], entry: TypeEntry) {
    if (this.registrations.has(regId)) {
      console.warn(`[MapStore] Registration ID collision: '${regId}'. Overwriting previous registration.`);
      this.unregister(regId);
    }

    this.registrations.set(regId, { type: typeId, role });

    if (role === 'producer' || role === 'both') entry.producers.add(regId);
    if (role === 'consumer' || role === 'both') entry.consumers.add(regId);
  }
}

// --- Factory & Svelte Integration ---

/**
 * Creates a new MapStore instance.
 * Preferred over global singleton for SSR/SvelteKit apps.
 */
export function createMapStore() {
  return new MapStore();
}

/**
 * Initialize MapStore in a parent component (e.g., Layout).
 */
export function setMapStoreContext() {
  const store = new MapStore();
  setContext(MAP_STORE_CONTEXT_KEY, store);
  
  // Cleanup whole store when the context owner is destroyed
  onDestroy(() => store.reset());
  
  return store;
}

/**
 * Get the MapStore from context.
 */
export function getMapStoreContext(): MapStore {
  const store = getContext<MapStore>(MAP_STORE_CONTEXT_KEY);
  if (!store) {
    throw new Error('MapStore context not found. Call setMapStoreContext() in a parent component.');
  }
  return store;
}

/**
 * Helper to create an auto-cleaning consumer inside a component
 */
export function useConsumer<T>(store: MapStore, typeId: string, id?: string) {
  const consumer = store.registerConsumer<T>(typeId, id);
  onDestroy(() => consumer.dispose());
  return consumer;
}

/**
 * Helper to create an auto-cleaning producer inside a component
 */
export function useProducer<T>(store: MapStore, typeId: string, id?: string, initial?: T) {
  const producer = store.registerProducer<T>(typeId, id, initial);
  onDestroy(() => producer.dispose());
  return producer;
}

// Global instance (Keep for backward compatibility or pure SPA usage)
export const mapStore = new MapStore();





// // stores/MapStore.ts
// import { writable, derived, get, type Writable, type Readable, type Unsubscriber } from 'svelte/store';

// // Type definitions for producers and consumers
// interface Producer<T> {
//   publish: (value: T) => void;
//   update: (updater: (current: T | undefined) => T) => void;
//   clear: () => void;
// }

// interface Consumer<T> {
//   subscribe: Readable<T | undefined>['subscribe'];
//   get: () => T | undefined;
// }

// interface ProducerConsumer<T> extends Producer<T>, Consumer<T> {}

// // Type registry entry
// interface TypeEntry<T = any> {
//   store: Writable<T | undefined>;
//   producers: Set<string>;
//   consumers: Set<string>;
//   lastValue?: T;
// }

// // Main MapStore class - single store for all types
// class MapStore {
//   // Map of type name to its store and metadata
//   private typeRegistry = new Map<string, TypeEntry>();
  
//   // Track active registrations
//   private registrations = new Map<string, {
//     type: string;
//     role: 'producer' | 'consumer' | 'both';
//   }>();

//   /**
//    * Register as a producer for a specific type
//    * Producers can publish values of the specified type
//    */
//   registerProducer<T>(typeId: string, registrationId: string, initialValue?: T): Producer<T> {
//     this.ensureType<T>(typeId, initialValue);
//     const entry = this.typeRegistry.get(typeId)! as TypeEntry<T>;
    
//     // Track this producer
//     entry.producers.add(registrationId);
//     this.registrations.set(registrationId, { type: typeId, role: 'producer' });

//     return {
//       publish: (value: T) => {
//         entry.store.set(value);
//         entry.lastValue = value;
//       },
      
//       update: (updater: (current: T | undefined) => T) => {
//         entry.store.update(current => {
//           const newValue = updater(current);
//           entry.lastValue = newValue;
//           return newValue;
//         });
//       },
      
//       clear: () => {
//         entry.store.set(undefined);
//         entry.lastValue = undefined;
//       }
//     };
//   }

//   /**
//    * Register as a consumer for a specific type
//    * Consumers can subscribe to values of the specified type
//    */
//   registerConsumer<T>(typeId: string, registrationId: string): Consumer<T> {
//     this.ensureType<T>(typeId);
//     const entry = this.typeRegistry.get(typeId)! as TypeEntry<T>;
    
//     // Track this consumer
//     entry.consumers.add(registrationId);
//     this.registrations.set(registrationId, { type: typeId, role: 'consumer' });

//     return {
//       subscribe: entry.store.subscribe,
      
//       get: () => get(entry.store)
//     };
//   }

//   /**
//    * Register as both producer and consumer for a specific type
//    * Can both publish and subscribe to values
//    */
//   register<T>(typeId: string, registrationId: string, initialValue?: T): ProducerConsumer<T> {
//     this.ensureType<T>(typeId, initialValue);
//     const entry = this.typeRegistry.get(typeId)! as TypeEntry<T>;
    
//     // Track as both producer and consumer
//     entry.producers.add(registrationId);
//     entry.consumers.add(registrationId);
//     this.registrations.set(registrationId, { type: typeId, role: 'both' });

//     return {
//       publish: (value: T) => {
//         entry.store.set(value);
//         entry.lastValue = value;
//       },
      
//       update: (updater: (current: T | undefined) => T) => {
//         entry.store.update(current => {
//           const newValue = updater(current);
//           entry.lastValue = newValue;
//           return newValue;
//         });
//       },
      
//       clear: () => {
//         entry.store.set(undefined);
//         entry.lastValue = undefined;
//       },
      
//       subscribe: entry.store.subscribe,
      
//       get: () => get(entry.store)
//     };
//   }

//   /**
//    * Create a derived consumer that transforms data from another type
//    */
//   registerDerivedConsumer<TSource, TDerived>(
//     sourceTypeId: string,
//     registrationId: string,
//     transformer: (value: TSource | undefined) => TDerived | undefined
//   ): Consumer<TDerived> {
//     this.ensureType<TSource>(sourceTypeId);
//     const sourceEntry = this.typeRegistry.get(sourceTypeId)! as TypeEntry<TSource>;
    
//     // Track this as a consumer of the source type
//     sourceEntry.consumers.add(registrationId);
//     this.registrations.set(registrationId, { type: sourceTypeId, role: 'consumer' });

//     const derivedStore = derived(
//       sourceEntry.store,
//       $value => transformer($value)
//     );

//     return {
//       subscribe: derivedStore.subscribe,
//       get: () => get(derivedStore)
//     };
//   }

//   /**
//    * Bridge two types - consume from one type and produce to another
//    */
//   registerBridge<TSource, TTarget>(
//     sourceTypeId: string,
//     targetTypeId: string,
//     registrationId: string,
//     transformer: (value: TSource) => TTarget,
//     options?: {
//       filter?: (value: TSource) => boolean;
//       debounceMs?: number;
//     }
//   ): Unsubscriber {
//     const consumer = this.registerConsumer<TSource>(sourceTypeId, `${registrationId}_consumer`);
//     const producer = this.registerProducer<TTarget>(targetTypeId, `${registrationId}_producer`);
    
//     let timeout: ReturnType<typeof setTimeout>;
    
//     return consumer.subscribe(value => {
//       if (value === undefined) return;
//       if (options?.filter && !options.filter(value)) return;
      
//       if (options?.debounceMs) {
//         clearTimeout(timeout);
//         timeout = setTimeout(() => {
//           producer.publish(transformer(value));
//         }, options.debounceMs);
//       } else {
//         producer.publish(transformer(value));
//       }
//     });
//   }

//   /**
//    * Unregister a producer/consumer
//    */
//   unregister(registrationId: string): void {
//     const registration = this.registrations.get(registrationId);
//     if (!registration) return;
    
//     const entry = this.typeRegistry.get(registration.type);
//     if (!entry) return;
    
//     // Remove from appropriate sets
//     if (registration.role === 'producer' || registration.role === 'both') {
//       entry.producers.delete(registrationId);
//     }
//     if (registration.role === 'consumer' || registration.role === 'both') {
//       entry.consumers.delete(registrationId);
//     }
    
//     this.registrations.delete(registrationId);
    
//     // Clean up type if no more producers/consumers
//     if (entry.producers.size === 0 && entry.consumers.size === 0) {
//       this.typeRegistry.delete(registration.type);
//     }
//   }

//   /**
//    * Get information about registered types
//    */
//   getTypeInfo(): Array<{
//     typeId: string;
//     producerCount: number;
//     consumerCount: number;
//     hasValue: boolean;
//   }> {
//     return Array.from(this.typeRegistry.entries()).map(([typeId, entry]) => ({
//       typeId,
//       producerCount: entry.producers.size,
//       consumerCount: entry.consumers.size,
//       hasValue: entry.lastValue !== undefined
//     }));
//   }

//   /**
//    * Get all registrations for a specific type
//    */
//   getTypeRegistrations(typeId: string): {
//     producers: string[];
//     consumers: string[];
//   } {
//     const entry = this.typeRegistry.get(typeId);
//     if (!entry) return { producers: [], consumers: [] };
    
//     return {
//       producers: Array.from(entry.producers),
//       consumers: Array.from(entry.consumers)
//     };
//   }

//   /**
//    * Clear all data but keep registrations
//    */
//   clearData(): void {
//     this.typeRegistry.forEach(entry => {
//       entry.store.set(undefined);
//       entry.lastValue = undefined;
//     });
//   }

//   /**
//    * Reset everything
//    */
//   reset(): void {
//     this.typeRegistry.clear();
//     this.registrations.clear();
//   }

//   // Private helper to ensure a type exists
//   private ensureType<T>(typeId: string, initialValue?: T): void {
//     if (!this.typeRegistry.has(typeId)) {
//       this.typeRegistry.set(typeId, {
//         store: writable<T | undefined>(initialValue),
//         producers: new Set(),
//         consumers: new Set(),
//         lastValue: initialValue
//       });
//     } else if (initialValue !== undefined && !this.typeRegistry.get(typeId)!.lastValue) {
//       // Set initial value if type exists but has no value
//       const entry = this.typeRegistry.get(typeId)! as TypeEntry<T>;
//       entry.store.set(initialValue);
//       entry.lastValue = initialValue;
//     }
//   }
// }

// // Create singleton instance
// export const mapStore = new MapStore();

// // Convenience functions for common patterns
// export function createProducer<T>(typeId: string, registrationId: string, initialValue?: T) {
//   return mapStore.registerProducer<T>(typeId, registrationId, initialValue);
// }

// export function createConsumer<T>(typeId: string, registrationId: string) {
//   return mapStore.registerConsumer<T>(typeId, registrationId);
// }

// export function createProducerConsumer<T>(typeId: string, registrationId: string, initialValue?: T) {
//   return mapStore.register<T>(typeId, registrationId, initialValue);
// }

// // Example usage:
// /*
// // Define your types
// interface UserData {
//   id: string;
//   name: string;
//   role: string;
// }

// interface AuthState {
//   isAuthenticated: boolean;
//   token?: string;
// }

// interface Notification {
//   message: string;
//   type: 'info' | 'warning' | 'error';
// }

// // Auth service acts as a producer of AuthState
// const authService = mapStore.registerProducer<AuthState>('auth', 'authService', {
//   isAuthenticated: false
// });

// // User service produces UserData
// const userService = mapStore.registerProducer<UserData>('user', 'userService');

// // Header component consumes both auth and user data
// const headerAuth = mapStore.registerConsumer<AuthState>('auth', 'headerComponent');
// const headerUser = mapStore.registerConsumer<UserData>('user', 'headerComponent');

// // Notification system can both produce and consume notifications
// const notificationSystem = mapStore.register<Notification>('notification', 'notificationSystem');

// // Bridge example: When user logs in, create a notification
// const loginNotificationBridge = mapStore.registerBridge<AuthState, Notification>(
//   'auth',
//   'notification',
//   'loginNotificationBridge',
//   (auth) => ({
//     message: auth.isAuthenticated ? 'Logged in successfully' : 'Logged out',
//     type: 'info'
//   }),
//   {
//     filter: (auth) => auth.isAuthenticated !== undefined
//   }
// );

// // Usage
// authService.publish({ isAuthenticated: true, token: 'abc123' });
// userService.publish({ id: '1', name: 'John Doe', role: 'admin' });

// // Subscribe to changes
// headerAuth.subscribe(auth => {
//   console.log('Auth state changed:', auth);
// });

// headerUser.subscribe(user => {
//   console.log('User data changed:', user);
// });

// // Check type information
// console.log(mapStore.getTypeInfo());
// // [
// //   { typeId: 'auth', producerCount: 1, consumerCount: 2, hasValue: true },
// //   { typeId: 'user', producerCount: 1, consumerCount: 1, hasValue: true },
// //   { typeId: 'notification', producerCount: 2, consumerCount: 1, hasValue: true }
// // ]
// */