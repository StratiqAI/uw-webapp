/**
 * Vertex AI–backed @google/genai client (matches backend aiQueryExecute ai-provider).
 */

import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';

const DEFAULT_MODEL = 'gemini-2.5-flash';

const GEMINI_MODELS: Record<string, string> = {
	GEMINI_3_1_PRO_PREVIEW: 'gemini-3.1-pro-preview',
	GEMINI_3_1_FLASH_PREVIEW: 'gemini-3.1-flash-lite-preview',
	GEMINI_3_FLASH_PREVIEW: 'gemini-3-flash-preview',
	GEMINI_2_5_FLASH: 'gemini-2.5-flash',
	GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
	GEMINI_2_5_PRO: 'gemini-2.5-pro'
};

const CLAUDE_MODELS: Record<string, string> = {
	CLAUDE_OPUS_4_6: 'claude-opus-4-6',
	CLAUDE_SONNET_4_6: 'claude-sonnet-4-6',
	CLAUDE_HAIKU_4_5: 'claude-haiku-4-5'
};

let cachedClient: GoogleGenAI | null = null;
let cachedProject = '';
let cachedLocation = '';

function getClient(project: string, location: string): GoogleGenAI {
	if (cachedClient && cachedProject === project && cachedLocation === location) return cachedClient;
	cachedClient = new GoogleGenAI({ vertexai: true, project, location });
	cachedProject = project;
	cachedLocation = location;
	return cachedClient;
}

export function getGeminiClient(): GoogleGenAI {
	const project = env.GOOGLE_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT ?? '';
	const location = env.GOOGLE_LOCATION ?? env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';
	if (!project) {
		throw new Error('GOOGLE_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) is not configured');
	}
	return getClient(project, location);
}

/**
 * Resolve an AIModel enum value (or raw model string) to a Gemini model id.
 * Claude enums are rejected (same as backend).
 */
export function resolveModelId(enumOrId?: string | null): string {
	if (enumOrId == null || enumOrId === '') {
		return DEFAULT_MODEL;
	}

	const claudeId = CLAUDE_MODELS[enumOrId];
	if (claudeId || enumOrId.startsWith('CLAUDE_') || enumOrId.startsWith('claude-')) {
		throw new Error('Claude models are not supported. Please select a Gemini model.');
	}

	const geminiId = GEMINI_MODELS[enumOrId];
	if (!geminiId && enumOrId.startsWith('GEMINI_')) {
		console.warn(`Unknown Gemini enum "${enumOrId}", falling back to ${DEFAULT_MODEL}`);
		return DEFAULT_MODEL;
	}
	return geminiId ?? enumOrId;
}

export function getGcpProjectAndLocation(): { projectId: string; location: string } {
	const projectId = env.GOOGLE_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT ?? '';
	const location = env.GOOGLE_LOCATION ?? env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';
	return { projectId, location };
}
