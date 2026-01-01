/**
 * Notification Store
 * Provides a centralized store for managing notifications across the application
 */

// Notification type
export type Notification = {
	id: string;
	entityType: string;
	tenantId: string;
	ownerId: string;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
	parentId: string;
	message: string;
	properties?: any;
};

// Notification subscription query
export const S_ON_CREATE_NOTIFICATION = `
	subscription OnCreateNotification($parentId: ID) {
		onCreateNotification(parentId: $parentId) {
			id
			entityType
			tenantId
			ownerId
			createdAt
			updatedAt
			deletedAt
			parentId
			message
			properties
		}
	}
`;

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


