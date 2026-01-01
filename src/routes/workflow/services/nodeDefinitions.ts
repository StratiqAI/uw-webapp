import type { ElementType, AIQueryData } from '../types/node';

/**
 * Default element type definitions for the workflow builder.
 * This array contains all available node types including:
 * - Input nodes (data sources)
 * - Process nodes (calculations and transformations)
 * - AI nodes (AI-powered analysis)
 * - Output nodes (results and reports)
 */
export const elementTypes: ElementType[] = [
	// Input Nodes
	{
		id: 'input-property-data',
		type: 'input',
		label: 'Document Knowledge Base',
		icon: '🏢',
		execute: (input) => input || { address: '', sqft: 0, yearBuilt: 0, propertyType: 'Office' }
	},
	{
		id: 'input-financial-metrics',
		type: 'input',
		label: 'MCP Server',
		icon: 'M',
		execute: (input) => input || { purchasePrice: 0, annualRent: 0, operatingExpenses: 0 }
	},
	{
		id: 'input-market-data',
		type: 'input',
		label: 'US Census',
		icon: '📊',
		execute: (input) => input || { marketCapRate: 0, comparableSales: [], marketTrends: '' }
	},
	// Process Nodes
	{
		id: 'process-calculate-noi',
		type: 'process',
		label: 'Calculate NOI',
		icon: 'NOI',
		execute: (input) => {
			if (typeof input === 'object' && input !== null) {
				const rent = input.annualRent || input.rent || 0;
				const expenses = input.operatingExpenses || input.expenses || 0;
				return rent - expenses;
			}
			return 0;
		}
	},
	{
		id: 'process-calculate-cap-rate',
		type: 'process',
		label: 'Calculate Cap Rate',
		icon: '%',
		execute: (input) => {
			if (typeof input === 'object' && input !== null) {
				const noi = input.noi || input.netOperatingIncome || 0;
				const price = input.purchasePrice || input.price || 0;
				if (price > 0) {
					return ((noi / price) * 100).toFixed(2) + '%';
				}
			}
			return '0%';
		}
	},
	{
		id: 'process-calculate-dscr',
		type: 'process',
		label: 'Calculate DSCR',
		icon: 'DSCR',
		execute: (input) => {
			if (typeof input === 'object' && input !== null) {
				const noi = input.noi || input.netOperatingIncome || 0;
				const debtService = input.debtService || input.monthlyPayment || 0;
				if (debtService > 0) {
					return (noi / (debtService * 12)).toFixed(2);
				}
			}
			return '0.00';
		}
	},
	{
		id: 'process-calculate-cash-flow',
		type: 'process',
		label: 'Calculate Cash Flow',
		icon: 'CF',
		execute: (input) => {
			if (typeof input === 'object' && input !== null) {
				const noi = input.noi || input.netOperatingIncome || 0;
				const debtService = input.debtService || input.monthlyPayment || 0;
				return noi - (debtService * 12);
			}
			return 0;
		}
	},
	// AI Nodes - These nodes use a common execute function pattern with AIQueryData
	{
		id: 'ai-property-analysis',
		type: 'ai',
		label: 'Property Analysis',
		icon: 'AI',
		execute: async (input: any, customData?: AIQueryData) => {
			if (!customData) {
				customData = {
					prompt: 'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}',
					model: 'gpt-4o',
					systemPrompt: 'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.'
				};
			}
			if (!customData) {
				return 'AI Query not configured';
			}

			try {
				// Format the input into the prompt
				let formattedPrompt = customData.prompt;
				if (input !== null && input !== undefined) {
					// Replace {input} placeholder or append input
					if (formattedPrompt.includes('{input}')) {
						formattedPrompt = formattedPrompt.replace('{input}', String(input));
					} else {
						formattedPrompt = `${formattedPrompt}\n\nInput: ${JSON.stringify(input)}`;
					}
				}

				const response = await fetch('/api/openai-responses', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						model: customData.model,
						input: [
							...(customData.systemPrompt
								? [{ role: 'system', content: customData.systemPrompt }]
								: []),
							{ role: 'user', content: formattedPrompt }
						]
					})
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to call OpenAI API');
				}

				const result = await response.json();
				
				// Handle different response formats from OpenAI Responses API
				if (result.data) {
					// Try to extract content from various possible response structures
					if (result.data.output && Array.isArray(result.data.output)) {
						const firstOutput = result.data.output[0];
						if (firstOutput?.content) {
							return firstOutput.content;
						}
						if (typeof firstOutput === 'string') {
							return firstOutput;
						}
					}
					if (result.data.content) {
						return result.data.content;
					}
					if (typeof result.data === 'string') {
						return result.data;
					}
					// Fallback: return stringified data
					return JSON.stringify(result.data);
				}
				
				return 'No response';
			} catch (error) {
				console.error('AI Query error:', error);
				return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			}
		}
	}
];
