<script lang="ts">
	import { onMount } from 'svelte';

	interface AIQueryData {
		prompt: string;
		model: string;
		systemPrompt?: string;
	}

	interface ElementType {
		id: string;
		type: 'input' | 'process' | 'output' | 'ai';
		label: string;
		icon: string;
		execute: (input: any, customData?: AIQueryData) => Promise<any> | any;
		defaultAIQueryData?: AIQueryData;
	}

	// Default element types - AI queries only
	const elementTypes: ElementType[] = [
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
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
				return 'AI Query configured';
			}
		}
	];

	// State
	let darkMode = $state(false);
	let customAINodes = $state<ElementType[]>([]);
	let aiGalleryFilter = $state('');
	let creatingCustomAI = $state(false);
	let customAINodeLabel = $state('');
	let customAINodePrompt = $state('');
	let customAINodeModel = $state('gpt-4o');
	let customAINodeSystemPrompt = $state('');

	// Load custom AI nodes from localStorage on mount
	function loadCustomAINodes() {
		try {
			const stored = localStorage.getItem('workflow-custom-ai-nodes');
			if (stored) {
				const parsed = JSON.parse(stored);
				// Reconstruct execute function for each custom node
				customAINodes = parsed.map((node: any) => ({
					...node,
					execute: async (input: any, customData?: AIQueryData) => {
						const data = customData || node.defaultAIQueryData;
						if (!data) return 'AI Query not configured';
						return 'AI Query configured';
					}
				}));
			}
		} catch (e) {
			console.error('Failed to load custom AI nodes:', e);
		}
	}

	// Save custom AI nodes to localStorage (without execute functions)
	function saveCustomAINodes() {
		try {
			const serializable = customAINodes.map(({ execute, ...rest }) => rest);
			localStorage.setItem('workflow-custom-ai-nodes', JSON.stringify(serializable));
		} catch (e) {
			console.error('Failed to save custom AI nodes:', e);
		}
	}

	// Create a custom AI node
	function createCustomAINode() {
		if (!customAINodeLabel.trim() || !customAINodePrompt.trim()) {
			return;
		}

		const newId = `custom-ai-${Date.now()}`;
		const newNode: ElementType = {
			id: newId,
			type: 'ai',
			label: customAINodeLabel.trim(),
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				const data = customData || newNode.defaultAIQueryData;
				if (!data) return 'AI Query not configured';
				return 'AI Query configured';
			},
			defaultAIQueryData: {
				prompt: customAINodePrompt.trim(),
				model: customAINodeModel,
				systemPrompt: customAINodeSystemPrompt.trim() || undefined
			}
		};

		customAINodes = [...customAINodes, newNode];
		saveCustomAINodes();

		// Reset form
		customAINodeLabel = '';
		customAINodePrompt = '';
		customAINodeModel = 'gpt-4o';
		customAINodeSystemPrompt = '';
		creatingCustomAI = false;
	}

	// Delete a custom AI node
	function deleteCustomAINode(nodeId: string) {
		customAINodes = customAINodes.filter((node) => node.id !== nodeId);
		saveCustomAINodes();
	}

	// Cancel creating custom AI node
	function cancelCreateCustomAI() {
		customAINodeLabel = '';
		customAINodePrompt = '';
		customAINodeModel = 'gpt-4o';
		customAINodeSystemPrompt = '';
		creatingCustomAI = false;
	}

	// Toggle dark mode
	function toggleDarkMode() {
		darkMode = !darkMode;
		if (darkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	// Get query description
	function getQueryDescription(queryId: string): string {
		const descriptions: Record<string, string> = {
			'ai-property-analysis': 'Analyze commercial real estate properties with comprehensive assessments',
			'ai-market-analysis': 'Analyze market trends, comparable properties, and market conditions',
			'ai-risk-assessment': 'Assess investment risks including financial, market, and regulatory factors',
			'ai-investment-recommendation': 'Provide investment recommendations with buy/hold/pass rationale',
			'ai-tenant-analysis': 'Analyze tenant profiles, lease structures, and rent roll stability',
			'ai-capital-expenditure-analysis': 'Assess capital expenditure requirements and deferred maintenance',
			'ai-comparable-sales-analysis': 'Analyze comparable sales for valuation and market value assessment',
			'ai-financial-modeling': 'Create comprehensive financial models with cash flow and return analysis',
			'ai-location-analysis': 'Evaluate location characteristics, demographics, and accessibility',
			'ai-lease-structure-analysis': 'Analyze lease structures, expiration schedules, and lease economics',
			'ai-zoning-compliance': 'Assess zoning regulations, permitted uses, and development rights',
			'ai-environmental-assessment': 'Evaluate environmental risks, compliance, and remediation requirements',
			'ai-debt-structure-analysis': 'Analyze debt structures, loan terms, and financing strategies',
			'ai-tax-analysis': 'Evaluate tax implications, depreciation benefits, and tax planning',
			'ai-competition-analysis': 'Analyze competitive landscape and market positioning',
			'ai-exit-strategy': 'Develop exit strategies and optimal hold period analysis',
			'ai-due-diligence-checklist': 'Generate comprehensive due diligence checklists for acquisitions',
			'ai-rent-roll-analysis': 'Analyze rent rolls, market rents, and rent growth potential',
			'ai-asset-management': 'Develop asset management strategies and value-add opportunities',
			'ai-portfolio-analysis': 'Analyze portfolio diversification and optimization opportunities',
			'ai-valuation-analysis': 'Perform comprehensive valuation using multiple approaches',
			'ai-lease-negotiation': 'Provide lease negotiation strategies and recommendations',
			'ai-property-management': 'Develop property management strategies and best practices',
			'ai-development-feasibility': 'Analyze development feasibility and project economics',
			'ai-refinancing-analysis': 'Analyze refinancing opportunities and optimal timing',
			'ai-1031-exchange': 'Analyze 1031 exchange opportunities and tax benefits',
			'ai-market-timing': 'Analyze optimal market timing for transactions',
			'ai-tenant-retention': 'Develop tenant retention and renewal strategies',
			'ai-value-add-opportunities': 'Identify value-add and repositioning opportunities',
			'ai-legal-compliance': 'Assess legal compliance and regulatory requirements',
			'ai-operating-expense-analysis': 'Analyze operating expenses and cost optimization',
			'ai-cap-rate-analysis': 'Analyze capitalization rates and yield metrics',
			'ai-demographic-analysis': 'Analyze demographic trends and characteristics',
			'ai-construction-cost-estimation': 'Estimate construction costs for development projects',
			'ai-property-condition-assessment': 'Assess physical condition and maintenance needs',
			'ai-income-approach-valuation': 'Perform income approach valuation and DCF analysis',
			'ai-lease-abstract': 'Create comprehensive lease abstracts and summaries',
			'ai-property-repositioning': 'Develop property repositioning strategies',
			'ai-acquisition-underwriting': 'Perform comprehensive acquisition underwriting',
			'ai-market-forecasting': 'Forecast market trends and future conditions',
			'ai-tenant-improvement-analysis': 'Analyze tenant improvement costs and strategies'
		};
		return descriptions[queryId] || 'Custom AI analysis query';
	}

	onMount(() => {
		loadCustomAINodes();
		// Check for dark mode preference
		if (typeof window !== 'undefined') {
			darkMode = document.documentElement.classList.contains('dark');
		}
	});
</script>

<div class="min-h-screen {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Header -->
	<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							AI Query Library
						</h1>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and manage AI analysis queries</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<button
						onclick={() => creatingCustomAI = true}
						class="px-4 py-2 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded-lg transition-colors flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
						</svg>
						Create New
					</button>
					<button
						onclick={toggleDarkMode}
						class="p-2 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded-lg transition-colors"
						aria-label="Toggle dark mode"
					>
						{#if darkMode}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
							</svg>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
							</svg>
						{/if}
					</button>
				</div>
			</div>
			<!-- Filter Input -->
			<div class="relative mt-4">
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
	</div>

	<!-- Main Content -->
	<div class="max-w-7xl mx-auto px-6 py-8">
		<!-- Default AI Queries -->
		{#if elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length > 0}
			<div class="mb-8">
				<h2 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
					<span class="w-1 h-4 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded"></span>
					Default Queries ({elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))) as query}
						<div
							class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 transition-all hover:shadow-lg group"
						>
							<div class="flex items-start gap-3">
								<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
									<span class="text-xs font-bold {darkMode ? 'text-indigo-300' : 'text-indigo-600'}">AI</span>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-indigo-400 transition-colors">
										{query.label}
									</h3>
									<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
										{getQueryDescription(query.id)}
									</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Custom AI Queries -->
		{#if customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length > 0}
			<div>
				<h2 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
					<span class="w-1 h-4 {darkMode ? 'bg-emerald-500' : 'bg-emerald-600'} rounded"></span>
					Your Custom Queries ({customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())) as query}
						<div
							class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'} border rounded-lg p-4 transition-all hover:shadow-lg group relative"
						>
							<button
								onclick={() => deleteCustomAINode(query.id)}
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
									<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-emerald-400 transition-colors">
										{query.label}
									</h3>
									{#if query.defaultAIQueryData}
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
											{query.defaultAIQueryData.prompt.slice(0, 80)}...
										</p>
										<div class="mt-2 flex items-center gap-2">
											<span class="text-[10px] px-1.5 py-0.5 {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'} rounded font-medium">
												{query.defaultAIQueryData.model}
											</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else if !aiGalleryFilter}
			<div class="text-center py-12">
				<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
				</svg>
				<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No custom queries yet</p>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">Create your first custom AI query to get started</p>
				<button
					onclick={() => creatingCustomAI = true}
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
							Create Custom AI Query
						</h2>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Add a new AI analysis query to your library</p>
					</div>
				</div>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						createCustomAINode();
					}}
					class="space-y-4"
				>
					<div>
						<label for="custom-label" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							Query Label
						</label>
						<input
							id="custom-label"
							type="text"
							bind:value={customAINodeLabel}
							placeholder="e.g., Market Analysis for Retail Properties"
							class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
							required
						/>
					</div>

					<div>
						<label for="custom-prompt" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							Prompt
						</label>
						<textarea
							id="custom-prompt"
							bind:value={customAINodePrompt}
							placeholder="Enter the prompt for your AI query. Use {input} as a placeholder for input data."
							rows="4"
							class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
							required
						></textarea>
					</div>

					<div>
						<label for="custom-model" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							Model
						</label>
						<select
							id="custom-model"
							bind:value={customAINodeModel}
							class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
						>
							<option value="gpt-4o">GPT-4o</option>
							<option value="gpt-4-turbo">GPT-4 Turbo</option>
							<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
						</select>
					</div>

					<div>
						<label for="custom-system-prompt" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							System Prompt (Optional)
						</label>
						<textarea
							id="custom-system-prompt"
							bind:value={customAINodeSystemPrompt}
							placeholder="Enter a system prompt to define the AI's role and expertise..."
							rows="3"
							class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
						></textarea>
					</div>

					<div class="flex items-center justify-end gap-3 pt-4 border-t {darkMode ? 'border-slate-700' : 'border-slate-200'}">
						<button
							type="button"
							onclick={cancelCreateCustomAI}
							class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
						>
							Create Query
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

