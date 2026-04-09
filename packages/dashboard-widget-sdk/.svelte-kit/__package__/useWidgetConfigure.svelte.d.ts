export declare function useWidgetConfigure<TData>(options: {
    widgetId?: string;
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
