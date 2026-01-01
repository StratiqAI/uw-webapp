<!--
	Workflow Builder Page - Commercial Real Estate Analysis Workflow System
	
	This component provides a visual, drag-and-drop workflow builder for creating and executing
	commercial real estate analysis workflows. Users can:
	
	- Build workflows by connecting nodes (inputs, processes, outputs, AI analysis)
	- Execute workflows to process data through connected nodes
	- Create custom AI analysis nodes with configurable prompts and models
	- Save and load workflow configurations
	- Visualize data flow through connections between nodes
	
	Key Features:
	- Pre-built node library for CRE analysis (NOI, cap rate, DSCR calculations, etc.)
	- AI-powered analysis nodes (market analysis, risk assessment, financial modeling, etc.)
	- Interactive canvas with drag-and-drop node placement
	- Connection system for linking node inputs/outputs
	- Workflow execution engine with dependency resolution
	- Dark mode support
	- Export/import workflow JSON
	
	Component Structure:
	- Types: ElementType, GridElement, Connection, ConnectionPoint
	- Element Library: Predefined CRE-focused nodes (inputs, processes, AI)
	- State Management: Grid elements, connections, execution state
	- Canvas Rendering: SVG-based visual workflow representation
	- Execution Engine: Topological sort and sequential node execution
-->

<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { generateId } from './utils/idGenerator';
	import { loadCustomAINodes as loadCustomNodes, saveCustomAINodes, createCustomAINode as createCustomNode } from './services/customNodeService';
	// Types
	type ElementType = {
		id: string;
		type: 'input' | 'process' | 'output' | 'ai';
		label: string;
		icon: string;
		execute: (input: any, customData?: any) => any | Promise<any>;
		defaultAIQueryData?: AIQueryData; // For custom AI nodes
	};

	type AIQueryData = {
		prompt: string;
		model: string;
		systemPrompt?: string;
	};

	type GridElement = {
		id: string;
		type: ElementType;
		x: number;
		y: number;
		width: number;
		height: number;
		output?: any;
		aiQueryData?: AIQueryData;
	};

	type Connection = {
		id: string;
		from: string; // element id
		to: string; // element id
		fromSide: 'top' | 'right' | 'bottom' | 'left';
		toSide: 'top' | 'right' | 'bottom' | 'left';
	};

	type ConnectionPoint = {
		x: number;
		y: number;
		elementId: string;
		side: 'top' | 'right' | 'bottom' | 'left';
	};

	// Available element types - Commercial Real Estate Focused
	const elementTypes: ElementType[] = [
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
		// AI Nodes
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
		},
		{
			id: 'ai-market-analysis',
			type: 'ai',
			label: 'Market Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.'
					};
				}

				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nMarket Data: ${JSON.stringify(input, null, 2)}`;
						}
					}

					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}

					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-risk-assessment',
			type: 'ai',
			label: 'Risk Assessment',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.'
					};
				}

				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nInvestment Data: ${JSON.stringify(input, null, 2)}`;
						}
					}

					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}

					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-investment-recommendation',
			type: 'ai',
			label: 'Investment Recommendation',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.'
					};
				}

				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nInvestment Analysis: ${JSON.stringify(input, null, 2)}`;
						}
					}

					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}

					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-tenant-analysis',
			type: 'ai',
			label: 'Tenant Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the tenant profile and lease structure for this commercial property. Evaluate tenant credit quality, lease terms, rent roll stability, and tenant concentration risks: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are an expert commercial real estate analyst specializing in tenant credit analysis, lease structure evaluation, and rent roll risk assessment.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nTenant Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-capital-expenditure-analysis',
			type: 'ai',
			label: 'CapEx Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the capital expenditure requirements for this commercial property. Assess deferred maintenance, required improvements, roof/HVAC systems, and estimate future CapEx needs: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate property condition expert specializing in building systems analysis, deferred maintenance assessment, and capital expenditure planning.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-comparable-sales-analysis',
			type: 'ai',
			label: 'Comparable Sales Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze comparable commercial real estate sales and provide valuation insights. Compare property characteristics, sale prices, cap rates, and price per square foot to assess market value: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate valuation expert specializing in comparable sales analysis, market value assessment, and property valuation methodologies.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nComparable Sales Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-financial-modeling',
			type: 'ai',
			label: 'Financial Modeling',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Create a comprehensive financial model for this commercial real estate investment. Analyze cash flows, returns (IRR, equity multiple), debt service coverage, and provide sensitivity analysis: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate financial modeling expert specializing in investment analysis, cash flow projections, return calculations, and financial underwriting.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nFinancial Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-location-analysis',
			type: 'ai',
			label: 'Location Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the location characteristics of this commercial property. Evaluate demographics, traffic patterns, accessibility, nearby amenities, competition, and location-based risks and opportunities: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate location analyst expert in site selection, demographic analysis, traffic studies, and location-based market evaluation.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nLocation Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-lease-structure-analysis',
			type: 'ai',
			label: 'Lease Structure Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the lease structure and terms for this commercial property. Evaluate lease expiration schedules, rent escalations, renewal probabilities, and lease economics: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate lease analyst expert in lease structure evaluation, rent roll analysis, lease expiration management, and lease economics.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nLease Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-zoning-compliance',
			type: 'ai',
			label: 'Zoning Compliance',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze zoning regulations and compliance for this commercial property. Assess permitted uses, development rights, setbacks, parking requirements, and potential zoning risks or opportunities: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate zoning expert specializing in land use regulations, zoning compliance, development rights analysis, and regulatory risk assessment.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nZoning Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-environmental-assessment',
			type: 'ai',
			label: 'Environmental Assessment',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Assess environmental risks and compliance for this commercial property. Evaluate potential contamination, environmental regulations, remediation requirements, and environmental liability: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate environmental consultant expert in Phase I/II assessments, environmental risk evaluation, regulatory compliance, and remediation cost estimation.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nEnvironmental Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-debt-structure-analysis',
			type: 'ai',
			label: 'Debt Structure Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the debt structure and financing terms for this commercial property investment. Evaluate loan terms, interest rates, amortization schedules, prepayment penalties, and refinancing risks: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate finance expert specializing in debt structuring, loan analysis, financing strategies, and debt service optimization.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nDebt Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-tax-analysis',
			type: 'ai',
			label: 'Tax Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the tax implications for this commercial real estate investment. Evaluate property taxes, income tax considerations, depreciation benefits, 1031 exchange opportunities, and tax-efficient structuring: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate tax advisor expert in property tax assessment, real estate tax planning, depreciation strategies, and tax-efficient investment structures.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nTax Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-competition-analysis',
			type: 'ai',
			label: 'Competition Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the competitive landscape for this commercial property. Evaluate competing properties, market positioning, competitive advantages, and competitive risks: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate market analyst expert in competitive analysis, market positioning, and competitive strategy evaluation.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nCompetition Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-exit-strategy',
			type: 'ai',
			label: 'Exit Strategy',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Develop an exit strategy for this commercial real estate investment. Analyze optimal hold period, exit timing, potential exit strategies (sale, refinance, 1031 exchange), and exit value projections: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate investment strategist expert in exit planning, hold period optimization, and exit strategy execution.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nInvestment Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-due-diligence-checklist',
			type: 'ai',
			label: 'Due Diligence Checklist',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Generate a comprehensive due diligence checklist for this commercial real estate acquisition. Include financial, legal, physical, environmental, and operational due diligence items: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate due diligence expert specializing in acquisition due diligence, risk identification, and comprehensive property evaluation.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-rent-roll-analysis',
			type: 'ai',
			label: 'Rent Roll Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the rent roll for this commercial property. Evaluate current rents vs market rents, lease expiration schedule, tenant mix, rent growth potential, and rent roll stability: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate rent roll analyst expert in lease analysis, rent optimization, and rent roll risk assessment.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nRent Roll Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-asset-management',
			type: 'ai',
			label: 'Asset Management',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Develop an asset management strategy for this commercial property. Analyze value-add opportunities, operational improvements, tenant retention strategies, and asset optimization initiatives: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate asset manager expert in property operations, value creation, tenant relations, and asset optimization strategies.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-portfolio-analysis',
			type: 'ai',
			label: 'Portfolio Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze this commercial real estate portfolio. Evaluate portfolio diversification, geographic concentration, property type mix, performance metrics, and portfolio optimization opportunities: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate portfolio manager expert in portfolio analysis, diversification strategies, and portfolio optimization.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nPortfolio Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-valuation-analysis',
			type: 'ai',
			label: 'Valuation Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Perform a comprehensive valuation analysis for this commercial property using multiple approaches. Evaluate income approach, sales comparison approach, and cost approach to determine fair market value: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate appraiser expert in property valuation methodologies, market value assessment, and appraisal standards.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-lease-negotiation',
			type: 'ai',
			label: 'Lease Negotiation',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Provide lease negotiation strategies and recommendations for this commercial property. Analyze market lease rates, tenant improvement allowances, rent escalations, and lease term structures: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate lease negotiator expert in lease structuring, market rate analysis, and lease negotiation strategies.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nLease Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-property-management',
			type: 'ai',
			label: 'Property Management',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Develop property management strategies for this commercial property. Analyze maintenance programs, tenant relations, operational efficiency, and property management best practices: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate property manager expert in property operations, maintenance management, tenant relations, and operational optimization.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-development-feasibility',
			type: 'ai',
			label: 'Development Feasibility',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze the development feasibility for this commercial real estate project. Evaluate construction costs, development timelines, entitlement processes, and project economics: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate development consultant expert in feasibility analysis, construction cost estimation, and development project evaluation.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nDevelopment Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-refinancing-analysis',
			type: 'ai',
			label: 'Refinancing Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze refinancing opportunities for this commercial property. Evaluate current loan terms, refinancing options, interest rate savings, and optimal refinancing timing: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate finance expert specializing in refinancing strategies, loan restructuring, and debt optimization.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nLoan Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-1031-exchange',
			type: 'ai',
			label: '1031 Exchange',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze 1031 exchange opportunities for this commercial real estate transaction. Evaluate exchange eligibility, timing requirements, replacement property criteria, and tax deferral benefits: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate tax advisor expert in 1031 exchanges, like-kind exchange rules, and tax-deferred exchange strategies.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nTransaction Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-market-timing',
			type: 'ai',
			label: 'Market Timing',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze optimal market timing for this commercial real estate transaction. Evaluate market cycles, economic indicators, interest rate trends, and optimal timing for acquisition or disposition: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate market strategist expert in market cycle analysis, economic indicators, and transaction timing optimization.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nMarket Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-tenant-retention',
			type: 'ai',
			label: 'Tenant Retention',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Develop tenant retention strategies for this commercial property. Analyze tenant satisfaction factors, renewal incentives, lease renewal probabilities, and retention best practices: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate tenant relations expert specializing in tenant retention, lease renewals, and tenant satisfaction strategies.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nTenant Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-value-add-opportunities',
			type: 'ai',
			label: 'Value-Add Opportunities',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Identify value-add opportunities for this commercial property. Analyze potential improvements, repositioning strategies, operational enhancements, and value creation initiatives: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate value-add strategist expert in property repositioning, value creation, and investment value enhancement.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-legal-compliance',
			type: 'ai',
			label: 'Legal Compliance',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Assess legal compliance requirements for this commercial property. Evaluate lease compliance, ADA requirements, building codes, environmental regulations, and legal risk factors: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate legal compliance expert specializing in property law, regulatory compliance, and legal risk assessment.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-operating-expense-analysis',
			type: 'ai',
			label: 'Operating Expense Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze operating expenses for this commercial property. Evaluate expense ratios, expense trends, expense recoveries, and operating expense optimization opportunities: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate operations analyst expert in operating expense analysis, expense management, and cost optimization.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nExpense Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-cap-rate-analysis',
			type: 'ai',
			label: 'Cap Rate Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze capitalization rates for this commercial property investment. Evaluate market cap rates, going-in cap rates, exit cap rates, and cap rate compression/expansion risks: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate investment analyst expert in cap rate analysis, yield analysis, and capitalization rate trends.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nInvestment Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-demographic-analysis',
			type: 'ai',
			label: 'Demographic Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze demographic trends and characteristics for this commercial property location. Evaluate population growth, income levels, employment trends, and demographic risk factors: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate demographic analyst expert in population analysis, demographic trends, and location-based demographic evaluation.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nDemographic Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-construction-cost-estimation',
			type: 'ai',
			label: 'Construction Cost Estimation',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Estimate construction costs for this commercial real estate development or renovation project. Analyze material costs, labor costs, contractor pricing, and construction cost trends: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial construction cost estimator expert in construction cost analysis, material pricing, and construction cost estimation methodologies.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProject Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-property-condition-assessment',
			type: 'ai',
			label: 'Property Condition Assessment',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Assess the physical condition of this commercial property. Evaluate building systems, structural integrity, maintenance needs, and property condition risks: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial property inspector expert in building condition assessment, property inspections, and physical condition evaluation.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-income-approach-valuation',
			type: 'ai',
			label: 'Income Approach Valuation',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Perform an income approach valuation for this commercial property. Analyze net operating income, capitalization rates, discount rates, and income-based property value: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate appraiser expert in income approach valuation, DCF analysis, and income-based property appraisal.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nIncome Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-lease-abstract',
			type: 'ai',
			label: 'Lease Abstract',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Create a comprehensive lease abstract for this commercial property lease. Extract and summarize key lease terms, rent structure, expiration dates, renewal options, and critical lease provisions: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate lease analyst expert in lease abstraction, lease term extraction, and lease document analysis.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nLease Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-property-repositioning',
			type: 'ai',
			label: 'Property Repositioning',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Develop a property repositioning strategy for this commercial property. Analyze repositioning opportunities, target market repositioning, renovation requirements, and repositioning economics: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate repositioning strategist expert in property transformation, market repositioning, and value creation through repositioning.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nProperty Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-acquisition-underwriting',
			type: 'ai',
			label: 'Acquisition Underwriting',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Perform comprehensive acquisition underwriting for this commercial property investment. Analyze purchase price, projected returns, risks, and investment viability: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate underwriter expert in acquisition analysis, investment underwriting, and deal evaluation.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nAcquisition Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-market-forecasting',
			type: 'ai',
			label: 'Market Forecasting',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Forecast market trends and conditions for this commercial real estate market. Analyze future rent growth, occupancy trends, cap rate movements, and market outlook: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate market forecaster expert in market trend analysis, economic forecasting, and real estate market predictions.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nMarket Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		{
			id: 'ai-tenant-improvement-analysis',
			type: 'ai',
			label: 'Tenant Improvement Analysis',
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				if (!customData) {
					customData = {
						prompt: 'Analyze tenant improvement requirements and costs for this commercial property. Evaluate TI allowances, build-out costs, tenant improvement economics, and TI negotiation strategies: {input}',
						model: 'gpt-4o',
						systemPrompt: 'You are a commercial real estate tenant improvement expert specializing in TI cost analysis, build-out planning, and tenant improvement negotiations.'
					};
				}
				try {
					let formattedPrompt = customData.prompt;
					if (input !== null && input !== undefined) {
						if (formattedPrompt.includes('{input}')) {
							formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
						} else {
							formattedPrompt = `${formattedPrompt}\n\nTI Data: ${JSON.stringify(input, null, 2)}`;
						}
					}
					const response = await fetch('/api/openai-responses', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							model: customData.model,
							input: [
								...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
								{ role: 'user', content: formattedPrompt }
							]
						})
					});
					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || 'Failed to call OpenAI API');
					}
					const result = await response.json();
					if (result.data) {
						if (result.data.output && Array.isArray(result.data.output)) {
							const firstOutput = result.data.output[0];
							if (firstOutput?.content) return firstOutput.content;
							if (typeof firstOutput === 'string') return firstOutput;
						}
						if (result.data.content) return result.data.content;
						if (typeof result.data === 'string') return result.data;
						return JSON.stringify(result.data);
					}
					return 'No response';
				} catch (error) {
					console.error('AI Query error:', error);
					return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				}
			}
		},
		// Output Nodes
		{
			id: 'output-investment-report',
			type: 'output',
			label: 'Investment Report',
			icon: '📄',
			execute: (input) => input
		},
		{
			id: 'output-financial-summary',
			type: 'output',
			label: 'Financial Summary',
			icon: '💰',
			execute: (input) => input
		},
		{
			id: 'output-analysis-report',
			type: 'output',
			label: 'Analysis Report',
			icon: '📈',
			execute: (input) => input
		}
	];

	// State using Svelte 5 runes
	let gridElements = $state<GridElement[]>([]);
	let connections = $state<Connection[]>([]);
	let draggedElementType = $state<ElementType | null>(null);
	let nodeFilter = $state('');
	let draggedGridElement = $state<GridElement | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let connectingFrom = $state<ConnectionPoint | null>(null);
	let currentMousePos = $state({ x: 0, y: 0 });
	let creatingCustomAI = $state(false);
	let showingAIGallery = $state(false);
	let showingInputGallery = $state(false);
	let showingProcessGallery = $state(false);
	let customAINodes = $state<ElementType[]>([]);
	let customAINodeLabel = $state('');
	let customAINodePrompt = $state('');
	let customAINodeModel = $state('gpt-4o');
	let customAINodeSystemPrompt = $state('');
	let aiGalleryFilter = $state('');

	// Custom AI node functions - now imported from services/customNodeService.ts
	function handleLoadCustomAINodes() {
		customAINodes = loadCustomNodes();
	}

	function handleSaveCustomAINodes() {
		saveCustomAINodes(customAINodes);
	}

	// Create a custom AI node
	function createCustomAINode() {
		if (!customAINodeLabel.trim() || !customAINodePrompt.trim()) {
			return;
		}

		const newId = `custom-ai-${Date.now()}`;
		const customNode = createCustomNode(
			newId,
			customAINodeLabel,
			customAINodePrompt,
			customAINodeModel,
			customAINodeSystemPrompt
		);

		customAINodes = [...customAINodes, customNode];
		handleSaveCustomAINodes();

		// Reset form
		customAINodeLabel = '';
		customAINodePrompt = '';
		customAINodeModel = 'gpt-4o';
		customAINodeSystemPrompt = '';
		creatingCustomAI = false;
	}

	// Delete a custom AI node
	function deleteCustomAINode(nodeId: string) {
		customAINodes = customAINodes.filter(n => n.id !== nodeId);
		handleSaveCustomAINodes();
	}

	// Cancel creating custom AI node
	function cancelCreateCustomAI() {
		customAINodeLabel = '';
		customAINodePrompt = '';
		customAINodeModel = 'gpt-4o';
		customAINodeSystemPrompt = '';
		creatingCustomAI = false;
	}

	// Combined element types (default + custom)
	let allElementTypes = $derived([...elementTypes, ...customAINodes]);

	// Load custom nodes on mount
	if (typeof window !== 'undefined') {
		handleLoadCustomAINodes();
	}
	let gridContainer = $state<HTMLDivElement | null>(null);
	let svgContainer = $state<SVGSVGElement | null>(null);
	let workflowResults = $state<any[]>([]);
	let editingAIQuery = $state<GridElement | null>(null);
	let aiQueryPrompt = $state('');
	let aiQueryModel = $state('gpt-4o');
	let aiQuerySystemPrompt = $state('');
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;
	let zoomLevel = $state(1);
	let showingWorkflowJSON = $state(false);
	let workflowJSON = $state('');
	let copiedToClipboard = $state(false);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0 });

	// Generate unique ID - now imported from utils/idGenerator.ts

	// Drag from sidebar
	function startDragFromSidebar(elementType: ElementType, event: MouseEvent) {
		draggedElementType = elementType;
		const rect = (event.target as HTMLElement).getBoundingClientRect();
		dragOffset = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	}

	// Drag element on grid
	function startDragOnGrid(element: GridElement, event: MouseEvent) {
		if ((event.target as HTMLElement).classList.contains('connection-point')) {
			return; // Don't drag if clicking connection point
		}
		draggedGridElement = element;
		if (gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			// Account for zoom and pan when calculating offset
			const elementScreenX = element.x * zoomLevel + panX;
			const elementScreenY = element.y * zoomLevel + panY;
			dragOffset = {
				x: (event.clientX - rect.left - elementScreenX) / zoomLevel,
				y: (event.clientY - rect.top - elementScreenY) / zoomLevel
			};
		}
		event.stopPropagation();
	}

	// Handle mouse move
	function handleMouseMove(event: MouseEvent) {
		currentMousePos = { x: event.clientX, y: event.clientY };

		if (isPanning && gridContainer) {
			// Pan the canvas
			const deltaX = event.clientX - panStart.x;
			const deltaY = event.clientY - panStart.y;
			panX += deltaX;
			panY += deltaY;
			panStart = { x: event.clientX, y: event.clientY };
		} else if (draggedGridElement && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			// Account for zoom and pan when updating position
			draggedGridElement.x = (event.clientX - rect.left - panX) / zoomLevel - dragOffset.x;
			draggedGridElement.y = (event.clientY - rect.top - panY) / zoomLevel - dragOffset.y;
		}
	}

	// Handle mouse up
	function handleMouseUp(event: MouseEvent) {
		isPanning = false;
		
		if (draggedElementType && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			// Account for zoom and pan when placing new element
			const x = (event.clientX - rect.left - panX) / zoomLevel - dragOffset.x;
			const y = (event.clientY - rect.top - panY) / zoomLevel - dragOffset.y;

			// Check bounds accounting for zoom
			const maxX = (rect.width - panX) / zoomLevel - 100;
			const maxY = (rect.height - panY) / zoomLevel - 80;
			if (x > -panX / zoomLevel && y > -panY / zoomLevel && x < maxX && y < maxY) {
				const newElement: GridElement = {
					id: generateId(),
					type: draggedElementType,
					x,
					y,
					width: 120,
					height: 80,
					...(draggedElementType.type === 'ai' && {
						aiQueryData: draggedElementType.defaultAIQueryData || {
							prompt: draggedElementType.id === 'ai-property-analysis' 
								? 'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}'
								: draggedElementType.id === 'ai-market-analysis'
								? 'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}'
								: draggedElementType.id === 'ai-risk-assessment'
								? 'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}'
								: 'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
							model: 'gpt-4o',
							systemPrompt: draggedElementType.id === 'ai-property-analysis'
								? 'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.'
								: draggedElementType.id === 'ai-market-analysis'
								? 'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.'
								: draggedElementType.id === 'ai-risk-assessment'
								? 'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.'
								: 'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.'
						}
					})
				};
				gridElements = [...gridElements, newElement];
			}
		}

		draggedElementType = null;
		draggedGridElement = null;
	}

	// Connection point click
	function handleConnectionPointClick(
		elementId: string,
		side: 'top' | 'right' | 'bottom' | 'left',
		event: MouseEvent
	) {
		event.stopPropagation();
		const element = gridElements.find((el) => el.id === elementId);
		if (!element) return;

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const gridRect = gridContainer?.getBoundingClientRect();
		if (!gridRect) return;

		// Account for zoom and pan when calculating connection point position
		const point: ConnectionPoint = {
			x: (rect.left + rect.width / 2 - gridRect.left - panX) / zoomLevel,
			y: (rect.top + rect.height / 2 - gridRect.top - panY) / zoomLevel,
			elementId,
			side
		};

		if (!connectingFrom) {
			connectingFrom = point;
		} else {
			// Create connection
			if (connectingFrom.elementId !== elementId) {
				const newConnection: Connection = {
					id: generateId(),
					from: connectingFrom.elementId,
					to: elementId,
					fromSide: connectingFrom.side,
					toSide: side
				};
				connections = [...connections, newConnection];
				executeWorkflow();
			}
			connectingFrom = null;
		}
	}

	// Get connection point position (in original coordinate space - zoom/pan handled by container transform)
	function getConnectionPointPos(elementId: string, side: 'top' | 'right' | 'bottom' | 'left') {
		const element = gridElements.find((el) => el.id === elementId);
		if (!element) return { x: 0, y: 0 };

		const centerX = element.x + element.width / 2;
		const centerY = element.y + element.height / 2;

		switch (side) {
			case 'top':
				return { x: centerX, y: element.y };
			case 'right':
				return { x: element.x + element.width, y: centerY };
			case 'bottom':
				return { x: centerX, y: element.y + element.height };
			case 'left':
				return { x: element.x, y: centerY };
		}
	}

	// Execute workflow
	async function executeWorkflow() {
		workflowResults = [];

		// Build execution order (topological sort)
		const processed = new Set<string>();
		const results = new Map<string, any>();

		async function executeElement(elementId: string): Promise<any> {
			if (processed.has(elementId)) {
				return results.get(elementId);
			}

			const element = gridElements.find((el) => el.id === elementId);
			if (!element) return null;

			// Get inputs from connected elements
			const inputConnections = connections.filter((conn) => conn.to === elementId);
			let input = null;

			if (inputConnections.length > 0) {
				const inputs = await Promise.all(
					inputConnections.map((conn) => executeElement(conn.from))
				);
				input = inputs.length === 1 ? inputs[0] : inputs;
			}

			// Execute element (handle both sync and async)
			const outputPromise = element.type.execute(input, element.aiQueryData);
			const output = await Promise.resolve(outputPromise);
			element.output = output;
			results.set(elementId, output);
			processed.add(elementId);

			return output;
		}

		// Execute all output elements (they will trigger upstream execution)
		const outputElements = gridElements.filter((el) => el.type.type === 'output');
		await Promise.all(outputElements.map((el) => executeElement(el.id)));

		// Collect results
		workflowResults = Array.from(results.entries()).map(([id, value]) => {
			const element = gridElements.find((el) => el.id === id);
			return {
				elementId: id,
				label: element?.type.label || '',
				value
			};
		});
	}

	// Delete element
	function deleteElement(elementId: string, event: MouseEvent) {
		event.stopPropagation();
		gridElements = gridElements.filter((el) => el.id !== elementId);
		connections = connections.filter((conn) => conn.from !== elementId && conn.to !== elementId);
		executeWorkflow();
	}

	// Delete connection
	function deleteConnection(connectionId: string) {
		connections = connections.filter((conn) => conn.id !== connectionId);
		executeWorkflow();
	}

	// Cancel connection
	function handleGridClick() {
		connectingFrom = null;
	}

	// Start panning
	function startPanning(event: MouseEvent) {
		// Don't pan if dragging from sidebar, clicking on node, or connection point
		if (draggedElementType || draggedGridElement || connectingFrom) {
			return;
		}
		
		// Check if clicking on a node or connection point
		const target = event.target as HTMLElement;
		if (
			target.closest('.absolute[style*="left"]') || // Node element
			target.classList.contains('connection-point') ||
			target.closest('.connection-point')
		) {
			return; // Don't pan if clicking on a node or connection point
		}
		
		// Start panning
		isPanning = true;
		panStart = { x: event.clientX, y: event.clientY };
		event.preventDefault();
		event.stopPropagation();
	}

	// Color mapping - Professional color scheme for grid nodes
	function getElementColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'bg-slate-600';
				case 'process':
					return 'bg-slate-600';
				case 'output':
					return 'bg-slate-600';
				case 'ai':
					return 'bg-slate-600';
			}
		} else {
			switch (type) {
				case 'input':
					return 'bg-white';
				case 'process':
					return 'bg-white';
				case 'output':
					return 'bg-white';
				case 'ai':
					return 'bg-white';
			}
		}
	}

	function getElementBorderColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'border-slate-400';
				case 'process':
					return 'border-slate-400';
				case 'output':
					return 'border-emerald-300';
				case 'ai':
					return 'border-indigo-300';
			}
		} else {
			switch (type) {
				case 'input':
					return 'border-slate-300';
				case 'process':
					return 'border-slate-300';
				case 'output':
					return 'border-emerald-300';
				case 'ai':
					return 'border-indigo-300';
			}
		}
	}

	function getNodeIconBgColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'bg-slate-600';
				case 'process':
					return 'bg-slate-600';
				case 'output':
					return 'bg-emerald-800';
				case 'ai':
					return 'bg-indigo-800';
			}
		} else {
			switch (type) {
				case 'input':
					return 'bg-slate-100';
				case 'process':
					return 'bg-slate-100';
				case 'output':
					return 'bg-emerald-50';
				case 'ai':
					return 'bg-indigo-50';
			}
		}
	}

	function getNodeIconTextColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'text-slate-100';
				case 'process':
					return 'text-slate-100';
				case 'output':
					return 'text-emerald-200';
				case 'ai':
					return 'text-indigo-200';
			}
		} else {
			switch (type) {
				case 'input':
					return 'text-slate-700';
				case 'process':
					return 'text-slate-700';
				case 'output':
					return 'text-emerald-700';
				case 'ai':
					return 'text-indigo-700';
			}
		}
	}

	function getNodeLabelColor(): string {
		return darkMode ? 'text-slate-100' : 'text-slate-900';
	}

	function getNodeAccentColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return '';
				case 'process':
					return '';
				case 'output':
					return 'ring-emerald-500/40';
				case 'ai':
					return 'ring-indigo-500/40';
			}
		} else {
			switch (type) {
				case 'input':
					return '';
				case 'process':
					return '';
				case 'output':
					return 'ring-emerald-200';
				case 'ai':
					return 'ring-indigo-200';
			}
		}
	}

	function getSidebarButtonColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
				case 'process':
					return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
				case 'output':
					return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
				case 'ai':
					return 'bg-slate-700/50 hover:bg-slate-700 border-slate-600';
			}
		} else {
			switch (type) {
				case 'input':
					return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
				case 'process':
					return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
				case 'output':
					return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
				case 'ai':
					return 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300';
			}
		}
	}

	function getIconBgColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		switch (type) {
			case 'input':
				return darkMode ? 'bg-slate-600' : 'bg-slate-100';
			case 'process':
				return darkMode ? 'bg-slate-600' : 'bg-slate-100';
			case 'output':
				return darkMode ? 'bg-emerald-700' : 'bg-emerald-50';
			case 'ai':
				return darkMode ? 'bg-indigo-700' : 'bg-indigo-50';
		}
	}

	function getIconTextColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		switch (type) {
			case 'input':
				return darkMode ? 'text-slate-200' : 'text-slate-700';
			case 'process':
				return darkMode ? 'text-slate-200' : 'text-slate-700';
			case 'output':
				return darkMode ? 'text-emerald-300' : 'text-emerald-700';
			case 'ai':
				return darkMode ? 'text-indigo-300' : 'text-indigo-700';
		}
	}

	function getLabelTextColor(): string {
		return darkMode ? 'text-slate-200' : 'text-slate-900';
	}

	// Handle double-click on element
	function handleElementDoubleClick(element: GridElement, event: MouseEvent) {
		event.stopPropagation();
		if (element.type.type === 'ai') {
			editingAIQuery = element;
			// Set default prompts based on AI node type
			const defaultPrompts: Record<string, { prompt: string; systemPrompt: string }> = {
				'ai-property-analysis': {
					prompt: 'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}',
					systemPrompt: 'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.'
				},
				'ai-market-analysis': {
					prompt: 'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}',
					systemPrompt: 'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.'
				},
				'ai-risk-assessment': {
					prompt: 'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}',
					systemPrompt: 'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.'
				},
				'ai-investment-recommendation': {
					prompt: 'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
					systemPrompt: 'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.'
				},
				'ai-tenant-analysis': {
					prompt: 'Analyze the tenant profile and lease structure for this commercial property. Evaluate tenant credit quality, lease terms, rent roll stability, and tenant concentration risks: {input}',
					systemPrompt: 'You are an expert commercial real estate analyst specializing in tenant credit analysis, lease structure evaluation, and rent roll risk assessment.'
				},
				'ai-capital-expenditure-analysis': {
					prompt: 'Analyze the capital expenditure requirements for this commercial property. Assess deferred maintenance, required improvements, roof/HVAC systems, and estimate future CapEx needs: {input}',
					systemPrompt: 'You are a commercial real estate property condition expert specializing in building systems analysis, deferred maintenance assessment, and capital expenditure planning.'
				},
				'ai-comparable-sales-analysis': {
					prompt: 'Analyze comparable commercial real estate sales and provide valuation insights. Compare property characteristics, sale prices, cap rates, and price per square foot to assess market value: {input}',
					systemPrompt: 'You are a commercial real estate valuation expert specializing in comparable sales analysis, market value assessment, and property valuation methodologies.'
				},
				'ai-financial-modeling': {
					prompt: 'Create a comprehensive financial model for this commercial real estate investment. Analyze cash flows, returns (IRR, equity multiple), debt service coverage, and provide sensitivity analysis: {input}',
					systemPrompt: 'You are a commercial real estate financial modeling expert specializing in investment analysis, cash flow projections, return calculations, and financial underwriting.'
				},
				'ai-location-analysis': {
					prompt: 'Analyze the location characteristics of this commercial property. Evaluate demographics, traffic patterns, accessibility, nearby amenities, competition, and location-based risks and opportunities: {input}',
					systemPrompt: 'You are a commercial real estate location analyst expert in site selection, demographic analysis, traffic studies, and location-based market evaluation.'
				},
				'ai-lease-structure-analysis': {
					prompt: 'Analyze the lease structure and terms for this commercial property. Evaluate lease expiration schedules, rent escalations, renewal probabilities, and lease economics: {input}',
					systemPrompt: 'You are a commercial real estate lease analyst expert in lease structure evaluation, rent roll analysis, lease expiration management, and lease economics.'
				},
				'ai-zoning-compliance': {
					prompt: 'Analyze zoning regulations and compliance for this commercial property. Assess permitted uses, development rights, setbacks, parking requirements, and potential zoning risks or opportunities: {input}',
					systemPrompt: 'You are a commercial real estate zoning expert specializing in land use regulations, zoning compliance, development rights analysis, and regulatory risk assessment.'
				},
				'ai-environmental-assessment': {
					prompt: 'Assess environmental risks and compliance for this commercial property. Evaluate potential contamination, environmental regulations, remediation requirements, and environmental liability: {input}',
					systemPrompt: 'You are a commercial real estate environmental consultant expert in Phase I/II assessments, environmental risk evaluation, regulatory compliance, and remediation cost estimation.'
				},
				'ai-debt-structure-analysis': {
					prompt: 'Analyze the debt structure and financing terms for this commercial property investment. Evaluate loan terms, interest rates, amortization schedules, prepayment penalties, and refinancing risks: {input}',
					systemPrompt: 'You are a commercial real estate finance expert specializing in debt structuring, loan analysis, financing strategies, and debt service optimization.'
				},
				'ai-tax-analysis': {
					prompt: 'Analyze the tax implications for this commercial real estate investment. Evaluate property taxes, income tax considerations, depreciation benefits, 1031 exchange opportunities, and tax-efficient structuring: {input}',
					systemPrompt: 'You are a commercial real estate tax advisor expert in property tax assessment, real estate tax planning, depreciation strategies, and tax-efficient investment structures.'
				},
				'ai-competition-analysis': {
					prompt: 'Analyze the competitive landscape for this commercial property. Evaluate competing properties, market positioning, competitive advantages, and competitive risks: {input}',
					systemPrompt: 'You are a commercial real estate market analyst expert in competitive analysis, market positioning, and competitive strategy evaluation.'
				},
				'ai-exit-strategy': {
					prompt: 'Develop an exit strategy for this commercial real estate investment. Analyze optimal hold period, exit timing, potential exit strategies (sale, refinance, 1031 exchange), and exit value projections: {input}',
					systemPrompt: 'You are a commercial real estate investment strategist expert in exit planning, hold period optimization, and exit strategy execution.'
				},
				'ai-due-diligence-checklist': {
					prompt: 'Generate a comprehensive due diligence checklist for this commercial real estate acquisition. Include financial, legal, physical, environmental, and operational due diligence items: {input}',
					systemPrompt: 'You are a commercial real estate due diligence expert specializing in acquisition due diligence, risk identification, and comprehensive property evaluation.'
				},
				'ai-rent-roll-analysis': {
					prompt: 'Analyze the rent roll for this commercial property. Evaluate current rents vs market rents, lease expiration schedule, tenant mix, rent growth potential, and rent roll stability: {input}',
					systemPrompt: 'You are a commercial real estate rent roll analyst expert in lease analysis, rent optimization, and rent roll risk assessment.'
				},
				'ai-asset-management': {
					prompt: 'Develop an asset management strategy for this commercial property. Analyze value-add opportunities, operational improvements, tenant retention strategies, and asset optimization initiatives: {input}',
					systemPrompt: 'You are a commercial real estate asset manager expert in property operations, value creation, tenant relations, and asset optimization strategies.'
				},
				'ai-portfolio-analysis': {
					prompt: 'Analyze this commercial real estate portfolio. Evaluate portfolio diversification, geographic concentration, property type mix, performance metrics, and portfolio optimization opportunities: {input}',
					systemPrompt: 'You are a commercial real estate portfolio manager expert in portfolio analysis, diversification strategies, and portfolio optimization.'
				},
				'ai-valuation-analysis': {
					prompt: 'Perform a comprehensive valuation analysis for this commercial property using multiple approaches. Evaluate income approach, sales comparison approach, and cost approach to determine fair market value: {input}',
					systemPrompt: 'You are a commercial real estate appraiser expert in property valuation methodologies, market value assessment, and appraisal standards.'
				},
				'ai-lease-negotiation': {
					prompt: 'Provide lease negotiation strategies and recommendations for this commercial property. Analyze market lease rates, tenant improvement allowances, rent escalations, and lease term structures: {input}',
					systemPrompt: 'You are a commercial real estate lease negotiator expert in lease structuring, market rate analysis, and lease negotiation strategies.'
				},
				'ai-property-management': {
					prompt: 'Develop property management strategies for this commercial property. Analyze maintenance programs, tenant relations, operational efficiency, and property management best practices: {input}',
					systemPrompt: 'You are a commercial real estate property manager expert in property operations, maintenance management, tenant relations, and operational optimization.'
				},
				'ai-development-feasibility': {
					prompt: 'Analyze the development feasibility for this commercial real estate project. Evaluate construction costs, development timelines, entitlement processes, and project economics: {input}',
					systemPrompt: 'You are a commercial real estate development consultant expert in feasibility analysis, construction cost estimation, and development project evaluation.'
				},
				'ai-refinancing-analysis': {
					prompt: 'Analyze refinancing opportunities for this commercial property. Evaluate current loan terms, refinancing options, interest rate savings, and optimal refinancing timing: {input}',
					systemPrompt: 'You are a commercial real estate finance expert specializing in refinancing strategies, loan restructuring, and debt optimization.'
				},
				'ai-1031-exchange': {
					prompt: 'Analyze 1031 exchange opportunities for this commercial real estate transaction. Evaluate exchange eligibility, timing requirements, replacement property criteria, and tax deferral benefits: {input}',
					systemPrompt: 'You are a commercial real estate tax advisor expert in 1031 exchanges, like-kind exchange rules, and tax-deferred exchange strategies.'
				},
				'ai-market-timing': {
					prompt: 'Analyze optimal market timing for this commercial real estate transaction. Evaluate market cycles, economic indicators, interest rate trends, and optimal timing for acquisition or disposition: {input}',
					systemPrompt: 'You are a commercial real estate market strategist expert in market cycle analysis, economic indicators, and transaction timing optimization.'
				},
				'ai-tenant-retention': {
					prompt: 'Develop tenant retention strategies for this commercial property. Analyze tenant satisfaction factors, renewal incentives, lease renewal probabilities, and retention best practices: {input}',
					systemPrompt: 'You are a commercial real estate tenant relations expert specializing in tenant retention, lease renewals, and tenant satisfaction strategies.'
				},
				'ai-value-add-opportunities': {
					prompt: 'Identify value-add opportunities for this commercial property. Analyze potential improvements, repositioning strategies, operational enhancements, and value creation initiatives: {input}',
					systemPrompt: 'You are a commercial real estate value-add strategist expert in property repositioning, value creation, and investment value enhancement.'
				},
				'ai-legal-compliance': {
					prompt: 'Assess legal compliance requirements for this commercial property. Evaluate lease compliance, ADA requirements, building codes, environmental regulations, and legal risk factors: {input}',
					systemPrompt: 'You are a commercial real estate legal compliance expert specializing in property law, regulatory compliance, and legal risk assessment.'
				},
				'ai-operating-expense-analysis': {
					prompt: 'Analyze operating expenses for this commercial property. Evaluate expense ratios, expense trends, expense recoveries, and operating expense optimization opportunities: {input}',
					systemPrompt: 'You are a commercial real estate operations analyst expert in operating expense analysis, expense management, and cost optimization.'
				},
				'ai-cap-rate-analysis': {
					prompt: 'Analyze capitalization rates for this commercial property investment. Evaluate market cap rates, going-in cap rates, exit cap rates, and cap rate compression/expansion risks: {input}',
					systemPrompt: 'You are a commercial real estate investment analyst expert in cap rate analysis, yield analysis, and capitalization rate trends.'
				},
				'ai-demographic-analysis': {
					prompt: 'Analyze demographic trends and characteristics for this commercial property location. Evaluate population growth, income levels, employment trends, and demographic risk factors: {input}',
					systemPrompt: 'You are a commercial real estate demographic analyst expert in population analysis, demographic trends, and location-based demographic evaluation.'
				},
				'ai-construction-cost-estimation': {
					prompt: 'Estimate construction costs for this commercial real estate development or renovation project. Analyze material costs, labor costs, contractor pricing, and construction cost trends: {input}',
					systemPrompt: 'You are a commercial construction cost estimator expert in construction cost analysis, material pricing, and construction cost estimation methodologies.'
				},
				'ai-property-condition-assessment': {
					prompt: 'Assess the physical condition of this commercial property. Evaluate building systems, structural integrity, maintenance needs, and property condition risks: {input}',
					systemPrompt: 'You are a commercial property inspector expert in building condition assessment, property inspections, and physical condition evaluation.'
				},
				'ai-income-approach-valuation': {
					prompt: 'Perform an income approach valuation for this commercial property. Analyze net operating income, capitalization rates, discount rates, and income-based property value: {input}',
					systemPrompt: 'You are a commercial real estate appraiser expert in income approach valuation, DCF analysis, and income-based property appraisal.'
				},
				'ai-lease-abstract': {
					prompt: 'Create a comprehensive lease abstract for this commercial property lease. Extract and summarize key lease terms, rent structure, expiration dates, renewal options, and critical lease provisions: {input}',
					systemPrompt: 'You are a commercial real estate lease analyst expert in lease abstraction, lease term extraction, and lease document analysis.'
				},
				'ai-property-repositioning': {
					prompt: 'Develop a property repositioning strategy for this commercial property. Analyze repositioning opportunities, target market repositioning, renovation requirements, and repositioning economics: {input}',
					systemPrompt: 'You are a commercial real estate repositioning strategist expert in property transformation, market repositioning, and value creation through repositioning.'
				},
				'ai-acquisition-underwriting': {
					prompt: 'Perform comprehensive acquisition underwriting for this commercial property investment. Analyze purchase price, projected returns, risks, and investment viability: {input}',
					systemPrompt: 'You are a commercial real estate underwriter expert in acquisition analysis, investment underwriting, and deal evaluation.'
				},
				'ai-market-forecasting': {
					prompt: 'Forecast market trends and conditions for this commercial real estate market. Analyze future rent growth, occupancy trends, cap rate movements, and market outlook: {input}',
					systemPrompt: 'You are a commercial real estate market forecaster expert in market trend analysis, economic forecasting, and real estate market predictions.'
				},
				'ai-tenant-improvement-analysis': {
					prompt: 'Analyze tenant improvement requirements and costs for this commercial property. Evaluate TI allowances, build-out costs, tenant improvement economics, and TI negotiation strategies: {input}',
					systemPrompt: 'You are a commercial real estate tenant improvement expert specializing in TI cost analysis, build-out planning, and tenant improvement negotiations.'
				}
			};
			
			const defaults = defaultPrompts[element.type.id] || {
				prompt: 'Analyze the following commercial real estate data: {input}',
				systemPrompt: 'You are an expert commercial real estate analyst.'
			};
			
			aiQueryPrompt = element.aiQueryData?.prompt || defaults.prompt;
			aiQueryModel = element.aiQueryData?.model || 'gpt-4o';
			aiQuerySystemPrompt = element.aiQueryData?.systemPrompt || defaults.systemPrompt;
		}
	}

	// Save AI query configuration
	function saveAIQuery() {
		if (!editingAIQuery) return;

		editingAIQuery.aiQueryData = {
			prompt: aiQueryPrompt,
			model: aiQueryModel,
			systemPrompt: aiQuerySystemPrompt || undefined
		};

		editingAIQuery = null;
		executeWorkflow();
	}

	// Cancel editing AI query
	function cancelEditAIQuery() {
		editingAIQuery = null;
		aiQueryPrompt = '';
		aiQueryModel = 'gpt-4o';
		aiQuerySystemPrompt = '';
	}

	// Toggle dark mode
	// Dark mode toggle is now handled by the unified store

	// Generate workflow JSON
	function generateWorkflowJSON() {
		const workflow = {
			elements: gridElements.map((el) => ({
				id: el.id,
				type: el.type.id,
				typeLabel: el.type.label,
				x: el.x,
				y: el.y,
				width: el.width,
				height: el.height,
				...(el.aiQueryData && { aiQueryData: el.aiQueryData }),
				...(el.output !== undefined && { output: el.output })
			})),
			connections: connections.map((conn) => ({
				id: conn.id,
				from: conn.from,
				to: conn.to,
				fromSide: conn.fromSide,
				toSide: conn.toSide
			}))
		};
		return JSON.stringify(workflow, null, 2);
	}

	// Show workflow JSON modal
	function showWorkflowJSON() {
		workflowJSON = generateWorkflowJSON();
		showingWorkflowJSON = true;
		copiedToClipboard = false;
	}

	// Copy JSON to clipboard
	async function copyWorkflowJSON() {
		try {
			await navigator.clipboard.writeText(workflowJSON);
			copiedToClipboard = true;
			setTimeout(() => {
				copiedToClipboard = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// Download JSON as file
	function downloadWorkflowJSON() {
		const blob = new Blob([workflowJSON], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `workflow-${Date.now()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Zoom functions
	function zoomIn() {
		zoomLevel = Math.min(zoomLevel + 0.1, 2); // Max zoom 200%
	}

	function zoomOut() {
		zoomLevel = Math.max(zoomLevel - 0.1, 0.5); // Min zoom 50%
	}

	function resetZoom() {
		zoomLevel = 1;
		panX = 0;
		panY = 0;
	}

	// Handle mouse wheel zoom
	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.1 : 0.1;
		const newZoom = Math.max(0.5, Math.min(2, zoomLevel + delta));
		
		// Zoom towards mouse position
		if (gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const mouseY = event.clientY - rect.top;
			
			// Calculate zoom point relative to container
			const zoomPointX = (mouseX - panX) / zoomLevel;
			const zoomPointY = (mouseY - panY) / zoomLevel;
			
			zoomLevel = newZoom;
			
			// Adjust pan to zoom towards mouse position
			panX = mouseX - zoomPointX * zoomLevel;
			panY = mouseY - zoomPointY * zoomLevel;
		}
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
	<!-- Left Sidebar -->
	<div class="w-72 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-r flex flex-col shadow-sm">
		<div class="p-5 border-b {darkMode ? 'border-slate-700 bg-gradient-to-r from-slate-800 to-slate-800' : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white'}">
			<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Workflow Builder</h1>
			<p class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'} mt-1.5 font-medium">Build automated workflows</p>
		</div>

		<!-- Filter Input -->
		<div class="px-5 pt-5 pb-3 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
			<div class="relative">
				<input
					type="text"
					bind:value={nodeFilter}
					placeholder="Search nodes..."
					class="w-full px-3 py-2 pl-9 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400' : 'bg-slate-100 text-slate-900 border-slate-300 placeholder-slate-500'} rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
				/>
				<svg class="absolute left-2.5 top-2.5 w-4 h-4 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				{#if nodeFilter}
					<button
						onclick={() => nodeFilter = ''}
						class="absolute right-2.5 top-2.5 w-5 h-5 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} rounded-full hover:bg-slate-600/20 transition-colors flex items-center justify-center"
						aria-label="Clear search"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<div class="flex-1 overflow-y-auto p-5 space-y-6">
			<div>
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider">Input Nodes</h3>
					<button
						onclick={() => showingInputGallery = true}
						class="px-2 py-1 text-xs font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1"
						title="Browse Property Data nodes"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
						Browse
					</button>
				</div>
				<div class="space-y-2.5">
					{#each allElementTypes.filter((t) => t.type === 'input' && (!nodeFilter || t.label.toLowerCase().includes(nodeFilter.toLowerCase()) || t.id.toLowerCase().includes(nodeFilter.toLowerCase()))) as elementType}
						<button
							class="w-full p-3.5 {getSidebarButtonColor(elementType.type)} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onmousedown={(e) => startDragFromSidebar(elementType, e)}
						>
							<span class="text-sm font-semibold w-10 h-10 flex items-center justify-center {getIconBgColor(elementType.type)} {getIconTextColor(elementType.type)} rounded-lg transition-colors group-hover:scale-105">
								{elementType.icon}
							</span>
							<span class="text-sm font-semibold flex-1 text-left {getLabelTextColor()}">{elementType.label}</span>
							<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
							</svg>
						</button>
					{/each}
				</div>
			</div>

			<div>
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider">Financial Calculations</h3>
					<button
						onclick={() => showingProcessGallery = true}
						class="px-2 py-1 text-xs font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1"
						title="Browse Financial Calculation nodes"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
						Browse
					</button>
				</div>
				<div class="space-y-2.5">
					{#each allElementTypes.filter((t) => t.type === 'process' && (!nodeFilter || t.label.toLowerCase().includes(nodeFilter.toLowerCase()) || t.id.toLowerCase().includes(nodeFilter.toLowerCase()))) as elementType}
						<button
							class="w-full p-3.5 {getSidebarButtonColor(elementType.type)} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onmousedown={(e) => startDragFromSidebar(elementType, e)}
						>
							<span class="text-sm font-semibold w-10 h-10 flex items-center justify-center {getIconBgColor(elementType.type)} {getIconTextColor(elementType.type)} rounded-lg transition-colors group-hover:scale-105">
								{elementType.icon}
							</span>
							<span class="text-sm font-semibold flex-1 text-left {getLabelTextColor()}">{elementType.label}</span>
							<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
							</svg>
						</button>
					{/each}
				</div>
			</div>

			<div>
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider">AI Analysis</h3>
					<button
						onclick={() => showingAIGallery = true}
						class="px-2 py-1 text-xs font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1"
						title="Browse AI Query library"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
						Browse
					</button>
				</div>
				<div class="space-y-2.5">
					{#each allElementTypes.filter((t) => t.type === 'ai' && (!nodeFilter || t.label.toLowerCase().includes(nodeFilter.toLowerCase()) || t.id.toLowerCase().includes(nodeFilter.toLowerCase()))) as elementType}
						<button
							class="w-full p-3.5 {getSidebarButtonColor(elementType.type)} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onmousedown={(e) => startDragFromSidebar(elementType, e)}
						>
							<span class="text-xs font-bold w-10 h-10 flex items-center justify-center {getIconBgColor(elementType.type)} {getIconTextColor(elementType.type)} rounded-lg transition-colors group-hover:scale-105">
								{elementType.icon}
							</span>
							<span class="text-sm font-semibold flex-1 text-left {getLabelTextColor()}">{elementType.label}</span>
							<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
							</svg>
						</button>
					{/each}
				</div>
			</div>

			<div>
				<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-3">Reports & Outputs</h3>
				<div class="space-y-2.5">
					{#each allElementTypes.filter((t) => t.type === 'output' && (!nodeFilter || t.label.toLowerCase().includes(nodeFilter.toLowerCase()) || t.id.toLowerCase().includes(nodeFilter.toLowerCase()))) as elementType}
						<button
							class="w-full p-3.5 {getSidebarButtonColor(elementType.type)} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onmousedown={(e) => startDragFromSidebar(elementType, e)}
						>
							<span class="text-sm font-semibold w-10 h-10 flex items-center justify-center {getIconBgColor(elementType.type)} {getIconTextColor(elementType.type)} rounded-lg transition-colors group-hover:scale-105">
								{elementType.icon}
							</span>
							<span class="text-sm font-semibold flex-1 text-left {getLabelTextColor()}">{elementType.label}</span>
							<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
							</svg>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="p-5 border-t {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
			<button
				class="w-full px-4 py-3 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2"
				onclick={executeWorkflow}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				Execute Workflow
			</button>
		</div>
	</div>

	<!-- Main Grid Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<!-- Toolbar -->
		<div class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm">
			<div class="flex items-center gap-4">
				<h2 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Workflow Canvas</h2>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					{gridElements.length} {gridElements.length === 1 ? 'node' : 'nodes'}
				</span>
			</div>
			<div class="flex items-center gap-2">
				<!-- Zoom Controls -->
				<div class="flex items-center gap-1 {darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-md p-1">
					<button
						class="p-1.5 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-600' : 'text-slate-600 hover:text-slate-900 hover:bg-white'} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={zoomOut}
						disabled={zoomLevel <= 0.5}
						aria-label="Zoom out"
							title="Zoom out (Scroll)"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
						</svg>
					</button>
					<span class="text-xs font-medium px-2 {darkMode ? 'text-slate-300' : 'text-slate-700'} min-w-[3rem] text-center">
						{Math.round(zoomLevel * 100)}%
					</span>
					<button
						class="p-1.5 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-600' : 'text-slate-600 hover:text-slate-900 hover:bg-white'} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={zoomIn}
						disabled={zoomLevel >= 2}
						aria-label="Zoom in"
							title="Zoom in (Scroll)"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
						</svg>
					</button>
					<button
						class="p-1.5 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-600' : 'text-slate-600 hover:text-slate-900 hover:bg-white'} rounded transition-colors"
						onclick={resetZoom}
						aria-label="Reset zoom"
						title="Reset zoom to 100%"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
						</svg>
					</button>
				</div>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<button
					class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
					onclick={() => { gridElements = []; connections = []; workflowResults = []; }}
				>
					Clear
				</button>
				<button
					class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
					onclick={showWorkflowJSON}
					aria-label="Export workflow JSON"
					title="Export workflow as JSON"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
					</svg>
				</button>
				<button
					class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
					onclick={toggleDarkMode}
					aria-label="Toggle dark mode"
					title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if darkMode}
						<!-- Sun icon for light mode -->
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
						</svg>
					{:else}
						<!-- Moon icon for dark mode -->
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Grid Canvas -->
		<div
			bind:this={gridContainer}
			class="flex-1 relative {darkMode ? 'bg-slate-900' : 'bg-slate-50'} overflow-hidden {isPanning ? 'cursor-grabbing' : 'cursor-default'}"
			style="background-image: linear-gradient(to right, {darkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px), linear-gradient(to bottom, {darkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px); background-size: {20 * zoomLevel}px {20 * zoomLevel}px; background-position: {panX}px {panY}px;"
			onmousedown={startPanning}
			onclick={handleGridClick}
			onkeydown={(e) => e.key === 'Escape' && handleGridClick()}
			onwheel={handleWheel}
			role="button"
			tabindex="0"
		>
			<!-- Zoomed Container -->
			<div
				class="absolute inset-0 origin-top-left"
				style="transform: translate({panX}px, {panY}px) scale({zoomLevel}); transform-origin: 0 0; width: 100%; height: 100%;"
			>
				<!-- SVG for connections -->
				<svg bind:this={svgContainer} class="absolute inset-0 w-full h-full pointer-events-none">
				<defs>
					<marker
						id="arrowhead"
						markerWidth="10"
						markerHeight="10"
						refX="9"
						refY="3"
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<polygon points="0 0, 10 3, 0 6" fill={darkMode ? '#cbd5e1' : '#475569'} />
					</marker>
				</defs>

				<!-- Existing connections -->
				{#each connections as connection}
					{@const fromPos = getConnectionPointPos(connection.from, connection.fromSide)}
					{@const toPos = getConnectionPointPos(connection.to, connection.toSide)}
					{@const isDragging = draggedGridElement && (draggedGridElement.id === connection.from || draggedGridElement.id === connection.to)}
					<g>
						<path
							d="M {fromPos.x} {fromPos.y} C {fromPos.x + 100} {fromPos.y}, {toPos.x -
								100} {toPos.y}, {toPos.x} {toPos.y}"
							stroke={darkMode ? '#cbd5e1' : '#475569'}
							stroke-width="2.5"
							fill="none"
							marker-end="url(#arrowhead)"
							class="pointer-events-auto cursor-pointer hover:stroke-red-500 {isDragging ? '' : 'transition-colors'}"
							style={isDragging ? 'transition: none;' : ''}
							onclick={() => deleteConnection(connection.id)}
							onkeydown={(e) => e.key === 'Delete' && deleteConnection(connection.id)}
							role="button"
							tabindex="0"
							aria-label="Delete connection"
						/>
					</g>
				{/each}

				<!-- Temporary connection line -->
				{#if connectingFrom && gridContainer}
					{@const gridRect = gridContainer.getBoundingClientRect()}
					{@const fromPos = getConnectionPointPos(connectingFrom.elementId, connectingFrom.side)}
					{@const mouseX = (currentMousePos.x - gridRect.left - panX) / zoomLevel}
					{@const mouseY = (currentMousePos.y - gridRect.top - panY) / zoomLevel}
					<line
						x1={fromPos.x}
						y1={fromPos.y}
						x2={mouseX}
						y2={mouseY}
						stroke={darkMode ? '#94a3b8' : '#475569'}
						stroke-width="2.5"
						stroke-dasharray="5,5"
						opacity="0.5"
					/>
				{/if}
				</svg>

				<!-- Grid Elements -->
				{#each gridElements as element (element.id)}
					<div
						class="absolute {getElementColor(
							element.type.type
						)} rounded-xl {darkMode ? 'shadow-2xl shadow-black/50' : 'shadow-lg'} cursor-move border-2 {getElementBorderColor(
							element.type.type
						)} {draggedGridElement?.id === element.id ? '' : 'hover:shadow-2xl hover:scale-[1.02] transition-all'} {getNodeAccentColor(element.type.type) ? getNodeAccentColor(element.type.type) + ' ring-1' : ''}"
						style="left: {element.x}px; top: {element.y}px; width: {element.width}px; height: {element.height}px; {draggedGridElement?.id === element.id ? 'transition: none;' : ''}"
						onmousedown={(e) => { startDragOnGrid(element, e); e.stopPropagation(); }}
						ondblclick={(e) => handleElementDoubleClick(element, e)}
						role="button"
						tabindex="0"
					>
					<div class="relative w-full h-full p-4 flex flex-col items-center justify-center group">
						<!-- Delete Button -->
						<button
							class="absolute -top-2 -right-2 w-5 h-5 {darkMode ? 'bg-slate-700 hover:bg-red-600' : 'bg-slate-200 hover:bg-red-500'} rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg hover:shadow-xl hover:scale-110"
							onclick={(e) => deleteElement(element.id, e)}
							aria-label="Delete node"
							title="Delete node"
						>
							<svg class="w-3 h-3 {darkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-white'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>

						<!-- Icon Container -->
						<div class="w-12 h-12 flex items-center justify-center {getNodeIconBgColor(element.type.type)} rounded-lg mb-2.5 shadow-sm">
							<span class="text-lg {getNodeIconTextColor(element.type.type)} font-semibold">
								{element.type.icon}
							</span>
						</div>

						<!-- Label -->
						<div class="text-xs font-semibold {getNodeLabelColor()} text-center leading-tight px-1 mb-1">
							{element.type.label}
						</div>

						<!-- Output Display -->
						{#if element.output !== undefined}
							<div class="text-[10px] mt-1.5 truncate max-w-full px-2 py-1 font-mono {darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'} rounded border {darkMode ? 'border-slate-600' : 'border-slate-200'}">
								{String(element.output).slice(0, 20)}
							</div>
						{/if}

						<!-- Connection Points -->
						<button
							class="connection-point absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
							onclick={(e) => handleConnectionPointClick(element.id, 'top', e)}
							aria-label="Top connection point"
						></button>
						<button
							class="connection-point absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
							onclick={(e) => handleConnectionPointClick(element.id, 'right', e)}
							aria-label="Right connection point"
						></button>
						<button
							class="connection-point absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
							onclick={(e) => handleConnectionPointClick(element.id, 'bottom', e)}
							aria-label="Bottom connection point"
						></button>
						<button
							class="connection-point absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
							onclick={(e) => handleConnectionPointClick(element.id, 'left', e)}
							aria-label="Left connection point"
						></button>
					</div>
				</div>
				{/each}
			</div>

			<!-- Instructions overlay (outside zoom container for fixed positioning) -->
			{#if gridElements.length === 0}
				<div
					class="absolute inset-0 flex items-center justify-center pointer-events-none {darkMode ? 'text-slate-400' : 'text-slate-400'}"
				>
					<div class="text-center max-w-md">
						<div class="mb-6">
							<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
						</div>
						<div class="text-lg font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">Build Your Workflow</div>
						<div class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Drag elements from the sidebar to begin creating your workflow</div>
						<div class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'} mt-4">Click connection points to link elements together</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Results Panel -->
		{#if workflowResults.length > 0}
			<div class="h-64 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t overflow-y-auto shadow-lg">
				<div class="p-5">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
							<svg class="w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
							Execution Results
						</h3>
						<button
							class="text-xs {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} font-medium"
							onclick={() => workflowResults = []}
						>
							Clear
						</button>
					</div>
					<div class="space-y-3">
						{#each workflowResults as result}
							<div class="{darkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} border rounded-lg p-4 transition-colors">
								<div class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">{result.label}</div>
								<div class="{darkMode ? 'text-slate-300 bg-slate-800 border-slate-600' : 'text-slate-600 bg-white border-slate-200'} font-mono text-xs break-all rounded p-2 border">
									{JSON.stringify(result.value, null, 2)}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Property Data Gallery Modal -->
	{#if showingInputGallery}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={() => showingInputGallery = false}
			onkeydown={(e) => e.key === 'Escape' && (showingInputGallery = false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="input-gallery-modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden m-4 border flex flex-col"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<!-- Header -->
				<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 {darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-blue-300' : 'text-blue-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
							</svg>
						</div>
						<div>
							<h2 id="input-gallery-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Property Data Library
							</h2>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and add property data input nodes</p>
						</div>
					</div>
					<button
						onclick={() => showingInputGallery = false}
						class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
						aria-label="Close gallery"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>

				<!-- Gallery Content -->
				<div class="flex-1 overflow-y-auto p-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each elementTypes.filter((t) => t.type === 'input') as query}
							<div
								class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group"
								onclick={() => {
									if (gridContainer) {
										const rect = gridContainer.getBoundingClientRect();
										const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
										const centerY = (rect.height / 2 - panY) / zoomLevel - 40;
										
										const newElement: GridElement = {
											id: generateId(),
											type: query,
											x: centerX,
											y: centerY,
											width: 120,
											height: 80
										};
										gridElements = [...gridElements, newElement];
									}
									showingInputGallery = false;
								}}
								role="button"
								tabindex="0"
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										if (gridContainer) {
											const rect = gridContainer.getBoundingClientRect();
											const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
											const centerY = (rect.height / 2 - panY) / zoomLevel - 40;
											
											const newElement: GridElement = {
												id: generateId(),
												type: query,
												x: centerX,
												y: centerY,
												width: 120,
												height: 80
											};
											gridElements = [...gridElements, newElement];
										}
										showingInputGallery = false;
									}
								}}
							>
								<div class="flex items-start gap-3">
									<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg flex items-center justify-center">
										<span class="text-sm font-semibold {darkMode ? 'text-blue-300' : 'text-blue-600'}">{query.icon}</span>
									</div>
									<div class="flex-1 min-w-0">
										<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-blue-400 transition-colors">
											{query.label}
										</h4>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
											{#if query.id === 'input-property-data'}
												Input property information including address, square footage, and property type
											{:else if query.id === 'input-financial-metrics'}
												Input financial metrics including purchase price, annual rent, and operating expenses
											{:else if query.id === 'input-market-data'}
												Input market data including cap rates, comparable sales, and market trends
											{:else}
												Property data input node
											{/if}
										</p>
									</div>
									<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
									</svg>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Financial Calculations Gallery Modal -->
	{#if showingProcessGallery}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={() => showingProcessGallery = false}
			onkeydown={(e) => e.key === 'Escape' && (showingProcessGallery = false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="process-gallery-modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden m-4 border flex flex-col"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<!-- Header -->
				<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 {darkMode ? 'bg-purple-900' : 'bg-purple-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-purple-300' : 'text-purple-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
							</svg>
						</div>
						<div>
							<h2 id="process-gallery-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Financial Calculations Library
							</h2>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and add financial calculation nodes</p>
						</div>
					</div>
					<button
						onclick={() => showingProcessGallery = false}
						class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
						aria-label="Close gallery"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>

				<!-- Gallery Content -->
				<div class="flex-1 overflow-y-auto p-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each elementTypes.filter((t) => t.type === 'process') as query}
							<div
								class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-purple-500' : 'bg-slate-50 border-slate-200 hover:border-purple-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group"
								onclick={() => {
									if (gridContainer) {
										const rect = gridContainer.getBoundingClientRect();
										const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
										const centerY = (rect.height / 2 - panY) / zoomLevel - 40;
										
										const newElement: GridElement = {
											id: generateId(),
											type: query,
											x: centerX,
											y: centerY,
											width: 120,
											height: 80
										};
										gridElements = [...gridElements, newElement];
									}
									showingProcessGallery = false;
								}}
								role="button"
								tabindex="0"
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										if (gridContainer) {
											const rect = gridContainer.getBoundingClientRect();
											const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
											const centerY = (rect.height / 2 - panY) / zoomLevel - 40;
											
											const newElement: GridElement = {
												id: generateId(),
												type: query,
												x: centerX,
												y: centerY,
												width: 120,
												height: 80
											};
											gridElements = [...gridElements, newElement];
										}
										showingProcessGallery = false;
									}
								}}
							>
								<div class="flex items-start gap-3">
									<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-purple-900' : 'bg-purple-100'} rounded-lg flex items-center justify-center">
										<span class="text-xs font-semibold {darkMode ? 'text-purple-300' : 'text-purple-600'}">{query.icon}</span>
									</div>
									<div class="flex-1 min-w-0">
										<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-purple-400 transition-colors">
											{query.label}
										</h4>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
											{#if query.id === 'process-calculate-noi'}
												Calculate Net Operating Income from rent and expenses
											{:else if query.id === 'process-calculate-cap-rate'}
												Calculate capitalization rate from NOI and purchase price
											{:else if query.id === 'process-calculate-dscr'}
												Calculate Debt Service Coverage Ratio
											{:else if query.id === 'process-calculate-cash-flow'}
												Calculate annual cash flow from NOI and debt service
											{:else}
												Financial calculation node
											{/if}
										</p>
									</div>
									<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-purple-400' : 'text-slate-400 group-hover:text-purple-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
									</svg>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- AI Query Edit Modal -->
	{#if editingAIQuery}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={cancelEditAIQuery}
			onkeydown={(e) => e.key === 'Escape' && cancelEditAIQuery()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<div class="p-6">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<span class="{darkMode ? 'text-indigo-300' : 'text-indigo-600'} font-bold text-sm">AI</span>
						</div>
						<div>
							<h2 id="modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Configure AI Analysis
							</h2>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Set up AI processing parameters</p>
						</div>
					</div>

					<div class="space-y-5">
						<div>
							<label for="ai-model-select" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								AI Model
							</label>
							<select
								id="ai-model-select"
								bind:value={aiQueryModel}
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							>
								<option value="gpt-4o">GPT-4o</option>
								<option value="gpt-4o-mini">GPT-4o Mini</option>
								<option value="gpt-4-turbo">GPT-4 Turbo</option>
								<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
							</select>
						</div>

						<div>
							<label for="ai-system-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Context Instructions <span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} font-normal">(Optional)</span>
							</label>
							<textarea
								id="ai-system-prompt"
								bind:value={aiQuerySystemPrompt}
								placeholder="You are an expert commercial real estate analyst..."
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
								rows="3"
							></textarea>
							<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Provide context about the AI's role and expertise</p>
						</div>

						<div>
							<label for="ai-user-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Analysis Prompt
							</label>
							<textarea
								id="ai-user-prompt"
								bind:value={aiQueryPrompt}
								placeholder="Analyze the following property data: {'{input}'}"
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
								rows="5"
							></textarea>
							<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
						</div>
					</div>

					<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
						<button
							onclick={saveAIQuery}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
						>
							Save Configuration
						</button>
						<button
							onclick={cancelEditAIQuery}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- AI Query Gallery Modal -->
	{#if showingAIGallery}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={() => showingAIGallery = false}
			onkeydown={(e) => e.key === 'Escape' && (showingAIGallery = false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="gallery-modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden m-4 border flex flex-col"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<!-- Header -->
				<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
								<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
								</svg>
							</div>
							<div>
								<h2 id="gallery-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
									AI Query Library
								</h2>
								<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and add AI analysis queries to your workflow</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<button
								onclick={() => { showingAIGallery = false; creatingCustomAI = true; }}
								class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1.5"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
								</svg>
								Create New
							</button>
							<button
								onclick={() => showingAIGallery = false}
								class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
								aria-label="Close gallery"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						</div>
					</div>
					<!-- Filter Input -->
					<div class="relative">
						<input
							type="text"
							bind:value={aiGalleryFilter}
							placeholder="Search queries..."
							class="w-full px-4 py-2 pl-10 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
						/>
						<svg class="absolute left-3 top-2.5 w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
						</svg>
						{#if aiGalleryFilter}
							<button
								onclick={() => aiGalleryFilter = ''}
								class="absolute right-3 top-2.5 p-1 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} rounded transition-colors"
								aria-label="Clear filter"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						{/if}
					</div>
				</div>

				<!-- Gallery Content -->
				<div class="flex-1 overflow-y-auto p-6">
					<!-- Default AI Queries -->
					{#if elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length > 0}
						<div class="mb-8">
							<h3 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
								<span class="w-1 h-4 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded"></span>
								Default Queries ({elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length})
							</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))) as query}
								<div
									class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group"
									onclick={() => {
										// Add query to center of canvas
										if (gridContainer) {
											const rect = gridContainer.getBoundingClientRect();
											const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
											const centerY = (rect.height / 2 - panY) / zoomLevel - 40;
											
											const newElement: GridElement = {
												id: generateId(),
												type: query,
												x: centerX,
												y: centerY,
												width: 120,
												height: 80,
												...(query.type === 'ai' && {
													aiQueryData: query.defaultAIQueryData || {
														prompt: query.id === 'ai-property-analysis' 
															? 'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}'
															: query.id === 'ai-market-analysis'
															? 'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}'
															: query.id === 'ai-risk-assessment'
															? 'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}'
															: 'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
														model: 'gpt-4o',
														systemPrompt: query.id === 'ai-property-analysis'
															? 'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.'
															: query.id === 'ai-market-analysis'
															? 'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.'
															: query.id === 'ai-risk-assessment'
															? 'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.'
															: 'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.'
													}
												})
											};
											gridElements = [...gridElements, newElement];
										}
										showingAIGallery = false;
									}}
									role="button"
									tabindex="0"
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											if (gridContainer) {
												const rect = gridContainer.getBoundingClientRect();
												const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
												const centerY = (rect.height / 2 - panY) / zoomLevel - 40;
												
												const newElement: GridElement = {
													id: generateId(),
													type: query,
													x: centerX,
													y: centerY,
													width: 120,
													height: 80,
													...(query.type === 'ai' && {
														aiQueryData: query.defaultAIQueryData || {
															prompt: query.id === 'ai-property-analysis' 
																? 'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}'
																: query.id === 'ai-market-analysis'
																? 'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}'
																: query.id === 'ai-risk-assessment'
																? 'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}'
																: 'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
															model: 'gpt-4o',
															systemPrompt: query.id === 'ai-property-analysis'
																? 'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.'
																: query.id === 'ai-market-analysis'
																? 'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.'
																: query.id === 'ai-risk-assessment'
																? 'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.'
																: 'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.'
														}
													})
												};
												gridElements = [...gridElements, newElement];
											}
											showingAIGallery = false;
										}
									}}
								>
									<div class="flex items-start gap-3">
										<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
											<span class="text-xs font-bold {darkMode ? 'text-indigo-300' : 'text-indigo-600'}">AI</span>
										</div>
										<div class="flex-1 min-w-0">
											<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-indigo-400 transition-colors">
												{query.label}
											</h4>
											<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
												{#if query.id === 'ai-property-analysis'}
													Analyze commercial real estate properties with comprehensive assessments
												{:else if query.id === 'ai-market-analysis'}
													Analyze market trends, comparable properties, and market conditions
												{:else if query.id === 'ai-risk-assessment'}
													Assess investment risks including financial, market, and regulatory factors
												{:else if query.id === 'ai-investment-recommendation'}
													Provide investment recommendations with buy/hold/pass rationale
												{:else if query.id === 'ai-tenant-analysis'}
													Analyze tenant profiles, lease structures, and rent roll stability
												{:else if query.id === 'ai-capital-expenditure-analysis'}
													Assess capital expenditure requirements and deferred maintenance
												{:else if query.id === 'ai-comparable-sales-analysis'}
													Analyze comparable sales for valuation and market value assessment
												{:else if query.id === 'ai-financial-modeling'}
													Create comprehensive financial models with cash flow and return analysis
												{:else if query.id === 'ai-location-analysis'}
													Evaluate location characteristics, demographics, and accessibility
												{:else if query.id === 'ai-lease-structure-analysis'}
													Analyze lease structures, expiration schedules, and lease economics
												{:else if query.id === 'ai-zoning-compliance'}
													Assess zoning regulations, permitted uses, and development rights
												{:else if query.id === 'ai-environmental-assessment'}
													Evaluate environmental risks, compliance, and remediation requirements
												{:else if query.id === 'ai-debt-structure-analysis'}
													Analyze debt structures, loan terms, and financing strategies
												{:else if query.id === 'ai-tax-analysis'}
													Evaluate tax implications, depreciation benefits, and tax planning
												{:else if query.id === 'ai-competition-analysis'}
													Analyze competitive landscape and market positioning
												{:else if query.id === 'ai-exit-strategy'}
													Develop exit strategies and optimal hold period analysis
												{:else if query.id === 'ai-due-diligence-checklist'}
													Generate comprehensive due diligence checklists for acquisitions
												{:else if query.id === 'ai-rent-roll-analysis'}
													Analyze rent rolls, market rents, and rent growth potential
												{:else if query.id === 'ai-asset-management'}
													Develop asset management strategies and value-add opportunities
												{:else if query.id === 'ai-portfolio-analysis'}
													Analyze portfolio diversification and optimization opportunities
												{:else if query.id === 'ai-valuation-analysis'}
													Perform comprehensive valuation using multiple approaches
												{:else if query.id === 'ai-lease-negotiation'}
													Provide lease negotiation strategies and recommendations
												{:else if query.id === 'ai-property-management'}
													Develop property management strategies and best practices
												{:else if query.id === 'ai-development-feasibility'}
													Analyze development feasibility and project economics
												{:else if query.id === 'ai-refinancing-analysis'}
													Analyze refinancing opportunities and optimal timing
												{:else if query.id === 'ai-1031-exchange'}
													Analyze 1031 exchange opportunities and tax benefits
												{:else if query.id === 'ai-market-timing'}
													Analyze optimal market timing for transactions
												{:else if query.id === 'ai-tenant-retention'}
													Develop tenant retention and renewal strategies
												{:else if query.id === 'ai-value-add-opportunities'}
													Identify value-add and repositioning opportunities
												{:else if query.id === 'ai-legal-compliance'}
													Assess legal compliance and regulatory requirements
												{:else if query.id === 'ai-operating-expense-analysis'}
													Analyze operating expenses and cost optimization
												{:else if query.id === 'ai-cap-rate-analysis'}
													Analyze capitalization rates and yield metrics
												{:else if query.id === 'ai-demographic-analysis'}
													Analyze demographic trends and characteristics
												{:else if query.id === 'ai-construction-cost-estimation'}
													Estimate construction costs for development projects
												{:else if query.id === 'ai-property-condition-assessment'}
													Assess physical condition and maintenance needs
												{:else if query.id === 'ai-income-approach-valuation'}
													Perform income approach valuation and DCF analysis
												{:else if query.id === 'ai-lease-abstract'}
													Create comprehensive lease abstracts and summaries
												{:else if query.id === 'ai-property-repositioning'}
													Develop property repositioning strategies
												{:else if query.id === 'ai-acquisition-underwriting'}
													Perform comprehensive acquisition underwriting
												{:else if query.id === 'ai-market-forecasting'}
													Forecast market trends and future conditions
												{:else if query.id === 'ai-tenant-improvement-analysis'}
													Analyze tenant improvement costs and strategies
												{:else}
													Custom AI analysis query
												{/if}
											</p>
										</div>
										<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
										</svg>
									</div>
								</div>
							{/each}
						</div>
					</div>
					{/if}

					<!-- Custom AI Queries -->
					{#if customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length > 0}
						<div>
							<h3 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
								<span class="w-1 h-4 {darkMode ? 'bg-emerald-500' : 'bg-emerald-600'} rounded"></span>
								Your Custom Queries ({customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length})
							</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								{#each customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())) as query}
									<div
										class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-emerald-500' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group relative"
										onclick={() => {
											const fakeEvent = new MouseEvent('mousedown', { bubbles: true });
											startDragFromSidebar(query, fakeEvent);
											showingAIGallery = false;
										}}
										role="button"
										tabindex="0"
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												const fakeEvent = new MouseEvent('mousedown', { bubbles: true });
												startDragFromSidebar(query, fakeEvent);
												showingAIGallery = false;
											}
										}}
									>
										<button
											onclick={(e) => { e.stopPropagation(); deleteCustomAINode(query.id); }}
											class="absolute top-2 right-2 p-1 {darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'} rounded transition-colors opacity-0 group-hover:opacity-100"
											title="Delete custom query"
											aria-label="Delete custom query"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
											</svg>
										</button>
										<div class="flex items-start gap-3 pr-6">
											<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-emerald-900' : 'bg-emerald-100'} rounded-lg flex items-center justify-center">
												<span class="text-xs font-bold {darkMode ? 'text-emerald-300' : 'text-emerald-600'}">AI</span>
											</div>
											<div class="flex-1 min-w-0">
												<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-emerald-400 transition-colors">
													{query.label}
												</h4>
												{#if query.defaultAIQueryData}
													<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
														{query.defaultAIQueryData.prompt.slice(0, 80)}...
													</p>
													<div class="mt-2 flex items-center gap-2">
														<span class="text-[10px] px-1.5 py-0.5 {darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'} rounded font-medium">
															{query.defaultAIQueryData.model}
														</span>
													</div>
												{/if}
											</div>
											<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
											</svg>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="text-center py-8">
							<svg class="w-12 h-12 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
							</svg>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">No custom queries yet</p>
							<button
								onclick={() => { showingAIGallery = false; creatingCustomAI = true; }}
								class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
							>
								Create Your First Custom Query
							</button>
						</div>
					{/if}

					<!-- No Results Message -->
					{#if aiGalleryFilter && elementTypes.filter((t) => t.type === 'ai' && (t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length === 0 && customAINodes.filter((q) => q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length === 0}
						<div class="text-center py-12">
							<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
							</svg>
							<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No queries found</p>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Try adjusting your search terms</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Workflow JSON Export Modal -->
	{#if showingWorkflowJSON}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={() => showingWorkflowJSON = false}
			onkeydown={(e) => e.key === 'Escape' && (showingWorkflowJSON = false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="json-modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4 border flex flex-col"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<!-- Header -->
				<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
							</svg>
						</div>
						<div>
							<h2 id="json-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Workflow JSON Export
							</h2>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Copy or download the JSON representation of your workflow</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<button
							onclick={copyWorkflowJSON}
							class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1.5"
						>
							{#if copiedToClipboard}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
								</svg>
								Copied!
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
								</svg>
								Copy
							{/if}
						</button>
						<button
							onclick={downloadWorkflowJSON}
							class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded transition-colors flex items-center gap-1.5"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
							</svg>
							Download
						</button>
						<button
							onclick={() => showingWorkflowJSON = false}
							class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
							aria-label="Close modal"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					</div>
				</div>

				<!-- JSON Content -->
				<div class="flex-1 overflow-y-auto p-6">
					<pre class="{darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} rounded-lg p-4 overflow-x-auto text-sm font-mono border {darkMode ? 'border-slate-700' : 'border-slate-200'}"><code>{workflowJSON}</code></pre>
				</div>
			</div>
		</div>
	{/if}

	<!-- Create Custom AI Node Modal -->
	{#if creatingCustomAI}
		<div
			class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
			onclick={cancelCreateCustomAI}
			onkeydown={(e) => e.key === 'Escape' && cancelCreateCustomAI()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-modal-title"
			tabindex="-1"
		>
			<div
				class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<div class="p-6">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
							</svg>
						</div>
						<div>
							<h2 id="create-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Create Custom AI Node
							</h2>
							<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Add a new AI analysis node to your workflow</p>
						</div>
					</div>

					<div class="space-y-5">
						<div>
							<label for="custom-ai-label" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Node Name <span class="text-red-500">*</span>
							</label>
							<input
								id="custom-ai-label"
								type="text"
								bind:value={customAINodeLabel}
								placeholder="e.g., Tenant Analysis, ROI Calculation"
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							/>
						</div>

						<div>
							<label for="custom-ai-model-select" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								AI Model
							</label>
							<select
								id="custom-ai-model-select"
								bind:value={customAINodeModel}
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							>
								<option value="gpt-4o">GPT-4o</option>
								<option value="gpt-4o-mini">GPT-4o Mini</option>
								<option value="gpt-4-turbo">GPT-4 Turbo</option>
								<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
							</select>
						</div>

						<div>
							<label for="custom-ai-system-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Context Instructions <span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} font-normal">(Optional)</span>
							</label>
							<textarea
								id="custom-ai-system-prompt"
								bind:value={customAINodeSystemPrompt}
								placeholder="You are an expert commercial real estate analyst..."
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
								rows="3"
							></textarea>
							<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Provide context about the AI's role and expertise</p>
						</div>

						<div>
							<label for="custom-ai-user-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
								Analysis Prompt <span class="text-red-500">*</span>
							</label>
							<textarea
								id="custom-ai-user-prompt"
								bind:value={customAINodePrompt}
								placeholder="Analyze the following property data: {'{input}'}"
								class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
								rows="5"
							></textarea>
							<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
						</div>
					</div>

					<div class="flex gap-3 mt-6">
						<button
							onclick={createCustomAINode}
							disabled={!customAINodeLabel.trim() || !customAINodePrompt.trim()}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Create Node
						</button>
						<button
							onclick={cancelCreateCustomAI}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

