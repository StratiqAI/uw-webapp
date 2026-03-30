import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import {
	proFormaUnleveredReturnsConfigSchema,
	proFormaUnleveredReturnsInputSchema
} from './schema.js';
import ProFormaUnleveredReturnsWidget from './ProFormaUnleveredReturnsWidget.svelte';

export const proFormaUnleveredReturnsWidget = defineWidget({
	kind: 'proFormaUnleveredReturns',
	displayName: 'Pro Forma Unlevered Returns',
	zodSchema: proFormaUnleveredReturnsConfigSchema,
	inputSchema: proFormaUnleveredReturnsInputSchema,
	component: ProFormaUnleveredReturnsWidget,
	defaultData: {
		projectionYears: 5,
		purchasePrice: 12_000_000,
		acquisitionCosts: 180_000,
		initialCapEx: 0,
		egiYear1: 1_734_000,
		egiGrowthRate: 0.03,
		totalOpexYear1: 920_000,
		opexGrowthRate: 0.03,
		terminalCapRate: 0.055,
		costOfSalePercent: 0.03,
		propertyName: '',
		unleveredDiscountRate: 0.1
	},
	defaultSize: { colSpan: 12, rowSpan: 2 }
});

export type { ProFormaUnleveredReturnsConfig, ProFormaUnleveredReturnsInput } from './schema.js';
export {
	proFormaUnleveredReturnsConfigSchema,
	proFormaUnleveredReturnsInputSchema
} from './schema.js';
