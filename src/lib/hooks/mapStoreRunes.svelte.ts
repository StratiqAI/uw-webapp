import { onDestroy } from 'svelte';
import { mapStore } from '$lib/stores/MapStore';

/**
 * useTopic (Read Only)
 * Returns reactive state for a topic.
 * 
 * Note: If the topic changes reactively (via $derived), use useReactiveTopic instead.
 */
export function useTopic<T = unknown>(topic: string, consumerId?: string) {
	let current = $state<T | undefined>(undefined);

	// Generate consumer ID if not provided
	const id = consumerId || `useTopic-${crypto.randomUUID()}`;
	const stream = mapStore.getStream(topic, id);
	const unsubscribe = stream.subscribe((val: unknown) => {
		// Cast to T allowed for DX, but runtime is strictly 'unknown'
		current = val as T;
	});

	onDestroy(unsubscribe);

	return {
		get current() {
			return current;
		}
	};
}

/**
 * useReactiveTopic (Read Only)
 * Returns reactive state for a topic that may change.
 * Automatically re-subscribes when the topic changes.
 */
export function useReactiveTopic<T = unknown>(topic: () => string, consumerId: () => string) {
	let current = $state<T | undefined>(undefined);
	let unsubscribe: (() => void) | null = null;

	$effect(() => {
		// Clean up previous subscription
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = null;
		}

		// Get current topic and consumer ID
		const currentTopic = topic();
		const id = consumerId();
		
		// Create new subscription
		const stream = mapStore.getStream(currentTopic, id);
		
		// Get initial value
		const initialValue = stream.get();
		if (initialValue !== undefined) {
			current = initialValue as T;
		}
		
		// Subscribe to updates
		unsubscribe = stream.subscribe((val: unknown) => {
			// Only update if we're still subscribed to the same topic
			if (currentTopic === topic()) {
				current = val as T;
			}
		});

		return () => {
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
		};
	});

	return {
		get current() {
			return current;
		}
	};
}

/**
 * usePublisher (Write Only)
 * Gets a handle to publish data.
 */
export function usePublisher(topic: string, id: string = 'anon') {
	const pub = mapStore.getPublisher(topic, id);

	onDestroy(() => pub.dispose());

	return {
		emit: (val: unknown) => pub.publish(val)
	};
}

/**
 * useSync (Bi-Directional)
 * Used for Forms/Editors. Handles Echo Cancellation.
 */
export function useSync<T = any>(topic: string, debounceMs = 200) {
	const syncId = `sync-${crypto.randomUUID()}`;
	const stream = mapStore.getStream(topic, syncId);
	// Generate unique ID for this editor instance
	const pub = mapStore.getPublisher(topic, syncId);

	// Local Mutable State
	let localState = $state<T | undefined>(undefined);

	// Logic Flags
	let isRemoteUpdate = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// 1. Remote -> Local
	const unsubscribe = stream.subscribe((remoteVal: unknown) => {
		if (remoteVal === undefined) return;

		isRemoteUpdate = true;
		// Deep clone is mandatory to prevent reference pollution
		localState = structuredClone(remoteVal) as T;
		isRemoteUpdate = false;
	});

	// 2. Local -> Remote (Watcher)
	$effect(() => {
		// Access localState to register dependency on all properties
		// For deep reactivity, we serialize to ensure all nested changes are tracked
		const snapshot = localState ? structuredClone(localState) : undefined;

		// Only publish if data exists AND it is not a remote echo
		if (snapshot && !isRemoteUpdate) {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(() => {
				// MapStore.publish will handle Schema Validation
				pub.publish(snapshot);
			}, debounceMs);
		}
	});

	onDestroy(() => {
		unsubscribe();
		pub.dispose();
		if (timer) {
			clearTimeout(timer);
		}
	});

	return {
		get current() {
			return localState;
		},
		set current(v) {
			localState = v;
		}
	};
}

