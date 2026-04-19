import { env } from '$env/dynamic/private';
import { tool } from 'ai';
import { z } from 'zod';
import type {
	AgentToolsConfig,
	BoundingBox,
	HighlightBox,
	TextItem
} from './types.js';
import { ConsoleAgentToolsLogger } from './logger.js';
import { DocumentRetrievalAndVisionStack } from './document-stack.js';
import {
	GoogleCredentialsEnvNormalizer,
	normalizeGoogleVertexLocation
} from './google-credentials.js';

const DEFAULT_PINECONE_INDEX = 'pdf-image-upsert';
const DEFAULT_PINECONE_NAMESPACE = 'AAA_UPSERT_TEST';
const DEFAULT_TOP_K = 3;
const DEFAULT_VISION_MODEL = 'gemini-2.5-flash';

function buildAgentToolsConfig(): AgentToolsConfig {
	const topKRaw = env.PINECONE_TOP_K;
	const topK = topKRaw != null && String(topKRaw).trim() !== '' ? Number(topKRaw) : DEFAULT_TOP_K;

	return {
		pineconeApiKey: env.PINECONE_API_KEY?.trim() ?? '',
		googleProjectId:
			env.GOOGLE_PROJECT_ID?.trim() || env.GOOGLE_VERTEX_PROJECT?.trim() || '',
		googleLocation: normalizeGoogleVertexLocation(
			env.GOOGLE_LOCATION?.trim() ||
				env.GOOGLE_LOCATION_REGION?.trim() ||
				env.GOOGLE_VERTEX_LOCATION?.trim()
		),
		pineconeIndexName:
			env.PINECONE_INDEX_NAME?.trim() || env.PINECONE_INDEX?.trim() || DEFAULT_PINECONE_INDEX,
		pineconeNamespace: env.PINECONE_NAMESPACE?.trim() || DEFAULT_PINECONE_NAMESPACE,
		topK,
		visionModel: env.GEMINI_MODEL?.trim() || DEFAULT_VISION_MODEL,
		googleApplicationCredentials: env.GOOGLE_APPLICATION_CREDENTIALS,
		credentialsResolveCwd: process.cwd(),
		feedbackEnabled: (env.AGENT_FEEDBACK ?? 'true').trim().toLowerCase() !== 'false',
		verboseRetrievalLogging: (env.AGENT_VERBOSE_RETRIEVAL ?? '').trim().toLowerCase() === 'true',
		multimodalEmbeddingModelId: env.MULTIMODAL_EMBEDDING_MODEL_ID?.trim()
	};
}

const config = buildAgentToolsConfig();

new GoogleCredentialsEnvNormalizer().resolve(
	config.credentialsResolveCwd ?? process.cwd(),
	config.googleApplicationCredentials
);

const feedbackEnabled = config.feedbackEnabled !== false;
const logger = new ConsoleAgentToolsLogger({ feedbackEnabled });
const stack = new DocumentRetrievalAndVisionStack(config, logger);

function documentToolsConfigured(): boolean {
	return Boolean(config.pineconeApiKey?.trim());
}

/** Pinecone-backed tools; empty object when `PINECONE_API_KEY` is unset so the agent still runs (e.g. weather-only). */
export function createDocumentTools() {
	if (!documentToolsConfigured()) {
		console.warn(
			'[agent-tools] Document search tools omitted: set PINECONE_API_KEY (and Pinecone/GCP-related env) to enable pineconeQuery and VisualDocumentResearchAgent.'
		);
		return {};
	}

	const pineconeQuery = tool({
		description: 'Query Pinecone for relevant PDF page and image matches and return image URLs.',
		inputSchema: z.object({
			query: z.string().describe('The user question to embed and search in Pinecone.')
		}),
		execute: async ({ query }) => {
			const started = Date.now();
			const topK = stack.topK;
			logger.info('Tool start: pineconeQuery', { query, topK });
			const result = await stack.queryPinecone(query, topK);
			if (stack.verboseRetrievalLogging) {
				console.error('[pineconeQuery full result]', JSON.stringify(result, null, 2));
			}
			logger.info('Tool end: pineconeQuery', {
				elapsedMs: Date.now() - started,
				matches: result.matches.length,
				imageUrls: result.imageUrls.length
			});
			return result;
		}
	});

	const visualDocumentResearchAgent = tool({
		description:
			'Answer a document question by querying Pinecone and then using Google Vertex vision. This keeps large retrieval payloads out of the model loop for faster responses.',
		inputSchema: z.object({
			question: z.string().describe('The user question to answer.')
		}),
		execute: async ({ question }) => {
			const started = Date.now();
			try {
				logger.info('Tool start: VisualDocumentResearchAgent', {
					questionChars: question.length
				});
				const result = await stack.answerFromImages(question);
				logger.info('Tool end: VisualDocumentResearchAgent', {
					elapsedMs: Date.now() - started,
					usedImageUrls: result.usedImageUrls.length,
					answerChars: result.answer.length
				});
				return result;
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				logger.info('Tool error: VisualDocumentResearchAgent', { message, elapsedMs: Date.now() - started });
				return {
					error: message,
					answer: '',
					usedImageUrls: [] as string[],
					highlightBoxes: [] as HighlightBox[],
					sources: [] as Array<{
						pageNumber: number | null;
						imageUrl: string | null;
						boundingBox: BoundingBox | null;
						textItems: TextItem[];
						metadata: Record<string, unknown>;
					}>
				};
			}
		}
	});

	return {
		pineconeQuery,
		VisualDocumentResearchAgent: visualDocumentResearchAgent
	};
}
