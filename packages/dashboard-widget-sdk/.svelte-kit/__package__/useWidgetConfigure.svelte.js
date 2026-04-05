/**
 * Reactive hook that encapsulates the flip-card configuration boilerplate.
 *
 * Manages `isFlipped` state, registers the toggle function with the host,
 * and provides apply/cancel helpers so each widget only needs to supply
 * its data getter and callbacks.
 */
export function useWidgetConfigure(options) {
    let isFlipped = $state(false);
    let draft = $state(structuredClone(options.data()));
    function syncDraft() {
        draft = structuredClone(options.data());
    }
    function toggleFlip() {
        isFlipped = !isFlipped;
        if (isFlipped)
            syncDraft();
    }
    $effect(() => {
        options.onConfigureReady?.(toggleFlip);
    });
    function applyConfig(draftData) {
        options.onUpdateConfig?.(draftData ?? draft);
        isFlipped = false;
    }
    function cancelConfig() {
        isFlipped = false;
    }
    return {
        get isFlipped() {
            return isFlipped;
        },
        get draft() {
            return draft;
        },
        set draft(v) {
            draft = v;
        },
        toggleFlip,
        applyConfig,
        cancelConfig
    };
}
