/**
 * Topic drag store
 *
 * Holds the currently dragged topic + widgetType during a drag from
 * ValidatedTopicStoreSidebar. getData() is not available in dragover,
 * so we set this in ondragstart and read it in the grid's onDragOver.
 * Cleared in ondragend (sidebar) and onDrop/onDragLeave (Dashboard).
 */

import type { WidgetType } from '$lib/dashboard/types/widget';

export const TOPIC_DROP_MIME = 'application/x-stratiqai-topic';

let current = $state<{ topic: string; widgetType: WidgetType } | null>(null);

export const topicDragStore = {
	get current() {
		return current;
	},
	set(d: { topic: string; widgetType: WidgetType } | null) {
		current = d;
	}
};
