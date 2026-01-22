<script lang="ts">
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';

	interface Props {
		widgetId: string;
	}

	let { widgetId }: Props = $props();

	function startResize(event: MouseEvent, handle: 'right' | 'bottom' | 'corner') {
		event.preventDefault();
		event.stopPropagation();

		const widget = dashboard.widgets.find((w) => w.id === widgetId);
		if (!widget) return;

		dashboard.setResizeState({
			isResizing: true,
			activeWidgetId: widgetId,
			resizeHandle: handle
		});

		const startX = event.clientX;
		const startY = event.clientY;
		const startColSpan = widget.colSpan;
		const startRowSpan = widget.rowSpan;

		function handleMouseMove(e: MouseEvent) {
			const deltaX = e.clientX - startX;
			const deltaY = e.clientY - startY;

			const container = document.querySelector('.dashboard-grid');
			if (!container) return;

			const rect = container.getBoundingClientRect();
			const cellWidth = rect.width / dashboard.config.gridColumns;
			const cellHeight = rect.height / dashboard.config.gridRows;

			let newColSpan = startColSpan;
			let newRowSpan = startRowSpan;

			if (handle === 'right' || handle === 'corner') {
				newColSpan = Math.max(1, startColSpan + Math.round(deltaX / cellWidth));
			}

			if (handle === 'bottom' || handle === 'corner') {
				newRowSpan = Math.max(1, startRowSpan + Math.round(deltaY / cellHeight));
			}

			dashboard.resizeWidget(widgetId, newColSpan, newRowSpan);
		}

		function handleMouseUp() {
			dashboard.resetInteractionStates();
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}
</script>

<div
	class="resize-handles opacity-0 transition-opacity group-hover:opacity-100"
>
	<button
		class="resize-handle resize-right absolute right-0 top-2 h-[calc(100%-16px)] w-1 cursor-ew-resize rounded-full bg-blue-500 hover:bg-blue-600"
		onmousedown={(e) => startResize(e, 'right')}
		aria-label="Resize width"
	>
		<span class="sr-only">Resize width</span>
	</button>
	<button
		class="resize-handle resize-bottom absolute bottom-0 left-2 h-1 w-[calc(100%-16px)] cursor-ns-resize rounded-full bg-blue-500 hover:bg-blue-600"
		onmousedown={(e) => startResize(e, 'bottom')}
		aria-label="Resize height"
	>
		<span class="sr-only">Resize height</span>
	</button>
	<button
		class="resize-handle resize-corner absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize rounded-tl-full bg-blue-500 hover:bg-blue-600"
		onmousedown={(e) => startResize(e, 'corner')}
		aria-label="Resize both dimensions"
	>
		<span class="sr-only">Resize both dimensions</span>
	</button>
</div>
