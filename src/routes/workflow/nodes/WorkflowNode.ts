import type { AIQueryData, ElementType, NodeType } from '../types/node';

type WorkflowNodeConfig = {
	id: string;
	type: NodeType;
	label: string;
	icon: string;
	execute: ElementType['execute'];
	defaultAIQueryData?: AIQueryData;
};

export class WorkflowNode implements ElementType {
	id: string;
	type: NodeType;
	label: string;
	icon: string;
	execute: ElementType['execute'];
	defaultAIQueryData?: AIQueryData;

	constructor(config: WorkflowNodeConfig) {
		this.id = config.id;
		this.type = config.type;
		this.label = config.label;
		this.icon = config.icon;
		this.execute = config.execute;
		this.defaultAIQueryData = config.defaultAIQueryData;
	}
}
