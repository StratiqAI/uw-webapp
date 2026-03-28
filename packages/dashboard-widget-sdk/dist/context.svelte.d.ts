import type { DashboardWidgetHost } from './types.js';
/**
 * Inject the host dashboard services into Svelte context.
 * Must be called synchronously during component initialization
 * (i.e. in a parent component's `<script>` block, not in onMount / $effect).
 */
export declare function setDashboardWidgetHost(host: DashboardWidgetHost): void;
/**
 * Retrieve the host dashboard services from Svelte context.
 * Only callable inside a descendant of the component that called `setDashboardWidgetHost`.
 */
export declare function getDashboardWidgetHost(): DashboardWidgetHost;
