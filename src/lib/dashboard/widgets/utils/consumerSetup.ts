import { createWidgetConsumer } from '$lib/dashboard/types/widgetBridge';
import type { WidgetChannelConfig } from '$lib/dashboard/types/widgetSchemas';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('widgets');

/**
 * Sets up a consumer for a widget with automatic subscription
 * 
 * @param channel - The channel definition to consume from
 * @param widgetId - Unique identifier for this widget instance
 * @param onDataReceived - Callback function when validated data is received
 * @returns The consumer instance and unsubscribe function
 */
export function setupConsumer<TData>(
	channel: WidgetChannelConfig<any>,
	widgetId: string,
	onDataReceived: (data: TData | undefined) => void
) {
	log.debug('Initializing widget consumer', { widgetId, channelId: channel.channelId });

	const consumer = createWidgetConsumer(channel, widgetId);

	log.debug(`Consumer created, subscribing: ${widgetId}`);

	// Subscribe to validated content updates
	// The consumer automatically validates data against the Zod schema
	const unsubscribe = consumer.subscribe((validatedData) => {
		if (validatedData) {
			log.debug(`Subscription data for ${widgetId}`, validatedData);
			onDataReceived(validatedData as TData);
		} else {
			log.debug(`No data for ${widgetId}`);
			onDataReceived(undefined);
		}
	});

	return { consumer, unsubscribe };
}

