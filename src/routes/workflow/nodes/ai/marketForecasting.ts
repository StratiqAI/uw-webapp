import { createAIWorkflowNode } from './createAIWorkflowNode';

export const marketForecastingNode = createAIWorkflowNode({
	id: 'ai-market-forecasting',
	label: 'Market Forecasting',
	prompt:
		'Forecast market trends and conditions for this commercial real estate market. Analyze future rent growth, occupancy trends, cap rate movements, and market outlook: {input}',
	systemPrompt:
		'You are a commercial real estate market forecaster expert in market trend analysis, economic forecasting, and real estate market predictions.',
	inputLabel: 'Market Data'
});

// prompt: 'Forecast market trends and conditions for this commercial real estate market. Analyze future rent growth, occupancy trends, cap rate movements, and market outlook: {input}',
// systemPrompt: 'You are a commercial real estate market forecaster expert in market trend analysis, economic forecasting, and real estate market predictions.'
