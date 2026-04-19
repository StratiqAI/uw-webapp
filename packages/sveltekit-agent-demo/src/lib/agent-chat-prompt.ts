/**
 * Validates UI messages and converts them to the model prompt format used by the document chat agent.
 */
import { convertToModelMessages, validateUIMessages, type UIMessage } from 'ai';
import { agentToolsForHistory } from '$lib/agent';

type ConvertedModelMessages = Awaited<ReturnType<typeof convertToModelMessages>>;

export class AgentChatPrompt {
	readonly #modelMessages: ConvertedModelMessages;

	private constructor(modelMessages: ConvertedModelMessages) {
		this.#modelMessages = modelMessages;
	}

	/** Model messages passed to `ToolLoopAgent.stream({ prompt })`. */
	get prompt(): ConvertedModelMessages {
		return this.#modelMessages;
	}

	static async fromUIMessages(messages: UIMessage[]): Promise<AgentChatPrompt> {
		const validatedMessages = await validateUIMessages({
			messages,
			// Vertex provider tools use input type `{}`; AI SDK validators expect wider `Tool` types.
			tools: agentToolsForHistory as unknown as Parameters<
				typeof validateUIMessages
			>[0]['tools']
		});
		const modelMessages = await convertToModelMessages(validatedMessages, {
			tools: agentToolsForHistory as unknown as NonNullable<
				Parameters<typeof convertToModelMessages>[1]
			>['tools'],
			ignoreIncompleteToolCalls: true
		});
		return new AgentChatPrompt(modelMessages);
	}
}
