<script lang="ts">
	import type { GridElement, Connection, ConnectionPoint, ConnectionSide, ElementType } from '../../types';
	import { getElementBorderColor, getElementColor } from '../../utils/nodeStyling';
	import WorkflowNode from './WorkflowNode.svelte';
	import WorkflowConnection from './WorkflowConnection.svelte';
	import WorkflowConnectionPreview from './WorkflowConnectionPreview.svelte';

	let {
		gridElements = $bindable([]),
		connections = $bindable([]),
		zoomLevel = $bindable(1),
		panX = $bindable(0),
		panY = $bindable(0),
		darkMode = false,
		draggedElementType = $bindable(null),
		dragOffset = $bindable({ x: 0, y: 0 }),
		gridContainer = $bindable(null),
		svgContainer = $bindable(null),
		onNodeDelete,
		onNodeDoubleClick,
		onExecuteWorkflow,
		nodeExecutionStatus = {},
		workflowExecutionOutput = null,
		labelsVisible = true,
		onClearExecution,
		onShowLabels,
		canShowLabels = false,
		generateId
	}: {
		gridElements?: GridElement[];
		connections?: Connection[];
		zoomLevel?: number;
		panX?: number;
		panY?: number;
		darkMode?: boolean;
		draggedElementType?: ElementType | null;
		dragOffset?: { x: number; y: number };
		gridContainer?: HTMLDivElement | null;
		svgContainer?: SVGSVGElement | null;
		onNodeDelete?: (id: string, event: MouseEvent) => void;
		onNodeDoubleClick?: (element: GridElement, event: MouseEvent) => void;
		onExecuteWorkflow?: () => void;
		/** Map nodeId -> WORKFLOW_NODE_EXECUTION status (RUNNING, COMPLETED, FAILED, CANCELLED) */
		nodeExecutionStatus?: Record<string, string>;
		/** Workflow execution outputData to display next to workflow-output node */
		workflowExecutionOutput?: any;
		/** When false, status badges and Start labels are hidden (Hide Labels pressed) */
		labelsVisible?: boolean;
		onClearExecution?: () => void;
		onShowLabels?: () => void;
		/** When true, Show Labels button is available (e.g. an execution is selected but labels were hidden) */
		canShowLabels?: boolean;
		generateId: () => string;
	} = $props();

	let connectingFrom = $state<ConnectionPoint | null>(null);
	let draggedGridElement = $state<GridElement | null>(null);
	let currentMousePos = $state({ x: 0, y: 0 });
	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0 });
	let resizingElement = $state<GridElement | null>(null);
	let resizeStart = $state({ x: 0, y: 0, width: 0, height: 0 });
	let editingComment = $state<GridElement | null>(null);
	let commentText = $state('');
	let commentTextareaRef = $state<HTMLTextAreaElement | null>(null);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			connectingFrom = null;
		}
	}

	function handleGridClick() {
		connectingFrom = null;
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.1 : 0.1;
		const newZoom = Math.max(0.5, Math.min(2, zoomLevel + delta));

		if (gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const mouseY = event.clientY - rect.top;
			const zoomPointX = (mouseX - panX) / zoomLevel;
			const zoomPointY = (mouseY - panY) / zoomLevel;

			zoomLevel = newZoom;
			panX = mouseX - zoomPointX * zoomLevel;
			panY = mouseY - zoomPointY * zoomLevel;
		}
	}

	function startPanning(event: MouseEvent) {
		if (draggedElementType || draggedGridElement || connectingFrom || resizingElement) {
			return;
		}

		const target = event.target as HTMLElement;
		if (
			target.closest('.absolute[style*="left"]') ||
			target.classList.contains('connection-point') ||
			target.closest('.connection-point')
		) {
			return;
		}

		isPanning = true;
		panStart = { x: event.clientX, y: event.clientY };
		event.preventDefault();
		event.stopPropagation();
	}

	function startDragOnGrid(element: GridElement, event: MouseEvent) {
		if ((event.target as HTMLElement).classList.contains('connection-point')) {
			return;
		}
		if ((event.target as HTMLElement).classList.contains('resize-handle')) {
			return;
		}
		draggedGridElement = element;
		if (gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			const elementScreenX = element.x * zoomLevel + panX;
			const elementScreenY = element.y * zoomLevel + panY;
			dragOffset = {
				x: (event.clientX - rect.left - elementScreenX) / zoomLevel,
				y: (event.clientY - rect.top - elementScreenY) / zoomLevel
			};
		}
		event.stopPropagation();
	}

	function startResize(element: GridElement, event: MouseEvent) {
		event.stopPropagation();
		if (element.type.type !== 'comment') return;

		resizingElement = element;
		if (gridContainer) {
			resizeStart = {
				x: event.clientX,
				y: event.clientY,
				width: element.width,
				height: element.height
			};
		}
	}

	function handleMouseMove(event: MouseEvent) {
		currentMousePos = { x: event.clientX, y: event.clientY };

		if (isPanning && gridContainer) {
			const deltaX = event.clientX - panStart.x;
			const deltaY = event.clientY - panStart.y;
			panX += deltaX;
			panY += deltaY;
			panStart = { x: event.clientX, y: event.clientY };
		} else if (resizingElement && gridContainer) {
			const deltaX = (event.clientX - resizeStart.x) / zoomLevel;
			const deltaY = (event.clientY - resizeStart.y) / zoomLevel;
			const newWidth = Math.max(150, resizeStart.width + deltaX);
			const newHeight = Math.max(80, resizeStart.height + deltaY);
			resizingElement.width = newWidth;
			resizingElement.height = newHeight;
		} else if (draggedGridElement && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			draggedGridElement.x = (event.clientX - rect.left - panX) / zoomLevel - dragOffset.x;
			draggedGridElement.y = (event.clientY - rect.top - panY) / zoomLevel - dragOffset.y;
		}
	}

	function handleMouseUp(event: MouseEvent) {
		isPanning = false;
		resizingElement = null;

		if (draggedElementType && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			const x = (event.clientX - rect.left - panX) / zoomLevel - dragOffset.x;
			const y = (event.clientY - rect.top - panY) / zoomLevel - dragOffset.y;

			// Enforce only one Workflow Output node
			if (draggedElementType.id === 'workflow-output') {
				const existingWorkflowOutput = gridElements.find((el) => el.type.id === 'workflow-output');
				if (existingWorkflowOutput) {
					// Don't add another one - could show a message here
					draggedElementType = null;
					return;
				}
			}

			const maxX = (rect.width - panX) / zoomLevel - 100;
			const maxY = (rect.height - panY) / zoomLevel - 80;
			if (x > -panX / zoomLevel && y > -panY / zoomLevel && x < maxX && y < maxY) {
				const newElement: GridElement = {
					id: generateId(),
					type: draggedElementType,
					x,
					y,
					width: 120,
					height: 80,
					...(draggedElementType.type === 'ai' && draggedElementType.defaultAIQueryData
						? { aiQueryData: draggedElementType.defaultAIQueryData }
						: {})
				};
				gridElements = [...gridElements, newElement];
			}
		}

		draggedElementType = null;
		draggedGridElement = null;
	}

	function handleConnectionPointClick(
		elementId: string,
		side: ConnectionSide,
		event: MouseEvent
	) {
		event.stopPropagation();
		const element = gridElements.find((el) => el.id === elementId);
		if (!element) return;

		// Workflow Output node cannot have outgoing connections (it's the final sink)
		if (element.type.id === 'workflow-output' && side === 'right') {
			return;
		}

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const gridRect = gridContainer?.getBoundingClientRect();
		if (!gridRect) return;

		const point: ConnectionPoint = {
			x: (rect.left + rect.width / 2 - gridRect.left - panX) / zoomLevel,
			y: (rect.top + rect.height / 2 - gridRect.top - panY) / zoomLevel,
			elementId,
			side
		};

		if (!connectingFrom) {
			if (side !== 'right') {
				return;
			}
			connectingFrom = point;
		} else {
			if (side !== 'left') {
				connectingFrom = null;
				return;
			}
			if (connectingFrom.elementId !== elementId && connectingFrom.side === 'right') {
				const newConnection: Connection = {
					id: generateId(),
					from: connectingFrom.elementId,
					to: elementId,
					fromSide: connectingFrom.side,
					toSide: side
				};
				connections = [...connections, newConnection];
			}
			connectingFrom = null;
		}
	}

	function deleteConnection(connectionId: string) {
		connections = connections.filter((conn) => conn.id !== connectionId);
	}

	function saveComment() {
		if (editingComment) {
			editingComment.commentText = commentText;
			editingComment = null;
			commentText = '';
		}
	}

	function cancelCommentEdit() {
		editingComment = null;
		commentText = '';
	}

	function handleCommentDoubleClick(element: GridElement, event: MouseEvent) {
		event.stopPropagation();
		editingComment = element;
		commentText = element.commentText || '';
	}

	export function createCommentAt(x: number, y: number) {
		const commentElementType: ElementType = {
			id: 'comment',
			type: 'comment',
			label: 'Comment',
			icon: '💬',
			execute: () => null
		};

		const newComment: GridElement = {
			id: generateId(),
			type: commentElementType,
			x,
			y,
			width: 200,
			height: 100,
			commentText: 'Double-click to edit'
		};

		gridElements = [...gridElements, newComment];
		editingComment = newComment;
		commentText = newComment.commentText || '';
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

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
	bind:this={gridContainer}
	class="flex-1 relative {darkMode ? 'bg-slate-900' : 'bg-slate-50'} overflow-hidden {isPanning ? 'cursor-grabbing' : 'cursor-default'}"
	style="background-image: linear-gradient(to right, {darkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px), linear-gradient(to bottom, {darkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px); background-size: {20 * zoomLevel}px {20 * zoomLevel}px; background-position: {panX}px {panY}px;"
	onmousedown={startPanning}
	onclick={handleGridClick}
	onkeydown={handleKeydown}
	onwheel={handleWheel}
	role="button"
	tabindex="0"
>
	<!-- SVG for connections (outside transformed container to avoid coordinate system issues) -->
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

		<!-- Transform group to match the container's CSS transform -->
		<g transform="translate({panX}, {panY}) scale({zoomLevel})">
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
						onDelete={deleteConnection}
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
		</g>
	</svg>

	<!-- Zoomed Container -->
	<div
		class="absolute inset-0 origin-top-left"
		style="transform: translate({panX}px, {panY}px) scale({zoomLevel}); transform-origin: 0 0; width: 100%; height: 100%;"
	>

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
					onmousedown={(e) => { startDragOnGrid(element, e); e.stopPropagation(); }}
					ondblclick={(e) => handleCommentDoubleClick(element, e)}
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
							onmousedown={(e) => startResize(element, e)}
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
										cancelCommentEdit();
									} else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
										saveComment();
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
					nodeStatus={nodeExecutionStatus[element.id]}
					workflowOutput={element.type.id === 'workflow-output' ? workflowExecutionOutput : undefined}
					{labelsVisible}
					onDelete={onNodeDelete}
					onDragStart={startDragOnGrid}
					onDoubleClick={onNodeDoubleClick}
					onConnectionPointClick={handleConnectionPointClick}
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

	<!-- Control buttons (top right) -->
	<div class="absolute top-4 right-4 z-50 pointer-events-auto flex items-center gap-2">
		{#if Object.keys(nodeExecutionStatus).length > 0 && onClearExecution}
			<button
				type="button"
				onclick={onClearExecution}
				class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
				title="Hide execution labels"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
				Hide Labels
			</button>
		{:else if canShowLabels && onShowLabels}
			<button
				type="button"
				onclick={onShowLabels}
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
				title="Show execution labels"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
				</svg>
				Show Labels
			</button>
		{/if}
	</div>
</div>
