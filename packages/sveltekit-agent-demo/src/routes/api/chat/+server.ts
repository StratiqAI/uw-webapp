/**
 * SvelteKit API route that streams agent responses.
 *
 * POST /api/chat
 *
 * The client sends the conversation as an array of UIMessage objects.
 * Optional JSON fields: `useMapsForMessage` (boolean) selects Vertex `googleMaps`-only
 * tools vs default chat tools; `mapsLatLng` / `retrievalLatLng` set Maps retrieval bias.
 * Uses {@link ToolLoopAgent} (Vercel AI SDK agents) with `stream` + `toUIMessageStreamResponse`
 * for @ai-sdk/svelte Chat.
 */
import { type UIMessage } from 'ai';
import type { RequestHandler } from '@sveltejs/kit';
import { AgentChatPrompt } from '$lib/agent-chat-prompt';
import { documentToolLoopAgent } from '$lib/agent';

function readUseMapsForMessage(raw: unknown): boolean {
	if (raw === true) return true;
	if (raw === 'true') return true;
	return false;
}

function readMapsLatLng(
	raw: unknown
): { latitude: number; longitude: number } | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const o = raw as Record<string, unknown>;
	if (typeof o.latitude !== 'number' || typeof o.longitude !== 'number') return undefined;
	return { latitude: o.latitude, longitude: o.longitude };
}

export const POST: RequestHandler = async ({ request }) => {
	let messages: UIMessage[] = [];
	let useMapsForMessage = false;
	let mapsLatLng: { latitude: number; longitude: number } | undefined;
	try {
		const body: unknown = await request.json();
		if (body && typeof body === 'object') {
			const b = body as Record<string, unknown>;
			messages = Array.isArray(b.messages) ? (b.messages as UIMessage[]) : [];
			useMapsForMessage = readUseMapsForMessage(b.useMapsForMessage);
			mapsLatLng = readMapsLatLng(b.mapsLatLng ?? b.retrievalLatLng);
		}
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const abortController = new AbortController();
	request.signal.addEventListener('abort', () => {
		abortController.abort();
	});

	let chatPrompt: AgentChatPrompt;
	try {
		chatPrompt = await AgentChatPrompt.fromUIMessages(messages);
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid messages' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const result = await documentToolLoopAgent.stream({
		prompt: chatPrompt.prompt,
		options: { useMapsForMessage, mapsLatLng },
		abortSignal: abortController.signal
	});

	return result.toUIMessageStreamResponse({
		originalMessages: messages,
		sendReasoning: true
	});
};
