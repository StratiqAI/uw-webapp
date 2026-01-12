/**
 * TypeScript types for Workflow GraphQL schema
 * These types match the GraphQL schema defined in workflow.graphql
 */

export enum ElementTypeEnum {
	INPUT = 'input',
	PROCESS = 'process',
	OUTPUT = 'output',
	AI = 'ai'
}

export enum ConnectionSide {
	TOP = 'TOP',
	RIGHT = 'RIGHT',
	BOTTOM = 'BOTTOM',
	LEFT = 'LEFT'
}

export interface WorkflowConnectionPage {
	items: Workflow[];
	nextToken?: string | null;
}

export interface AIQueryData {
	prompt: string;
	model: string;
	systemPrompt?: string | null;
}

export interface WorkflowElement {
	id: string;
	elementTypeId: string; // References elementTypes.id (e.g., 'input-text', 'ai-query')
	x: number;
	y: number;
	width: number;
	height: number;
	aiQueryData?: AIQueryData | null;
}

export interface WorkflowConnection {
	id: string;
	fromElementId: string;
	toElementId: string;
	fromSide: ConnectionSide;
	toSide: ConnectionSide;
}

export interface Workflow {
	id: string;
	name: string;
	description?: string | null;
	ownerId: string;
	tenant: string;
	sharingMode: string;
	elements: WorkflowElement[];
	connections: WorkflowConnection[];
	createdAt: string;
	updatedAt: string;
}

export interface CreateWorkflowInput {
	name: string;
	description?: string | null;
	elements?: WorkflowElement[] | null;
	connections?: WorkflowConnection[] | null;
}

export interface UpdateWorkflowInput {
	id: string;
	name?: string | null;
	description?: string | null;
	elements?: WorkflowElement[] | null;
	connections?: WorkflowConnection[] | null;
}

