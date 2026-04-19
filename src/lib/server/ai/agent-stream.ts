// src/lib/server/ai-studio/agent-stream.ts
import { Experimental_Agent as Agent, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { createVertex } from '@ai-sdk/google-vertex';
import { getGcpProjectAndLocation } from './gemini-client.js';
import { weatherTool } from '$lib/agent-tools/Weather/index.js';
import { createDocumentTools } from '$lib/agent-tools/DocumentSearch/index.js';
export interface AiStudioAgentParams {
	uiMessages: UIMessage[];
	modelId: string;
	systemInstruction?: string;
	abortSignal: AbortSignal;
}

// ── Tools ──────────────────────────────────────────────────────────────────
const getWeather = weatherTool;
const documentTools = createDocumentTools();
export async function createAiStudioAgentResponse(
	params: AiStudioAgentParams
): Promise<Response> {
	const { uiMessages, modelId, systemInstruction, abortSignal } = params;

    console.log("[createAiStudioAgentResponse]: ", params);
	const { projectId, location } = getGcpProjectAndLocation();
	if (!projectId) {
		return new Response(
			JSON.stringify({ error: 'GOOGLE_PROJECT_ID is not configured' }),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const vertex = createVertex({
		project: projectId,
		location: location || 'us-central1'
	});

	// The agent — this is the whole "loop". `stopWhen` controls
	// how many tool/step iterations before it must produce a final answer.
    const agentConfig = {
        model: vertex(modelId),
        ...(systemInstruction?.trim() ? { system: systemInstruction.trim() } : {}),
        tools: {
			getWeather,
			...documentTools
		},
        stopWhen: stepCountIs(8)
    };
    console.log("[agentConfig]: ", agentConfig);    
	const agent = new Agent(agentConfig);

	let messages;
	try {
		messages = await convertToModelMessages(uiMessages, {
			ignoreIncompleteToolCalls: true
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Invalid messages';
		return new Response(JSON.stringify({ error: msg }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const result = await agent.stream({
			messages,
			abortSignal
		});

		return result.toUIMessageStreamResponse({
			originalMessages: uiMessages,
			sendReasoning: true
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Generation failed';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}