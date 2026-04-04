import type {
	ElementType,
	WorkflowNodeType,
	InputNode,
	ProcessNode,
	ProcessNodeRequiredInput,
	OutputNode,
	AINode,
	CommentNode,
	ToolNode,
	AIQueryData
} from '../types/node';

// Configuration types for each node type
type InputNodeConfig = Omit<InputNode, 'type'> & { type: 'input' };
type ProcessNodeConfig = Omit<ProcessNode, 'type'> & { type: 'process' };
type OutputNodeConfig = Omit<OutputNode, 'type'> & { type: 'output' };
type AINodeConfig = Omit<AINode, 'type'> & { type: 'ai' };
type CommentNodeConfig = Omit<CommentNode, 'type'> & { type: 'comment' };
type ToolNodeConfig = Omit<ToolNode, 'type'> & { type: 'tools' };

// Union of all config types
type WorkflowNodeConfig = InputNodeConfig | ProcessNodeConfig | OutputNodeConfig | AINodeConfig | CommentNodeConfig | ToolNodeConfig;

// Base interface that all node types share
interface IWorkflowNodeBase {
	id: string;
	type: WorkflowNodeType['type'];
	label: string;
	description?: string;
	icon: string;
}

export class WorkflowNode implements IWorkflowNodeBase {
	id: string;
	type: WorkflowNodeType['type'];
	label: string;
	description?: string;
	icon: string;
	execute?: (input: unknown, customData?: AIQueryData) => unknown | Promise<unknown>;
	
	// Type-specific properties (optional, only present for certain node types)
	defaultAIQueryData?: AIQueryData;
	defaultInput?: unknown;
	outputFormat?: 'json' | 'text' | 'html' | 'pdf';
	inputLabel?: string;
	formatInputForPlaceholder?: (input: unknown) => string;
	formatInputForAppend?: (input: unknown) => string;
	content?: string;
	toolType?: string;
	requiredInputs?: ProcessNodeRequiredInput[];
	formula?: string;

	constructor(config: WorkflowNodeConfig) {
		this.id = config.id;
		this.type = config.type;
		this.label = config.label;
		this.description = config.description;
		this.icon = config.icon;

		// Handle execute function (not present for comment nodes)
		if ('execute' in config) {
			this.execute = config.execute;
		}

		// Handle type-specific properties
		if (config.type === 'input' && 'defaultInput' in config) {
			this.defaultInput = config.defaultInput;
		}

		if (config.type === 'output' && 'outputFormat' in config) {
			this.outputFormat = config.outputFormat;
		}

		if (config.type === 'process') {
			if ('requiredInputs' in config && config.requiredInputs) {
				this.requiredInputs = config.requiredInputs;
			}
			if ('formula' in config && config.formula) {
				this.formula = config.formula;
			}
		}

		if (config.type === 'ai') {
			this.defaultAIQueryData = config.defaultAIQueryData;
			if ('inputLabel' in config) {
				this.inputLabel = config.inputLabel;
			}
			if ('formatInputForPlaceholder' in config) {
				this.formatInputForPlaceholder = config.formatInputForPlaceholder;
			}
			if ('formatInputForAppend' in config) {
				this.formatInputForAppend = config.formatInputForAppend;
			}
		}

		if (config.type === 'tools') {
			if ('toolType' in config) {
				this.toolType = config.toolType;
			}
			if ('defaultInput' in config) {
				this.defaultInput = config.defaultInput;
			}
		}

		if (config.type === 'comment' && 'content' in config) {
			this.content = config.content;
		}
	}

	// Type guard methods for runtime type checking
	isInputNode(): this is WorkflowNode & InputNode {
		return this.type === 'input';
	}

	isProcessNode(): this is WorkflowNode & ProcessNode {
		return this.type === 'process';
	}

	isOutputNode(): this is WorkflowNode & OutputNode {
		return this.type === 'output';
	}

	isAINode(): this is WorkflowNode & AINode {
		return this.type === 'ai';
	}

	isCommentNode(): this is WorkflowNode & CommentNode {
		return this.type === 'comment';
	}

	isToolNode(): this is WorkflowNode & ToolNode {
		return this.type === 'tools';
	}

	// Convert to ElementType for compatibility
	toElementType(): ElementType {
		const base = {
			id: this.id,
			type: this.type,
			label: this.label,
			description: this.description,
			icon: this.icon
		};

		switch (this.type) {
			case 'input':
				return {
					...base,
					type: 'input',
					execute: this.execute!,
					...(this.defaultInput !== undefined && { defaultInput: this.defaultInput })
				} as InputNode;
			case 'process':
				return {
					...base,
					type: 'process',
					execute: this.execute!,
					...(this.requiredInputs && this.requiredInputs.length > 0 && { requiredInputs: this.requiredInputs }),
					...(this.formula && { formula: this.formula })
				} as ProcessNode;
			case 'output':
				return {
					...base,
					type: 'output',
					execute: this.execute!,
					...(this.outputFormat && { outputFormat: this.outputFormat })
				} as OutputNode;
			case 'ai':
				return {
					...base,
					type: 'ai',
					execute: this.execute!,
					defaultAIQueryData: this.defaultAIQueryData!,
					...(this.inputLabel && { inputLabel: this.inputLabel }),
					...(this.formatInputForPlaceholder && { formatInputForPlaceholder: this.formatInputForPlaceholder }),
					...(this.formatInputForAppend && { formatInputForAppend: this.formatInputForAppend })
				} as AINode;
			case 'tools':
				return {
					...base,
					type: 'tools',
					execute: this.execute!,
					...(this.toolType && { toolType: this.toolType }),
					...(this.defaultInput !== undefined && { defaultInput: this.defaultInput })
				} as ToolNode;
			case 'comment':
				return {
					...base,
					type: 'comment',
					...(this.content && { content: this.content })
				} as CommentNode;
		}
	}
}
