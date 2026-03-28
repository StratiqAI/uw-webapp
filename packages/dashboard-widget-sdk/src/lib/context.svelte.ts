import { setContext, getContext } from 'svelte';
import type { DashboardWidgetHost } from './types.js';

const HOST_KEY = Symbol('dashboard-widget-host');

/**
 * Inject the host dashboard services into Svelte context.
 * Must be called synchronously during component initialization
 * (i.e. in a parent component's `<script>` block, not in onMount / $effect).
 */
export function setDashboardWidgetHost(host: DashboardWidgetHost): void {
	setContext(HOST_KEY, host);
}

/**
 * Retrieve the host dashboard services from Svelte context.
 * Only callable inside a descendant of the component that called `setDashboardWidgetHost`.
 */
export function getDashboardWidgetHost(): DashboardWidgetHost {
	const host = getContext<DashboardWidgetHost>(HOST_KEY);
	if (!host) {
		throw new Error(
			'DashboardWidgetHost not found in Svelte context. ' +
				'Ensure setDashboardWidgetHost() is called in an ancestor component.'
		);
	}
	return host;
}
