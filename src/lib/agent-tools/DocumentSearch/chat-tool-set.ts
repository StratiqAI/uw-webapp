import type { ToolSet } from 'ai';
import { createDocumentTools } from './index.js';

export function createAllAgentTools() {
	const documentTools = createDocumentTools();

	return {
		...documentTools
	};
}

export function createChatAgentTools(): ToolSet {
	const allTools = createAllAgentTools();
	const out: ToolSet = {};
	if (allTools.VisualDocumentResearchAgent) {
		out.VisualDocumentResearchAgent = allTools.VisualDocumentResearchAgent;
	}
	return out;
}
