export declare function setConfigureTab(widgetId: string, tab: string): void;
export declare function consumeConfigureTab(widgetId: string): string | undefined;
/** Reactive read — use inside `$derived` / `$effect` to track changes. */
export declare function peekConfigureTab(widgetId: string): string | undefined;
