<script lang="ts">
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import GridContainer from '$lib/dashboard/components/GridContainer.svelte';
	import WidgetWrapper from '$lib/dashboard/components/WidgetWrapper.svelte';
	import GhostIndicator from '$lib/dashboard/components/GhostIndicator.svelte';
	import { getGridPositionFromCoordinates } from '$lib/dashboard/utils/grid';
	import { createDropHandlers } from '$lib/dashboard/utils/drag-drop';
	import type { Widget } from '$lib/dashboard/types/widget';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let containerEl = $state<HTMLElement>();

	const dropHandlers = createDropHandlers({
		onDragOver: (x: number, y: number) => {
			if (!containerEl || !dashboard.dragState.isDragging) return;

			const rect = containerEl.getBoundingClientRect();
			const position = getGridPositionFromCoordinates(
				x,
				y,
				rect,
				dashboard.config.gridColumns,
				dashboard.config.gridRows,
				dashboard.config.gap,
				dashboard.config.minCellHeight
			);
			console.log('position', position);
			if (dashboard.activeWidget) {
				const canPlace = dashboard.canPlaceWidget(
					{
						...dashboard.activeWidget,
						...position
					},
					dashboard.activeWidget.id
				);

				if (canPlace) {
					dashboard.setDragState({ ghostPosition: position });
				} else {
					dashboard.setDragState({ ghostPosition: null });
				}
			}
		},

		onDrop: (x: number, y: number) => {
			const position = dashboard.dragState.ghostPosition;
			if (position && dashboard.dragState.activeWidgetId) {
				dashboard.moveWidget(dashboard.dragState.activeWidgetId, position);
			}
			dashboard.resetInteractionStates();
		},

		onDragLeave: () => {
			dashboard.setDragState({ ghostPosition: null });
		}
	});

	function handleWidgetDragStart(widget: Widget) {
		dashboard.setDragState({
			isDragging: true,
			activeWidgetId: widget.id
		});
	}

	function handleWidgetDragEnd() {
		dashboard.resetInteractionStates();
	}
</script>

<GridContainer
	bind:containerEl
	columns={dashboard.config.gridColumns}
	rows={dashboard.config.gridRows}
	gap={dashboard.config.gap}
	minCellHeight={dashboard.config.minCellHeight}
	{...dropHandlers}
>
	{#each dashboard.widgets as widget (widget.id)}
		<WidgetWrapper {widget} {darkMode} onDragStart={handleWidgetDragStart} onDragEnd={handleWidgetDragEnd} />
	{/each}

	{#if dashboard.dragState.isDragging && dashboard.dragState.ghostPosition}
		<GhostIndicator
			position={dashboard.dragState.ghostPosition}
			size={{
				colSpan: dashboard.activeWidget?.colSpan || 1,
				rowSpan: dashboard.activeWidget?.rowSpan || 1
			}}
		/>
	{/if}
</GridContainer>
