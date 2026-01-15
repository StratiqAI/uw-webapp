<script lang="ts">
	import type { GridElement, Connection, ConnectionPoint, ConnectionSide } from '../types';
	import { getElementBorderColor, getElementColor } from '../utils/nodeStyling';
	import WorkflowNode from './WorkflowNode.svelte';
	import WorkflowConnection from './WorkflowConnection.svelte';
	import WorkflowConnectionPreview from './WorkflowConnectionPreview.svelte';

	let {
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
		editingComment = null,
		commentText = $bindable(''),
		commentTextareaRef = $bindable(null),
		gridContainer = $bindable(null),
		svgContainer = $bindable(null),
		onPanStart,
		onGridClick,
		onWheel,
		onNodeDelete,
		onNodeDragStart,
		onNodeDoubleClick,
		onConnectionPointClick,
		onConnectionDelete,
		onCommentSave,
		onCommentCancel,
		onCommentResizeStart
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
		editingComment?: GridElement | null;
		commentText?: string;
		commentTextareaRef?: HTMLTextAreaElement | null;
		gridContainer?: HTMLDivElement | null;
		svgContainer?: SVGSVGElement | null;
		onPanStart?: (event: MouseEvent) => void;
		onGridClick?: () => void;
		onWheel?: (event: WheelEvent) => void;
		onNodeDelete?: (id: string, event: MouseEvent) => void;
		onNodeDragStart?: (element: GridElement, event: MouseEvent) => void;
		onNodeDoubleClick?: (element: GridElement, event: MouseEvent) => void;
		onConnectionPointClick?: (elementId: string, side: ConnectionSide, event: MouseEvent) => void;
		onConnectionDelete?: (connectionId: string) => void;
		onCommentSave?: () => void;
		onCommentCancel?: () => void;
		onCommentResizeStart?: (element: GridElement, event: MouseEvent) => void;
	} = $props();

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
						onDelete={onConnectionDelete}
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
			{#if element.type.type === 'comment'}
				<div
					class="absolute overflow-visible {getElementColor(
						element.type.type,
						darkMode
					)} rounded-lg {darkMode ? 'shadow-lg shadow-black/30' : 'shadow-md'} cursor-move border-2 {getElementBorderColor(
						element.type.type,
						darkMode
					)} {draggedGridElement?.id === element.id ? '' : 'hover:shadow-lg transition-all'} border-dashed"
					style="left: {element.x}px; top: {element.y}px; width: {element.width}px; min-height: {element.height}px; {draggedGridElement?.id === element.id ? 'transition: none;' : ''}"
					onmousedown={(e) => { onNodeDragStart?.(element, e); e.stopPropagation(); }}
					ondblclick={(e) => onNodeDoubleClick?.(element, e)}
					role="button"
					tabindex="0"
				>
					<div class="relative w-full h-full p-3 group">
						<button
							class="absolute -top-2 -right-2 w-5 h-5 {darkMode ? 'bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white' : 'bg-slate-200 hover:bg-red-500 text-slate-600 hover:text-white'} rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm opacity-0 group-hover:opacity-100 z-30"
							onclick={(e) => onNodeDelete?.(element.id, e)}
							aria-label="Delete comment"
							title="Delete comment"
						>
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>

						<div
							class="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-30"
							onmousedown={(e) => onCommentResizeStart?.(element, e)}
							title="Resize comment"
							role="button"
							tabindex="0"
							aria-label="Resize comment"
						>
							<svg class="w-full h-full {darkMode ? 'text-amber-400' : 'text-amber-600'}" fill="currentColor" viewBox="0 0 24 24">
								<path d="M22 22H20V20H22V22Z" />
								<path d="M22 18H20V16H22V18Z" />
								<path d="M18 22H16V20H18V22Z" />
								<path d="M18 18H16V16H18V18Z" />
								<path d="M14 22H12V20H14V22Z" />
								<path d="M22 14H20V12H22V14Z" />
							</svg>
						</div>

						{#if editingComment?.id === element.id}
							<textarea
								bind:value={commentText}
								bind:this={commentTextareaRef}
								class="w-full h-full min-h-[80px] p-2 {darkMode ? 'bg-slate-800 text-slate-100 border-slate-600' : 'bg-white text-slate-900 border-slate-300'} border rounded resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
								placeholder="Enter your comment..."
								onkeydown={(e) => {
									if (e.key === 'Escape') {
										onCommentCancel?.();
									} else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
										onCommentSave?.();
									}
								}}
								onclick={(e) => e.stopPropagation()}
							></textarea>
							<div class="mt-2 flex items-center justify-end gap-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
								<span>Ctrl+Enter to save, Esc to cancel</span>
							</div>
						{:else}
							<div class="text-sm {darkMode ? 'text-slate-200' : 'text-slate-700'} whitespace-pre-wrap break-words">
								{element.commentText || 'Double-click to edit'}
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<WorkflowNode
					{element}
					{darkMode}
					isDragged={draggedGridElement?.id === element.id}
					onDelete={onNodeDelete}
					onDragStart={onNodeDragStart}
					onDoubleClick={onNodeDoubleClick}
					onConnectionPointClick={onConnectionPointClick}
				/>
			{/if}
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
