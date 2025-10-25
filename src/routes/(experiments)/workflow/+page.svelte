<script lang="ts">
	// Types
	type ElementType = {
		id: string;
		type: 'input' | 'process' | 'output';
		label: string;
		icon: string;
		execute: (input: any) => any;
	};

	type GridElement = {
		id: string;
		type: ElementType;
		x: number;
		y: number;
		width: number;
		height: number;
		output?: any;
	};

	type Connection = {
		id: string;
		from: string; // element id
		to: string; // element id
		fromSide: 'top' | 'right' | 'bottom' | 'left';
		toSide: 'top' | 'right' | 'bottom' | 'left';
	};

	type ConnectionPoint = {
		x: number;
		y: number;
		elementId: string;
		side: 'top' | 'right' | 'bottom' | 'left';
	};

	// Available element types
	const elementTypes: ElementType[] = [
		{
			id: 'input-text',
			type: 'input',
			label: 'Text Input',
			icon: '📝',
			execute: (input) => input || 'Sample text input'
		},
		{
			id: 'input-number',
			type: 'input',
			label: 'Number Input',
			icon: '🔢',
			execute: (input) => input || 42
		},
		{
			id: 'process-uppercase',
			type: 'process',
			label: 'Uppercase',
			icon: '🔤',
			execute: (input) => String(input).toUpperCase()
		},
		{
			id: 'process-multiply',
			type: 'process',
			label: 'Multiply x2',
			icon: '✖️',
			execute: (input) => Number(input) * 2
		},
		{
			id: 'process-reverse',
			type: 'process',
			label: 'Reverse',
			icon: '🔄',
			execute: (input) => String(input).split('').reverse().join('')
		},
		{
			id: 'output-display',
			type: 'output',
			label: 'Display',
			icon: '📺',
			execute: (input) => input
		}
	];

	// State using Svelte 5 runes
	let gridElements = $state<GridElement[]>([]);
	let connections = $state<Connection[]>([]);
	let draggedElementType = $state<ElementType | null>(null);
	let draggedGridElement = $state<GridElement | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let connectingFrom = $state<ConnectionPoint | null>(null);
	let currentMousePos = $state({ x: 0, y: 0 });
	let gridContainer = $state<HTMLDivElement | null>(null);
	let svgContainer = $state<SVGSVGElement | null>(null);
	let workflowResults = $state<any[]>([]);

	// Generate unique ID
	function generateId(): string {
		return `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	// Drag from sidebar
	function startDragFromSidebar(elementType: ElementType, event: MouseEvent) {
		draggedElementType = elementType;
		const rect = (event.target as HTMLElement).getBoundingClientRect();
		dragOffset = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	}

	// Drag element on grid
	function startDragOnGrid(element: GridElement, event: MouseEvent) {
		if ((event.target as HTMLElement).classList.contains('connection-point')) {
			return; // Don't drag if clicking connection point
		}
		draggedGridElement = element;
		dragOffset = {
			x: event.clientX - element.x,
			y: event.clientY - element.y
		};
		event.stopPropagation();
	}

	// Handle mouse move
	function handleMouseMove(event: MouseEvent) {
		currentMousePos = { x: event.clientX, y: event.clientY };

		if (draggedGridElement && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			draggedGridElement.x = event.clientX - rect.left - dragOffset.x;
			draggedGridElement.y = event.clientY - rect.top - dragOffset.y;
		}
	}

	// Handle mouse up
	function handleMouseUp(event: MouseEvent) {
		if (draggedElementType && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			const x = event.clientX - rect.left - dragOffset.x;
			const y = event.clientY - rect.top - dragOffset.y;

			if (x > 0 && y > 0 && x < rect.width - 100 && y < rect.height - 80) {
				const newElement: GridElement = {
					id: generateId(),
					type: draggedElementType,
					x,
					y,
					width: 120,
					height: 80
				};
				gridElements = [...gridElements, newElement];
			}
		}

		draggedElementType = null;
		draggedGridElement = null;
	}

	// Connection point click
	function handleConnectionPointClick(
		elementId: string,
		side: 'top' | 'right' | 'bottom' | 'left',
		event: MouseEvent
	) {
		event.stopPropagation();
		const element = gridElements.find((el) => el.id === elementId);
		if (!element) return;

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const gridRect = gridContainer?.getBoundingClientRect();
		if (!gridRect) return;

		const point: ConnectionPoint = {
			x: rect.left + rect.width / 2 - gridRect.left,
			y: rect.top + rect.height / 2 - gridRect.top,
			elementId,
			side
		};

		if (!connectingFrom) {
			connectingFrom = point;
		} else {
			// Create connection
			if (connectingFrom.elementId !== elementId) {
				const newConnection: Connection = {
					id: generateId(),
					from: connectingFrom.elementId,
					to: elementId,
					fromSide: connectingFrom.side,
					toSide: side
				};
				connections = [...connections, newConnection];
				executeWorkflow();
			}
			connectingFrom = null;
		}
	}

	// Get connection point position
	function getConnectionPointPos(elementId: string, side: 'top' | 'right' | 'bottom' | 'left') {
		const element = gridElements.find((el) => el.id === elementId);
		if (!element) return { x: 0, y: 0 };

		const centerX = element.x + element.width / 2;
		const centerY = element.y + element.height / 2;

		switch (side) {
			case 'top':
				return { x: centerX, y: element.y };
			case 'right':
				return { x: element.x + element.width, y: centerY };
			case 'bottom':
				return { x: centerX, y: element.y + element.height };
			case 'left':
				return { x: element.x, y: centerY };
		}
	}

	// Execute workflow
	function executeWorkflow() {
		workflowResults = [];

		// Build execution order (topological sort)
		const processed = new Set<string>();
		const results = new Map<string, any>();

		function executeElement(elementId: string): any {
			if (processed.has(elementId)) {
				return results.get(elementId);
			}

			const element = gridElements.find((el) => el.id === elementId);
			if (!element) return null;

			// Get inputs from connected elements
			const inputConnections = connections.filter((conn) => conn.to === elementId);
			let input = null;

			if (inputConnections.length > 0) {
				const inputs = inputConnections.map((conn) => executeElement(conn.from));
				input = inputs.length === 1 ? inputs[0] : inputs;
			}

			// Execute element
			const output = element.type.execute(input);
			element.output = output;
			results.set(elementId, output);
			processed.add(elementId);

			return output;
		}

		// Execute all output elements (they will trigger upstream execution)
		const outputElements = gridElements.filter((el) => el.type.type === 'output');
		outputElements.forEach((el) => executeElement(el.id));

		// Collect results
		workflowResults = Array.from(results.entries()).map(([id, value]) => {
			const element = gridElements.find((el) => el.id === id);
			return {
				elementId: id,
				label: element?.type.label || '',
				value
			};
		});
	}

	// Delete element
	function deleteElement(elementId: string, event: MouseEvent) {
		event.stopPropagation();
		gridElements = gridElements.filter((el) => el.id !== elementId);
		connections = connections.filter((conn) => conn.from !== elementId && conn.to !== elementId);
		executeWorkflow();
	}

	// Delete connection
	function deleteConnection(connectionId: string) {
		connections = connections.filter((conn) => conn.id !== connectionId);
		executeWorkflow();
	}

	// Cancel connection
	function handleGridClick() {
		connectingFrom = null;
	}

	// Color mapping
	function getElementColor(type: 'input' | 'process' | 'output'): string {
		switch (type) {
			case 'input':
				return 'bg-blue-500';
			case 'process':
				return 'bg-purple-500';
			case 'output':
				return 'bg-green-500';
		}
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="flex h-screen w-full overflow-hidden bg-gray-900">
	<!-- Left Sidebar -->
	<div class="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
		<div class="p-4 border-b border-gray-700">
			<h2 class="text-xl font-bold text-white">Workflow Builder</h2>
			<p class="text-sm text-gray-400 mt-1">Drag elements to canvas</p>
		</div>

		<div class="flex-1 overflow-y-auto p-4 space-y-2">
			<div class="mb-4">
				<h3 class="text-sm font-semibold text-gray-400 mb-2">INPUT NODES</h3>
				{#each elementTypes.filter((t) => t.type === 'input') as elementType}
					<button
						class="w-full p-3 mb-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-move transition-colors flex items-center gap-2 shadow-lg"
						onmousedown={(e) => startDragFromSidebar(elementType, e)}
					>
						<span class="text-xl">{elementType.icon}</span>
						<span class="text-sm font-medium">{elementType.label}</span>
					</button>
				{/each}
			</div>

			<div class="mb-4">
				<h3 class="text-sm font-semibold text-gray-400 mb-2">PROCESS NODES</h3>
				{#each elementTypes.filter((t) => t.type === 'process') as elementType}
					<button
						class="w-full p-3 mb-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-move transition-colors flex items-center gap-2 shadow-lg"
						onmousedown={(e) => startDragFromSidebar(elementType, e)}
					>
						<span class="text-xl">{elementType.icon}</span>
						<span class="text-sm font-medium">{elementType.label}</span>
					</button>
				{/each}
			</div>

			<div class="mb-4">
				<h3 class="text-sm font-semibold text-gray-400 mb-2">OUTPUT NODES</h3>
				{#each elementTypes.filter((t) => t.type === 'output') as elementType}
					<button
						class="w-full p-3 mb-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-move transition-colors flex items-center gap-2 shadow-lg"
						onmousedown={(e) => startDragFromSidebar(elementType, e)}
					>
						<span class="text-xl">{elementType.icon}</span>
						<span class="text-sm font-medium">{elementType.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="p-4 border-t border-gray-700">
			<button
				class="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
				onclick={executeWorkflow}
			>
				▶️ Run Workflow
			</button>
		</div>
	</div>

	<!-- Main Grid Area -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Grid Canvas -->
		<div
			bind:this={gridContainer}
			class="flex-1 relative bg-gray-900"
			style="background-image: radial-gradient(circle, #374151 1px, transparent 1px); background-size: 20px 20px;"
			onclick={handleGridClick}
			onkeydown={(e) => e.key === 'Escape' && handleGridClick()}
			role="button"
			tabindex="0"
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
					>
						<polygon points="0 0, 10 3, 0 6" fill="#60a5fa" />
					</marker>
				</defs>

				<!-- Existing connections -->
				{#each connections as connection}
					{@const fromPos = getConnectionPointPos(connection.from, connection.fromSide)}
					{@const toPos = getConnectionPointPos(connection.to, connection.toSide)}
					<g>
						<path
							d="M {fromPos.x} {fromPos.y} C {fromPos.x + 100} {fromPos.y}, {toPos.x -
								100} {toPos.y}, {toPos.x} {toPos.y}"
							stroke="#60a5fa"
							stroke-width="3"
							fill="none"
							marker-end="url(#arrowhead)"
							class="pointer-events-auto cursor-pointer hover:stroke-red-400 transition-colors"
							onclick={() => deleteConnection(connection.id)}
							onkeydown={(e) => e.key === 'Delete' && deleteConnection(connection.id)}
							role="button"
							tabindex="0"
							aria-label="Delete connection"
						/>
					</g>
				{/each}

				<!-- Temporary connection line -->
				{#if connectingFrom && gridContainer}
					{@const gridRect = gridContainer.getBoundingClientRect()}
					<line
						x1={connectingFrom.x}
						y1={connectingFrom.y}
						x2={currentMousePos.x - gridRect.left}
						y2={currentMousePos.y - gridRect.top}
						stroke="#60a5fa"
						stroke-width="2"
						stroke-dasharray="5,5"
						opacity="0.6"
					/>
				{/if}
			</svg>

			<!-- Grid Elements -->
			{#each gridElements as element (element.id)}
				<div
					class="absolute {getElementColor(
						element.type.type
					)} rounded-lg shadow-xl cursor-move border-2 border-gray-700 hover:border-gray-500 transition-colors"
					style="left: {element.x}px; top: {element.y}px; width: {element.width}px; height: {element.height}px;"
					onmousedown={(e) => startDragOnGrid(element, e)}
					role="button"
					tabindex="0"
				>
					<div class="relative w-full h-full p-2 text-white flex flex-col items-center justify-center">
						<button
							class="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full text-xs flex items-center justify-center"
							onclick={(e) => deleteElement(element.id, e)}
						>
							×
						</button>
						<div class="text-2xl mb-1">{element.type.icon}</div>
						<div class="text-xs font-semibold text-center">{element.type.label}</div>
						{#if element.output !== undefined}
							<div class="text-xs mt-1 opacity-75 truncate max-w-full px-1">
								{String(element.output).slice(0, 20)}
							</div>
						{/if}

						<!-- Connection Points -->
						<button
							class="connection-point absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-700 rounded-full hover:bg-yellow-400 hover:scale-125 transition-all cursor-crosshair"
							onclick={(e) => handleConnectionPointClick(element.id, 'top', e)}
							aria-label="Top connection point"
						></button>
						<button
							class="connection-point absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-700 rounded-full hover:bg-yellow-400 hover:scale-125 transition-all cursor-crosshair"
							onclick={(e) => handleConnectionPointClick(element.id, 'right', e)}
							aria-label="Right connection point"
						></button>
						<button
							class="connection-point absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-700 rounded-full hover:bg-yellow-400 hover:scale-125 transition-all cursor-crosshair"
							onclick={(e) => handleConnectionPointClick(element.id, 'bottom', e)}
							aria-label="Bottom connection point"
						></button>
						<button
							class="connection-point absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-700 rounded-full hover:bg-yellow-400 hover:scale-125 transition-all cursor-crosshair"
							onclick={(e) => handleConnectionPointClick(element.id, 'left', e)}
							aria-label="Left connection point"
						></button>
					</div>
				</div>
			{/each}

			<!-- Instructions overlay -->
			{#if gridElements.length === 0}
				<div
					class="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-500"
				>
					<div class="text-center">
						<div class="text-4xl mb-4">🎨</div>
						<div class="text-lg font-semibold">Drag elements from the sidebar</div>
						<div class="text-sm mt-2">Click connection points to link elements</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Results Panel -->
		{#if workflowResults.length > 0}
			<div class="h-48 bg-gray-800 border-t border-gray-700 overflow-y-auto">
				<div class="p-4">
					<h3 class="text-lg font-bold text-white mb-3 flex items-center gap-2">
						<span>📊</span> Workflow Results
					</h3>
					<div class="space-y-2">
						{#each workflowResults as result}
							<div class="bg-gray-700 rounded-lg p-3">
								<div class="text-sm font-semibold text-gray-300 mb-1">{result.label}</div>
								<div class="text-white font-mono text-sm break-all">
									{JSON.stringify(result.value, null, 2)}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

