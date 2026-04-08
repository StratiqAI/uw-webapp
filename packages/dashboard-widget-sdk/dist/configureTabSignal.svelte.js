/**
 * Shared reactive signal for requesting a specific tab when the configure
 * panel opens.  WidgetWrapper sets the signal; WidgetConfigureBack consumes it.
 */
let signals = $state({});
export function setConfigureTab(widgetId, tab) {
    signals = { ...signals, [widgetId]: tab };
}
export function consumeConfigureTab(widgetId) {
    const tab = signals[widgetId];
    if (tab !== undefined) {
        const { [widgetId]: _, ...rest } = signals;
        signals = rest;
    }
    return tab;
}
/** Reactive read — use inside `$derived` / `$effect` to track changes. */
export function peekConfigureTab(widgetId) {
    return signals[widgetId];
}
