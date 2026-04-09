/**
 * Notification Store
 * Provides a centralized store for managing notifications across the application
 */

import type { Notification } from '@stratiqai/types-simple';

// Re-export for convenience
export type { Notification };
export { S_ON_CREATE_NOTIFICATION, Q_LIST_NOTIFICATIONS } from '@stratiqai/types-simple';

class NotificationStore {
	notifications = $state<Notification[]>([]);
	showPanel = $state(false);
	loading = $state(false);

	get unreadCount(): number {
		return this.notifications.length;
	}

	setLoading(value: boolean) {
		this.loading = value;
	}

	addNotification(notification: Notification) {
		if (!this.notifications.some(n => n.id === notification.id)) {
			this.notifications = [notification, ...this.notifications];
		}
	}

	addNotifications(items: Notification[]) {
		const existingIds = new Set(this.notifications.map(n => n.id));
		const newItems = items.filter(n => !existingIds.has(n.id));
		if (newItems.length > 0) {
			this.notifications = [...this.notifications, ...newItems];
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


