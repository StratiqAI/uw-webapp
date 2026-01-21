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
	import WorkflowSidebar from './components/layout/WorkflowSidebar.svelte';
	import WorkflowToolbar from './components/layout/WorkflowToolbar.svelte';
	import WorkflowCanvas from './components/canvas/WorkflowCanvas.svelte';
	import WorkflowBottomPanel from './components/layout/WorkflowBottomPanel.svelte';
	import WorkflowExecutionDetailModal from './components/modals/WorkflowExecutionDetailModal.svelte';
	import WorkflowInputGalleryModal from './components/modals/WorkflowInputGalleryModal.svelte';
	import WorkflowProcessGalleryModal from './components/modals/WorkflowProcessGalleryModal.svelte';
	import WorkflowAIQueryEditModal from './components/modals/WorkflowAIQueryEditModal.svelte';
	import WorkflowNodeOptionsModal from './components/modals/WorkflowNodeOptionsModal.svelte';
	import WorkflowAIGalleryModal from './components/modals/WorkflowAIGalleryModal.svelte';
	import WorkflowJsonExportModal from './components/modals/WorkflowJsonExportModal.svelte';
	import WorkflowCreateCustomAIModal from './components/modals/WorkflowCreateCustomAIModal.svelte';
	import {
		loadCustomAINodesFromStorage,
		createCustomAINodeState,
		deleteCustomAINodeState,
		resetCustomAINodeDraft
	} from './services/nodes/customAiNodes';
	import { getElementTypes } from './services/nodes/nodeLibraryService';
	import { generateWorkflowJSON } from './services/serialization/workflowSerializationService';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import WorkflowSwitcher from '$lib/dashboard/components/WorkflowSwitcher.svelte';
	import { Q_GET_PROJECT } from '@stratiqai/types-simple';
	import { S_ON_WORKFLOW_EXECUTION_STATUS_CHANGE } from '$lib/graphql/workflowExecutionSubscriptions';
	import { fetchWorkflowExecutions } from './services/backend/workflowExecutionService';
	import type { WorkflowExecutionListItem } from './services/backend/workflowExecutionService';
	import { getAppSyncWsClient, initAppSyncWsClient } from '$lib/realtime/websocket/wsClient';
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
	import type { ElementType, GridElement, Connection } from './types';
	import type { PageData } from './$types';
	import type { Project } from '@stratiqai/types-simple';
	import type { WorkflowJSON } from './types/workflow';
	
	// M_UPDATE_WORKFLOW mutation - matches the structure from @stratiqai/types-simple
	// Uses CompositeKeyInput since Workflow is a child entity (has parentId)
	const M_UPDATE_WORKFLOW = `
		mutation UpdateWorkflow($key: CompositeKeyInput!, $input: UpdateWorkflowInput!) {
			updateWorkflow(key: $key, input: $input) {
				id
				entityType
				tenantId
				ownerId
				createdAt
				updatedAt
				deletedAt
				sharingMode
				name
				definitionJSON
			}
		}
	`;
	
	// M_DELETE_WORKFLOW mutation - uses CompositeKeyInput since Workflow is a child entity
	const M_DELETE_WORKFLOW = `
		mutation DeleteWorkflow($key: CompositeKeyInput!) {
			deleteWorkflow(key: $key) {
				id
				entityType
				tenantId
				ownerId
				createdAt
				updatedAt
				deletedAt
				sharingMode
				name
				definitionJSON
			}
		}
	`;
	
	// Workflow type - defined locally since it may not be exported from types-simple
	type Workflow = {
		id: string;
		name: string;
		definitionJSON: any;
		[key: string]: any;
	};
	
	// M_CREATE_WORKFLOW mutation - matches the structure from @stratiqai/types-simple
	// This is the same mutation defined in types-simple/src/graphql/mutations/Workflow.ts
	// Using inline definition since TypeScript exports may not be available, but structure matches exactly
	const M_CREATE_WORKFLOW = `
		mutation CreateWorkflow($input: CreateWorkflowInput!) {
			createWorkflow(input: $input) {
				id
				entityType
				tenantId
				ownerId
				createdAt
				updatedAt
				deletedAt
				sharingMode
				name
				definitionJSON
			}
		}
	`;

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

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
	let customAINodeModel = $state('gemini-3-flash-preview');
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
	// Project state
	// ------------------------------------------------------------------------------------------------
	let projects = $state<Project[]>(data.projects || []);
	let selectedProjectId = $state<string | null>(null);

	// ------------------------------------------------------------------------------------------------
	// Workflow state
	// ------------------------------------------------------------------------------------------------
	let workflows = $state<Workflow[]>([]);
	let selectedWorkflowId = $state<string | null>(null);
	let loadingWorkflows = $state(false);

	// ------------------------------------------------------------------------------------------------
	// Workflow executions (backend runs from events)
	// ------------------------------------------------------------------------------------------------
	let executions = $state<WorkflowExecutionListItem[]>([]);
	let executionsLoading = $state(false);
	let selectedExecutionId = $state<string | null>(null);
	const executionsSubscriptionSpecRef = { current: null as { query: any; variables: any; next: (p: any) => void } | null };

	// Load workflows when project changes
	async function loadWorkflowsForProject(projectId: string | null) {
		if (!projectId || !data.idToken) {
			workflows = [];
			selectedWorkflowId = null;
			return;
		}

		loadingWorkflows = true;
		try {
			// Query the project to get its workflows using the exact query structure
			const response = await gql<{ getProject: { workflows?: { items: Workflow[]; nextToken?: string | null } } | null }>(
				Q_GET_PROJECT,
				{ id: projectId },
				data.idToken
			);
			
			const workflowItems = response?.getProject?.workflows?.items || [];
			console.log('Loaded workflows for project:', projectId, workflowItems);
			workflows = workflowItems;
		} catch (error) {
			console.error('Failed to load workflows:', error);
			workflows = [];
		} finally {
			loadingWorkflows = false;
		}
	}

	function handleProjectChange(projectId: string | null) {
		selectedProjectId = projectId;
		selectedWorkflowId = null; // Clear selected workflow when project changes
		loadWorkflowsForProject(projectId);
	}

	// Load workflows when project is selected (including on initial load)
	$effect(() => {
		if (selectedProjectId && data.idToken) {
			loadWorkflowsForProject(selectedProjectId);
		}
	});

	// Load workflow executions and subscribe to status changes when a workflow is selected
	$effect(() => {
		const wfId = selectedWorkflowId;
		const token = data.idToken;
		if (!wfId || !token) {
			executions = [];
			const client = getAppSyncWsClient();
			const spec = executionsSubscriptionSpecRef.current;
			if (client && spec) {
				client.removeSubscription(spec);
				executionsSubscriptionSpecRef.current = null;
			}
			return;
		}
		let cancelled = false;
		(async () => {
			executionsLoading = true;
			try {
				const { items } = await fetchWorkflowExecutions(wfId, token);
				if (cancelled) return;
				executions = items;
			} catch (e) {
				if (!cancelled) executions = [];
			} finally {
				if (!cancelled) executionsLoading = false;
			}
			if (cancelled) return;
			const client = getAppSyncWsClient() ?? initAppSyncWsClient({
				graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
				auth: { mode: 'cognito', idToken: token }
			});
			const spec = {
				query: S_ON_WORKFLOW_EXECUTION_STATUS_CHANGE,
				variables: { workflowId: wfId },
				next: (payload: any) => {
					if (cancelled) return;
					const d = payload?.onWorkflowExecutionStatusChange;
					if (!d) return;
					executions = (() => {
						const list = executions;
						const idx = list.findIndex((e) => e.id === d.id);
						if (idx >= 0) {
							const n = [...list];
							n[idx] = { ...list[idx], ...d };
							return n;
						}
						return [d, ...list];
					})();
				}
			};
			executionsSubscriptionSpecRef.current = spec;
			client.addSubscription(spec);
		})();
		return () => {
			cancelled = true;
			const client = getAppSyncWsClient();
			const spec = executionsSubscriptionSpecRef.current;
			if (client && spec) {
				client.removeSubscription(spec);
				executionsSubscriptionSpecRef.current = null;
			}
		};
	});

	// ------------------------------------------------------------------------------------------------
	// Load workflow into canvas
	// ------------------------------------------------------------------------------------------------
	function findElementTypeByTypeAndCategory(typeId: string, category: string): ElementType | null {
		// Try to find element type by matching id (with or without prefix)
		// Use allElementTypes to include custom AI nodes
		// First try exact match
		let found = allElementTypes.find((et) => et.id === typeId);
		if (found) return found;

		// Try with category prefix
		found = allElementTypes.find((et) => et.id === `${category}-${typeId}`);
		if (found) return found;

		// Try without prefix if it has one
		const withoutPrefix = typeId.replace(/^(input|output|process|ai)-/, '');
		found = allElementTypes.find((et) => {
			const etWithoutPrefix = et.id.replace(/^(input|output|process|ai)-/, '');
			return etWithoutPrefix === withoutPrefix && et.type === category;
		});
		if (found) return found;

		return null;
	}

	function loadWorkflowIntoCanvas(workflow: Workflow) {
		if (!workflow.definitionJSON) {
			console.error('Workflow has no definitionJSON');
			return;
		}

		try {
			const workflowData: WorkflowJSON = typeof workflow.definitionJSON === 'string' 
				? JSON.parse(workflow.definitionJSON)
				: workflow.definitionJSON;

			// Clear current canvas
			gridElements = [];
			connections = [];

			// Deserialize elements
			const newElements: GridElement[] = [];
			for (const elData of workflowData.elements || []) {
				// Handle comments specially since they're not in the element types library
				let elementType: ElementType | null = null;
				if (elData.category === 'comment') {
					// Create comment element type inline (same as createCommentAt)
					elementType = {
						id: 'comment',
						type: 'comment',
						label: 'Comment',
						icon: '💬',
						execute: () => null
					};
				} else {
					elementType = findElementTypeByTypeAndCategory(elData.type, elData.category);
				}

				if (!elementType) {
					console.warn(`Could not find element type for: ${elData.type} (category: ${elData.category})`);
					continue;
				}

				const gridElement: GridElement = {
					id: elData.id,
					type: elementType,
					x: elData.x,
					y: elData.y,
					width: elData.width,
					height: elData.height,
					...(elData.aiQueryData && { aiQueryData: elData.aiQueryData }),
					...(elData.output !== undefined && { output: elData.output }),
					...(elData.nodeOptions !== undefined && { nodeOptions: elData.nodeOptions }),
					...(elData.commentText && { commentText: elData.commentText })
				};
				newElements.push(gridElement);
			}

			// Deserialize connections
			const newConnections: Connection[] = (workflowData.connections || []).map((connData) => ({
				id: connData.id,
				from: connData.from,
				to: connData.to,
				fromSide: connData.fromSide,
				toSide: connData.toSide
			}));

			gridElements = newElements;
			connections = newConnections;
		} catch (error) {
			console.error('Failed to load workflow into canvas:', error);
			alert(`Error loading workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	function handleWorkflowChange(workflowId: string | null) {
		selectedWorkflowId = workflowId;
		if (workflowId) {
			const workflow = workflows.find((w) => w.id === workflowId);
			if (workflow) {
				loadWorkflowIntoCanvas(workflow);
			}
		} else {
			// Clear canvas when "New Workflow" is selected
			gridElements = [];
			connections = [];
			workflowResults = [];
		}
	}

	// ------------------------------------------------------------------------------------------------
	// Delete workflow
	// ------------------------------------------------------------------------------------------------
	async function handleDeleteWorkflow(workflowId: string) {
		if (!data.idToken) {
			console.error('No authentication token available');
			alert('Error: Not authenticated. Please refresh the page.');
			return;
		}

		if (!selectedProjectId) {
			console.error('No project selected');
			alert('Error: Please select a project before deleting the workflow.');
			return;
		}

		const workflow = workflows.find((w) => w.id === workflowId);
		if (!workflow) {
			console.error('Workflow not found:', workflowId);
			return;
		}

		try {
			// CompositeKeyInput requires both id and parentId for child entities
			const key = {
				id: workflowId,
				parentId: selectedProjectId
			};

			const response = await gql<{ deleteWorkflow: { id: string } | null }>(
				M_DELETE_WORKFLOW,
				{ key },
				data.idToken
			);

			if (!response.deleteWorkflow) {
				console.error('Workflow deletion returned null');
				alert('Error deleting workflow: No workflow returned');
				return;
			}

			// Remove the workflow from local state
			workflows = workflows.filter((w) => w.id !== workflowId);

			// If the deleted workflow was selected, clear the selection and canvas
			if (selectedWorkflowId === workflowId) {
				selectedWorkflowId = null;
				gridElements = [];
				connections = [];
				workflowResults = [];
			}

			console.log('Workflow deleted successfully:', response.deleteWorkflow);
		} catch (error) {
			console.error('Failed to delete workflow:', error);
			alert(`Error deleting workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	// ------------------------------------------------------------------------------------------------
	// Rename workflow
	// ------------------------------------------------------------------------------------------------
	async function handleRenameWorkflow(workflowId: string, newName: string) {
		if (!data.idToken) {
			console.error('No authentication token available');
			alert('Error: Not authenticated. Please refresh the page.');
			return;
		}

		if (!selectedProjectId) {
			console.error('No project selected');
			alert('Error: Please select a project before renaming the workflow.');
			return;
		}

		const workflow = workflows.find((w) => w.id === workflowId);
		if (!workflow) {
			console.error('Workflow not found:', workflowId);
			return;
		}

		try {
			// UpdateWorkflowInput - both fields are optional, so we can update just the name
			// For a rename, we only need to send the name field
			const input: { name: string; definitionJSON?: string } = {
				name: newName
			};
			
			// Optionally include definitionJSON to preserve it during the update
			// Convert to string if it's an object (AWSJSON expects a string)
			if (workflow.definitionJSON) {
				input.definitionJSON = typeof workflow.definitionJSON === 'string' 
					? workflow.definitionJSON 
					: JSON.stringify(workflow.definitionJSON);
			}

			// CompositeKeyInput requires both id and parentId for child entities
			const key = {
				id: workflowId,
				parentId: selectedProjectId
			};

			const response = await gql<{ updateWorkflow: { id: string; name: string } | null }>(
				M_UPDATE_WORKFLOW,
				{ key, input },
				data.idToken
			);

			if (!response.updateWorkflow) {
				console.error('Workflow update returned null');
				alert('Error renaming workflow: No workflow returned');
				return;
			}

			// Update the workflow in the local state
			const workflowIndex = workflows.findIndex((w) => w.id === workflowId);
			if (workflowIndex !== -1) {
				workflows[workflowIndex] = {
					...workflows[workflowIndex],
					name: newName
				};
				// Trigger reactivity by reassigning
				workflows = [...workflows];
			}

			console.log('Workflow renamed successfully:', response.updateWorkflow);
		} catch (error) {
			console.error('Failed to rename workflow:', error);
			alert(`Error renaming workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error; // Re-throw so the component can handle it
		}
	}

	// ------------------------------------------------------------------------------------------------
	// Save workflow to backend
	// ------------------------------------------------------------------------------------------------
	async function saveWorkflow() {
		if (!data.idToken) {
			console.error('No authentication token available');
			alert('Error: Not authenticated. Please refresh the page.');
			return;
		}

		if (!selectedProjectId) {
			alert('Error: Please select a project before saving the workflow.');
			return;
		}

		try {
			// Generate workflow JSON
			const workflowJSON = generateWorkflowJSON(gridElements, connections);

			// Check if we're updating an existing workflow or creating a new one
			if (selectedWorkflowId) {
				// Update existing workflow
				const workflow = workflows.find((w) => w.id === selectedWorkflowId);
				if (!workflow) {
					alert('Error: Selected workflow not found.');
					return;
				}

				const input: { name: string; definitionJSON: string } = {
					name: workflow.name, // Keep existing name, or you could update it
					definitionJSON: workflowJSON
				};

				// CompositeKeyInput requires both id and parentId for child entities
				const key = {
					id: selectedWorkflowId,
					parentId: selectedProjectId
				};

				const response = await gql<{ updateWorkflow: { id: string; name: string; definitionJSON: any } | null }>(
					M_UPDATE_WORKFLOW,
					{ key, input },
					data.idToken
				);

				if (!response.updateWorkflow) {
					console.error('Workflow update returned null');
					alert('Error updating workflow: No workflow returned');
					return;
				}

				// Update the workflow in local state
				const workflowIndex = workflows.findIndex((w) => w.id === selectedWorkflowId);
				if (workflowIndex !== -1) {
					workflows[workflowIndex] = {
						...workflows[workflowIndex],
						...response.updateWorkflow
					};
					workflows = [...workflows]; // Trigger reactivity
				}

				console.log('Workflow updated successfully:', response.updateWorkflow);
				alert('Workflow updated successfully!');
			} else {
				// Create new workflow
				const input = {
					name: 'New Workflow',
					definitionJSON: workflowJSON,
					parentId: selectedProjectId
				};

				const response = await gql<{ createWorkflow: { id: string; name: string; definitionJSON: any } | null }>(
					M_CREATE_WORKFLOW,
					{ input },
					data.idToken
				);

				if (!response.createWorkflow) {
					console.error('Workflow creation returned null');
					alert('Error saving workflow: No workflow returned');
					return;
				}

				// Add the new workflow to the list and select it
				workflows = [...workflows, response.createWorkflow];
				selectedWorkflowId = response.createWorkflow.id;

				console.log('Workflow created successfully:', response.createWorkflow);
				alert('Workflow created successfully!');
			}
		} catch (error) {
			console.error('Failed to save workflow:', error);
			alert(`Error saving workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// ------------------------------------------------------------------------------------------------
	// Lifecycle: load custom AI nodes on mount
	// ------------------------------------------------------------------------------------------------
	if (typeof window !== 'undefined') {
		customAINodes = loadCustomAINodesFromStorage();
	}

	// ------------------------------------------------------------------------------------------------
	// Custom AI node management (create/save/delete)
	// ------------------------------------------------------------------------------------------------
	function createCustomAINode() {
		const result = createCustomAINodeState({
			customAINodes,
			draft: {
				label: customAINodeLabel,
				prompt: customAINodePrompt,
				model: customAINodeModel,
				systemPrompt: customAINodeSystemPrompt
			}
		});

		if (!result.created) {
			return;
		}

		customAINodes = result.customAINodes;
		customAINodeLabel = result.draft.label;
		customAINodePrompt = result.draft.prompt;
		customAINodeModel = result.draft.model;
		customAINodeSystemPrompt = result.draft.systemPrompt;
		creatingCustomAI = false;
	}

	function deleteCustomAINode(nodeId: string) {
		customAINodes = deleteCustomAINodeState(customAINodes, nodeId);
	}

	function cancelCreateCustomAI() {
		const resetDraft = resetCustomAINodeDraft();
		customAINodeLabel = resetDraft.label;
		customAINodePrompt = resetDraft.prompt;
		customAINodeModel = resetDraft.model;
		customAINodeSystemPrompt = resetDraft.systemPrompt;
		creatingCustomAI = false;
	}

	// ------------------------------------------------------------------------------------------------
	// Canvas interactions are handled inside WorkflowCanvas
	// ------------------------------------------------------------------------------------------------

	// ------------------------------------------------------------------------------------------------
	// Workflow execution: topological run and results capture (in-browser / local preview only)
	// - Starts from output nodes when present; otherwise from sink nodes (no outgoing connections)
	//   so workflows like Input -> AI without an Output node still run.
	// - Does NOT call the backend; for real runs (Pinecone/Gemini, etc.) use "Test run" when available.
	// ------------------------------------------------------------------------------------------------
	async function executeWorkflow() {
		workflowResults = [];

		const processed = new Set<string>();
		const results = new Map<string, any>();

		async function executeElement(elementId: string): Promise<any> {
			if (processed.has(elementId)) {
				return results.get(elementId);
			}

			const element = gridElements.find((el) => el.id === elementId);
			if (!element) return null;

			const inputConnections = connections.filter((conn) => conn.to === elementId);
			let input: any = null;

			if (inputConnections.length > 0) {
				const inputs = await Promise.all(
					inputConnections.map((conn) => executeElement(conn.from))
				);
				input = inputs.length === 1 ? inputs[0] : inputs;
			} else if (element.type.type === 'input') {
				// Input nodes: use nodeOptions when set, or synthetic placeholder for local run
				input = element.nodeOptions ?? {
					_source: 'local-run',
					doclinkId: 'local-placeholder',
					documentId: 'local-placeholder',
					filename: 'test-document.pdf'
				};
			}

			const outputPromise = element.type.execute(input, element.aiQueryData);
			const output = await Promise.resolve(outputPromise);
			element.output = output;
			results.set(elementId, output);
			processed.add(elementId);

			return output;
		}

		// Start from output-type nodes if any; otherwise from sink nodes (no outgoing) so
		// workflows like Input -> AI run without requiring an Output node.
		const outputTypeElements = gridElements.filter((el) => el.type.type === 'output');
		const sinkElements = gridElements.filter((el) => !connections.some((c) => c.from === el.id));
		const roots = outputTypeElements.length > 0 ? outputTypeElements : sinkElements;

		if (roots.length === 0) {
			// No sink and no output: try running from every node (e.g. single disconnected node)
			await Promise.all(gridElements.map((el) => executeElement(el.id)));
		} else {
			await Promise.all(roots.map((el) => executeElement(el.id)));
		}

		workflowResults = Array.from(results.entries()).map(([id, value]) => {
			const element = gridElements.find((el) => el.id === id);
			return {
				elementId: id,
				label: element?.type.label || element?.type.id || '',
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
			{projects}
			{selectedProjectId}
			{workflows}
			{selectedWorkflowId}
			onSave={saveWorkflow}
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
			onProjectChange={handleProjectChange}
			onWorkflowChange={handleWorkflowChange}
			onRenameWorkflow={handleRenameWorkflow}
			onDeleteWorkflow={handleDeleteWorkflow}
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

		<WorkflowBottomPanel
			results={workflowResults}
			onClearResults={() => (workflowResults = [])}
			{executions}
			executionsLoading={executionsLoading}
			{selectedWorkflowId}
			onSelectExecution={(exec) => (selectedExecutionId = exec.id)}
			{darkMode}
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
			{selectedProjectId}
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

	<!-- Workflow Execution Detail Modal -->
	{#if selectedExecutionId && data.idToken}
		<WorkflowExecutionDetailModal
			executionId={selectedExecutionId}
			idToken={data.idToken}
			{darkMode}
			onClose={() => (selectedExecutionId = null)}
		/>
	{/if}
</div>

