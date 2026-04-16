/** Context for “Add to Dashboard” from the prompt workspace chat (parent sets, chat reads). */
export const PROMPTS_ADD_CHAT_TO_DASHBOARD = Symbol('promptsAddChatToDashboard');

export type PromptsAddChatToDashboardContext = {
	/** Returns whether the widget was added (false if validation failed or no space). */
	add: (text: string, tabId?: string) => boolean | Promise<boolean>;
};
