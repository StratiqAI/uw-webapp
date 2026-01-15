export type NodeType = 'input' | 'process' | 'output' | 'ai' | 'comment';

export type AIQueryData = {
	prompt: string;
	model: string;
	systemPrompt?: string;
};

export type ElementType = {
	id: string;
	type: NodeType;
	label: string;
	description?: string;
	icon: string;
	execute: (input: any, customData?: AIQueryData) => any | Promise<any>;
	defaultAIQueryData?: AIQueryData;
};
