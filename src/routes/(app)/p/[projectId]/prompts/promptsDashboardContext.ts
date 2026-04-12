/** Context for “Add to Dashboard” from the prompt workspace chat (parent sets, chat reads). */
export const PROMPTS_ADD_CHAT_TO_DASHBOARD = Symbol('promptsAddChatToDashboard');

export type PromptsAddChatToDashboardContext = {
	add: (text: string, tabId?: string) => void | Promise<void>;
};
