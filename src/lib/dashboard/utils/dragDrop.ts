import type { Widget } from '$lib/dashboard/types/widget';

export interface DragDropHandlers {
	onDragStart: (widget: Widget, grabPoint: { clientX: number; clientY: number }) => void;
	onDragEnd: () => void;
	onDrop: (x: number, y: number) => void;
}

export function createDragHandlers(widget: Widget, handlers: DragDropHandlers) {
	return {
		handleDragStart: (e: DragEvent) => {
			if (!e.dataTransfer) return;

			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('application/json', JSON.stringify(widget));

			const dragImage = e.currentTarget as HTMLElement;
			const rect = dragImage.getBoundingClientRect();
			const offsetX = e.clientX - rect.left;
			const offsetY = e.clientY - rect.top;

			e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);

			handlers.onDragStart(widget, { clientX: e.clientX, clientY: e.clientY });
		},

		handleDragEnd: () => {
			handlers.onDragEnd();
		}
	};
}

export function createDropHandlers(handlers: {
	onDragOver: (e: DragEvent) => void;
	onDrop: (e: DragEvent) => void;
	onDragLeave: (e: DragEvent) => void;
}) {
	return {
		handleDragOver: (e: DragEvent) => {
			e.preventDefault();
			handlers.onDragOver(e);
		},

		handleDrop: (e: DragEvent) => {
			e.preventDefault();
			handlers.onDrop(e);
		},

		handleDragLeave: (e: DragEvent) => {
			handlers.onDragLeave(e);
		}
	};
}
