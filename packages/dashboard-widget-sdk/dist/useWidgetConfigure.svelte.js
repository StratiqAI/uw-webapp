import { getDashboardWidgetHost } from './context.svelte.js';
function resolveWidgetId(w) {
    if (w === undefined)
        return undefined;
    return typeof w === 'function' ? w() : w;
}
/**
 * Reactive hook that encapsulates the flip-card configuration boilerplate.
 *
 * Manages `isFlipped` state, registers the toggle function with the host,
 * and provides apply/cancel helpers so each widget only needs to supply
 * its data getter and callbacks.
 *
 * Automatically exits fullscreen when the card flips back to front.
 *
 * Pass `widgetId` as `() => widgetId` when it comes from a reactive prop so the
 * current id is read when exiting fullscreen (avoids stale closure warnings).
 */
export function useWidgetConfigure(options) {
    const host = getDashboardWidgetHost();
    let isFlipped = $state(false);
    let initialDraft;
    try {
        initialDraft = structuredClone(options.data());
    }
    catch {
        initialDraft = JSON.parse(JSON.stringify(options.data()));
    }
    let draft = $state(initialDraft);
    function syncDraft() {
        try {
            draft = structuredClone(options.data());
        }
        catch {
            draft = JSON.parse(JSON.stringify(options.data()));
        }
    }
    function exitFullscreen() {
        const id = resolveWidgetId(options.widgetId);
        if (id) {
            host.setWidgetFullscreen?.(id, false);
        }
    }
    function toggleFlip() {
        isFlipped = !isFlipped;
        if (isFlipped) {
            syncDraft();
        }
        else {
            exitFullscreen();
        }
    }
    $effect(() => {
        options.onConfigureReady?.(toggleFlip);
    });
    function applyConfig(draftData) {
        options.onUpdateConfig?.(draftData ?? draft);
        isFlipped = false;
        exitFullscreen();
    }
    function cancelConfig() {
        isFlipped = false;
        exitFullscreen();
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
