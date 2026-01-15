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
	import WorkflowInputGalleryModal from './components/WorkflowInputGalleryModal.svelte';
	import WorkflowProcessGalleryModal from './components/WorkflowProcessGalleryModal.svelte';
	import WorkflowAIQueryEditModal from './components/WorkflowAIQueryEditModal.svelte';
	import WorkflowNodeOptionsModal from './components/WorkflowNodeOptionsModal.svelte';
	import WorkflowAIGalleryModal from './components/WorkflowAIGalleryModal.svelte';
	import WorkflowJsonExportModal from './components/WorkflowJsonExportModal.svelte';
	import WorkflowCreateCustomAIModal from './components/WorkflowCreateCustomAIModal.svelte';
	import { loadCustomAINodes as loadCustomNodes, saveCustomAINodes, createCustomAINode as createCustomNode } from './services/customNodeService';
	import { getElementTypes } from './services/nodeLibraryService';
	import type { ElementType, GridElement, Connection } from './types';

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
	let dragOffset = $state({ x: 0, y: 0 });
	let gridContainer = $state<HTMLDivElement | null>(null);
	let svgContainer = $state<SVGSVGElement | null>(null);
	let panX = $state(0);
	let panY = $state(0);
	let zoomLevel = $state(1);

	// ------------------------------------------------------------------------------------------------
	// UI filters + modal state
	// ------------------------------------------------------------------------------------------------
	let nodeFilter = $state('');
	let creatingCustomAI = $state(false);
	let showingAIGallery = $state(false);
	let showingInputGallery = $state(false);
	let showingProcessGallery = $state(false);
	let aiGalleryFilter = $state('');
	let workflowResults = $state<any[]>([]);
	let editingAIQuery = $state<GridElement | null>(null);
	let editingNodeOptions = $state<GridElement | null>(null);
	let showingWorkflowJSON = $state(false);
	let canvasRef: any = null;

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
	// Canvas interactions are handled inside WorkflowCanvas
	// ------------------------------------------------------------------------------------------------

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

	// ------------------------------------------------------------------------------------------------
	// Element configuration: double-click editors (AI + node options)
	// ------------------------------------------------------------------------------------------------
	// Handle double-click on element
	function handleElementDoubleClick(element: GridElement, event: MouseEvent) {
		event.stopPropagation();
		if (element.type.type === 'ai') {
			editingAIQuery = element;
		} else {
			editingNodeOptions = element;
		}
	}

	// Toggle dark mode
	// Dark mode toggle is now handled by the unified store

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

	// Mouse wheel zoom is handled inside WorkflowCanvas
</script>

<!-- Layout: sidebar + canvas workspace + modal layers -->
<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
	<WorkflowSidebar
		allElementTypes={allElementTypes}
		darkMode={darkMode}
		bind:nodeFilter={nodeFilter}
		bind:draggedElementType={draggedElementType}
		bind:dragOffset={dragOffset}
		onShowInputGallery={() => (showingInputGallery = true)}
		onShowProcessGallery={() => (showingProcessGallery = true)}
		onShowAIGallery={() => (showingAIGallery = true)}
		onAddComment={() => {
			if (gridContainer) {
				const rect = gridContainer.getBoundingClientRect();
				const centerX = (rect.width / 2 - panX) / zoomLevel;
				const centerY = (rect.height / 2 - panY) / zoomLevel;
				canvasRef?.createCommentAt(centerX - 100, centerY - 50);
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
			onExport={() => (showingWorkflowJSON = true)}
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
			bind:this={canvasRef}
			bind:gridContainer={gridContainer}
			bind:svgContainer={svgContainer}
			bind:gridElements={gridElements}
			bind:connections={connections}
			bind:zoomLevel={zoomLevel}
			bind:panX={panX}
			bind:panY={panY}
			bind:draggedElementType={draggedElementType}
			bind:dragOffset={dragOffset}
			{darkMode}
			onNodeDelete={deleteElement}
			onNodeDoubleClick={handleElementDoubleClick}
			onExecuteWorkflow={executeWorkflow}
			{generateId}
		/>

		<WorkflowResultsPanel
			results={workflowResults}
			{darkMode}
			onClear={() => (workflowResults = [])}
		/>
	</div>

	<!-- Property Data Gallery Modal -->
	{#if showingInputGallery}
		<WorkflowInputGalleryModal
			{darkMode}
			{elementTypes}
			{gridContainer}
			{panX}
			{panY}
			{zoomLevel}
			bind:gridElements={gridElements}
			onClose={() => (showingInputGallery = false)}
			{generateId}
		/>
	{/if}

	<!-- Financial Calculations Gallery Modal -->
	{#if showingProcessGallery}
		<WorkflowProcessGalleryModal
			{darkMode}
			{elementTypes}
			{gridContainer}
			{panX}
			{panY}
			{zoomLevel}
			bind:gridElements={gridElements}
			onClose={() => (showingProcessGallery = false)}
			{generateId}
		/>
	{/if}

	<!-- AI Query Edit Modal -->
	{#if editingAIQuery}
		<WorkflowAIQueryEditModal
			{darkMode}
			bind:editingAIQuery={editingAIQuery}
			onSave={executeWorkflow}
		/>
	{/if}

	<!-- Node Options Modal -->
	{#if editingNodeOptions}
		<WorkflowNodeOptionsModal
			{darkMode}
			bind:editingNodeOptions={editingNodeOptions}
			onSave={executeWorkflow}
		/>
	{/if}

	<!-- AI Query Gallery Modal -->
	{#if showingAIGallery}
		<WorkflowAIGalleryModal
			{darkMode}
			bind:aiGalleryFilter={aiGalleryFilter}
			{elementTypes}
			{customAINodes}
			{gridContainer}
			{panX}
			{panY}
			{zoomLevel}
			bind:gridElements={gridElements}
			onClose={() => (showingAIGallery = false)}
			onCreateCustomAI={() => {
				showingAIGallery = false;
				creatingCustomAI = true;
			}}
			deleteCustomAINode={deleteCustomAINode}
			{generateId}
		/>
	{/if}

	<!-- Workflow JSON Export Modal -->
	{#if showingWorkflowJSON}
		<WorkflowJsonExportModal
			{darkMode}
			{gridElements}
			{connections}
			onClose={() => (showingWorkflowJSON = false)}
		/>
	{/if}

	<!-- Create Custom AI Node Modal -->
	{#if creatingCustomAI}
		<WorkflowCreateCustomAIModal
			{darkMode}
			bind:customAINodeLabel={customAINodeLabel}
			bind:customAINodeModel={customAINodeModel}
			bind:customAINodeSystemPrompt={customAINodeSystemPrompt}
			bind:customAINodePrompt={customAINodePrompt}
			onCreate={createCustomAINode}
			onClose={cancelCreateCustomAI}
		/>
	{/if}
</div>

