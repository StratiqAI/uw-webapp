export type NodeType = 'input' | 'process' | 'output' | 'ai';

export type AIQueryData = {
	prompt: string;
	model: string;
	systemPrompt?: string;
};

export type ElementType = {
	id: string;
	type: NodeType;
	label: string;
	icon: string;
	execute: (input: any, customData?: AIQueryData) => any | Promise<any>;
	defaultAIQueryData?: AIQueryData;
};
