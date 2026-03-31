import type { GridElement, WorkflowJSON } from '../../types/workflow';
import type { Connection } from '../../types/connection';

/** GraphQL WorkflowNodeKind - aligned with schema enum */
type WorkflowNodeKind = 'INPUT' | 'PROCESS' | 'OUTPUT' | 'AI' | 'TOOLS' | 'COMMENT';

/** Minimal types for WorkflowDefinitionInput (nodes + edges) - matches schema for create/update */
export type WorkflowDefinitionInput = {
	nodes: WorkflowNodeInput[];
	edges: WorkflowEdgeInput[];
};

/** Union-shaped config sent as AWSJSON; __typename identifies variant (AINodeConfig, ProcessNodeConfig, ToolsNodeConfig, EmptyNodeConfig). */
export type WorkflowNodeInput = {
	id: string;
	kind: WorkflowNodeKind;
	label?: string | null;
	configuration: Record<string, unknown>;
	options?: unknown;
};

export type WorkflowEdgeInput = {
	id: string;
	sourceId: string;
	targetId: string;
	sourcePort?: string | null;
	targetPort?: string | null;
};

/**
 * Prepare definition for GraphQL mutation variables. AppSync AWSJSON expects strings:
 * each node's configuration (and options) must be JSON.stringify'd to avoid "Variable 'configuration' has an invalid value".
 */
export function definitionToApiVariables(definition: WorkflowDefinitionInput): {
	nodes: Array<Omit<WorkflowNodeInput, 'configuration' | 'options'> & { configuration: string; options?: string | null }>;
	edges: WorkflowEdgeInput[];
} {
	return {
		nodes: definition.nodes.map((node) => ({
			id: node.id,
			kind: node.kind,
			label: node.label ?? undefined,
			configuration: JSON.stringify(node.configuration),
			options: node.options != null ? JSON.stringify(node.options) : undefined
		})),
		edges: definition.edges
	};
}

/**
 * Convert definition from API (output shape: nodes with configuration) to WorkflowDefinitionInput.
 * Reads node.configuration or legacy node.config; outputs nodes with single configuration (union shape).
 */
export function definitionToInput(
	def: { nodes?: unknown[]; edges?: unknown[] }
): WorkflowDefinitionInput {
	if (!def || !Array.isArray(def.nodes) || !Array.isArray(def.edges)) {
		return { nodes: [], edges: [] };
	}
	const nodes: WorkflowNodeInput[] = def.nodes.map((node: any) => {
		let config = node.configuration ?? node.config;
		if (!config && (node.aiConfig || node.processConfig || node.toolsConfig)) {
			config = node.aiConfig ?? node.processConfig ?? node.toolsConfig ?? {};
			if (node.aiConfig) (config as Record<string, unknown>).__typename = 'AINodeConfig';
			else if (node.processConfig) (config as Record<string, unknown>).__typename = 'ProcessNodeConfig';
			else if (node.toolsConfig) (config as Record<string, unknown>).__typename = 'ToolsNodeConfig';
		}
		let configuration: Record<string, unknown>;
		if (config && typeof config === 'object') {
			configuration = { ...config };
			if (!configuration.__typename) {
				if ('prompt' in config || 'model' in config) configuration.__typename = 'AINodeConfig';
				else if ('staticOutput' in config || ('options' in config && node.kind === 'PROCESS')) configuration.__typename = 'ProcessNodeConfig';
				else if (node.kind === 'TOOLS' && config.options !== undefined) configuration.__typename = 'ToolsNodeConfig';
				else if (node.kind === 'INPUT' && ('source' in config || 'detailType' in config)) configuration.__typename = 'InputNodeConfig';
				else configuration.__typename = 'EmptyNodeConfig';
			}
		} else {
			configuration = { __typename: 'EmptyNodeConfig', _empty: true };
		}
		return {
			id: node.id,
			kind: node.kind,
			label: node.label ?? undefined,
			options: node.options ?? undefined,
			configuration
		};
	});
	const edges: WorkflowEdgeInput[] = def.edges.map((e: any) => ({
		id: e.id,
		sourceId: e.sourceId ?? e.from,
		targetId: e.targetId ?? e.to,
		sourcePort: e.sourcePort ?? e.fromSide ?? undefined,
		targetPort: e.targetPort ?? e.toSide ?? undefined
	}));
	return { nodes, edges };
}

/** Map canvas category (el.type.type) to GraphQL WorkflowNodeKind */
function categoryToKind(category: string): WorkflowNodeKind {
	switch (category) {
		case 'input':
			return 'INPUT';
		case 'process':
			return 'PROCESS';
		case 'output':
			return 'OUTPUT';
		case 'ai':
			return 'AI';
		case 'tools':
			return 'TOOLS';
		case 'comment':
			return 'COMMENT';
		default:
			return 'PROCESS';
	}
}

/**
 * Build WorkflowDefinitionInput (nodes + edges) from canvas state for CreateWorkflowInput/UpdateWorkflowInput.
 * Each node has a single configuration (union shape with __typename).
 */
export function buildWorkflowDefinitionInput(
	gridElements: GridElement[],
	connections: Connection[],
	jsonSchemaId?: string | null,
	nodeJsonSchemaIds?: Record<string, string>
): { definition: WorkflowDefinitionInput; jsonSchemaId?: string } {
	const nodes: WorkflowNodeInput[] = gridElements.map((el) => {
		const kind = categoryToKind(el.type.type);
		let configuration: Record<string, unknown>;
		if (kind === 'AI' && el.aiQueryData) {
			const nodeSchemaId = nodeJsonSchemaIds?.[el.id];
			configuration = {
				__typename: 'AINodeConfig',
				prompt: el.aiQueryData.prompt,
				model: el.aiQueryData.model,
				topK: el.aiQueryData.maxTokens ?? undefined,
				systemPrompt: el.aiQueryData.systemPrompt ?? undefined,
				...(nodeSchemaId && { jsonSchemaId: nodeSchemaId })
			};
		} else if (kind === 'PROCESS' && (el.nodeOptions != null || el.output !== undefined)) {
			configuration = {
				__typename: 'ProcessNodeConfig',
				options: el.nodeOptions ?? undefined,
				staticOutput: el.output ?? undefined
			};
		} else if (kind === 'TOOLS' && el.nodeOptions != null) {
			configuration = { __typename: 'ToolsNodeConfig', options: el.nodeOptions };
		} else if (kind === 'INPUT') {
			configuration = {
				__typename: 'InputNodeConfig',
				source: (el.nodeOptions?.source as string) ?? 'com.stratiqai.doclink',
				detailType: (el.nodeOptions?.detailType as string) ?? 'Created'
			};
		} else {
			configuration = { __typename: 'EmptyNodeConfig', _empty: true };
		}
		const node: WorkflowNodeInput = {
			id: el.id,
			kind,
			label: el.type.label ?? undefined,
			configuration
		};
		if (el.commentText != null) {
			node.options = { commentText: el.commentText };
		}
		return node;
	});

	const edges: WorkflowEdgeInput[] = connections.map((conn) => ({
		id: conn.id,
		sourceId: conn.from,
		targetId: conn.to,
		sourcePort: conn.fromSide ?? undefined,
		targetPort: conn.toSide ?? undefined
	}));

	const result: {
		definition: WorkflowDefinitionInput;
		jsonSchemaId?: string;
	} = {
		definition: { nodes, edges }
	};
	if (jsonSchemaId) {
		result.jsonSchemaId = jsonSchemaId;
	}
	return result;
}

export function generateWorkflowJSON(
	gridElements: GridElement[],
	connections: Connection[],
	outputSchema?: Record<string, unknown> | null
): string {
	const workflow: WorkflowJSON = {
		elements: gridElements.map((el) => {
			// Extract category from el.type.type
			const category = el.type.type;
			// Strip category prefix from el.type.id (e.g., "input-property-data" -> "property-data")
			const typeIdWithoutPrefix = el.type.id.replace(/^(input|output|process|ai)-/, '');
			return {
				id: el.id,
				type: typeIdWithoutPrefix,
				category,
				typeLabel: el.type.label,
				x: el.x,
				y: el.y,
				width: el.width,
				height: el.height,
				...(el.aiQueryData && { aiQueryData: el.aiQueryData }),
				...(el.output !== undefined && { output: el.output }),
				...(el.nodeOptions !== undefined && { nodeOptions: el.nodeOptions }),
				...(el.commentText && { commentText: el.commentText })
			};
		}),
		connections: connections.map((conn) => ({
			id: conn.id,
			from: conn.from,
			to: conn.to,
			fromSide: conn.fromSide,
			toSide: conn.toSide
		})),
		...(outputSchema && { outputSchema })
	};
	return JSON.stringify(workflow, null, 2);
}

export async function copyWorkflowJSONToClipboard(workflowJSON: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(workflowJSON);
		return true;
	} catch (err) {
		console.error('Failed to copy:', err);
		return false;
	}
}

export function downloadWorkflowJSON(workflowJSON: string): void {
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
