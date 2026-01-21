/**
 * Widget Publisher Utilities
 * 
 * Helper functions for publishing data to widget topics using ValidatedTopicStore.
 * Uses the topic naming convention: widgets/${type}/${widgetId}
 */

import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
import type { WidgetType } from '$lib/dashboard/types/widget';

/**
 * Create a publisher for a widget topic
 * 
 * @param widgetType - The widget type (e.g., 'title', 'paragraph')
 * @param widgetId - The widget instance ID
 * @param producerId - Unique identifier for the producer (e.g., 'ai-service', 'user-input')
 * @returns Publisher object with publish() and dispose() methods
 * 
 * @example
 * ```typescript
 * const publisher = createWidgetPublisher('title', 'widget-123', 'ai-service');
 * publisher.publish({ title: 'Hello', subtitle: 'World', alignment: 'center' });
 * // ... later
 * publisher.dispose();
 * ```
 */
export function createWidgetPublisher<T = unknown>(
	widgetType: WidgetType,
	widgetId: string,
	producerId: string
) {
	const topic = getWidgetTopic(widgetType, widgetId);

	console.log(`📡 [createWidgetPublisher] Creating publisher for topic: ${topic} (producer: ${producerId})`);

	return {
		publish: (data: T) => {
			const success = validatedTopicStore.publish(topic, data);
			if (success) {
				console.log(`   ✅ Published to ${topic}`);
			} else {
				console.error(`   ❌ Failed to publish to ${topic} - validation failed`);
			}
			return success;
		},
		dispose: () => {
			// ValidatedTopicStore doesn't require explicit disposal
			console.log(`   🗑️ Disposed publisher for ${topic}`);
		}
	};
}

/**
 * Get the current value at a widget topic
 * 
 * @param widgetType - The widget type
 * @param widgetId - The widget instance ID
 * @returns Current value at the topic or undefined
 * 
 * @example
 * ```typescript
 * const data = getWidgetData('title', 'widget-123');
 * console.log('Widget data:', data);
 * ```
 */
export function getWidgetData<T = unknown>(widgetType: WidgetType, widgetId: string): T | undefined {
	const topic = getWidgetTopic(widgetType, widgetId);
	return validatedTopicStore.at<T>(topic);
}

/**
 * Subscribe to a widget topic
 * 
 * @param widgetType - The widget type
 * @param widgetId - The widget instance ID
 * @param callback - Callback function called when data changes
 * @returns Unsubscribe function
 * 
 * @example
 * ```typescript
 * const unsubscribe = subscribeToWidget('title', 'widget-123', (data) => {
 *   console.log('Widget data updated:', data);
 * });
 * // ... later
 * unsubscribe();
 * ```
 */
export function subscribeToWidget<T = unknown>(
	widgetType: WidgetType,
	widgetId: string,
	callback: (data: T | undefined) => void
): () => void {
	const topic = getWidgetTopic(widgetType, widgetId);
	return validatedTopicStore.subscribe(topic, callback as (value: unknown) => void);
}
