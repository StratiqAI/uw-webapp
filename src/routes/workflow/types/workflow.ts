import type { ElementType, AIQueryData } from './node';
import type { Connection } from './connection';

export type GridElement = {
	id: string;
	type: ElementType;
	x: number;
	y: number;
	width: number;
	height: number;
	output?: any;
	aiQueryData?: AIQueryData;
	nodeOptions?: any;
	commentText?: string;
};

export type WorkflowResult = {
	elementId: string;
	label: string;
	value: any;
};

export type WorkflowJSON = {
	elements: Array<{
		id: string;
		type: string;
		category: string;
		typeLabel: string;
		x: number;
		y: number;
		width: number;
		height: number;
		aiQueryData?: AIQueryData;
		output?: any;
		nodeOptions?: any;
		commentText?: string;
	}>;
	connections: Array<{
		id: string;
		from: string;
		to: string;
		fromSide: Connection['fromSide'];
		toSide: Connection['toSide'];
	}>;
};


