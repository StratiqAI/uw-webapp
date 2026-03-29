import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { brokerCardWidgetDataSchema } from './schema.js';
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
	defaultSize: { colSpan: 3, rowSpan: 2 }
});

export { brokerCardWidgetDataSchema, type BrokerCardWidgetData } from './schema.js';
export { default as BrokerCardWidget } from './BrokerCardWidget.svelte';
