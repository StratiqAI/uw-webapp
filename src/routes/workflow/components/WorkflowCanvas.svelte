<script lang="ts">
	import type { GridElement, Connection, ConnectionPoint, ConnectionSide } from '../types';
	import WorkflowNode from './WorkflowNode.svelte';
	import WorkflowConnection from './WorkflowConnection.svelte';
	import WorkflowConnectionPreview from './WorkflowConnectionPreview.svelte';

	const {
		gridElements = [],
		connections = [],
		zoomLevel = 1,
		panX = 0,
		panY = 0,
		darkMode = false,
		connectingFrom = null,
		draggedGridElement = null,
		currentMousePos = { x: 0, y: 0 },
		isPanning = false,
		onPanStart,
		onGridClick,
		onWheel,
		onNodeDelete,
		onNodeDragStart,
		onNodeDoubleClick,
		onConnectionPointClick,
		onConnectionDelete
	}: {
		gridElements?: GridElement[];
		connections?: Connection[];
		zoomLevel?: number;
		panX?: number;
		panY?: number;
		darkMode?: boolean;
		connectingFrom?: ConnectionPoint | null;
		draggedGridElement?: GridElement | null;
		currentMousePos?: { x: number; y: number };
		isPanning?: boolean;
		onPanStart?: (event: MouseEvent) => void;
		onGridClick?: () => void;
		onWheel?: (event: WheelEvent) => void;
		onNodeDelete?: (id: string, event: MouseEvent) => void;
		onNodeDragStart?: (element: GridElement, event: MouseEvent) => void;
		onNodeDoubleClick?: (element: GridElement, event: MouseEvent) => void;
		onConnectionPointClick?: (elementId: string, side: ConnectionSide, event: MouseEvent) => void;
		onConnectionDelete?: (connectionId: string) => void;
	} = $props();

	let gridContainer: HTMLDivElement | null = null;
	let svgContainer: SVGSVGElement | null = null;

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		if (onWheel) {
			onWheel(event);
		}
	}

	function handlePanStart(event: MouseEvent) {
		if (onPanStart) {
			onPanStart(event);
		}
	}

	function handleGridClick() {
		if (onGridClick) {
			onGridClick();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && onGridClick) {
			onGridClick();
		}
	}

	// Helper to find element by ID
	function findElement(id: string): GridElement | undefined {
		return gridElements.find((el) => el.id === id);
	}

	// Calculate mouse position for connection preview
	const mousePos = $derived(
		connectingFrom && gridContainer
			? (() => {
					const gridRect = gridContainer.getBoundingClientRect();
					return {
						mouseX: (currentMousePos.x - gridRect.left - panX) / zoomLevel,
						mouseY: (currentMousePos.y - gridRect.top - panY) / zoomLevel
					};
				})()
			: null
	);
</script>

<div
	bind:this={gridContainer}
	class="flex-1 relative {darkMode ? 'bg-slate-900' : 'bg-slate-50'} overflow-hidden {isPanning ? 'cursor-grabbing' : 'cursor-default'}"
	style="background-image: linear-gradient(to right, {darkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px), linear-gradient(to bottom, {darkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px); background-size: {20 * zoomLevel}px {20 * zoomLevel}px; background-position: {panX}px {panY}px;"
	onmousedown={handlePanStart}
	onclick={handleGridClick}
	onkeydown={handleKeydown}
	onwheel={handleWheel}
	role="button"
	tabindex="0"
>
	<!-- Zoomed Container -->
	<div
		class="absolute inset-0 origin-top-left"
		style="transform: translate({panX}px, {panY}px) scale({zoomLevel}); transform-origin: 0 0; width: 100%; height: 100%;"
	>
		<!-- SVG for connections -->
		<svg bind:this={svgContainer} class="absolute inset-0 w-full h-full pointer-events-none">
			<defs>
				<marker
					id="arrowhead"
					markerWidth="10"
					markerHeight="10"
					refX="9"
					refY="3"
					orient="auto"
					markerUnits="userSpaceOnUse"
				>
					<polygon points="0 0, 10 3, 0 6" fill={darkMode ? '#cbd5e1' : '#475569'} />
				</marker>
			</defs>

			<!-- Existing connections -->
			{#each connections as connection}
				{@const fromElement = findElement(connection.from)}
				{@const toElement = findElement(connection.to)}
				{#if fromElement && toElement}
					<WorkflowConnection
						{connection}
						{fromElement}
						{toElement}
						{darkMode}
						isDragging={draggedGridElement ? (draggedGridElement.id === connection.from || draggedGridElement.id === connection.to) : false}
						{onDelete}={onConnectionDelete}
					/>
				{/if}
			{/each}

			<!-- Temporary connection preview -->
			{#if connectingFrom && mousePos}
				{@const fromElement = findElement(connectingFrom.elementId)}
				{#if fromElement}
					<WorkflowConnectionPreview
						{connectingFrom}
						{fromElement}
						mouseX={mousePos.mouseX}
						mouseY={mousePos.mouseY}
						{darkMode}
					/>
				{/if}
			{/if}
		</svg>

		<!-- Grid Elements -->
		{#each gridElements as element (element.id)}
			<WorkflowNode
				{element}
				{darkMode}
				isDragged={draggedGridElement?.id === element.id}
				{onDelete}={onNodeDelete}
				{onDragStart}={onNodeDragStart}
				{onDoubleClick}={onNodeDoubleClick}
				{onConnectionPointClick}={onConnectionPointClick}
			/>
		{/each}
	</div>

	<!-- Instructions overlay (outside zoom container for fixed positioning) -->
	{#if gridElements.length === 0}
		<div
			class="absolute inset-0 flex items-center justify-center pointer-events-none {darkMode ? 'text-slate-400' : 'text-slate-400'}"
		>
			<div class="text-center max-w-md">
				<div class="mb-6">
					<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
					</svg>
				</div>
				<div class="text-lg font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">Build Your Workflow</div>
				<div class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Drag elements from the sidebar to begin creating your workflow</div>
				<div class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'} mt-4">Click connection points to link elements together</div>
			</div>
		</div>
	{/if}
</div>
