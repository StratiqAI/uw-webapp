<script lang="ts">
	// Types
	type ElementType = {
		id: string;
		type: 'input' | 'process' | 'output' | 'ai';
		label: string;
		icon: string;
		execute: (input: any, customData?: any) => any | Promise<any>;
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
			label: 'Property Data',
			icon: '🏢',
			execute: (input) => input || { address: '', sqft: 0, yearBuilt: 0, propertyType: 'Office' }
		},
		{
			id: 'input-financial-metrics',
			type: 'input',
			label: 'Financial Metrics',
			icon: '$',
			execute: (input) => input || { purchasePrice: 0, annualRent: 0, operatingExpenses: 0 }
		},
		{
			id: 'input-market-data',
			type: 'input',
			label: 'Market Data',
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
	let draggedGridElement = $state<GridElement | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let connectingFrom = $state<ConnectionPoint | null>(null);
	let currentMousePos = $state({ x: 0, y: 0 });
	let gridContainer = $state<HTMLDivElement | null>(null);
	let svgContainer = $state<SVGSVGElement | null>(null);
	let workflowResults = $state<any[]>([]);
	let editingAIQuery = $state<GridElement | null>(null);
	let aiQueryPrompt = $state('');
	let aiQueryModel = $state('gpt-4o');
	let aiQuerySystemPrompt = $state('');
	let darkMode = $state(false);
	let zoomLevel = $state(1);
	let panX = $state(0);
	let panY = $state(0);

	// Generate unique ID
	function generateId(): string {
		return `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

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

		if (draggedGridElement && gridContainer) {
			const rect = gridContainer.getBoundingClientRect();
			// Account for zoom and pan when updating position
			draggedGridElement.x = (event.clientX - rect.left - panX) / zoomLevel - dragOffset.x;
			draggedGridElement.y = (event.clientY - rect.top - panY) / zoomLevel - dragOffset.y;
		}
	}

	// Handle mouse up
	function handleMouseUp(event: MouseEvent) {
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
						aiQueryData: {
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

	// Color mapping - Professional color scheme for grid nodes
	function getElementColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'bg-slate-800';
				case 'process':
					return 'bg-slate-800';
				case 'output':
					return 'bg-slate-800';
				case 'ai':
					return 'bg-slate-800';
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
					return 'border-slate-600';
				case 'process':
					return 'border-slate-600';
				case 'output':
					return 'border-emerald-500/50';
				case 'ai':
					return 'border-indigo-500/50';
			}
		} else {
			switch (type) {
				case 'input':
					return 'border-slate-200';
				case 'process':
					return 'border-slate-200';
				case 'output':
					return 'border-emerald-200';
				case 'ai':
					return 'border-indigo-200';
			}
		}
	}

	function getNodeIconBgColor(type: 'input' | 'process' | 'output' | 'ai'): string {
		if (darkMode) {
			switch (type) {
				case 'input':
					return 'bg-slate-700';
				case 'process':
					return 'bg-slate-700';
				case 'output':
					return 'bg-emerald-900/40';
				case 'ai':
					return 'bg-indigo-900/40';
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
					return 'text-slate-200';
				case 'process':
					return 'text-slate-200';
				case 'output':
					return 'text-emerald-300';
				case 'ai':
					return 'text-indigo-300';
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
					return 'ring-emerald-500/20';
				case 'ai':
					return 'ring-indigo-500/20';
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
				return darkMode ? 'bg-emerald-600/30' : 'bg-emerald-50';
			case 'ai':
				return darkMode ? 'bg-indigo-600/30' : 'bg-indigo-50';
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
	function toggleDarkMode() {
		darkMode = !darkMode;
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
		if (event.ctrlKey || event.metaKey) {
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

		<div class="flex-1 overflow-y-auto p-5 space-y-6">
			<div>
				<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-3">Property Data</h3>
				<div class="space-y-2.5">
					{#each elementTypes.filter((t) => t.type === 'input') as elementType}
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
				<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-3">Financial Calculations</h3>
				<div class="space-y-2.5">
					{#each elementTypes.filter((t) => t.type === 'process') as elementType}
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
				<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-3">AI Analysis</h3>
				<div class="space-y-2.5">
					{#each elementTypes.filter((t) => t.type === 'ai') as elementType}
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
					{#each elementTypes.filter((t) => t.type === 'output') as elementType}
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
						title="Zoom out (Ctrl + Scroll)"
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
						title="Zoom in (Ctrl + Scroll)"
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
			class="flex-1 relative {darkMode ? 'bg-slate-900' : 'bg-slate-50'} overflow-hidden"
			style="background-image: linear-gradient(to right, {darkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px), linear-gradient(to bottom, {darkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px); background-size: {20 * zoomLevel}px {20 * zoomLevel}px; background-position: {panX}px {panY}px; opacity: {darkMode ? '0.3' : '1'};"
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
						<polygon points="0 0, 10 3, 0 6" fill={darkMode ? '#94a3b8' : '#475569'} />
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
							stroke={darkMode ? '#94a3b8' : '#475569'}
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
					)} rounded-xl shadow-md cursor-move border-2 {getElementBorderColor(
						element.type.type
					)} {draggedGridElement?.id === element.id ? '' : 'hover:shadow-xl hover:scale-[1.02] transition-all'} {getNodeAccentColor(element.type.type) ? getNodeAccentColor(element.type.type) + ' ring-1' : ''}"
					style="left: {element.x}px; top: {element.y}px; width: {element.width}px; height: {element.height}px; {draggedGridElement?.id === element.id ? 'transition: none;' : ''}"
					onmousedown={(e) => startDragOnGrid(element, e)}
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
							<div class="text-[10px] mt-1.5 opacity-90 truncate max-w-full px-2 py-1 font-mono {darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'} rounded border {darkMode ? 'border-slate-600' : 'border-slate-200'}">
								{String(element.output).slice(0, 20)}
							</div>
						{/if}

						<!-- Connection Points -->
						<button
							class="connection-point absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
							onclick={(e) => handleConnectionPointClick(element.id, 'top', e)}
							aria-label="Top connection point"
						></button>
						<button
							class="connection-point absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
							onclick={(e) => handleConnectionPointClick(element.id, 'right', e)}
							aria-label="Right connection point"
						></button>
						<button
							class="connection-point absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
							onclick={(e) => handleConnectionPointClick(element.id, 'bottom', e)}
							aria-label="Bottom connection point"
						></button>
						<button
							class="connection-point absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
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
</div>

