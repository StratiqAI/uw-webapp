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
 * Publish validated data to a widget's output topic via the host context.
 * Returns false if the host does not support output publishing or the
 * widget kind has no registered output schema.
 */
export function publishWidgetOutput(kind: string, widgetId: string, data: unknown): boolean {
	const host = getDashboardWidgetHost();
	if (!host.publishWidgetOutput) {
		console.warn(`publishWidgetOutput not available on host — ${kind}/${widgetId} publish skipped`);
		return false;
	}
	return host.publishWidgetOutput(kind, widgetId, data);
}

// ---------------------------------------------------------------------------
// AI generation status — convention-based topic for widget loading indicators
// ---------------------------------------------------------------------------

export interface AiGenerationStatus {
	generating: boolean;
	error?: string;
}

const AI_STATUS_SUFFIX = '/__ai_status';

/** Build the topic path used to track AI generation state for a widget. */
export function getAiStatusTopic(widgetTopic: string): string {
	return widgetTopic + AI_STATUS_SUFFIX;
}

/**
 * Reactive hook that tracks the AI generation status for a widget.
 * Returns `{ generating, error }` — both reactive.
 */
export function useAiGenerationStatus(topic: () => string) {
	const host = getDashboardWidgetHost();
	const store = host.validatedTopicStore;

	const status = $derived.by(() => {
		const _ = store.tree;
		return store.at<AiGenerationStatus>(getAiStatusTopic(topic()));
	});

	return {
		get generating() { return status?.generating ?? false; },
		get error() { return status?.error; }
	};
}
