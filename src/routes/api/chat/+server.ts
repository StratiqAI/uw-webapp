import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY, OPENAI_BASE_URL } from '$env/static/private';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('api');
import OpenAI from 'openai';
import type { DemographicsResult, JobsAndCommutingResult, EconomyResult } from './types';
// const DEFAULT_MODEL = 'gpt-4o-nano'; // change as you like
const DEFAULT_MODEL = 'gpt-4o';
const client = new OpenAI({
	apiKey: OPENAI_API_KEY
});

// Valid roles for OpenAI API
const VALID_ROLES = ['system', 'user', 'assistant', 'function', 'tool', 'developer'];

/** ────────────────────────────────────────────────────────────────────────────
 *  Tools: let the model call these with arguments it decides on.
 *  Keep descriptions concise but specific so the model knows when to use them.
 *  ────────────────────────────────────────────────────────────────────────────
 */
const tools = [
	// Existing calc tools (optional, keep if you use them)
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

	// NEW: Demographics within rings of an address
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

	// NEW: Jobs and commuting flows around a place
	{
		type: 'function',

		name: 'get_jobs_and_commuting_flows',
		description:
			'Work ↔ home flows and industry mix around an address or geo. Returns inflow/outflow, job-worker balance, top OD flows, NAICS mix, commute time.',
		parameters: {
			type: 'object',
			properties: {
				address: {
					type: 'string',
					description: 'Street, city, state or full address. Optional if geoId provided.'
				},
				geoId: {
					type: 'string',
					description: 'Census tract/block group/county/CBSA. Optional if address provided.'
				},
				radius_miles: {
					type: 'number',
					description: 'Optional search radius for clustering flows.'
				},
				year: { type: 'integer', description: 'LODES/ACS reference year if supported. Optional.' }
			}
		}
	},

	// NEW: Economy snapshot (labor, GDP, CPI, income)
	{
		type: 'function',

		name: 'get_economy_snapshot',
		description:
			'Local macro snapshot around a location: unemployment, payroll jobs YoY, GDP per capita, median HH income, CPI YoY, permits if available.',
		parameters: {
			type: 'object',
			properties: {
				address: {
					type: 'string',
					description: 'Street, city, state or full address. Optional if geoId provided.'
				},
				geoId: {
					type: 'string',
					description: 'County/CBSA/state FIPS/CBSA code. Optional if address provided.'
				},
				prefer_msa: { type: 'boolean', description: 'Prefer CBSA if resolvable from address.' }
			}
		}
	}
];

/** ────────────────────────────────────────────────────────────────────────────
 *  Tool Implementations (stubs): replace internals with your real services.
 *  Keep return shapes stable to avoid breaking prompts/clients.
 *  ────────────────────────────────────────────────────────────────────────────
 */
async function getDemographicsWithinRadius(
	address: string,
	rings_miles: number[],
	year?: number
): Promise<DemographicsResult> {
	// TODO: Geocode -> build rings -> intersect with Census geos -> aggregate ACS
	// Replace with your Lambda or service. Below is deterministic placeholder.
	const now = new Date().toISOString();
	const fake = (m: number) => ({
		miles: m,
		population: Math.max(500, Math.round(5000 * m + 3000 * Math.random())),
		medianAge: +(30 + 5 * Math.random()).toFixed(1),
		medianHouseholdIncome: Math.round(50000 + 25000 * Math.random()),
		households: Math.round(0.4 * (5000 * m)),
		medianGrossRent: Math.round(1200 + 400 * Math.random()),
		ownerOccRate: +(0.45 + 0.3 * Math.random()).toFixed(2),
		eduAttainmentPctBA: +(0.2 + 0.4 * Math.random()).toFixed(2),
		raceEthnicity: {
			white: +(0.3 + 0.5 * Math.random()).toFixed(2),
			black: +(0.05 + 0.15 * Math.random()).toFixed(2),
			asian: +(0.05 + 0.15 * Math.random()).toFixed(2),
			hispanic: +(0.1 + 0.25 * Math.random()).toFixed(2),
			other: +(0.05 + 0.15 * Math.random()).toFixed(2)
		}
	});

	return {
		address,
		geocoded: { lat: 0, lon: 0 }, // replace with real geocode
		rings: rings_miles.map(fake),
		asOf: now,
		sources: [`US Census ACS ${year ?? 2023} (aggregated)`]
	};
}

async function getJobsAndCommutingFlows(args: {
	address?: string;
	geoId?: string;
	radius_miles?: number;
	year?: number;
}): Promise<JobsAndCommutingResult> {
	const { address, geoId, radius_miles, year } = args;
	const now = new Date().toISOString();
	const inflow = 15000 + Math.round(5000 * Math.random());
	const outflow = 12000 + Math.round(4000 * Math.random());
	return {
		anchor: { address, geoId, name: 'Sample Area' },
		summary: {
			inflowJobs: inflow,
			outflowWorkers: outflow,
			jobToWorkerRatio: +(inflow / Math.max(1, outflow)).toFixed(2),
			medianCommuteMinutes: +(22 + 8 * Math.random()).toFixed(1)
		},
		topFlowsIn: [
			{
				origin: { geoId: '06037', name: 'Los Angeles County' },
				destination: { geoId: '06059', name: 'Orange County' },
				jobs: 3200
			},
			{
				origin: { geoId: '06059', name: 'Orange County' },
				destination: { geoId: '06059', name: 'Orange County' },
				jobs: 2900
			}
		],
		topFlowsOut: [
			{
				origin: { geoId: '06059', name: 'Orange County' },
				destination: { geoId: '06037', name: 'Los Angeles County' },
				jobs: 2700
			},
			{
				origin: { geoId: '06059', name: 'Orange County' },
				destination: { geoId: '06073', name: 'San Diego County' },
				jobs: 1800
			}
		],
		industryMix: [
			{ naics2: '44-45', name: 'Retail Trade', jobsShare: 0.16 },
			{ naics2: '62', name: 'Health Care & Social Assist.', jobsShare: 0.18 },
			{ naics2: '72', name: 'Accommodation & Food', jobsShare: 0.11 },
			{ naics2: '54', name: 'Professional Services', jobsShare: 0.12 }
		],
		asOf: now,
		sources: [`LEHD LODES ${year ?? 2021}`, `ACS ${year ?? 2023}`]
	};
}

async function getEconomySnapshot(args: {
	address?: string;
	geoId?: string;
	prefer_msa?: boolean;
}): Promise<EconomyResult> {
	const { address, geoId, prefer_msa } = args;
	const now = new Date().toISOString();
	return {
		anchor: {
			address,
			geoId,
			name: 'Sample Area',
			msa: prefer_msa ? 'Sample CBSA' : undefined,
			county: 'Sample County',
			state: 'CA'
		},
		unemploymentRate: +(0.035 + 0.03 * Math.random()).toFixed(3),
		unemploymentYoYChangePts: +(-0.4 + 0.8 * Math.random()).toFixed(2),
		payrollJobsYoY: +(-0.02 + 0.06 * Math.random()).toFixed(3),
		gdpPerCapita: Math.round(65000 + 15000 * Math.random()),
		medianHHIncome: Math.round(80000 + 20000 * Math.random()),
		cpiYoY: +(0.015 + 0.03 * Math.random()).toFixed(3),
		buildingPermitsYoY: +(-0.2 + 0.4 * Math.random()).toFixed(3),
		asOf: now,
		sources: ['BLS LAUS/SAE latest', 'BEA CAINC/GDP latest', 'ACS latest', 'BLS CPI-U']
	};
}

/** ────────────────────────────────────────────────────────────────────────────
 *  Tool call router
 *  ────────────────────────────────────────────────────────────────────────────
 */
async function handleToolCall(name: string, args: any) {
	switch (name) {
		case 'calc_cap_rate': {
			const { noi, price } = args;
			const capRate = price ? noi / price : null;
			return { capRate, capRatePct: capRate == null ? null : +(capRate * 100).toFixed(2) };
		}
		case 'calc_dscr': {
			const { noi, annual_debt_service } = args;
			const dscr = annual_debt_service ? noi / annual_debt_service : null;
			return { dscr: dscr == null ? null : +dscr.toFixed(2) };
		}
		case 'get_demographics_within_radius': {
			const { address, rings_miles, year } = args;
			return await getDemographicsWithinRadius(address, rings_miles, year);
		}
		case 'get_jobs_and_commuting_flows': {
			return await getJobsAndCommutingFlows(args);
		}
		case 'get_economy_snapshot': {
			return await getEconomySnapshot(args);
		}
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}

/** ────────────────────────────────────────────────────────────────────────────
 *  Minimal moderation stub (toggle on real Moderations API if desired)
 *  ────────────────────────────────────────────────────────────────────────────
 */
async function passesModeration(_text: string) {
	return true;
}

/** ────────────────────────────────────────────────────────────────────────────
 *  Prompt: teach the model when to call which tool
 *  ────────────────────────────────────────────────────────────────────────────
 */
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

const tools2 = [
	{
		type: 'function',
		name: 'get_weather',
		description: 'Get current temperature for a given location.',
		parameters: {
			type: 'object',
			properties: {
				location: {
					type: 'string',
					description: 'City and country e.g. Bogotá, Colombia'
				}
			},
			required: ['location'],
			additionalProperties: false
		},
		strict: true
	}
];

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { messages, model = DEFAULT_MODEL } = await request.json();

		if (!OPENAI_API_KEY) {
			return json({ error: 'Server misconfigured: OPENAI_API_KEY is missing.' }, { status: 500 });
		}

		// Filter out messages with invalid roles and log them for debugging
		const validMessages = [
			{ role: 'system', content: SYSTEM_PROMPT },
			...messages.filter((msg: any) => {
				if (!VALID_ROLES.includes(msg.role)) {
					log.warn(`Filtering out message with invalid role: ${msg.role}`, msg);
					return false;
				}
				return true;
			})
		];

		// log.debug('validMessages: ', validMessages);

		// OpenAI Chat Completions (simple non-streaming for reliability)
		const respTools = await fetch(`${OPENAI_BASE_URL}/v1/responses`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_API_KEY}`
			},
			body: JSON.stringify({
				model,
				input: validMessages,
				tools: tools,
				tool_choice: 'auto'
			})
		});

		// log.debug('respTools: ', respTools);

		if (!respTools.ok) {
			const errText = await respTools.text().catch(() => '');
			return json({ error: `Upstream error: ${respTools.status} ${errText}` }, { status: 500 });
		}

		const data = await respTools.json();

		log.debug('data.output: ', JSON.stringify(data.output, null, 2));
		log.debug('==============================================')
		const toolCalls = data.output;

		if (toolCalls.length) {
			const toolMessages = [];
			for (const call of toolCalls) {
				if (call.type !== 'function_call') continue;
				const args = call.arguments ? JSON.parse(call.arguments) : {};
				const result = await handleToolCall(call.name, args);
				log.debug('result: ', JSON.stringify(result, null, 2));
				log.debug('==============================================')
				toolMessages.push({
					role: 'assistant',
					content: JSON.stringify(result)
				});
			}

			log.debug('toolMessages: ', JSON.stringify(toolMessages, null, 2));
			log.debug('==============================================')
			validMessages.push(...toolMessages);
			log.debug('validMessages: ', JSON.stringify(validMessages, null, 2));
			log.debug('==============================================')

			const resp = await fetch(`${OPENAI_BASE_URL}/v1/responses`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${OPENAI_API_KEY}`
				},
				body: JSON.stringify({
					model,
					input: validMessages
				})
			});
			// completion = await openai.chat.completions.create({
			// 	model: 'gpt-4o',
			// 	messages
			// });
			if (!resp.ok) {
				const errText = await resp.text().catch(() => '');
				return json({ error: `Upstream error: ${resp.status} ${errText}` }, { status: 500 });
			}

			const responseData = await resp.json();
			const reply = responseData.output
				.map((o: any) => o.content?.map((c: any) => c.text).join(' ') ?? '')
				.join(' ');
			log.debug('reply: ', reply);
			return json({ reply });
		}

		// log.debug('reply: ', JSON.stringify(reply, null, 2));

		// // OpenAI Chat Completions (simple non-streaming for reliability)
		// const resp = await fetch(`${OPENAI_BASE_URL}/v1/responses`, {
		// 	method: 'POST',
		// 	headers: {
		// 		'Content-Type': 'application/json',
		// 		Authorization: `Bearer ${OPENAI_API_KEY}`
		// 	},
		// 	body: JSON.stringify({
		// 		model,
		// 		input: validMessages
		// 	})
		// });

		// log.debug('resp: ', resp);

		// if (!resp.ok) {
		// 	const errText = await resp.text().catch(() => '');
		// 	return json({ error: `Upstream error: ${resp.status} ${errText}` }, { status: 500 });
		// }

		// const data = await resp.json();
		// const reply = data.output
		// 	.map((o: any) => o.content?.map((c: any) => c.text).join(' ') ?? '')
		// 	.join(' ');
		// return json({ reply });
	} catch (err: any) {
		return json({ error: err?.message ?? 'Unknown server error' }, { status: 500 });
	}
};
