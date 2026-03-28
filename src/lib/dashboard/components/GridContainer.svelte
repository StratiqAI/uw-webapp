<script lang="ts">
	interface Props {
		columns: number;
		rows: number;
		gap: number;
		minCellHeight?: number;
		containerEl?: HTMLElement;
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
		handleDragOver,
		handleDrop,
		handleDragLeave,
		children
	}: Props = $props();
	
	// Calculate the total height needed for the grid
	const gridHeight = $derived(rows * minCellHeight + (rows - 1) * gap);
</script>

<div
	bind:this={containerEl}
	role="region"
	aria-label="Dashboard grid drop zone"
	class="dashboard-grid relative w-full rounded-lg p-4"
	ondragover={handleDragOver}
	ondrop={handleDrop}
	ondragleave={handleDragLeave}
>
	<div
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

