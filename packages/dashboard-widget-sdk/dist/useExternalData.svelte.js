import { getDashboardWidgetHost } from './context.svelte.js';
/**
 * Retrieve a named service from the host service registry.
 * Returns `undefined` if the service is not registered.
 */
export function useHostService(name) {
    const host = getDashboardWidgetHost();
    return host.services?.get(name);
}
const EMPTY_SERVICE_ACCESSOR = {
    get: () => undefined,
    has: () => false
};
/**
 * Dual-source reactive hook for external data fetching.
 *
 * Re-execution rules:
 *   inputKeys change  --> re-run transform --> re-run fetchFn
 *   configKeys change --> skip transform (use cached) --> re-run fetchFn
 *   refresh()         --> re-run full pipeline
 */
export function useExternalData(options) {
    const host = getDashboardWidgetHost();
    const services = host.services ?? EMPTY_SERVICE_ACCESSOR;
    let data = $state(undefined);
    let isLoading = $state(false);
    let error = $state(null);
    let cachedResolved;
    let lastInputKeyJson = '';
    let lastConfigKeyJson = '';
    let refreshCounter = $state(0);
    let runId = 0;
    function serializeKeys(keys) {
        try {
            return JSON.stringify(keys);
        }
        catch {
            return String(keys);
        }
    }
    async function runTransformAndFetch(input, config, thisRunId) {
        try {
            cachedResolved = await options.transform(input, config, services);
        }
        catch (e) {
            if (thisRunId !== runId)
                return;
            error = e instanceof Error ? e.message : 'Transform failed';
            isLoading = false;
            return;
        }
        if (thisRunId !== runId)
            return;
        await runFetch(cachedResolved, config, thisRunId);
    }
    async function runFetch(resolved, config, thisRunId) {
        try {
            const result = await options.fetchFn(resolved, config, services);
            if (thisRunId !== runId)
                return;
            data = result;
            error = null;
        }
        catch (e) {
            if (thisRunId !== runId)
                return;
            error = e instanceof Error ? e.message : 'Fetch failed';
        }
        finally {
            if (thisRunId === runId) {
                isLoading = false;
            }
        }
    }
    $effect(() => {
        const inputRaw = options.input();
        const configRaw = options.config();
        const _refresh = refreshCounter;
        if (!inputRaw)
            return;
        const inputKeyJson = serializeKeys(options.inputKeys(inputRaw));
        const configKeyJson = serializeKeys(options.configKeys(configRaw));
        const inputChanged = inputKeyJson !== lastInputKeyJson;
        const configChanged = configKeyJson !== lastConfigKeyJson;
        const isRefresh = _refresh > 0 && lastInputKeyJson !== '';
        if (!inputChanged && !configChanged && !isRefresh)
            return;
        lastInputKeyJson = inputKeyJson;
        lastConfigKeyJson = configKeyJson;
        const thisRunId = ++runId;
        isLoading = true;
        error = null;
        if (inputChanged || isRefresh || !cachedResolved) {
            void runTransformAndFetch(inputRaw, configRaw, thisRunId);
        }
        else {
            void runFetch(cachedResolved, configRaw, thisRunId);
        }
    });
    return {
        get data() {
            return data;
        },
        get isLoading() {
            return isLoading;
        },
        get error() {
            return error;
        },
        refresh() {
            refreshCounter++;
        }
    };
}
