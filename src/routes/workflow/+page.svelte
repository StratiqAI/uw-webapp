<!--
	Workflow Builder Page - Commercial Real Estate Analysis Workflow System
	
	This component provides a visual, drag-and-drop workflow builder for creating and executing
	commercial real estate analysis workflows. Users can:
	
	- Build workflows by connecting nodes (inputs, processes, outputs, AI analysis)
	- Execute workflows to process data through connected nodes
	- Create custom AI analysis nodes with configurable prompts and models
	- Save and load workflow configurations
	- Visualize data flow through connections between nodes
	
	Key Features:
	- Pre-built node library for CRE analysis (NOI, cap rate, DSCR calculations, etc.)
	- AI-powered analysis nodes (market analysis, risk assessment, financial modeling, etc.)
	- Interactive canvas with drag-and-drop node placement
	- Connection system for linking node inputs/outputs
	- Workflow execution engine with dependency resolution
	- Dark mode support
	- Export/import workflow JSON
	
	Component Structure:
	- Types: ElementType, GridElement, Connection, ConnectionPoint
	- Element Library: Predefined CRE-focused nodes (inputs, processes, AI)
	- State Management: Grid elements, connections, execution state
	- Canvas Rendering: SVG-based visual workflow representation
	- Execution Engine: Topological sort and sequential node execution
-->

<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { generateId } from './utils/idGenerator';
	import WorkflowSidebar from './components/WorkflowSidebar.svelte';
	import WorkflowToolbar from './components/WorkflowToolbar.svelte';
	import WorkflowCanvas from './components/WorkflowCanvas.svelte';
	import WorkflowResultsPanel from './components/WorkflowResultsPanel.svelte';
	import WorkflowModal from './components/WorkflowModal.svelte';
	import { loadCustomAINodes as loadCustomNodes, saveCustomAINodes, createCustomAINode as createCustomNode } from './services/customNodeService';
	import { getElementTypes } from './services/nodeLibraryService';
	import type { AIQueryData, ElementType, GridElement, Connection, ConnectionPoint } from './types';

	// ------------------------------------------------------------------------------------------------
	// Workflow builder overview
	// - Node library and custom AI nodes
	// - Canvas interaction and execution state
	// - Editing modals and export tooling
	// ------------------------------------------------------------------------------------------------

	// ------------------------------------------------------------------------------------------------
	// Node library (default + custom AI)
	// ------------------------------------------------------------------------------------------------
	const elementTypes: ElementType[] = getElementTypes();
	let customAINodes = $state<ElementType[]>([]);
	let customAINodeLabel = $state('');
	let customAINodePrompt = $state('');
	let customAINodeModel = $state('gpt-4o');
	let customAINodeSystemPrompt = $state('');
	let allElementTypes = $derived([...elementTypes, ...customAINodes]);

	// ------------------------------------------------------------------------------------------------
	// Canvas data + interaction state
	// ------------------------------------------------------------------------------------------------
	let gridElements = $state<GridElement[]>([]);
	let connections = $state<Connection[]>([]);
	let draggedElementType = $state<ElementType | null>(null);
	let draggedGridElement = $state<GridElement | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let connectingFrom = $state<ConnectionPoint | null>(null);
	let currentMousePos = $state({ x: 0, y: 0 });
	let gridContainer = $state<HTMLDivElement | null>(null);
	let svgContainer = $state<SVGSVGElement | null>(null);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0 });
	let zoomLevel = $state(1);
	let resizingElement = $state<GridElement | null>(null);
	let resizeStart = $state({ x: 0, y: 0, width: 0, height: 0 });

	// ------------------------------------------------------------------------------------------------
	// UI filters + modal state
	// ------------------------------------------------------------------------------------------------
	let nodeFilter = $state('');
	let creatingCustomAI = $state(false);
	let showingAIGallery = $state(false);
	let showingInputGallery = $state(false);
	let showingProcessGallery = $state(true);
	let aiGalleryFilter = $state('');
	let workflowResults = $state<any[]>([]);
	let editingAIQuery = $state<GridElement | null>(null);
	let aiQueryPrompt = $state('');
	let aiQueryModel = $state('gpt-4o');
	let aiQuerySystemPrompt = $state('');
	let editingNodeOptions = $state<GridElement | null>(null);
	let nodeOptionsText = $state('');
	let nodeOptionsError = $state('');
	let editingComment = $state<GridElement | null>(null);
	let commentText = $state('');
	let commentTextareaRef = $state<HTMLTextAreaElement | null>(null);
	let showingWorkflowJSON = $state(false);
	let workflowJSON = $state('');
	let copiedToClipboard = $state(false);

	// ------------------------------------------------------------------------------------------------
	// Theme state
	// ------------------------------------------------------------------------------------------------
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	// ------------------------------------------------------------------------------------------------
	// Lifecycle: load custom AI nodes on mount
	// ------------------------------------------------------------------------------------------------
	if (typeof window !== 'undefined') {
		handleLoadCustomAINodes();
	}

	// ------------------------------------------------------------------------------------------------
	// Custom AI node management (create/save/delete)
	// ------------------------------------------------------------------------------------------------
	function handleLoadCustomAINodes() {
		customAINodes = loadCustomNodes();
	}

	function handleSaveCustomAINodes() {
		saveCustomAINodes(customAINodes);
	}

	function createCustomAINode() {
		if (!customAINodeLabel.trim() || !customAINodePrompt.trim()) {
			return;
		}

		const newId = `custom-ai-${Date.now()}`;
		const customNode = createCustomNode(
			newId,
			customAINodeLabel,
			customAINodePrompt,
			customAINodeModel,
			customAINodeSystemPrompt
		);

		customAINodes = [...customAINodes, customNode];
		handleSaveCustomAINodes();

		customAINodeLabel = '';
		customAINodePrompt = '';
		customAINodeModel = 'gpt-4o';
		customAINodeSystemPrompt = '';
		creatingCustomAI = false;
	}

	function deleteCustomAINode(nodeId: string) {
		customAINodes = customAINodes.filter(n => n.id !== nodeId);
		handleSaveCustomAINodes();
	}

	function cancelCreateCustomAI() {
		customAINodeLabel = '';
		customAINodePrompt = '';
		customAINodeModel = 'gpt-4o';
		customAINodeSystemPrompt = '';
		creatingCustomAI = false;
	}

	// ------------------------------------------------------------------------------------------------
	// Canvas interactions: drag, resize, pan
	// ------------------------------------------------------------------------------------------------
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
		if ((event.target as HTMLElement).classList.contains('resize-handle')) {
			return; // Don't drag if clicking resize handle
		}
		draggedGridElement = element;
		if (gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			// Account for zoom and pan when calculating offset
			const elementScreenX = element.x * zoomLevel + panX;
			const elementScreenY = element.y * zoomLevel + panY;
			dragOffset = {
				x: (event.clientX - rect.left - elementScreenX) / zoomLevel,
				y: (event.clientY - rect.top - elementScreenY) / zoomLevel
			};
		}
		event.stopPropagation();
	}

	// Start resizing comment
	function startResize(element: GridElement, event: MouseEvent) {
		event.stopPropagation();
		if (element.type.type !== 'comment') return;
		
		resizingElement = element;
		if (gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			const elementScreenX = (element.x + element.width) * zoomLevel + panX;
			const elementScreenY = (element.y + element.height) * zoomLevel + panY;
			resizeStart = {
				x: event.clientX,
				y: event.clientY,
				width: element.width,
				height: element.height
			};
		}
	}

	// Handle mouse move
	function handleMouseMove(event: MouseEvent) {
		currentMousePos = { x: event.clientX, y: event.clientY };

		if (isPanning && gridContainer) {
			// Pan the canvas
			const deltaX = event.clientX - panStart.x;
			const deltaY = event.clientY - panStart.y;
			panX += deltaX;
			panY += deltaY;
			panStart = { x: event.clientX, y: event.clientY };
		} else if (resizingElement && gridContainer) {
			// Resize comment element
			const deltaX = (event.clientX - resizeStart.x) / zoomLevel;
			const deltaY = (event.clientY - resizeStart.y) / zoomLevel;
			const newWidth = Math.max(150, resizeStart.width + deltaX);
			const newHeight = Math.max(80, resizeStart.height + deltaY);
			resizingElement.width = newWidth;
			resizingElement.height = newHeight;
		} else if (draggedGridElement && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			// Account for zoom and pan when updating position
			draggedGridElement.x = (event.clientX - rect.left - panX) / zoomLevel - dragOffset.x;
			draggedGridElement.y = (event.clientY - rect.top - panY) / zoomLevel - dragOffset.y;
		}
	}

	// Handle mouse up
	function handleMouseUp(event: MouseEvent) {
		isPanning = false;
		resizingElement = null;
		
		if (draggedElementType && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			// Account for zoom and pan when placing new element
			const x = (event.clientX - rect.left - panX) / zoomLevel - dragOffset.x;
			const y = (event.clientY - rect.top - panY) / zoomLevel - dragOffset.y;

			// Check bounds accounting for zoom
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
					...(draggedElementType.type === 'ai' && {
						aiQueryData: draggedElementType.defaultAIQueryData || {
							prompt: draggedElementType.id === 'ai-property-analysis' 
								? 'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}'
								: draggedElementType.id === 'ai-market-analysis'
								? 'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}'
								: draggedElementType.id === 'ai-risk-assessment'
								? 'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}'
								: 'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
							model: 'gpt-4o',
							systemPrompt: draggedElementType.id === 'ai-property-analysis'
								? 'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.'
								: draggedElementType.id === 'ai-market-analysis'
								? 'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.'
								: draggedElementType.id === 'ai-risk-assessment'
								? 'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.'
								: 'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.'
						}
					})
				};
				gridElements = [...gridElements, newElement];
			}
		}

		draggedElementType = null;
		draggedGridElement = null;
	}

	// ------------------------------------------------------------------------------------------------
	// Connection wiring: start/end connections and compute positions
	// ------------------------------------------------------------------------------------------------
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

		// Account for zoom and pan when calculating connection point position
		const point: ConnectionPoint = {
			x: (rect.left + rect.width / 2 - gridRect.left - panX) / zoomLevel,
			y: (rect.top + rect.height / 2 - gridRect.top - panY) / zoomLevel,
			elementId,
			side
		};

		if (!connectingFrom) {
			// Only allow output (right) side to be selected as source
			if (side !== 'right') {
				return; // Ignore clicks on non-output connection points
			}
			connectingFrom = point;
		} else {
			// Only allow input (left) side to be selected as destination
			if (side !== 'left') {
				// Reset connection attempt if clicking on non-input
				connectingFrom = null;
				return;
			}
			// Create connection (only from output to input)
			if (connectingFrom.elementId !== elementId && connectingFrom.side === 'right') {
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

	// Get connection point position (in original coordinate space - zoom/pan handled by container transform)
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

	// ------------------------------------------------------------------------------------------------
	// Workflow execution: topological run and results capture
	// ------------------------------------------------------------------------------------------------
	// Execute workflow
	async function executeWorkflow() {
		workflowResults = [];

		// Build execution order (topological sort)
		const processed = new Set<string>();
		const results = new Map<string, any>();

		async function executeElement(elementId: string): Promise<any> {
			if (processed.has(elementId)) {
				return results.get(elementId);
			}

			const element = gridElements.find((el) => el.id === elementId);
			if (!element) return null;

			// Get inputs from connected elements
			const inputConnections = connections.filter((conn) => conn.to === elementId);
			let input = null;

			if (inputConnections.length > 0) {
				const inputs = await Promise.all(
					inputConnections.map((conn) => executeElement(conn.from))
				);
				input = inputs.length === 1 ? inputs[0] : inputs;
			}

		if (inputConnections.length === 0 && element.type.type === 'input' && element.nodeOptions !== undefined) {
			input = element.nodeOptions;
		}

			// Execute element (handle both sync and async)
			const outputPromise = element.type.execute(input, element.aiQueryData);
			const output = await Promise.resolve(outputPromise);
			element.output = output;
			results.set(elementId, output);
			processed.add(elementId);

			return output;
		}

		// Execute all output elements (they will trigger upstream execution)
		const outputElements = gridElements.filter((el) => el.type.type === 'output');
		await Promise.all(outputElements.map((el) => executeElement(el.id)));

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

	// ------------------------------------------------------------------------------------------------
	// Comment nodes: edit, save, cancel
	// ------------------------------------------------------------------------------------------------
	// Save comment edit
	function saveComment() {
		if (editingComment) {
			editingComment.commentText = commentText;
			editingComment = null;
			commentText = '';
		}
	}

	// Cancel comment edit
	function cancelCommentEdit() {
		editingComment = null;
		commentText = '';
	}

	// Start panning
	function startPanning(event: MouseEvent) {
		// Don't pan if dragging from sidebar, clicking on node, connection point, or resizing
		if (draggedElementType || draggedGridElement || connectingFrom || resizingElement) {
			return;
		}
		
		// Check if clicking on a node or connection point
		const target = event.target as HTMLElement;
		if (
			target.closest('.absolute[style*="left"]') || // Node element
			target.classList.contains('connection-point') ||
			target.closest('.connection-point')
		) {
			return; // Don't pan if clicking on a node or connection point
		}
		
		// Start panning
		isPanning = true;
		panStart = { x: event.clientX, y: event.clientY };
		event.preventDefault();
		event.stopPropagation();
	}

	// Color mapping - Professional color scheme for grid nodes
	function getElementColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'bg-slate-600';
				case 'process':
					return 'bg-slate-600';
				case 'output':
					return 'bg-slate-600';
				case 'ai':
					return 'bg-slate-600';
			}
		} else {
			switch (type) {
				case 'input':
					return 'bg-white';
				case 'process':
					return 'bg-white';
				case 'output':
					return 'bg-white';
				case 'ai':
					return 'bg-white';
			}
		}
	}

	function getElementBorderColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'border-slate-400';
				case 'process':
					return 'border-slate-400';
				case 'output':
					return 'border-emerald-300';
				case 'ai':
					return 'border-indigo-300';
			}
		} else {
			switch (type) {
				case 'input':
					return 'border-slate-300';
				case 'process':
					return 'border-slate-300';
				case 'output':
					return 'border-emerald-300';
				case 'ai':
					return 'border-indigo-300';
			}
		}
	}

	function getNodeIconBgColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'bg-slate-600';
				case 'process':
					return 'bg-slate-600';
				case 'output':
					return 'bg-emerald-800';
				case 'ai':
					return 'bg-indigo-800';
			}
		} else {
			switch (type) {
				case 'input':
					return 'bg-slate-100';
				case 'process':
					return 'bg-slate-100';
				case 'output':
					return 'bg-emerald-50';
				case 'ai':
					return 'bg-indigo-50';
			}
		}
	}

	function getNodeIconTextColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'text-slate-100';
				case 'process':
					return 'text-slate-100';
				case 'output':
					return 'text-emerald-200';
				case 'ai':
					return 'text-indigo-200';
			}
		} else {
			switch (type) {
				case 'input':
					return 'text-slate-700';
				case 'process':
					return 'text-slate-700';
				case 'output':
					return 'text-emerald-700';
				case 'ai':
					return 'text-indigo-700';
			}
		}
	}

	function getNodeLabelColor(): string {
		return darkMode ? 'text-slate-100' : 'text-slate-900';
	}

	function getNodeAccentColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return '';
				case 'process':
					return '';
				case 'output':
					return 'ring-emerald-500/40';
				case 'ai':
					return 'ring-indigo-500/40';
			}
		} else {
			switch (type) {
				case 'input':
					return '';
				case 'process':
					return '';
				case 'output':
					return 'ring-emerald-200';
				case 'ai':
					return 'ring-indigo-200';
			}
		}
	}

	function getSidebarButtonColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
				case 'process':
					return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
				case 'output':
					return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
				case 'ai':
					return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
			}
		} else {
			switch (type) {
				case 'input':
					return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
				case 'process':
					return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
				case 'output':
					return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
				case 'ai':
					return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
			}
		}
	}

	function getIconBgColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		switch (type) {
			case 'input':
				return darkMode ? 'bg-slate-600' : 'bg-slate-100';
			case 'process':
				return darkMode ? 'bg-slate-600' : 'bg-slate-100';
			case 'output':
				return darkMode ? 'bg-emerald-700' : 'bg-emerald-50';
			case 'ai':
				return darkMode ? 'bg-indigo-700' : 'bg-indigo-50';
		}
	}

	function getIconTextColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		switch (type) {
			case 'input':
				return darkMode ? 'text-slate-200' : 'text-slate-700';
			case 'process':
				return darkMode ? 'text-slate-200' : 'text-slate-700';
			case 'output':
				return darkMode ? 'text-emerald-300' : 'text-emerald-700';
			case 'ai':
				return darkMode ? 'text-indigo-300' : 'text-indigo-700';
		}
	}

	function getLabelTextColor(): string {
		return darkMode ? 'text-slate-200' : 'text-slate-900';
	}

	// Create a comment on the canvas
	function createComment(x: number, y: number) {
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

	// ------------------------------------------------------------------------------------------------
	// Node options modal: resolve defaults, edit, save
	// ------------------------------------------------------------------------------------------------
	function getDefaultNodeOptions(element: GridElement) {
		if (element.type.type !== 'input') {
			return {};
		}

		try {
			const fallbackOptions = element.type.execute(null);
			if (fallbackOptions && typeof (fallbackOptions as Promise<any>).then === 'function') {
				return {};
			}
			return fallbackOptions ?? {};
		} catch (error) {
			console.warn('Failed to resolve default node options', error);
			return {};
		}
	}

	function openNodeOptions(element: GridElement) {
		editingNodeOptions = element;
		nodeOptionsError = '';
		const fallbackOptions = getDefaultNodeOptions(element);
		const optionsValue = element.nodeOptions ?? fallbackOptions ?? {};
		nodeOptionsText = JSON.stringify(optionsValue, null, 2);
	}

	function saveNodeOptions() {
		if (!editingNodeOptions) return;
		try {
			const trimmed = nodeOptionsText.trim();
			editingNodeOptions.nodeOptions = trimmed ? JSON.parse(trimmed) : {};
			editingNodeOptions = null;
			nodeOptionsText = '';
			nodeOptionsError = '';
			executeWorkflow();
		} catch (error) {
			nodeOptionsError = 'Invalid JSON. Please fix and try again.';
		}
	}

	function cancelNodeOptions() {
		editingNodeOptions = null;
		nodeOptionsText = '';
		nodeOptionsError = '';
	}

	// ------------------------------------------------------------------------------------------------
	// Element configuration: double-click editors (AI, comment, node options)
	// ------------------------------------------------------------------------------------------------
	// Handle double-click on element
	function handleElementDoubleClick(element: GridElement, event: MouseEvent) {
		event.stopPropagation();
		if (element.type.type === 'comment') {
			editingComment = element;
			commentText = element.commentText || '';
		} else if (element.type.type === 'ai') {
			editingAIQuery = element;
			const defaults = element.type.defaultAIQueryData || {
				prompt: 'Analyze the following commercial real estate data: {input}',
				model: 'gpt-4o',
				systemPrompt: 'You are an expert commercial real estate analyst.'
			};

			aiQueryPrompt = element.aiQueryData?.prompt || defaults.prompt;
			aiQueryModel = element.aiQueryData?.model || defaults.model;
			aiQuerySystemPrompt = element.aiQueryData?.systemPrompt || defaults.systemPrompt || '';
		} else {
			openNodeOptions(element);
		}
	}

	// Save AI query configuration
	function saveAIQuery() {
		if (!editingAIQuery) return;

		editingAIQuery.aiQueryData = {
			prompt: aiQueryPrompt,
			model: aiQueryModel,
			systemPrompt: aiQuerySystemPrompt || undefined
		};

		editingAIQuery = null;
		executeWorkflow();
	}

	// Cancel editing AI query
	function cancelEditAIQuery() {
		editingAIQuery = null;
		aiQueryPrompt = '';
		aiQueryModel = 'gpt-4o';
		aiQuerySystemPrompt = '';
	}

	// Toggle dark mode
	// Dark mode toggle is now handled by the unified store

	// ------------------------------------------------------------------------------------------------
	// Workflow JSON export (preview, copy, download)
	// ------------------------------------------------------------------------------------------------
	// Generate workflow JSON
	function generateWorkflowJSON() {
		const workflow = {
			elements: gridElements.map((el) => ({
				id: el.id,
				type: el.type.id,
				typeLabel: el.type.label,
				x: el.x,
				y: el.y,
				width: el.width,
				height: el.height,
				...(el.aiQueryData && { aiQueryData: el.aiQueryData }),
				...(el.output !== undefined && { output: el.output }),
				...(el.nodeOptions !== undefined && { nodeOptions: el.nodeOptions }),
				...(el.commentText && { commentText: el.commentText })
			})),
			connections: connections.map((conn) => ({
				id: conn.id,
				from: conn.from,
				to: conn.to,
				fromSide: conn.fromSide,
				toSide: conn.toSide
			}))
		};
		return JSON.stringify(workflow, null, 2);
	}

	// Show workflow JSON modal
	function showWorkflowJSON() {
		workflowJSON = generateWorkflowJSON();
		showingWorkflowJSON = true;
		copiedToClipboard = false;
	}

	// Copy JSON to clipboard
	async function copyWorkflowJSON() {
		try {
			await navigator.clipboard.writeText(workflowJSON);
			copiedToClipboard = true;
			setTimeout(() => {
				copiedToClipboard = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// Download JSON as file
	function downloadWorkflowJSON() {
		const blob = new Blob([workflowJSON], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `workflow-${Date.now()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// ------------------------------------------------------------------------------------------------
	// Zoom controls + mouse wheel zoom
	// ------------------------------------------------------------------------------------------------
	// Zoom functions
	function zoomIn() {
		zoomLevel = Math.min(zoomLevel + 0.1, 2); // Max zoom 200%
	}

	function zoomOut() {
		zoomLevel = Math.max(zoomLevel - 0.1, 0.5); // Min zoom 50%
	}

	function resetZoom() {
		zoomLevel = 1;
		panX = 0;
		panY = 0;
	}

	// Handle mouse wheel zoom
	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.1 : 0.1;
		const newZoom = Math.max(0.5, Math.min(2, zoomLevel + delta));
		
		// Zoom towards mouse position
		if (gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const mouseY = event.clientY - rect.top;
			
			// Calculate zoom point relative to container
			const zoomPointX = (mouseX - panX) / zoomLevel;
			const zoomPointY = (mouseY - panY) / zoomLevel;
			
			zoomLevel = newZoom;
			
			// Adjust pan to zoom towards mouse position
			panX = mouseX - zoomPointX * zoomLevel;
			panY = mouseY - zoomPointY * zoomLevel;
		}
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<!-- Layout: sidebar + canvas workspace + modal layers -->
<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
	<WorkflowSidebar
		allElementTypes={allElementTypes}
		darkMode={darkMode}
		bind:nodeFilter={nodeFilter}
		onNodeDragStart={startDragFromSidebar}
		onShowInputGallery={() => (showingInputGallery = true)}
		onShowProcessGallery={() => (showingProcessGallery = true)}
		onShowAIGallery={() => (showingAIGallery = true)}
		onAddComment={() => {
			if (gridContainer) {
				const rect = gridContainer.getBoundingClientRect();
				const centerX = (rect.width / 2 - panX) / zoomLevel;
				const centerY = (rect.height / 2 - panY) / zoomLevel;
				createComment(centerX - 100, centerY - 50);
			}
		}}
		onExecuteWorkflow={executeWorkflow}
	/>

	<!-- Main Grid Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<WorkflowToolbar
			{zoomLevel}
			{darkMode}
			gridElementsCount={gridElements.length}
			onSave={() => {}}
			onExport={showWorkflowJSON}
			onZoomIn={zoomIn}
			onZoomOut={zoomOut}
			onResetZoom={resetZoom}
			onClear={() => {
				gridElements = [];
				connections = [];
				workflowResults = [];
			}}
			onToggleDarkMode={toggleDarkMode}
		/>

		<WorkflowCanvas
			bind:gridContainer={gridContainer}
			bind:svgContainer={svgContainer}
			{gridElements}
			{connections}
			{zoomLevel}
			{panX}
			{panY}
			{darkMode}
			{connectingFrom}
			{draggedGridElement}
			{currentMousePos}
			{isPanning}
			editingComment={editingComment}
			bind:commentText={commentText}
			bind:commentTextareaRef={commentTextareaRef}
			onPanStart={startPanning}
			onGridClick={handleGridClick}
			onWheel={handleWheel}
			onNodeDelete={deleteElement}
			onNodeDragStart={startDragOnGrid}
			onNodeDoubleClick={handleElementDoubleClick}
			onConnectionPointClick={handleConnectionPointClick}
			onConnectionDelete={deleteConnection}
			onCommentSave={saveComment}
			onCommentCancel={cancelCommentEdit}
			onCommentResizeStart={startResize}
		/>

		<WorkflowResultsPanel
			results={workflowResults}
			{darkMode}
			onClear={() => (workflowResults = [])}
		/>
	</div>

	<!-- Property Data Gallery Modal -->
	{#if showingInputGallery}
		<WorkflowModal
			{darkMode}
			labelledBy="input-gallery-modal-title"
			containerClass="overflow-hidden flex flex-col"
			onClose={() => (showingInputGallery = false)}
		>
			<!-- Header -->
			<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 {darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 {darkMode ? 'text-blue-300' : 'text-blue-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
					</div>
					<div>
						<h2 id="input-gallery-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							Property Data Library
						</h2>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and add property data input nodes</p>
					</div>
				</div>
				<button
					onclick={() => showingInputGallery = false}
					class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
					aria-label="Close gallery"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>

			<!-- Gallery Content -->
			<div class="flex-1 overflow-y-auto p-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each elementTypes.filter((t) => t.type === 'input') as query}
						<div
							class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group"
							onclick={() => {
								if (gridContainer) {
									const rect = gridContainer.getBoundingClientRect();
									const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
									const centerY = (rect.height / 2 - panY) / zoomLevel - 40;

									const newElement: GridElement = {
										id: generateId(),
										type: query,
										x: centerX,
										y: centerY,
										width: 120,
										height: 80
									};
									gridElements = [...gridElements, newElement];
								}
								showingInputGallery = false;
							}}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									if (gridContainer) {
										const rect = gridContainer.getBoundingClientRect();
										const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
										const centerY = (rect.height / 2 - panY) / zoomLevel - 40;

										const newElement: GridElement = {
											id: generateId(),
											type: query,
											x: centerX,
											y: centerY,
											width: 120,
											height: 80
										};
										gridElements = [...gridElements, newElement];
									}
									showingInputGallery = false;
								}
							}}
						>
							<div class="flex items-start gap-3">
								<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg flex items-center justify-center">
									<span class="text-sm font-semibold {darkMode ? 'text-blue-300' : 'text-blue-600'}">{query.icon}</span>
								</div>
								<div class="flex-1 min-w-0">
									<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-blue-400 transition-colors">
										{query.label}
									</h4>
									<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
										{#if query.id === 'input-property-data'}
											Input property information including address, square footage, and property type
										{:else if query.id === 'input-financial-metrics'}
											Input financial metrics including purchase price, annual rent, and operating expenses
										{:else if query.id === 'input-market-data'}
											Input market data including cap rates, comparable sales, and market trends
										{:else if query.id === 'input-event'}
											Configure an AWS EventBridge event payload with source, detail type, and bus settings
										{:else}
											Property data input node
										{/if}
									</p>
								</div>
								<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
								</svg>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</WorkflowModal>
	{/if}

	<!-- Financial Calculations Gallery Modal -->
	{#if showingProcessGallery}
		<WorkflowModal
			{darkMode}
			labelledBy="process-gallery-modal-title"
			containerClass="overflow-hidden flex flex-col"
			onClose={() => (showingProcessGallery = false)}
		>
			<!-- Header -->
			<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 {darkMode ? 'bg-purple-900' : 'bg-purple-100'} rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 {darkMode ? 'text-purple-300' : 'text-purple-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
						</svg>
					</div>
					<div>
						<h2 id="process-gallery-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							Financial Calculations Library
						</h2>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and add financial calculation nodes</p>
					</div>
				</div>
				<button
					onclick={() => showingProcessGallery = false}
					class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
					aria-label="Close gallery"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>

			<!-- Gallery Content -->
			<div class="flex-1 overflow-y-auto p-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each elementTypes.filter((t) => t.type === 'process') as query}
						<div
							class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-purple-500' : 'bg-slate-50 border-slate-200 hover:border-purple-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group"
							onclick={() => {
								if (gridContainer) {
									const rect = gridContainer.getBoundingClientRect();
									const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
									const centerY = (rect.height / 2 - panY) / zoomLevel - 40;

									const newElement: GridElement = {
										id: generateId(),
										type: query,
										x: centerX,
										y: centerY,
										width: 120,
										height: 80
									};
									gridElements = [...gridElements, newElement];
								}
								showingProcessGallery = false;
							}}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									if (gridContainer) {
										const rect = gridContainer.getBoundingClientRect();
										const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
										const centerY = (rect.height / 2 - panY) / zoomLevel - 40;

										const newElement: GridElement = {
											id: generateId(),
											type: query,
											x: centerX,
											y: centerY,
											width: 120,
											height: 80
										};
										gridElements = [...gridElements, newElement];
									}
									showingProcessGallery = false;
								}
							}}
						>
							<div class="flex items-start gap-3">
								<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-purple-900' : 'bg-purple-100'} rounded-lg flex items-center justify-center">
									<span class="text-xs font-semibold {darkMode ? 'text-purple-300' : 'text-purple-600'}">{query.icon}</span>
								</div>
								<div class="flex-1 min-w-0">
									<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-purple-400 transition-colors">
										{query.label}
									</h4>
									<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
										{#if query.id === 'process-calculate-noi'}
											Calculate Net Operating Income from rent and expenses
										{:else if query.id === 'process-calculate-cap-rate'}
											Calculate capitalization rate from NOI and purchase price
										{:else if query.id === 'process-calculate-dscr'}
											Calculate Debt Service Coverage Ratio
										{:else if query.id === 'process-calculate-cash-flow'}
											Calculate annual cash flow from NOI and debt service
										{:else}
											Financial calculation node
										{/if}
									</p>
								</div>
								<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-purple-400' : 'text-slate-400 group-hover:text-purple-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
								</svg>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</WorkflowModal>
	{/if}

	<!-- AI Query Edit Modal -->
	{#if editingAIQuery}
		<WorkflowModal
			{darkMode}
			labelledBy="modal-title"
			maxWidthClass="max-w-2xl"
			maxHeightClass="max-h-[90vh]"
			containerClass="overflow-y-auto"
			onClose={cancelEditAIQuery}
		>
			<div class="p-6">
				<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
					<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
						<span class="{darkMode ? 'text-indigo-300' : 'text-indigo-600'} font-bold text-sm">AI</span>
					</div>
					<div>
						<h2 id="modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							Configure AI Analysis
						</h2>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Set up AI processing parameters</p>
					</div>
				</div>

				<div class="space-y-5">
					<div>
						<label for="ai-model-select" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
							AI Model
						</label>
						<select
							id="ai-model-select"
							bind:value={aiQueryModel}
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
						>
							<option value="gpt-4o">GPT-4o</option>
							<option value="gpt-4o-mini">GPT-4o Mini</option>
							<option value="gpt-4-turbo">GPT-4 Turbo</option>
							<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
						</select>
					</div>

					<div>
						<label for="ai-system-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
							Context Instructions <span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} font-normal">(Optional)</span>
						</label>
						<textarea
							id="ai-system-prompt"
							bind:value={aiQuerySystemPrompt}
							placeholder="You are an expert commercial real estate analyst..."
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
							rows="3"
						></textarea>
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Provide context about the AI's role and expertise</p>
					</div>

					<div>
						<label for="ai-user-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
							Analysis Prompt
						</label>
						<textarea
							id="ai-user-prompt"
							bind:value={aiQueryPrompt}
							placeholder="Analyze the following property data: {'{input}'}"
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
							rows="5"
						></textarea>
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
					</div>
				</div>

				<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
					<button
						onclick={saveAIQuery}
						class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
					>
						Save Configuration
					</button>
					<button
						onclick={cancelEditAIQuery}
						class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
					>
						Cancel
					</button>
				</div>
			</div>
		</WorkflowModal>
	{/if}

	<!-- Node Options Modal -->
	{#if editingNodeOptions}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={cancelNodeOptions}
			onkeydown={(e) => e.key === 'Escape' && cancelNodeOptions()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="node-options-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<div class="p-6">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg flex items-center justify-center">
							<span class="{darkMode ? 'text-slate-200' : 'text-slate-700'} font-semibold text-sm">
								{editingNodeOptions?.type.icon}
							</span>
						</div>
						<div>
							<h2 id="node-options-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Configure {editingNodeOptions?.type.label}
							</h2>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">
								Set node options as JSON
							</p>
						</div>
					</div>

					<div class="space-y-4">
						<div>
							<label for="node-options-json" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Options JSON
							</label>
							<textarea
								id="node-options-json"
								bind:value={nodeOptionsText}
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm font-mono"
								rows="10"
								placeholder="Example: &#123;&quot;example&quot;: true&#125;"
							></textarea>
							{#if nodeOptionsError}
								<p class="text-xs text-red-500 mt-1.5">{nodeOptionsError}</p>
							{:else}
								<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">
									These options are used as the node's input when no upstream data is connected.
								</p>
							{/if}
						</div>
					</div>

					<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
						<button
							onclick={saveNodeOptions}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
						>
							Save Configuration
						</button>
						<button
							onclick={cancelNodeOptions}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- AI Query Gallery Modal -->
	{#if showingAIGallery}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={() => showingAIGallery = false}
			onkeydown={(e) => e.key === 'Escape' && (showingAIGallery = false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="gallery-modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden m-4 border flex flex-col"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<!-- Header -->
				<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
								<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
								</svg>
							</div>
							<div>
								<h2 id="gallery-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
									AI Query Library
								</h2>
								<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and add AI analysis queries to your workflow</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<button
								onclick={() => { showingAIGallery = false; creatingCustomAI = true; }}
								class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1.5"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
								</svg>
								Create New
							</button>
							<button
								onclick={() => showingAIGallery = false}
								class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
								aria-label="Close gallery"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						</div>
					</div>
					<!-- Filter Input -->
					<div class="relative">
						<input
							type="text"
							bind:value={aiGalleryFilter}
							placeholder="Search queries..."
							class="w-full px-4 py-2 pl-10 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
						/>
						<svg class="absolute left-3 top-2.5 w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
						</svg>
						{#if aiGalleryFilter}
							<button
								onclick={() => aiGalleryFilter = ''}
								class="absolute right-3 top-2.5 p-1 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} rounded transition-colors"
								aria-label="Clear filter"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						{/if}
					</div>
				</div>

				<!-- Gallery Content -->
				<div class="flex-1 overflow-y-auto p-6">
					<!-- Default AI Queries -->
					{#if elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length > 0}
						<div class="mb-8">
							<h3 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
								<span class="w-1 h-4 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded"></span>
								Default Queries ({elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length})
							</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))) as query}
								<div
									class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group"
									onclick={() => {
										// Add query to center of canvas
										if (gridContainer) {
											const rect = gridContainer.getBoundingClientRect();
											const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
											const centerY = (rect.height / 2 - panY) / zoomLevel - 40;
											
											const newElement: GridElement = {
												id: generateId(),
												type: query,
												x: centerX,
												y: centerY,
												width: 120,
												height: 80,
												...(query.type === 'ai' && {
													aiQueryData: query.defaultAIQueryData || {
														prompt: query.id === 'ai-property-analysis' 
															? 'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}'
															: query.id === 'ai-market-analysis'
															? 'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}'
															: query.id === 'ai-risk-assessment'
															? 'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}'
															: 'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
														model: 'gpt-4o',
														systemPrompt: query.id === 'ai-property-analysis'
															? 'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.'
															: query.id === 'ai-market-analysis'
															? 'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.'
															: query.id === 'ai-risk-assessment'
															? 'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.'
															: 'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.'
													}
												})
											};
											gridElements = [...gridElements, newElement];
										}
										showingAIGallery = false;
									}}
									role="button"
									tabindex="0"
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											if (gridContainer) {
												const rect = gridContainer.getBoundingClientRect();
												const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
												const centerY = (rect.height / 2 - panY) / zoomLevel - 40;
												
												const newElement: GridElement = {
													id: generateId(),
													type: query,
													x: centerX,
													y: centerY,
													width: 120,
													height: 80,
													...(query.type === 'ai' && {
														aiQueryData: query.defaultAIQueryData || {
															prompt: query.id === 'ai-property-analysis' 
																? 'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}'
																: query.id === 'ai-market-analysis'
																? 'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}'
																: query.id === 'ai-risk-assessment'
																? 'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}'
																: 'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
															model: 'gpt-4o',
															systemPrompt: query.id === 'ai-property-analysis'
																? 'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.'
																: query.id === 'ai-market-analysis'
																? 'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.'
																: query.id === 'ai-risk-assessment'
																? 'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.'
																: 'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.'
														}
													})
												};
												gridElements = [...gridElements, newElement];
											}
											showingAIGallery = false;
										}
									}}
								>
									<div class="flex items-start gap-3">
										<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
											<span class="text-xs font-bold {darkMode ? 'text-indigo-300' : 'text-indigo-600'}">AI</span>
										</div>
										<div class="flex-1 min-w-0">
											<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-indigo-400 transition-colors">
												{query.label}
											</h4>
											<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
												{#if query.id === 'ai-property-analysis'}
													Analyze commercial real estate properties with comprehensive assessments
												{:else if query.id === 'ai-market-analysis'}
													Analyze market trends, comparable properties, and market conditions
												{:else if query.id === 'ai-risk-assessment'}
													Assess investment risks including financial, market, and regulatory factors
												{:else if query.id === 'ai-investment-recommendation'}
													Provide investment recommendations with buy/hold/pass rationale
												{:else if query.id === 'ai-tenant-analysis'}
													Analyze tenant profiles, lease structures, and rent roll stability
												{:else if query.id === 'ai-capital-expenditure-analysis'}
													Assess capital expenditure requirements and deferred maintenance
												{:else if query.id === 'ai-comparable-sales-analysis'}
													Analyze comparable sales for valuation and market value assessment
												{:else if query.id === 'ai-financial-modeling'}
													Create comprehensive financial models with cash flow and return analysis
												{:else if query.id === 'ai-location-analysis'}
													Evaluate location characteristics, demographics, and accessibility
												{:else if query.id === 'ai-lease-structure-analysis'}
													Analyze lease structures, expiration schedules, and lease economics
												{:else if query.id === 'ai-zoning-compliance'}
													Assess zoning regulations, permitted uses, and development rights
												{:else if query.id === 'ai-environmental-assessment'}
													Evaluate environmental risks, compliance, and remediation requirements
												{:else if query.id === 'ai-debt-structure-analysis'}
													Analyze debt structures, loan terms, and financing strategies
												{:else if query.id === 'ai-tax-analysis'}
													Evaluate tax implications, depreciation benefits, and tax planning
												{:else if query.id === 'ai-competition-analysis'}
													Analyze competitive landscape and market positioning
												{:else if query.id === 'ai-exit-strategy'}
													Develop exit strategies and optimal hold period analysis
												{:else if query.id === 'ai-due-diligence-checklist'}
													Generate comprehensive due diligence checklists for acquisitions
												{:else if query.id === 'ai-rent-roll-analysis'}
													Analyze rent rolls, market rents, and rent growth potential
												{:else if query.id === 'ai-asset-management'}
													Develop asset management strategies and value-add opportunities
												{:else if query.id === 'ai-portfolio-analysis'}
													Analyze portfolio diversification and optimization opportunities
												{:else if query.id === 'ai-valuation-analysis'}
													Perform comprehensive valuation using multiple approaches
												{:else if query.id === 'ai-lease-negotiation'}
													Provide lease negotiation strategies and recommendations
												{:else if query.id === 'ai-property-management'}
													Develop property management strategies and best practices
												{:else if query.id === 'ai-development-feasibility'}
													Analyze development feasibility and project economics
												{:else if query.id === 'ai-refinancing-analysis'}
													Analyze refinancing opportunities and optimal timing
												{:else if query.id === 'ai-1031-exchange'}
													Analyze 1031 exchange opportunities and tax benefits
												{:else if query.id === 'ai-market-timing'}
													Analyze optimal market timing for transactions
												{:else if query.id === 'ai-tenant-retention'}
													Develop tenant retention and renewal strategies
												{:else if query.id === 'ai-value-add-opportunities'}
													Identify value-add and repositioning opportunities
												{:else if query.id === 'ai-legal-compliance'}
													Assess legal compliance and regulatory requirements
												{:else if query.id === 'ai-operating-expense-analysis'}
													Analyze operating expenses and cost optimization
												{:else if query.id === 'ai-cap-rate-analysis'}
													Analyze capitalization rates and yield metrics
												{:else if query.id === 'ai-demographic-analysis'}
													Analyze demographic trends and characteristics
												{:else if query.id === 'ai-construction-cost-estimation'}
													Estimate construction costs for development projects
												{:else if query.id === 'ai-property-condition-assessment'}
													Assess physical condition and maintenance needs
												{:else if query.id === 'ai-income-approach-valuation'}
													Perform income approach valuation and DCF analysis
												{:else if query.id === 'ai-lease-abstract'}
													Create comprehensive lease abstracts and summaries
												{:else if query.id === 'ai-property-repositioning'}
													Develop property repositioning strategies
												{:else if query.id === 'ai-acquisition-underwriting'}
													Perform comprehensive acquisition underwriting
												{:else if query.id === 'ai-market-forecasting'}
													Forecast market trends and future conditions
												{:else if query.id === 'ai-tenant-improvement-analysis'}
													Analyze tenant improvement costs and strategies
												{:else}
													Custom AI analysis query
												{/if}
											</p>
										</div>
										<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
										</svg>
									</div>
								</div>
							{/each}
						</div>
					</div>
					{/if}

					<!-- Custom AI Queries -->
					{#if customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length > 0}
						<div>
							<h3 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
								<span class="w-1 h-4 {darkMode ? 'bg-emerald-500' : 'bg-emerald-600'} rounded"></span>
								Your Custom Queries ({customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length})
							</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								{#each customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())) as query}
									<div
										class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-emerald-500' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group relative"
										onclick={() => {
											const fakeEvent = new MouseEvent('mousedown', { bubbles: true });
											startDragFromSidebar(query, fakeEvent);
											showingAIGallery = false;
										}}
										role="button"
										tabindex="0"
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												const fakeEvent = new MouseEvent('mousedown', { bubbles: true });
												startDragFromSidebar(query, fakeEvent);
												showingAIGallery = false;
											}
										}}
									>
										<button
											onclick={(e) => { e.stopPropagation(); deleteCustomAINode(query.id); }}
											class="absolute top-2 right-2 p-1 {darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'} rounded transition-colors opacity-0 group-hover:opacity-100"
											title="Delete custom query"
											aria-label="Delete custom query"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
											</svg>
										</button>
										<div class="flex items-start gap-3 pr-6">
											<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-emerald-900' : 'bg-emerald-100'} rounded-lg flex items-center justify-center">
												<span class="text-xs font-bold {darkMode ? 'text-emerald-300' : 'text-emerald-600'}">AI</span>
											</div>
											<div class="flex-1 min-w-0">
												<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-emerald-400 transition-colors">
													{query.label}
												</h4>
												{#if query.defaultAIQueryData}
													<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
														{query.defaultAIQueryData.prompt.slice(0, 80)}...
													</p>
													<div class="mt-2 flex items-center gap-2">
														<span class="text-[10px] px-1.5 py-0.5 {darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'} rounded font-medium">
															{query.defaultAIQueryData.model}
														</span>
													</div>
												{/if}
											</div>
											<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
											</svg>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="text-center py-8">
							<svg class="w-12 h-12 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
							</svg>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">No custom queries yet</p>
							<button
								onclick={() => { showingAIGallery = false; creatingCustomAI = true; }}
								class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
							>
								Create Your First Custom Query
							</button>
						</div>
					{/if}

					<!-- No Results Message -->
					{#if aiGalleryFilter && elementTypes.filter((t) => t.type === 'ai' && (t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length === 0 && customAINodes.filter((q) => q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length === 0}
						<div class="text-center py-12">
							<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
							</svg>
							<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No queries found</p>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Try adjusting your search terms</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Workflow JSON Export Modal -->
	{#if showingWorkflowJSON}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={() => showingWorkflowJSON = false}
			onkeydown={(e) => e.key === 'Escape' && (showingWorkflowJSON = false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="json-modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4 border flex flex-col"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<!-- Header -->
				<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
							</svg>
						</div>
						<div>
							<h2 id="json-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Workflow JSON Export
							</h2>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Copy or download the JSON representation of your workflow</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<button
							onclick={copyWorkflowJSON}
							class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1.5"
						>
							{#if copiedToClipboard}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
								</svg>
								Copied!
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
								</svg>
								Copy
							{/if}
						</button>
						<button
							onclick={downloadWorkflowJSON}
							class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded transition-colors flex items-center gap-1.5"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
							</svg>
							Download
						</button>
						<button
							onclick={() => showingWorkflowJSON = false}
							class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
							aria-label="Close modal"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					</div>
				</div>

				<!-- JSON Content -->
				<div class="flex-1 overflow-y-auto p-6">
					<pre class="{darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} rounded-lg p-4 overflow-x-auto text-sm font-mono border {darkMode ? 'border-slate-700' : 'border-slate-200'}"><code>{workflowJSON}</code></pre>
				</div>
			</div>
		</div>
	{/if}

	<!-- Create Custom AI Node Modal -->
	{#if creatingCustomAI}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={cancelCreateCustomAI}
			onkeydown={(e) => e.key === 'Escape' && cancelCreateCustomAI()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<div class="p-6">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
							</svg>
						</div>
						<div>
							<h2 id="create-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Create Custom AI Node
							</h2>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Add a new AI analysis node to your workflow</p>
						</div>
					</div>

					<div class="space-y-5">
						<div>
							<label for="custom-ai-label" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Node Name <span class="text-red-500">*</span>
							</label>
							<input
								id="custom-ai-label"
								type="text"
								bind:value={customAINodeLabel}
								placeholder="e.g., Tenant Analysis, ROI Calculation"
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							/>
						</div>

						<div>
							<label for="custom-ai-model-select" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								AI Model
							</label>
							<select
								id="custom-ai-model-select"
								bind:value={customAINodeModel}
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							>
								<option value="gpt-4o">GPT-4o</option>
								<option value="gpt-4o-mini">GPT-4o Mini</option>
								<option value="gpt-4-turbo">GPT-4 Turbo</option>
								<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
							</select>
						</div>

						<div>
							<label for="custom-ai-system-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Context Instructions <span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} font-normal">(Optional)</span>
							</label>
							<textarea
								id="custom-ai-system-prompt"
								bind:value={customAINodeSystemPrompt}
								placeholder="You are an expert commercial real estate analyst..."
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
								rows="3"
							></textarea>
							<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Provide context about the AI's role and expertise</p>
						</div>

						<div>
							<label for="custom-ai-user-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Analysis Prompt <span class="text-red-500">*</span>
							</label>
							<textarea
								id="custom-ai-user-prompt"
								bind:value={customAINodePrompt}
								placeholder="Analyze the following property data: {'{input}'}"
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
								rows="5"
							></textarea>
							<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
						</div>
					</div>

					<div class="flex gap-3 mt-6">
						<button
							onclick={createCustomAINode}
							disabled={!customAINodeLabel.trim() || !customAINodePrompt.trim()}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Create Node
						</button>
						<button
							onclick={cancelCreateCustomAI}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

