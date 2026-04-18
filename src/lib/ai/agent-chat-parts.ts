/**
 * Helpers for rendering Vercel AI SDK UIMessage parts (aligned with sveltekit-agent-demo).
 */

import type { UIMessage } from 'ai';

/** Match `<thinking>...</thinking>` with flexible whitespace / case (model output varies). */
export const THINKING_TAG_RE = /<\s*thinking\s*>([\s\S]*?)<\s*\/\s*thinking\s*>/gi;

export function extractTaggedThinking(text: string): { prose: string; blocks: string[] } {
	const blocks: string[] = [];
	const prose = text.replace(THINKING_TAG_RE, (_, inner: string) => {
		const t = inner.trim();
		if (t) blocks.push(t);
		return '';
	});
	return { prose: prose.trim(), blocks };
}

export function proseWithoutThinkingTags(text: string): string {
	return text.replace(THINKING_TAG_RE, '').trim();
}

export type UnifiedToolPart = {
	name: string;
	state: string;
	isPending: boolean;
	isSuccess: boolean;
	isError: boolean;
	args: unknown;
	result: unknown;
	errorText: string | null;
};

export function getToolRender(part: unknown): UnifiedToolPart | null {
	if (!part || typeof part !== 'object') return null;
	const p = part as Record<string, unknown>;
	const type = p.type;
	const state = typeof p.state === 'string' ? p.state : '';

	if (type === 'tool-invocation' && p.toolInvocation && typeof p.toolInvocation === 'object') {
		const inv = p.toolInvocation as { toolName?: string; args?: unknown; result?: unknown };
		const legacyState = state;
		return {
			name: inv.toolName ?? 'tool',
			state: legacyState,
			isPending: legacyState === 'call' || legacyState === 'partial-call',
			isSuccess: legacyState === 'result',
			isError: false,
			args: inv.args,
			result: inv.result,
			errorText: null
		};
	}

	if (type === 'dynamic-tool') {
		const name = typeof p.toolName === 'string' ? p.toolName : 'tool';
		return {
			name,
			state,
			isPending: state === 'input-streaming' || state === 'input-available',
			isSuccess: state === 'output-available',
			isError: state === 'output-error',
			args: p.input,
			result: p.output,
			errorText: typeof p.errorText === 'string' ? p.errorText : null
		};
	}

	if (typeof type === 'string' && type.startsWith('tool-')) {
		const name = type.slice('tool-'.length);
		return {
			name,
			state,
			isPending: state === 'input-streaming' || state === 'input-available',
			isSuccess: state === 'output-available',
			isError: state === 'output-error',
			args: p.input,
			result: p.output,
			errorText: typeof p.errorText === 'string' ? p.errorText : null
		};
	}

	return null;
}

export function toolResultEmbeddedError(result: unknown): string | null {
	if (!result || typeof result !== 'object') return null;
	const e = (result as Record<string, unknown>).error;
	return typeof e === 'string' && e.length > 0 ? e : null;
}

export type ParsedSource = {
	pageLabel: string | null;
	url: string | null;
	raw: string;
	displayText: string;
};

export function parseAssistantTextWithSources(text: string): { bodyText: string; sources: ParsedSource[] } {
	const lines = text.split(/\r?\n/);
	const sourceHeaderRegex = /^\s*sources?\s*:\s*(.*)$/i;
	const sourceStartIndex = lines.findIndex((line) => sourceHeaderRegex.test(line));

	if (sourceStartIndex === -1) {
		return { bodyText: text, sources: [] };
	}

	const headerMatch = lines[sourceStartIndex].match(sourceHeaderRegex);
	const bodyText = lines.slice(0, sourceStartIndex).join('\n').trimEnd();

	const sourceLines = [headerMatch?.[1] ?? '', ...lines.slice(sourceStartIndex + 1)];

	const sources: ParsedSource[] = sourceLines
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
		.filter(Boolean)
		.map((line) => {
			const pageMatch = line.match(/^(page|pages|p\.|pg\.)\s*([\d]+(?:\s*-\s*[\d]+)?)\s*[:\-,]\s*(.*)$/i);
			const pageLabel = pageMatch ? `Page ${pageMatch[2].replace(/\s+/g, '')}` : null;
			const content = pageMatch ? pageMatch[3].trim() : line;
			const urlMatch = content.match(/https?:\/\/[^\s)]+/i);
			const url = urlMatch ? urlMatch[0].replace(/[.,;:!?]+$/, '') : null;
			const displayText = /^image\s+https?:\/\/\S+/i.test(content) ? 'Open page image' : content;

			return {
				pageLabel,
				url,
				raw: content,
				displayText
			};
		});

	return { bodyText, sources };
}

export function collectAssistantVisibleText(message: UIMessage): string {
	let out = '';
	for (const part of message.parts) {
		if (part.type === 'text' && 'text' in part) {
			const t = String((part as { text?: string }).text ?? '');
			const { prose } = extractTaggedThinking(t);
			out += proseWithoutThinkingTags(prose) + '\n';
		}
	}
	return out.trim();
}

export function getLastAssistantTextForDashboard(messages: UIMessage[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (m?.role === 'assistant') {
			return collectAssistantVisibleText(m);
		}
	}
	return '';
}
