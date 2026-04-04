import { WidgetChannels } from '$lib/dashboard/types/widgetSchemas';
import type { WidgetChannelConfig } from '$lib/dashboard/types/widgetSchemas';

/**
 * Creates a channel configuration for the paragraph widget
 * 
 * @param channelId - The channel ID to use
 * @returns Widget channel definition
 */
export function createParagraphChannel(channelId: string): WidgetChannelConfig<any> {
	if (channelId === 'paragraph-content') {
		return WidgetChannels.paragraphContent;
	}
	
	// Custom channel configuration
	return {
		channelId,
		widgetType: 'paragraph',
		schema: WidgetChannels.paragraphContent.schema,
		description: `Custom paragraph widget channel: ${channelId}`
	};
}

