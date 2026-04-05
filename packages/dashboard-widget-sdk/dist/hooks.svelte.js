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
export function useReactiveValidatedTopic(topic) {
    const host = getDashboardWidgetHost();
    const store = host.validatedTopicStore;
    const current = $derived.by(() => {
        const _ = store.tree;
        return store.at(topic());
    });
    return {
        get current() {
            return current;
        }
    };
}
/**
 * Publish validated data to a widget's output topic via the host context.
 * Returns false if the host does not support output publishing or the
 * widget kind has no registered output schema.
 */
export function publishWidgetOutput(kind, widgetId, data) {
    const host = getDashboardWidgetHost();
    if (!host.publishWidgetOutput) {
        console.warn(`publishWidgetOutput not available on host — ${kind}/${widgetId} publish skipped`);
        return false;
    }
    return host.publishWidgetOutput(kind, widgetId, data);
}
