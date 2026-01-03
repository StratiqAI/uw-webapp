/**
 * Notification Store
 * Provides a centralized store for managing notifications across the application
 */

import type { Notification } from '@stratiqai/types-simple';
import { S_ON_CREATE_NOTIFICATION } from '@stratiqai/types-simple';

// Re-export for convenience
export type { Notification };
export { S_ON_CREATE_NOTIFICATION };

class NotificationStore {
	notifications = $state<Notification[]>([]);
	showPanel = $state(false);

	get unreadCount(): number {
		return this.notifications.length;
	}

	addNotification(notification: Notification) {
		// Check if notification already exists (avoid duplicates)
		if (!this.notifications.some(n => n.id === notification.id)) {
			// Add to the beginning (most recent first)
			this.notifications = [notification, ...this.notifications];
		}
	}

	clearAll() {
		this.notifications = [];
	}

	removeNotification(id: string) {
		this.notifications = this.notifications.filter(n => n.id !== id);
	}

	togglePanel() {
		this.showPanel = !this.showPanel;
	}

	setPanel(open: boolean) {
		this.showPanel = open;
	}
}

export const notificationStore = new NotificationStore();


