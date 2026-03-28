<script lang="ts">
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { themeStore } from '$lib/stores/themeStore.svelte';

	interface Props {
		widgetId: string;
	}

	let { widgetId }: Props = $props();

	/** Rail fill + stronger tint when pointer is anywhere in the grab zone (group/rail). */
	const railBarClass = $derived.by(() => {
		switch (themeStore.theme) {
			case 'dark':
				return 'bg-white/15 group-hover/rail:bg-white/28';
			case 'warm':
				return 'bg-[#4a3629]/22 group-hover/rail:bg-[#4a3629]/40';
			default:
				return 'bg-slate-500/22 group-hover/rail:bg-slate-600/38';
		}
	});

	const cornerBlockClass = $derived.by(() => {
		switch (themeStore.theme) {
			case 'dark':
				return 'bg-white/22 group-hover/corner:bg-white/40';
			case 'warm':
				return 'bg-[#5c4436]/30 group-hover/corner:bg-[#4a3629]/50';
			default:
				return 'bg-slate-500/28 group-hover/corner:bg-slate-600/46';
		}
	});

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
	class="resize-handles opacity-0 transition-opacity duration-200 group-hover:opacity-100"
>
	<button
		type="button"
		class="resize-handle resize-right group/rail absolute right-0 top-2 flex h-[calc(100%-16px)] w-4 cursor-ew-resize items-stretch justify-end pr-0.5"
		onmousedown={(e) => startResize(e, 'right')}
		aria-label="Resize width"
	>
		<span
			class="h-full w-1.5 shrink-0 rounded-full transition-colors {railBarClass}"
			aria-hidden="true"
		></span>
		<span class="sr-only">Resize width</span>
	</button>
	<button
		type="button"
		class="resize-handle resize-bottom group/rail absolute bottom-0 left-2 flex h-4 w-[calc(100%-16px)] cursor-ns-resize items-start justify-stretch pt-0.5"
		onmousedown={(e) => startResize(e, 'bottom')}
		aria-label="Resize height"
	>
		<span
			class="h-1.5 w-full shrink-0 rounded-full transition-colors {railBarClass}"
			aria-hidden="true"
		></span>
		<span class="sr-only">Resize height</span>
	</button>
	<button
		type="button"
		class="resize-handle resize-corner group/corner absolute bottom-0 right-0 cursor-nwse-resize p-2 -m-2"
		onmousedown={(e) => startResize(e, 'corner')}
		aria-label="Resize both dimensions"
	>
		<span
			class="block h-3.5 w-3.5 rounded-tl-md transition-colors {cornerBlockClass}"
			aria-hidden="true"
		></span>
		<span class="sr-only">Resize both dimensions</span>
	</button>
</div>
