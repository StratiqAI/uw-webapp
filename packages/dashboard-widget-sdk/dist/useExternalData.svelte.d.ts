import type { ServiceAccessor } from './types.js';
/**
 * Retrieve a named service from the host service registry.
 * Returns `undefined` if the service is not registered.
 */
export declare function useHostService<T = unknown>(name: string): T | undefined;
export interface UseExternalDataOptions<TInput, TConfig, TResolved, TResult> {
    /** Reactive getter for topic store data (e.g. city, state, zip). */
    input: () => TInput | undefined;
    /** Reactive getter for widget config props (e.g. year, sortOrder, areaFips override). */
    config: () => TConfig;
    /** Extract values from input that trigger the full pipeline (transform + fetchFn). */
    inputKeys: (input: TInput) => unknown[];
    /** Extract values from config that trigger fetchFn only (reuses cached transform result). */
    configKeys: (config: TConfig) => unknown[];
    /**
     * Async transform: derive external-API parameters from topic store input.
     * Receives both input and config so it can check for manual overrides.
     * Runs when inputKeys change or on manual refresh().
     */
    transform: (input: TInput, config: TConfig, services: ServiceAccessor) => Promise<TResolved>;
    /**
     * Async fetch: call the external API with resolved parameters.
     * Runs whenever transform completes or configKeys change.
     */
    fetchFn: (resolved: TResolved, config: TConfig, services: ServiceAccessor) => Promise<TResult>;
}
export interface ExternalDataResult<TResult> {
    readonly data: TResult | undefined;
    readonly isLoading: boolean;
    readonly error: string | null;
    refresh(): void;
}
/**
 * Dual-source reactive hook for external data fetching.
 *
 * Re-execution rules:
 *   inputKeys change  --> re-run transform --> re-run fetchFn
 *   configKeys change --> skip transform (use cached) --> re-run fetchFn
 *   refresh()         --> re-run full pipeline
 */
export declare function useExternalData<TInput, TConfig, TResolved, TResult>(options: UseExternalDataOptions<TInput, TConfig, TResolved, TResult>): ExternalDataResult<TResult>;
