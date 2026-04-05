/**
 * Reactive hook that encapsulates the flip-card configuration boilerplate.
 *
 * Manages `isFlipped` state, registers the toggle function with the host,
 * and provides apply/cancel helpers so each widget only needs to supply
 * its data getter and callbacks.
 */
export declare function useWidgetConfigure<TData>(options: {
    data: () => TData;
    onUpdateConfig?: (data: TData) => void;
    onConfigureReady?: (toggleFn: () => void) => void;
}): {
    readonly isFlipped: boolean;
    draft: TData;
    toggleFlip: () => void;
    applyConfig: (draftData?: TData) => void;
    cancelConfig: () => void;
};
