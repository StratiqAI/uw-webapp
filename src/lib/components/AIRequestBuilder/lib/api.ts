// src/lib/api.ts

export async function submitToAPI(config: any): Promise<{ data?: any; error?: string }> {
	try {
		const response = await fetch('/api/openai-responses', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(config)
		});

		const result = await response.json();

		if (!response.ok) {
			let errorMessage = result.error || 'Failed to submit to OpenAI API';
			if (result.details) {
				errorMessage += `: ${JSON.stringify(result.details)}`;
			}
			return { error: errorMessage };
		}

		return { data: result.data };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
		return { error: errorMessage };
	}
}