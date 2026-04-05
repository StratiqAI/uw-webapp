import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$env/static/private';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('api');
import OpenAI from 'openai';

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!OPENAI_API_KEY) {
			return json({ error: 'Server misconfigured: OPENAI_API_KEY is missing.' }, { status: 500 });
		}

		const body = await request.json();

		// Validate required fields
		if (!body.model || !body.input) {
			return json({ error: 'Missing required fields: model and input are required.' }, { status: 400 });
		}

		// Call OpenAI Responses API
		// Note: The /v1/responses endpoint uses the default OpenAI API baseURL
		// If this endpoint doesn't exist at the default location, you may need a custom baseURL
		const response = await fetch('https://api.openai.com/v1/responses', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_API_KEY}`
			},
			body: JSON.stringify({
				model: body.model,
				input: body.input,
				...(body.tools && { tools: body.tools }),
				...(body.tool_choice && { tool_choice: body.tool_choice }),
				...(body.text && { text: body.text })
			})
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			const errorData = await response.json().catch(() => ({ error: errorText }));
			throw new OpenAI.APIError(
				response.status,
				errorData,
				`OpenAI API error: ${response.status}`,
				undefined
			);
		}

		const data = await response.json();

		return json({
			success: true,
			data: data
		});
	} catch (error) {
		log.error('Error calling OpenAI Responses API:', error);
		
		// Handle OpenAI API errors
		if (error instanceof OpenAI.APIError) {
			return json(
				{
					error: `OpenAI API error: ${error.message}`,
					details: {
						status: error.status,
						code: error.code,
						type: error.type
					}
				},
				{ status: error.status || 500 }
			);
		}

		return json(
			{
				error: 'Internal server error',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

