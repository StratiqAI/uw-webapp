/**
 * Toast Store – in-app notifications (success, error, info).
 * Use instead of window.alert() for non-blocking messages.
 */

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	message: string;
	variant: ToastVariant;
	createdAt: number;
}

const AUTO_DISMISS_MS = 4500;

function generateId(): string {
	return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

class ToastStore {
	toasts = $state<Toast[]>([]);

	add(message: string, variant: ToastVariant = 'info'): string {
		const id = generateId();
		const toast: Toast = { id, message, variant, createdAt: Date.now() };
		this.toasts = [...this.toasts, toast];

		setTimeout(() => {
			this.remove(id);
		}, AUTO_DISMISS_MS);

		return id;
	}

	success(message: string): string {
		return this.add(message, 'success');
	}

	error(message: string): string {
		return this.add(message, 'error');
	}

	info(message: string): string {
		return this.add(message, 'info');
	}

	remove(id: string): void {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	clear(): void {
		this.toasts = [];
	}
}

export const toastStore = new ToastStore();
