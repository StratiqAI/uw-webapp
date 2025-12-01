/**
 * Widget Publisher Utilities
 * 
 * Helper functions for publishing data to widget topics using the new MapStore API.
 * Uses the topic naming convention: widget:${type}:${widgetId}
 */

import { mapStore } from '$lib/stores/MapStore';
import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
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
	const schemaId = getWidgetSchemaId(widgetType);

	// Enforce schema on the topic
	mapStore.enforceTopicSchema(topic, schemaId);

	// Get publisher from MapStore
	const publisher = mapStore.getPublisher(topic, producerId);

	return {
		publish: (data: T) => {
			publisher.publish(data);
		},
		dispose: () => {
			publisher.dispose();
		}
	};
}

/**
 * Get a stream for a widget topic
 * 
 * @param widgetType - The widget type
 * @param widgetId - The widget instance ID
 * @returns Readable stream for the widget topic
 * 
 * @example
 * ```typescript
 * const stream = getWidgetStream('title', 'widget-123');
 * stream.subscribe((data) => {
 *   console.log('Widget data updated:', data);
 * });
 * ```
 */
export function getWidgetStream<T = unknown>(widgetType: WidgetType, widgetId: string) {
	const topic = getWidgetTopic(widgetType, widgetId);
	return mapStore.getStream(topic) as any;
}

