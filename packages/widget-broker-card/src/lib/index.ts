import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { brokerCardWidgetDataSchema, brokerCardAiOutputSchema } from './schema.js';
import BrokerCardWidget from './BrokerCardWidget.svelte';

export const brokerCardWidget = defineWidget({
	kind: 'brokerCard',
	displayName: 'Broker Card',
	zodSchema: brokerCardWidgetDataSchema,
	component: BrokerCardWidget,
	defaultData: {
		title: null,
		description: null,
		fullName: 'Pete Beihea',
		company: 'Newmark',
		phone: '310-407-3830',
		email: 'pete.beihea@nmrk.com',
		initials: 'PB',
		avatarUrl: null
	},
	defaultSize: { colSpan: 3, rowSpan: 2 },
	entityDefinition: { name: 'Broker Card Output', description: 'Structured output for broker card widgets', outputSchema: brokerCardAiOutputSchema },
	promptConfig: {
		defaultPrompt: 'Look up broker contact information for the listing agent',
		systemInstruction:
			'You are a commercial real estate research assistant. ' +
			'Provide accurate broker contact details including full name, company, phone, and email.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: brokerCardAiOutputSchema,
		mapAiOutput: (out) => ({
			title: null,
			description: null,
			fullName: (out.fullName as string) ?? '',
			company: (out.company as string) ?? '',
			phone: (out.phone as string) ?? null,
			email: (out.email as string) ?? null,
			initials: (out.initials as string) ?? null,
			avatarUrl: null
		})
	}
});

export { brokerCardWidgetDataSchema, brokerCardAiOutputSchema } from './schema.js';
export type { BrokerCardWidgetData, BrokerCardAiOutput } from './schema.js';
export { default as BrokerCardWidget } from './BrokerCardWidget.svelte';
