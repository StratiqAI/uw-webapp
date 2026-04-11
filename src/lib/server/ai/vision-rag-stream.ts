/**
 * Vision RAG with streaming Gemini generation (Vertex embeddings + Pinecone + @google/genai stream).
 */

import path from 'node:path';
import { Buffer } from 'node:buffer';
import { Pinecone } from '@pinecone-database/pinecone';
import type { GoogleGenAI } from '@google/genai';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import { createLogger } from '$lib/utils/logger';
import type { VisionRagBlock } from './types.js';
import { withRetry } from './utils.js';

const log = createLogger('server.ai.visionRag');

const VISION_RAG_EMBEDDING_MODEL = 'multimodalembedding@001';
export const VISION_RAG_DEFAULT_TOP_K = 5;
export const VISION_RAG_DEFAULT_TOP_K_PER_NS = 5;

const mimeByExt: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.bmp': 'image/bmp',
	'.gif': 'image/gif'
};

let cachedVertexClient: PredictionServiceClient | null = null;
let cachedVertexEndpoint = '';
let cachedPinecone: Pinecone | null = null;
let cachedPineconeKey = '';

function getVertexClient(location: string): PredictionServiceClient {
	const endpoint = `${location}-aiplatform.googleapis.com`;
	if (cachedVertexClient && cachedVertexEndpoint === endpoint) return cachedVertexClient;
	cachedVertexClient = new PredictionServiceClient({ apiEndpoint: endpoint });
	cachedVertexEndpoint = endpoint;
	return cachedVertexClient;
}

function getPineconeClient(apiKey: string): Pinecone {
	if (cachedPinecone && cachedPineconeKey === apiKey) return cachedPinecone;
	cachedPinecone = new Pinecone({ apiKey });
	cachedPineconeKey = apiKey;
	return cachedPinecone;
}

function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
	const { $schema, additionalProperties, ...rest } = schema;
	const cleaned: Record<string, unknown> = { ...rest };
	if (cleaned.properties && typeof cleaned.properties === 'object') {
		const props: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(cleaned.properties as Record<string, unknown>)) {
			props[k] =
				typeof v === 'object' && v !== null ? sanitizeSchema(v as Record<string, unknown>) : v;
		}
		cleaned.properties = props;
	}
	if (cleaned.items && typeof cleaned.items === 'object') {
		cleaned.items = sanitizeSchema(cleaned.items as Record<string, unknown>);
	}
	return cleaned;
}

export function sanitizeId(s: string): string {
	return s.replace(/[^a-zA-Z0-9-_./]/g, '_').toLowerCase();
}

function getMimeType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	return mimeByExt[ext] ?? 'image/jpeg';
}

async function embedQueryText(
	text: string,
	vertexClient: PredictionServiceClient,
	endpointPath: string
): Promise<number[]> {
	const instance = { text };
	const instanceValue = helpers.toValue(instance as Parameters<typeof helpers.toValue>[0]);
	const [response] = await vertexClient.predict({
		endpoint: endpointPath,
		instances: [instanceValue!]
	});
	if (!response.predictions?.length) throw new Error('No prediction from Vertex AI');
	const prediction = response.predictions[0];
	const values = prediction.structValue?.fields?.textEmbedding?.listValue?.values;
	if (!values?.length) throw new Error('No textEmbedding in response');
	return values.map((v) => v.numberValue ?? 0);
}

async function loadImageFromUrl(imageUrl: string): Promise<import('./types.js').LoadedImage | null> {
	try {
		const res = await fetch(imageUrl);
		if (!res.ok) {
			log.warn('Failed to fetch image', { imageUrl, status: res.status });
			return null;
		}
		const buf = Buffer.from(await res.arrayBuffer());
		const filename = imageUrl.split('/').pop() ?? 'image.png';
		return {
			base64: buf.toString('base64'),
			mimeType: getMimeType(filename),
			filename
		};
	} catch (err) {
		log.warn('Error fetching image', {
			imageUrl,
			error: err instanceof Error ? err.message : String(err)
		});
		return null;
	}
}

function loadImageForMatch(meta: Record<string, unknown>): Promise<import('./types.js').LoadedImage | null> {
	const imageUrl = meta.imageUrl as string | undefined;
	if (!imageUrl) return Promise.resolve(null);
	return loadImageFromUrl(imageUrl);
}

type MatchType = { id?: string; score?: number; metadata?: Record<string, unknown> };

async function queryMultipleNamespaces(
	index: ReturnType<Pinecone['index']>,
	namespaces: string[],
	vector: number[],
	topK: number,
	topKPerNs: number
): Promise<MatchType[]> {
	const results = await Promise.all(
		namespaces.map((ns) =>
			index.namespace(ns).query({ vector, topK: topKPerNs, includeMetadata: true, includeValues: false })
		)
	);

	const withNs = results.flatMap((result, idx) =>
		(result.matches ?? []).map((m) => ({ match: m, namespace: namespaces[idx] }))
	);

	const byNs = new Map<string, typeof withNs>();
	for (const item of withNs) {
		const list = byNs.get(item.namespace) ?? [];
		list.push(item);
		byNs.set(item.namespace, list);
	}

	const selected: typeof withNs = [];
	for (const [, items] of byNs) {
		const best = items.sort((a, b) => (b.match.score ?? 0) - (a.match.score ?? 0))[0];
		if (best) selected.push(best);
	}

	const remaining = withNs
		.filter((item) => !selected.includes(item))
		.sort((a, b) => (b.match.score ?? 0) - (a.match.score ?? 0));
	for (const item of remaining) {
		if (selected.length >= topK) break;
		selected.push(item);
	}

	return selected
		.sort((a, b) => (b.match.score ?? 0) - (a.match.score ?? 0))
		.slice(0, topK)
		.map(({ match }) => match);
}

export interface VisionStreamMeta {
	promptTokenCount: number;
	candidatesTokenCount: number;
	retryCount: number;
	embeddingCallCount: number;
	pineconeQueryCount: number;
	pineconeMatchCount: number;
}

/**
 * Run vision RAG and stream Gemini text chunks.
 */
export async function streamVisionRag(
	block: VisionRagBlock,
	responseSchema: Record<string, unknown> | null | undefined,
	client: GoogleGenAI,
	modelId: string,
	onChunk: (text: string) => void
): Promise<VisionStreamMeta> {
	const {
		documentIds,
		question,
		topK: inputTopK = VISION_RAG_DEFAULT_TOP_K,
		topKPerNs: inputTopKPerNs = VISION_RAG_DEFAULT_TOP_K_PER_NS,
		googleSearchEnabled = true
	} = block;

	const topK = Math.max(1, Math.min(20, inputTopK));
	const topKPerNs = Math.max(1, Math.min(20, inputTopKPerNs));

	if (!documentIds?.length) throw new Error('documentIds must be a non-empty array');
	if (!question?.trim()) throw new Error('question is required');

	const hasSchema =
		responseSchema != null && typeof responseSchema === 'object' && Object.keys(responseSchema).length > 0;
	const useStructured = hasSchema && !googleSearchEnabled;

	const config = block.visionConfig;
	const namespaces = documentIds.map((id) => sanitizeId(id));
	const vertexClient = getVertexClient(config.location);
	const endpointPath = `projects/${config.projectId}/locations/${config.location}/publishers/google/models/${VISION_RAG_EMBEDDING_MODEL}`;
	const pinecone = getPineconeClient(config.pineconeApiKey);
	const index = pinecone.index(config.pineconeIndexName);

	const vector = await embedQueryText(question, vertexClient, endpointPath);

	let matches: MatchType[];
	if (namespaces.length > 1) {
		matches = await queryMultipleNamespaces(index, namespaces, vector, topK, topKPerNs);
	} else {
		const response = await index.namespace(namespaces[0]!).query({
			vector,
			topK,
			includeMetadata: true,
			includeValues: false
		});
		matches = (response.matches ?? []) as MatchType[];
	}

	const pineconeQueryCount = namespaces.length;
	const pineconeMatchCount = matches.length;

	if (matches.length === 0) {
		const msg = 'No relevant images were found for the given documents and question.';
		onChunk(msg);
		return {
			promptTokenCount: 0,
			candidatesTokenCount: 0,
			retryCount: 0,
			embeddingCallCount: 1,
			pineconeQueryCount,
			pineconeMatchCount: 0
		};
	}

	const imageResults = await Promise.allSettled(
		matches.map((m) => loadImageForMatch((m.metadata ?? {}) as Record<string, unknown>))
	);
	const loaded = imageResults
		.filter((r): r is PromiseFulfilledResult<import('./types.js').LoadedImage | null> => r.status === 'fulfilled')
		.map((r) => r.value)
		.filter((img): img is import('./types.js').LoadedImage => img != null);

	if (loaded.length === 0) {
		throw new Error(
			'Could not load any image files. Ensure Pinecone metadata imageUrl points to accessible S3 URLs.'
		);
	}

	const promptText =
		`The images above were retrieved as relevant to the following question. ` +
		`Use these images as the primary source, and supplement with Google Search results for additional context when helpful.\n\n` +
		`Question: ${question}`;

	const imageParts = loaded.map((img) => ({
		inlineData: { data: img.base64, mimeType: img.mimeType }
	}));

	const contents = [
		{
			role: 'user' as const,
			parts: [...imageParts, { text: promptText }]
		}
	];

	const { result: usage, retryCount } = await withRetry(async () => {
		const stream = await client.models.generateContentStream({
			model: modelId,
			contents,
			config: {
				...(googleSearchEnabled && { tools: [{ googleSearch: {} }] }),
				...(useStructured && {
					responseMimeType: 'application/json',
					responseSchema: sanitizeSchema(responseSchema!)
				})
			}
		});

		let promptTokens = 0;
		let completionTokens = 0;

		for await (const chunk of stream) {
			const t = chunk.text ?? '';
			if (t) onChunk(t);
			if (chunk.usageMetadata) {
				promptTokens = chunk.usageMetadata.promptTokenCount ?? promptTokens;
				completionTokens = chunk.usageMetadata.candidatesTokenCount ?? completionTokens;
			}
		}

		return {
			promptTokenCount: promptTokens,
			candidatesTokenCount: completionTokens
		};
	}, 'vision-rag-stream');

	return {
		promptTokenCount: usage.promptTokenCount,
		candidatesTokenCount: usage.candidatesTokenCount,
		retryCount,
		embeddingCallCount: 1,
		pineconeQueryCount,
		pineconeMatchCount
	};
}
