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
	import { generateId } from '../../utils/idGenerator';
	import WorkflowSidebar from '../../components/layout/WorkflowSidebar.svelte';
	import WorkflowToolbar from '../../components/layout/WorkflowToolbar.svelte';
	import WorkflowCanvas from '../../components/canvas/WorkflowCanvas.svelte';
	import WorkflowBottomPanel from '../../components/layout/WorkflowBottomPanel.svelte';
	import WorkflowExecutionDetailModal from '../../components/modals/WorkflowExecutionDetailModal.svelte';
	import WorkflowInputGalleryModal from '../../components/modals/WorkflowInputGalleryModal.svelte';
	import WorkflowProcessGalleryModal from '../../components/modals/WorkflowProcessGalleryModal.svelte';
	import WorkflowAIQueryEditModal from '../../components/modals/WorkflowAIQueryEditModal.svelte';
	import WorkflowNodeOptionsModal from '../../components/modals/WorkflowNodeOptionsModal.svelte';
	import WorkflowAIGalleryModal from '../../components/modals/WorkflowAIGalleryModal.svelte';
	import WorkflowJsonExportModal from '../../components/modals/WorkflowJsonExportModal.svelte';
	import WorkflowCreateCustomAIModal from '../../components/modals/WorkflowCreateCustomAIModal.svelte';
	import {
		loadCustomAINodesFromStorage,
		createCustomAINodeState,
		deleteCustomAINodeState,
		resetCustomAINodeDraft
	} from '../../services/nodes/customAiNodes';
	import { getElementTypes } from '../../services/nodes/nodeLibraryService';
	import { generateWorkflowJSON } from '../../services/serialization/workflowSerializationService';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import WorkflowSwitcher from '$lib/dashboard/components/WorkflowSwitcher.svelte';
	import {
		Q_GET_PROJECT,
		M_CREATE_WORKFLOW,
		M_UPDATE_WORKFLOW,
		M_DELETE_WORKFLOW,
		type CreateWorkflowMutation,
		type UpdateWorkflowMutation,
		type DeleteWorkflowMutation
	} from '@stratiqai/types-simple';
	import { S_ON_WORKFLOW_EXECUTION_STATUS_CHANGE } from '$lib/graphql/workflowExecutionSubscriptions';
	import { fetchWorkflowExecutions } from '../../services/backend/workflowExecutionService';
	import type { WorkflowExecutionListItem } from '../../services/backend/workflowExecutionService';
	import { getAppSyncWsClient, initAppSyncWsClient } from '$lib/realtime/websocket/wsClient';
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
	import type { ElementType, GridElement, Connection } from '../../types';
	import { isExecutableNode } from '../../types/node';
	import type { PageData } from './$types';
	import type { Project, Workflow, WorkflowExecution } from '@stratiqai/types-simple';
	import type { WorkflowJSON } from '../../types/workflow';
	import { WorkflowSyncManager } from '$lib/realtime/websocket/syncManagers/WorkflowSyncManager';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { toTopicPath } from '$lib/realtime/store/TopicMapper';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	
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
	// Initialize from URL params
	let selectedProjectId = $state<string | null>(data.projectId || null);

	// ------------------------------------------------------------------------------------------------
	// Workflow state
	// ------------------------------------------------------------------------------------------------
	let workflows = $state<Workflow[]>([]);
	// Initialize from URL params
	let selectedWorkflowId = $state<string | null>(data.workflowId || null);
	let loadingWorkflows = $state(false);

	// ------------------------------------------------------------------------------------------------
	// Workflow executions (backend runs from events)
	// ------------------------------------------------------------------------------------------------
	let executions = $state<WorkflowExecutionListItem[]>([]);
	let executionsLoading = $state(false);
	let selectedExecutionId = $state<string | null>(null);
	const executionsSubscriptionSpecRef = { current: null as { query: any; variables: any; next: (p: any) => void } | null };

	// ------------------------------------------------------------------------------------------------
	// Workflow Sync Manager
	// ------------------------------------------------------------------------------------------------
	let workflowSyncManager = $state<WorkflowSyncManager | null>(null);

	onMount(async () => {
		if (data.idToken) {
			try {
				workflowSyncManager = await WorkflowSyncManager.create({
					idToken: data.idToken,
					setupSubscriptions: true
				});
			} catch (error) {
				console.error('Failed to initialize WorkflowSyncManager:', error);
			}
		}
	});

	onDestroy(() => {
		if (workflowSyncManager) {
			workflowSyncManager.cleanup();
			workflowSyncManager = null;
		}
	});

	// Load workflow from URL params on initial load
	$effect(() => {
		if (data.projectId) {
			selectedProjectId = data.projectId;
			if (data.workflowId && data.workflow) {
				// If we have a workflow from the server, load it
				selectedWorkflowId = data.workflowId;
				if (data.project) {
					workflows = data.project.workflows?.items || [];
				}
				loadWorkflowIntoCanvas(data.workflow);
			} else {
				// Just project ID, load workflows
				selectedWorkflowId = null;
				if (data.project) {
					workflows = data.project.workflows?.items || [];
				} else {
					loadWorkflowsForProject(data.projectId);
				}
			}
		}
	});

	// Function to load workflow executions for the selected workflow
	async function loadWorkflowExecutions() {
		const wfId = selectedWorkflowId;
		const projectId = selectedProjectId;
		const token = data.idToken;
		console.log('[loadWorkflowExecutions] Loading executions:', { wfId, projectId, token });
		if (!wfId || !projectId || !token) {
			executions = [];
			return;
		}

		executionsLoading = true;
		try {
			console.log('[loadWorkflowExecutions] Loading executions:', { wfId, projectId });
			const { items } = await fetchWorkflowExecutions(wfId, projectId, token);
			console.log('[loadWorkflowExecutions] Loaded executions:', { count: items.length, items });
			executions = items;
		} catch (e) {
			console.error('Failed to load workflow executions:', e);
			executions = [];
		} finally {
			executionsLoading = false;
		}
	}

	// Load workflows when project changes
	async function loadWorkflowsForProject(projectId: string | null) {
		if (!projectId || !data.idToken) {
			workflows = [];
			selectedWorkflowId = null;
			return;
		}

		loadingWorkflows = true;
		try {
			// Query the project to get its workflows and workflowExecutions
			const response = await gql<{ 
				getProject: { 
					workflows?: { items: Workflow[]; nextToken?: string | null };
					workflowexecutions?: { items: WorkflowExecution[]; nextToken?: string | null };
				} | null 
			}>(
				Q_GET_PROJECT,
				{ id: projectId },
				data.idToken
			);
			
			const project = response?.getProject;
			const workflowItems = project?.workflows?.items || [];
			const executionItems = project?.workflowexecutions?.items || [];
			
			console.log('Loaded workflows for project:', projectId, workflowItems);
			console.log('Loaded workflow executions for project:', projectId, executionItems.length, executionItems);
			
			workflows = workflowItems;

			// Publish workflow executions to the store (use 'workflowExecutions' camelCase to match sync manager)
			if (executionItems.length > 0) {
				for (const execution of executionItems) {
					const topic = toTopicPath('workflowExecutions', execution.id);
					const published = validatedTopicStore.publish(topic, execution);
					console.log(`[loadWorkflowsForProject] Published execution ${execution.id} to ${topic}:`, published, execution);
				}
				console.log(`[loadWorkflowsForProject] Published ${executionItems.length} workflow executions to store`);
				
				// Verify they're in the store
				const stored = validatedTopicStore.getAllAtArray<WorkflowExecution>('workflowExecutions');
				console.log(`[loadWorkflowsForProject] Verified: ${stored.length} executions now in store:`, stored.map(e => ({ id: e.id, workflowId: e.workflowId })));
			}
		} catch (error) {
			console.error('Failed to load workflows:', error);
			workflows = [];
		} finally {
			loadingWorkflows = false;
		}
	}

	async function handleProjectChange(projectId: string | null) {
		selectedProjectId = projectId;
		selectedWorkflowId = null; // Clear selected workflow when project changes
		
		// Navigate to new URL
		if (projectId) {
			await goto(`/workflow/${projectId}`, { replaceState: true });
		} else {
			await goto('/workflow', { replaceState: true });
		}
		
		loadWorkflowsForProject(projectId);
		// Update the create workflow subscription to filter by the new projectId
		if (workflowSyncManager?.isReady) {
			workflowSyncManager.updateCreateWorkflowSubscription(projectId ?? undefined);
		}
	}

	// Load workflows when project is selected (including on initial load)
	$effect(() => {
		if (selectedProjectId && data.idToken) {
			loadWorkflowsForProject(selectedProjectId);
		}
		// Update the create workflow subscription when project changes
		if (workflowSyncManager?.isReady) {
			workflowSyncManager.updateCreateWorkflowSubscription(selectedProjectId ?? undefined);
		}
	});

	// Load workflow executions and subscribe to status changes when a workflow is selected
	$effect(() => {
		const wfId = selectedWorkflowId;
		const projectId = selectedProjectId;
		const token = data.idToken;
		if (!wfId || !projectId || !token) {
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
			// Load executions
			await loadWorkflowExecutions();
			if (cancelled) return;

			// Set up subscription for real-time updates
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

	/**
	 * Generate UI structure from gridElements and connections for the ui field
	 */
	function generateWorkflowUI() {
		return {
			elements: gridElements.map((el) => {
				const category = el.type.type;
				const typeIdWithoutPrefix = el.type.id.replace(/^(input|output|process|ai)-/, '');
				return {
					id: el.id,
					type: typeIdWithoutPrefix,
					category,
					typeLabel: el.type.label,
					x: el.x,
					y: el.y,
					width: el.width,
					height: el.height
				};
			}),
			connections: connections.map((conn) => ({
				id: conn.id,
				from: conn.from,
				to: conn.to,
				fromSide: conn.fromSide,
				toSide: conn.toSide
			}))
		};
	}

	function loadWorkflowIntoCanvas(workflow: Workflow) {
		// Clear current canvas
		gridElements = [];
		connections = [];

		try {
			// Prefer loading from ui field if available, otherwise fall back to definition
			let elementsData: any[] = [];
			let connectionsData: any[] = [];

			if (workflow.ui && workflow.ui.elements && workflow.ui.connections) {
				// Load from ui field
				elementsData = workflow.ui.elements;
				connectionsData = workflow.ui.connections;
			} else if (workflow.definition) {
				// Fall back to definition for backward compatibility
				const workflowData: WorkflowJSON = typeof workflow.definition === 'string' 
					? JSON.parse(workflow.definition)
					: workflow.definition;
				elementsData = workflowData.elements || [];
				connectionsData = workflowData.connections || [];
			} else {
				console.error('Workflow has no ui or definition');
				return;
			}

			// Deserialize elements
			const newElements: GridElement[] = [];
			for (const elData of elementsData) {
				// Handle comments specially since they're not in the element types library
				let elementType: ElementType | null = null;
				if (elData.category === 'comment') {
					// Create comment element type inline (same as createCommentAt)
					elementType = {
						id: 'comment',
						type: 'comment',
						label: 'Comment',
						icon: '💬'
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
			const newConnections: Connection[] = connectionsData.map((connData) => ({
				id: connData.id,
				from: connData.from,
				to: connData.to,
				fromSide: connData.fromSide,
				toSide: connData.toSide
			}));

			// If we loaded from ui field, we still need to load additional data (aiQueryData, nodeOptions, etc.) from definition
			if (workflow.ui && workflow.definition) {
				const workflowData: WorkflowJSON = typeof workflow.definition === 'string' 
					? JSON.parse(workflow.definition)
					: workflow.definition;
				
				// Merge additional data from definition into elements
				for (const elData of workflowData.elements || []) {
					const gridElement = newElements.find((el) => el.id === elData.id);
					if (gridElement) {
						if (elData.aiQueryData) gridElement.aiQueryData = elData.aiQueryData;
						if (elData.output !== undefined) gridElement.output = elData.output;
						if (elData.nodeOptions !== undefined) gridElement.nodeOptions = elData.nodeOptions;
						if (elData.commentText) gridElement.commentText = elData.commentText;
					}
				}
			}

			gridElements = newElements;
			connections = newConnections;
		} catch (error) {
			console.error('Failed to load workflow into canvas:', error);
			alert(`Error loading workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async function handleWorkflowChange(workflowId: string | null) {
		selectedWorkflowId = workflowId;
		
		// Navigate to new URL
		if (selectedProjectId) {
			if (workflowId) {
				await goto(`/workflow/${selectedProjectId}/${workflowId}`, { replaceState: true });
			} else {
				await goto(`/workflow/${selectedProjectId}`, { replaceState: true });
			}
		}
		
		if (workflowId) {
			const workflow = workflows.find((w) => w.id === workflowId);
			if (workflow) {
				loadWorkflowIntoCanvas(workflow);
			}
		} else {
			// Clear canvas when "New Workflow" is selected
			gridElements = [];
			connections = [];
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

			const response = await gql<DeleteWorkflowMutation>(
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
			const input: { name: string; definition?: string; ui?: any } = {
				name: newName
			};
			
			// Optionally include definition to preserve it during the update
			// Convert to string if it's an object (AWSJSON expects a string)
			if (workflow.definition) {
				input.definition = typeof workflow.definition === 'string' 
					? workflow.definition 
					: JSON.stringify(workflow.definition);
			}
			
			// Preserve ui field if it exists
			if (workflow.ui) {
				input.ui = workflow.ui;
			}

			// CompositeKeyInput requires both id and parentId for child entities
			const key = {
				id: workflowId,
				parentId: selectedProjectId
			};

			const response = await gql<UpdateWorkflowMutation>(
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

			// Generate UI structure
			const workflowUI = generateWorkflowUI();

			// Check if we're updating an existing workflow or creating a new one
			if (selectedWorkflowId) {
				// Update existing workflow
				const workflow = workflows.find((w) => w.id === selectedWorkflowId);
				if (!workflow) {
					alert('Error: Selected workflow not found.');
					return;
				}

				const input: { name: string; definition: string; ui: typeof workflowUI } = {
					name: workflow.name, // Keep existing name, or you could update it
					definition: workflowJSON,
					ui: workflowUI
				};

				// CompositeKeyInput requires both id and parentId for child entities
				const key = {
					id: selectedWorkflowId,
					parentId: selectedProjectId
				};

				const response = await gql<UpdateWorkflowMutation>(
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
					definition: workflowJSON,
					ui: workflowUI,
					parentId: selectedProjectId
				};

				console.log('[saveWorkflow] Creating new workflow:', { input });

				const response = await gql<CreateWorkflowMutation>(
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

				// Navigate to the new workflow URL
				if (selectedProjectId) {
					await goto(`/workflow/${selectedProjectId}/${response.createWorkflow.id}`, { replaceState: true });
				}

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
	// Workflow execution: All executions are handled by AWS backend
	// Local execution has been removed - workflows run on AWS when triggered by events
	// ------------------------------------------------------------------------------------------------
	async function executeWorkflow() {
		// No-op: Local execution removed. All workflows run on AWS backend.
	}

	// Delete element
	function deleteElement(elementId: string, event: MouseEvent) {
		event.stopPropagation();
		gridElements = gridElements.filter((el) => el.id !== elementId);
		connections = connections.filter((conn) => conn.from !== elementId && conn.to !== elementId);
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
			{executions}
			executionsLoading={executionsLoading}
			{selectedWorkflowId}
			selectedProjectId={selectedProjectId}
			onSelectExecution={(exec) => (selectedExecutionId = exec.id)}
			onRefreshExecutions={loadWorkflowExecutions}
			syncManager={workflowSyncManager}
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
			projectId={selectedProjectId ?? undefined}
			{darkMode}
			onClose={() => (selectedExecutionId = null)}
		/>
	{/if}
</div>

