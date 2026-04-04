/**
 * validatedTopicStoreRunes.svelte.ts
 * 
 * Svelte 5 runes-based hooks for ValidatedTopicStore integration.
 * Provides reactive data access with JSON Schema validation at the boundary.
 * 
 * These hooks mirror the MapStore hooks pattern but use ValidatedTopicStore
 * for schema-validated, topic-based state management.
 */

import { onDestroy } from 'svelte';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';

/**
 * useValidatedTopic (Read Only)
 * Returns reactive state for a topic from ValidatedTopicStore.
 * 
 * The hook automatically creates a reactive dependency on the store's tree,
 * so the component will re-render when the topic data changes.
 * 
 * @param topic - The topic path to subscribe to (e.g., 'widgets/metric/widget-1')
 * @returns An object with a reactive `current` getter
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
 *   
 *   const dataStream = useValidatedTopic<MetricData>('widgets/metric/my-widget');
 *   let widgetData = $derived(dataStream.current || defaultData);
 * </script>
 * ```
 */
export function useValidatedTopic<T = unknown>(topic: string) {
	const store = validatedTopicStore;
	
	const current = $derived.by(() => {
		const _ = store.tree;
		return store.at<T>(topic);
	});

	return {
		get current() {
			return current;
		}
	};
}

/**
 * useReactiveValidatedTopic (Read Only)
 * Returns reactive state for a topic that may change dynamically.
 * Automatically re-reads when the topic changes.
 * 
 * @param topic - A function returning the topic path (for reactive topic changes)
 * @returns An object with a reactive `current` getter
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
 *   
 *   let { widgetId } = $props();
 *   const topic = $derived(`widgets/metric/${widgetId}`);
 *   const dataStream = useReactiveValidatedTopic<MetricData>(() => topic);
 * </script>
 * ```
 */
export function useReactiveValidatedTopic<T = unknown>(topic: () => string) {
	const store = validatedTopicStore;

	const current = $derived.by(() => {
		const _ = store.tree;
		return store.at<T>(topic());
	});

	return {
		get current() {
			return current;
		}
	};
}

/**
 * useValidatedPublisher (Write Only)
 * Gets a handle to publish data to a topic with schema validation.
 * 
 * Data published through this hook will be validated against any
 * registered schema for the topic pattern before being stored.
 * 
 * @param topic - The topic path to publish to
 * @returns An object with `publish` and `clear` methods
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useValidatedPublisher } from '$lib/hooks/validatedTopicStoreRunes.svelte';
 *   
 *   const publisher = useValidatedPublisher('widgets/metric/my-widget');
 *   
 *   function updateMetric(value: number) {
 *     publisher.publish({ label: 'Sales', value, unit: '$' });
 *   }
 * </script>
 * ```
 */
export function useValidatedPublisher(topic: string) {
	const store = validatedTopicStore;

	return {
		/**
		 * Publish data to the topic with validation.
		 * @param data - The data to publish
		 * @returns true if data was stored (valid or no schema), false if validation failed
		 */
		publish: (data: unknown): boolean => {
			return store.publish(topic, data);
		},
		
		/**
		 * Clear/delete the data at this topic.
		 */
		clear: () => {
			store.delete(topic);
		}
	};
}

/**
 * useValidatedSync (Bi-Directional)
 * Used for Forms/Editors. Provides read/write access with echo cancellation.
 * 
 * @param topic - The topic path to sync with
 * @param debounceMs - Debounce delay for publishing changes (default: 200ms)
 * @returns An object with a reactive `current` getter/setter
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useValidatedSync } from '$lib/hooks/validatedTopicStoreRunes.svelte';
 *   
 *   const sync = useValidatedSync<FormData>('widgets/form/my-form');
 *   
 *   // Two-way binding
 *   <input bind:value={sync.current.name} />
 * </script>
 * ```
 */
export function useValidatedSync<T = unknown>(topic: string, debounceMs = 200) {
	const store = validatedTopicStore;
	
	let localState = $state<T | undefined>(store.at<T>(topic));
	
	let remoteVersion = 0;
	let lastPublishedVersion = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Remote -> Local: bump version so the local->remote effect knows to skip
	$effect(() => {
		const _ = store.tree;
		
		const remoteVal = store.at<T>(topic);
		if (remoteVal === undefined) return;

		remoteVersion++;
		localState = structuredClone(remoteVal);
	});

	// Local -> Remote: only publish when version hasn't changed (i.e. a true local edit)
	$effect(() => {
		const snapshot = localState ? structuredClone(localState) : undefined;
		const currentRemoteVersion = remoteVersion;

		if (snapshot && currentRemoteVersion === lastPublishedVersion) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				lastPublishedVersion = remoteVersion;
				store.publish(topic, snapshot);
			}, debounceMs);
		} else {
			lastPublishedVersion = currentRemoteVersion;
		}
	});

	onDestroy(() => {
		if (timer) clearTimeout(timer);
	});

	return {
		get current() {
			return localState;
		},
		set current(v: T | undefined) {
			localState = v;
		}
	};
}

/**
 * useValidatedErrors (Read Only)
 * Returns reactive validation errors for a specific topic.
 * 
 * @param topic - The topic path to get errors for
 * @returns An object with a reactive `errors` getter
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useValidatedErrors } from '$lib/hooks/validatedTopicStoreRunes.svelte';
 *   
 *   const { errors } = useValidatedErrors('widgets/metric/my-widget');
 *   
 *   {#if errors}
 *     <div class="error">Validation failed</div>
 *   {/if}
 * </script>
 * ```
 */
export function useValidatedErrors(topic: string) {
	const store = validatedTopicStore;

	const errors = $derived.by(() => {
		const _ = store.errors;
		return store.errors.get(topic) || null;
	});

	return {
		get errors() {
			return errors;
		}
	};
}

/**
 * useValidatedCollection (Read Only)
 * Returns all children at a given topic path as a reactive array.
 * Useful for listing all items of a type (e.g., all metric widgets).
 * 
 * @param basePath - The parent topic path (e.g., 'widgets/metric')
 * @returns An object with a reactive `items` getter
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useValidatedCollection } from '$lib/hooks/validatedTopicStoreRunes.svelte';
 *   
 *   const metrics = useValidatedCollection<MetricData>('widgets/metric');
 *   
 *   {#each metrics.items as { id, data }}
 *     <!-- Render a dashboard widget; e.g. a component from @stratiqai/widget-metric -->
 *   {/each}
 * </script>
 * ```
 */
export function useValidatedCollection<T = unknown>(basePath: string) {
	const store = validatedTopicStore;

	const items = $derived.by(() => {
		const _ = store.tree;
		return store.getAllAt<T>(basePath);
	});

	return {
		get items() {
			return items;
		}
	};
}
