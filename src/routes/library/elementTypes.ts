export interface AIQueryData {
	prompt: string;
	model: string;
	systemPrompt?: string;
}

export interface ElementType {
	id: string;
	type: 'input' | 'process' | 'output' | 'ai';
	label: string;
	icon: string;
	description: string;
	execute: (input: any, customData?: AIQueryData) => Promise<any> | any;
	defaultAIQueryData?: AIQueryData;
}

// Default element types - AI queries only
export const elementTypes: ElementType[] = [
	{
		id: 'ai-property-analysis',
		type: 'ai',
		label: 'Property Analysis',
		icon: 'AI',
		description: 'Analyze commercial real estate properties with comprehensive assessments',
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
		description: 'Analyze market trends, comparable properties, and market conditions',
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
		description: 'Assess investment risks including financial, market, and regulatory factors',
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
		description: 'Provide investment recommendations with buy/hold/pass rationale',
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
		description: 'Analyze tenant profiles, lease structures, and rent roll stability',
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
		description: 'Assess capital expenditure requirements and deferred maintenance',
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
		description: 'Analyze comparable sales for valuation and market value assessment',
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
		description: 'Create comprehensive financial models with cash flow and return analysis',
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
		description: 'Evaluate location characteristics, demographics, and accessibility',
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
		description: 'Analyze lease structures, expiration schedules, and lease economics',
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
		description: 'Assess zoning regulations, permitted uses, and development rights',
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
		description: 'Evaluate environmental risks, compliance, and remediation requirements',
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
		description: 'Analyze debt structures, loan terms, and financing strategies',
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
		description: 'Evaluate tax implications, depreciation benefits, and tax planning',
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
		description: 'Analyze competitive landscape and market positioning',
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
		description: 'Develop exit strategies and optimal hold period analysis',
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
		description: 'Generate comprehensive due diligence checklists for acquisitions',
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
		description: 'Analyze rent rolls, market rents, and rent growth potential',
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
		description: 'Develop asset management strategies and value-add opportunities',
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
		description: 'Analyze portfolio diversification and optimization opportunities',
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
		description: 'Perform comprehensive valuation using multiple approaches',
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
		description: 'Provide lease negotiation strategies and recommendations',
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
		description: 'Develop property management strategies and best practices',
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
		description: 'Analyze development feasibility and project economics',
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
		description: 'Analyze refinancing opportunities and optimal timing',
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
		description: 'Analyze 1031 exchange opportunities and tax benefits',
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
		description: 'Analyze optimal market timing for transactions',
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
		description: 'Develop tenant retention and renewal strategies',
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
		description: 'Identify value-add and repositioning opportunities',
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
		description: 'Assess legal compliance and regulatory requirements',
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
		description: 'Analyze operating expenses and cost optimization',
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
		description: 'Analyze capitalization rates and yield metrics',
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
		description: 'Analyze demographic trends and characteristics',
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
		description: 'Estimate construction costs for development projects',
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
		description: 'Assess physical condition and maintenance needs',
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
		description: 'Perform income approach valuation and DCF analysis',
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
		description: 'Create comprehensive lease abstracts and summaries',
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
		description: 'Develop property repositioning strategies',
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
		description: 'Perform comprehensive acquisition underwriting',
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
		description: 'Forecast market trends and future conditions',
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
		description: 'Analyze tenant improvement costs and strategies',
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
