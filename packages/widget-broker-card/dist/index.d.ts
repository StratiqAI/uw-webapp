export declare const brokerCardWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    fullName: string;
    company: string;
    title?: string | null | undefined;
    description?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    initials?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}>;
export { brokerCardWidgetDataSchema, type BrokerCardWidgetData } from './schema.js';
export { default as BrokerCardWidget } from './BrokerCardWidget.svelte';
