import { tool } from "ai";
import { z } from "zod";

export const weatherTool = tool( {
	description: 'Get the current weather for a given city.',
	inputSchema: z.object({
		city: z.string().describe('The city name, e.g. "San Francisco"'),
		unit: z.enum(['celsius', 'fahrenheit']).optional().default('fahrenheit')
	}),
	execute: async ({ city, unit }) => {
		console.log("[getWeather]: ", city, unit);
		return {
			city,
			temperature: unit === 'celsius' ? 18 : 64,
			condition: 'Partly cloudy',
			unit
		};
	}
});