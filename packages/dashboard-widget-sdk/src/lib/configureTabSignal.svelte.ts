/**
 * Shared reactive signal for requesting a specific tab when the configure
 * panel opens.  WidgetWrapper sets the signal; WidgetConfigureBack consumes it.
 */
let signals = $state<Record<string, string>>({});

export function setConfigureTab(widgetId: string, tab: string): void {
	signals = { ...signals, [widgetId]: tab };
}

export function consumeConfigureTab(widgetId: string): string | undefined {
	const tab = signals[widgetId];
	if (tab !== undefined) {
		const { [widgetId]: _, ...rest } = signals;
		signals = rest;
	}
	return tab;
}

/** Reactive read — use inside `$derived` / `$effect` to track changes. */
export function peekConfigureTab(widgetId: string): string | undefined {
	return signals[widgetId];
}
