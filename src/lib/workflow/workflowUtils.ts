/**
 * Utility functions for converting between workflow component state and GraphQL types
 */

import type {
	Workflow,
	WorkflowElement,
	WorkflowConnection,
	AIQueryData,
	ConnectionSide
} from '$lib/types/Workflow';

// Internal component types (from +page.svelte)
export type InternalElementType = {
	id: string;
	type: 'input' | 'process' | 'output' | 'ai';
	label: string;
	icon: string;
	execute: (input: any, customData?: any) => any | Promise<any>;
};

export type InternalGridElement = {
	id: string;
	type: InternalElementType;
	x: number;
	y: number;
	width: number;
	height: number;
	output?: any;
	aiQueryData?: AIQueryData;
};

export type InternalConnection = {
	id: string;
	from: string;
	to: string;
	fromSide: 'top' | 'right' | 'bottom' | 'left';
	toSide: 'top' | 'right' | 'bottom' | 'left';
};

/**
 * Convert GraphQL Workflow to internal component state
 */
export function workflowToInternal(
	workflow: Workflow,
	elementTypes: InternalElementType[]
): {
	elements: InternalGridElement[];
	connections: InternalConnection[];
} {
	// Convert elements
	const elements: InternalGridElement[] = workflow.elements.map((el) => {
		const elementType = elementTypes.find((et) => et.id === el.elementTypeId);
		if (!elementType) {
			throw new Error(`Element type ${el.elementTypeId} not found`);
		}

		return {
			id: el.id,
			type: elementType,
			x: el.x,
			y: el.y,
			width: el.width,
			height: el.height,
			aiQueryData: el.aiQueryData || undefined
		};
	});

	// Convert connections
	const connections: InternalConnection[] = workflow.connections.map((conn) => ({
		id: conn.id,
		from: conn.fromElementId,
		to: conn.toElementId,
			fromSide: conn.fromSide.toLowerCase() as 'top' | 'right' | 'bottom' | 'left',
		toSide: conn.toSide.toLowerCase() as 'top' | 'right' | 'bottom' | 'left'
	}));

	return { elements, connections };
}

/**
 * Convert internal component state to GraphQL Workflow format
 */
export function internalToWorkflow(
	elements: InternalGridElement[],
	connections: InternalConnection[]
): {
	elements: WorkflowElement[];
	connections: WorkflowConnection[];
} {
	// Convert elements
	const workflowElements: WorkflowElement[] = elements.map((el) => ({
		id: el.id,
		elementTypeId: el.type.id,
		x: el.x,
		y: el.y,
		width: el.width,
		height: el.height,
		aiQueryData: el.aiQueryData || null
	}));

	// Convert connections
	const workflowConnections: WorkflowConnection[] = connections.map((conn) => ({
		id: conn.id,
		fromElementId: conn.from,
		toElementId: conn.to,
		fromSide: (conn.fromSide.toUpperCase() as ConnectionSide),
		toSide: (conn.toSide.toUpperCase() as ConnectionSide)
	}));

	return {
		elements: workflowElements,
		connections: workflowConnections
	};
}

