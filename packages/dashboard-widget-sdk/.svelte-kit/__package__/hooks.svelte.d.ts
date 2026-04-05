/**
 * Reactive hook that subscribes to a ValidatedTopicStore topic via the host context.
 * Re-reads whenever the topic function returns a new value or the store tree changes.
 *
 * Portable replacement for the app-internal `useReactiveValidatedTopic` hook.
 *
 * @param topic - A function returning the current topic path (reactive to changes)
 * @returns An object with a reactive `current` getter
 */
export declare function useReactiveValidatedTopic<T = unknown>(topic: () => string): {
    readonly current: T | undefined;
};
/**
 * Publish validated data to a widget's output topic via the host context.
 * Returns false if the host does not support output publishing or the
 * widget kind has no registered output schema.
 */
export declare function publishWidgetOutput(kind: string, widgetId: string, data: unknown): boolean;
