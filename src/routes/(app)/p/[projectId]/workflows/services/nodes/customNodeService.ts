import type { AINode, AIQueryData, ElementType } from '../../types/node';

const STORAGE_KEY = 'workflow-custom-ai-nodes';

type StoredAINode = Omit<AINode, 'execute'>;

function customAIExecute(_input: unknown, customData?: AIQueryData) {
	return Promise.resolve({
		preview: true,
		note: 'AI nodes run on the server when the workflow is executed.',
		query: customData
	});
}

function reviveStoredNode(raw: unknown): ElementType | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	if (o.type !== 'ai' || typeof o.id !== 'string' || typeof o.label !== 'string') return null;
	const dq = o.defaultAIQueryData;
	if (!dq || typeof dq !== 'object' || typeof (dq as AIQueryData).model !== 'string') return null;
	const node = o as StoredAINode;
	return {
		...node,
		icon: typeof node.icon === 'string' ? node.icon : '🤖',
		execute: customAIExecute
	};
}

function stripExecuteForStorage(node: ElementType): unknown {
	if (node.type !== 'ai') return node;
	const { execute: _e, ...rest } = node;
	return rest;
}

export function loadCustomAINodes(): ElementType[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.map(reviveStoredNode).filter((n): n is ElementType => n !== null);
	} catch {
		return [];
	}
}

export function saveCustomAINodes(nodes: ElementType[]): void {
	if (typeof localStorage === 'undefined') return;
	try {
		const serializable = nodes.map(stripExecuteForStorage);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
	} catch {
		// ignore quota / private mode
	}
}

export function createCustomAINode(
	id: string,
	label: string,
	prompt: string,
	model: string,
	systemPrompt: string
): AINode {
	const defaultAIQueryData: AIQueryData = {
		model: model.trim() || 'gpt-4o',
		prompt,
		...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {})
	};

	return {
		id,
		type: 'ai',
		label: label.trim() || 'Custom AI',
		icon: '🤖',
		description: 'User-defined AI query node',
		defaultAIQueryData,
		execute: customAIExecute
	};
}
