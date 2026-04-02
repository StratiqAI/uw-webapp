import type { IndustryData, ScoreWeights } from './schema.js';

export const DEMO_QUARTERS = ['Q1 2024', 'Q2 2024', 'Q3 2024'];

export const DEMO_WEIGHTS: ScoreWeights = {
	emp: 35,
	lq: 30,
	wage: 20,
	estab: 15
};

export const DEMO_INDUSTRIES: IndustryData[] = [
	{
		name: 'Professional Services',
		naicsCode: '54',
		color: '#22d3ee',
		lqTrend: 'rising',
		data: [
			{ empYoy: 3.8, lqValue: 1.52, wageYoy: 3.5, estabYoy: 2.8 },
			{ empYoy: 4.1, lqValue: 1.55, wageYoy: 3.7, estabYoy: 3.0 },
			{ empYoy: 4.4, lqValue: 1.58, wageYoy: 3.9, estabYoy: 3.1 }
		]
	},
	{
		name: 'Finance & Insurance',
		naicsCode: '52',
		color: '#3b82f6',
		lqTrend: 'rising',
		data: [
			{ empYoy: 2.2, lqValue: 1.30, wageYoy: 4.8, estabYoy: 1.5 },
			{ empYoy: 2.8, lqValue: 1.33, wageYoy: 5.0, estabYoy: 1.6 },
			{ empYoy: 3.2, lqValue: 1.37, wageYoy: 5.2, estabYoy: 1.8 }
		]
	},
	{
		name: 'Construction',
		naicsCode: '23',
		color: '#ef4444',
		lqTrend: 'stable',
		data: [
			{ empYoy: 4.0, lqValue: 1.22, wageYoy: 5.0, estabYoy: 2.2 },
			{ empYoy: 3.8, lqValue: 1.23, wageYoy: 5.2, estabYoy: 2.4 },
			{ empYoy: 3.5, lqValue: 1.25, wageYoy: 5.4, estabYoy: 2.6 }
		]
	},
	{
		name: 'Health Care',
		naicsCode: '62',
		color: '#a855f7',
		lqTrend: 'stable',
		data: [
			{ empYoy: 2.0, lqValue: 1.18, wageYoy: 5.7, estabYoy: 0.9 },
			{ empYoy: 2.3, lqValue: 1.20, wageYoy: 5.9, estabYoy: 1.0 },
			{ empYoy: 2.5, lqValue: 1.23, wageYoy: 6.1, estabYoy: 1.1 }
		]
	},
	{
		name: 'Information',
		naicsCode: '51',
		color: '#10b981',
		lqTrend: 'stable',
		data: [
			{ empYoy: 1.2, lqValue: 0.95, wageYoy: 7.5, estabYoy: 0.0 },
			{ empYoy: 1.3, lqValue: 0.93, wageYoy: 7.8, estabYoy: 0.1 },
			{ empYoy: 1.4, lqValue: 0.87, wageYoy: 8.1, estabYoy: 0.2 }
		]
	},
	{
		name: 'Accommodation & Food',
		naicsCode: '72',
		color: '#eab308',
		lqTrend: 'stable',
		data: [
			{ empYoy: 1.5, lqValue: 1.05, wageYoy: 3.5, estabYoy: -0.5 },
			{ empYoy: 1.0, lqValue: 1.06, wageYoy: 3.7, estabYoy: -0.7 },
			{ empYoy: 0.6, lqValue: 1.07, wageYoy: 3.9, estabYoy: -0.9 }
		]
	},
	{
		name: 'Manufacturing',
		naicsCode: '31-33',
		color: '#1d4ed8',
		lqTrend: 'stable',
		data: [
			{ empYoy: -1.0, lqValue: 0.40, wageYoy: 1.0, estabYoy: -0.8 },
			{ empYoy: -1.3, lqValue: 0.38, wageYoy: 1.2, estabYoy: -1.0 },
			{ empYoy: -1.6, lqValue: 0.37, wageYoy: 1.4, estabYoy: -1.2 }
		]
	},
	{
		name: 'Retail Trade',
		naicsCode: '44-45',
		color: '#f97316',
		lqTrend: 'stable',
		data: [
			{ empYoy: -0.8, lqValue: 0.82, wageYoy: 1.4, estabYoy: -1.7 },
			{ empYoy: -1.1, lqValue: 0.81, wageYoy: 1.6, estabYoy: -1.9 },
			{ empYoy: -1.4, lqValue: 0.80, wageYoy: 1.8, estabYoy: -2.1 }
		]
	}
];
