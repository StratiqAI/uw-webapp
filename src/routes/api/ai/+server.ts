/**
 * Unified AI API route — single server-side entry point for all direct AI calls.
 *
 * Replaces api/chat/+server.ts. Handles:
 * - OpenAI Responses API calls with tool use
 * - Usage recording via M_CREATE_USAGE_RECORD through AppSync (IAM auth)
 * - Pre-flight quota checks (Phase 5)
 *
 * Request body: { model, messages, tools?, responseFormat?, temperature?,
 *                 maxTokens?, topP?, frequencyPenalty?, usage: UsageContext }
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY, OPENAI_BASE_URL } from '$env/static/private';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('api.ai');

const DEFAULT_MODEL = 'gpt-4o';
const VALID_ROLES = new Set(['system', 'user', 'assistant', 'tool', 'developer']);

// CRE system prompt (carried over from api/chat)
const SYSTEM_PROMPT = `
You are a senior Commercial Real Estate (CRE) analyst.

When a user asks about a location or market:
- If they want *people* and *household* info within 1/3/5 miles, call get_demographics_within_radius.
- If they want *jobs*, *commuting*, or *industry mix*, call get_jobs_and_commuting_flows.
- If they want *macro indicators* (unemployment, GDP per capita, CPI, income), call get_economy_snapshot.
- Combine tools when needed (e.g., demographics + economy).
- Always return units, define metrics, and provide short interpretation.
- Include "Not financial/legal advice." at the end when giving investment views.
`;

// ---------------------------------------------------------------------------
// Tool definitions (carried from api/chat)
// ---------------------------------------------------------------------------

const tools = [
	{
		type: 'function',
		name: 'calc_cap_rate',
		description: 'Calculate capitalization rate given NOI and purchase price.',
		parameters: {
			type: 'object',
			properties: { noi: { type: 'number' }, price: { type: 'number' } },
			required: ['noi', 'price']
		}
	},
	{
		type: 'function',
		name: 'calc_dscr',
		description: 'Debt Service Coverage Ratio = NOI / annual_debt_service.',
		parameters: {
			type: 'object',
			properties: { noi: { type: 'number' }, annual_debt_service: { type: 'number' } },
			required: ['noi', 'annual_debt_service']
		}
	},
	{
		type: 'function',
		name: 'get_demographics_within_radius',
		description:
			'Demographic stats for concentric rings around an address (e.g., 1/3/5 miles): population, median age, income, rent, tenure, education, race/ethnicity share.',
		parameters: {
			type: 'object',
			properties: {
				address: { type: 'string', description: 'Street, city, state or full address.' },
				rings_miles: {
					type: 'array',
					items: { type: 'number' },
					description: 'Ring radii in miles, e.g., [1,3,5]'
				},
				year: { type: 'integer', description: 'ACS 5-year end year (e.g., 2023). Optional.' }
			},
			required: ['address', 'rings_miles']
		}
	},
	{
		type: 'function',
		name: 'get_jobs_and_commuting_flows',
		description:
			'Work ↔ home flows and industry mix around an address or geo. Returns inflow/outflow, job-worker balance, top OD flows, NAICS mix, commute time.',
		parameters: {
			type: 'object',
			properties: {
				address: { type: 'string', description: 'Street, city, state or full address. Optional if geoId provided.' },
				geoId: { type: 'string', description: 'Census tract/block group/county/CBSA. Optional if address provided.' },
				radius_miles: { type: 'number', description: 'Optional search radius for clustering flows.' },
				year: { type: 'integer', description: 'LODES/ACS reference year if supported. Optional.' }
			}
		}
	},
	{
		type: 'function',
		name: 'get_economy_snapshot',
		description:
			'Local macro snapshot around a location: unemployment, payroll jobs YoY, GDP per capita, median HH income, CPI YoY, permits if available.',
		parameters: {
			type: 'object',
			properties: {
				address: { type: 'string', description: 'Street, city, state or full address. Optional if geoId provided.' },
				geoId: { type: 'string', description: 'County/CBSA/state FIPS/CBSA code. Optional if address provided.' },
				prefer_msa: { type: 'boolean', description: 'Prefer CBSA if resolvable from address.' }
			}
		}
	}
];

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
	switch (name) {
		case 'calc_cap_rate': {
			const noi = args.noi as number;
			const price = args.price as number;
			const capRate = price ? noi / price : null;
			return { capRate, capRatePct: capRate == null ? null : +(capRate * 100).toFixed(2) };
		}
		case 'calc_dscr': {
			const noi = args.noi as number;
			const ads = args.annual_debt_service as number;
			const dscr = ads ? noi / ads : null;
			return { dscr: dscr == null ? null : +dscr.toFixed(2) };
		}
		case 'get_demographics_within_radius':
			throw new Error('get_demographics_within_radius is not yet implemented');
		case 'get_jobs_and_commuting_flows':
			throw new Error('get_jobs_and_commuting_flows is not yet implemented');
		case 'get_economy_snapshot':
			throw new Error('get_economy_snapshot is not yet implemented');
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const {
			messages,
			model = DEFAULT_MODEL,
			usage: _usageCtx
		} = body;

		if (!OPENAI_API_KEY) {
			return json({ error: 'Server misconfigured: OPENAI_API_KEY is missing.' }, { status: 500 });
		}

		// Sanitise messages
		const validMessages: Array<{ role: string; content: string }> = [
			{ role: 'system', content: SYSTEM_PROMPT },
			...messages.filter((msg: { role: string }) => VALID_ROLES.has(msg.role))
		];

		// First call: with tools
		const resp1 = await fetch(`${OPENAI_BASE_URL}/v1/responses`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_API_KEY}`
			},
			body: JSON.stringify({ model, input: validMessages, tools, tool_choice: 'auto' })
		});

		if (!resp1.ok) {
			const errText = await resp1.text().catch(() => '');
			return json({ error: `Upstream error: ${resp1.status} ${errText}` }, { status: 502 });
		}

		const data1 = await resp1.json();
		const toolCalls = data1.output ?? [];

		// Process tool calls if any
		if (toolCalls.length && toolCalls.some((c: { type: string }) => c.type === 'function_call')) {
			const toolMessages: Array<{ role: string; content: string }> = [];
			for (const call of toolCalls) {
				if (call.type !== 'function_call') continue;
				const args = call.arguments ? JSON.parse(call.arguments) : {};
				const result = await handleToolCall(call.name, args);
				toolMessages.push({ role: 'assistant', content: JSON.stringify(result) });
			}

			validMessages.push(...toolMessages);

			const resp2 = await fetch(`${OPENAI_BASE_URL}/v1/responses`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${OPENAI_API_KEY}`
				},
				body: JSON.stringify({ model, input: validMessages })
			});

			if (!resp2.ok) {
				const errText = await resp2.text().catch(() => '');
				return json({ error: `Upstream error: ${resp2.status} ${errText}` }, { status: 502 });
			}

			const data2 = await resp2.json();
			const reply = data2.output
				?.map((o: { content?: Array<{ text: string }> }) =>
					o.content?.map((c) => c.text).join(' ') ?? ''
				)
				.join(' ') ?? '';

			const usage = extractUsage(data1, data2);

			// TODO (Phase 5): record UsageRecord via AppSync IAM with _usageCtx
			// TODO (Phase 5): pre-flight quota check before the OpenAI call

			return json({ reply, usage });
		}

		// No tool calls — extract direct reply
		const reply = data1.output
			?.map((o: { content?: Array<{ text: string }> }) =>
				o.content?.map((c) => c.text).join(' ') ?? ''
			)
			.join(' ') ?? '';

		const usage = extractUsage(data1);

		// TODO (Phase 5): record UsageRecord via AppSync IAM with _usageCtx

		return json({ reply, usage });
	} catch (err: unknown) {
		log.error('AI route error:', err);
		return json(
			{ error: err instanceof Error ? err.message : 'Unknown server error' },
			{ status: 500 }
		);
	}
};

// ---------------------------------------------------------------------------
// Usage extraction helper
// ---------------------------------------------------------------------------

function extractUsage(
	...responses: Array<Record<string, unknown>>
): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
	let promptTokens = 0;
	let completionTokens = 0;

	for (const resp of responses) {
		const u = resp.usage as Record<string, number> | undefined;
		if (u) {
			promptTokens += u.input_tokens ?? u.prompt_tokens ?? 0;
			completionTokens += u.output_tokens ?? u.completion_tokens ?? 0;
		}
	}

	const totalTokens = promptTokens + completionTokens;
	if (totalTokens === 0) return undefined;
	return { promptTokens, completionTokens, totalTokens };
}
