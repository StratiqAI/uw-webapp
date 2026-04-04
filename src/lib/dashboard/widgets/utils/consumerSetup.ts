import { createWidgetConsumer } from '$lib/dashboard/types/widgetBridge';
import type { WidgetChannelConfig } from '$lib/dashboard/types/widgetSchemas';

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
	console.log(`\n📝 [ParagraphWidget] Initializing widget`);
	console.log(`   Widget ID: ${widgetId}`);
	console.log(`   Channel ID: ${channel.channelId}`);

	// Create a validated consumer using the type-safe bridge system
	const consumer = createWidgetConsumer(channel, widgetId);

	console.log(`📝 [ParagraphWidget:${widgetId}] Consumer created, setting up subscription...`);

	// Subscribe to validated content updates
	// The consumer automatically validates data against the Zod schema
	const unsubscribe = consumer.subscribe((validatedData) => {
		console.log(`\n📝 [ParagraphWidget:${widgetId}] 📥 Subscription callback triggered`);
		if (validatedData) {
			console.log(`   ✅ Received validated data:`, validatedData);
			onDataReceived(validatedData as TData);
			console.log(`   ✅ Widget state updated`);
		} else {
			console.log(`   ⚠️ Received undefined or invalid data`);
			onDataReceived(undefined);
		}
	});

	return { consumer, unsubscribe };
}

