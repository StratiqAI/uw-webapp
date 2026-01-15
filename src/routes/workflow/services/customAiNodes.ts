import type { ElementType } from '../types';
import {
	loadCustomAINodes as loadCustomNodes,
	saveCustomAINodes,
	createCustomAINode as createCustomNode
} from './customNodeService';

export type CustomAINodeDraft = {
	label: string;
	prompt: string;
	model: string;
	systemPrompt: string;
};

export function loadCustomAINodesFromStorage(): ElementType[] {
	return loadCustomNodes();
}

export function createCustomAINodeState(params: {
	customAINodes: ElementType[];
	draft: CustomAINodeDraft;
	now?: number;
}): { customAINodes: ElementType[]; draft: CustomAINodeDraft; created: boolean } {
	const { customAINodes, draft, now = Date.now() } = params;
	if (!draft.label.trim() || !draft.prompt.trim()) {
		return { customAINodes, draft, created: false };
	}

	const newId = `custom-ai-${now}`;
	const customNode = createCustomNode(newId, draft.label, draft.prompt, draft.model, draft.systemPrompt);
	const nextNodes = [...customAINodes, customNode];
	saveCustomAINodes(nextNodes);

	return {
		customAINodes: nextNodes,
		draft: resetCustomAINodeDraft(),
		created: true
	};
}

export function deleteCustomAINodeState(customAINodes: ElementType[], nodeId: string): ElementType[] {
	const nextNodes = customAINodes.filter((node) => node.id !== nodeId);
	saveCustomAINodes(nextNodes);
	return nextNodes;
}

export function resetCustomAINodeDraft(): CustomAINodeDraft {
	return {
		label: '',
		prompt: '',
		model: 'gpt-4o',
		systemPrompt: ''
	};
}
