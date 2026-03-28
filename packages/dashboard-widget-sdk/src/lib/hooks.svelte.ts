import { getDashboardWidgetHost } from './context.svelte.js';

/**
 * Reactive hook that subscribes to a ValidatedTopicStore topic via the host context.
 * Re-reads whenever the topic function returns a new value or the store tree changes.
 *
 * Portable replacement for the app-internal `useReactiveValidatedTopic` hook.
 *
 * @param topic - A function returning the current topic path (reactive to changes)
 * @returns An object with a reactive `current` getter
 */
export function useReactiveValidatedTopic<T = unknown>(topic: () => string) {
	const host = getDashboardWidgetHost();
	const store = host.validatedTopicStore;
	let current = $state<T | undefined>(undefined);

	$effect(() => {
		// Access store.tree to establish a reactive dependency
		const _ = store.tree;
		const currentTopic = topic();
		current = store.at<T>(currentTopic);
	});

	return {
		get current() {
			return current;
		}
	};
}
