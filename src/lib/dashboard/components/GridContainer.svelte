<script lang="ts">
	import { setContext } from 'svelte';
	import {
		GRID_CONTAINER_CONTEXT_KEY,
		type DashboardGridContainerContext
	} from '$lib/dashboard/context/dashboardGridContext';

	interface Props {
		columns: number;
		rows: number;
		gap: number;
		minCellHeight?: number;
		/** Inner element with `display: grid` — used for cell geometry and resize math. */
		containerEl?: HTMLElement;
		/** Outer padded drop zone — use for hit-testing whether a pointer is still inside the dashboard grid region. */
		dropZoneEl?: HTMLElement;
		handleDragOver: (e: DragEvent) => void;
		handleDrop: (e: DragEvent) => void;
		handleDragLeave: (e: DragEvent) => void;
		children?: any;
	}

	let {
		columns,
		rows,
		gap,
		minCellHeight = 100,
		containerEl = $bindable(),
		dropZoneEl = $bindable(),
		handleDragOver,
		handleDrop,
		handleDragLeave,
		children
	}: Props = $props();

	setContext<DashboardGridContainerContext>(GRID_CONTAINER_CONTEXT_KEY, {
		get el() {
			return containerEl;
		}
	});

	// Calculate the total height needed for the grid
	const gridHeight = $derived(rows * minCellHeight + (rows - 1) * gap);
</script>

<div
	bind:this={dropZoneEl}
	role="region"
	aria-label="Dashboard grid drop zone"
	class="dashboard-grid relative w-full rounded-lg p-4"
	ondragover={handleDragOver}
	ondrop={handleDrop}
	ondragleave={handleDragLeave}
>
	<div
		bind:this={containerEl}
		class="relative grid"
		style="
        grid-template-columns: repeat({columns}, 1fr);
        grid-template-rows: repeat({rows}, {minCellHeight}px);
        gap: {gap}px;
        min-height: {gridHeight}px;
      "
	>
		{@render children?.()}
	</div>
</div>
<style>
	.dashboard-grid {
		/* No fixed height - grows dynamically with grid content */
	}
</style>

