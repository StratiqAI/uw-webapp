import { getDashboardWidgetHost } from './context.svelte.js';
import type { ServiceAccessor } from './types.js';

/**
 * Retrieve a named service from the host service registry.
 * Returns `undefined` if the service is not registered.
 */
export function useHostService<T = unknown>(name: string): T | undefined {
	const host = getDashboardWidgetHost();
	return host.services?.get<T>(name);
}

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
	transform: (
		input: TInput,
		config: TConfig,
		services: ServiceAccessor
	) => Promise<TResolved>;
	/**
	 * Async fetch: call the external API with resolved parameters.
	 * Runs whenever transform completes or configKeys change.
	 */
	fetchFn: (
		resolved: TResolved,
		config: TConfig,
		services: ServiceAccessor
	) => Promise<TResult>;
}

export interface ExternalDataResult<TResult> {
	readonly data: TResult | undefined;
	readonly isLoading: boolean;
	readonly error: string | null;
	refresh(): void;
}

const EMPTY_SERVICE_ACCESSOR: ServiceAccessor = {
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
export function useExternalData<TInput, TConfig, TResolved, TResult>(
	options: UseExternalDataOptions<TInput, TConfig, TResolved, TResult>
): ExternalDataResult<TResult> {
	const host = getDashboardWidgetHost();
	const services: ServiceAccessor = host.services ?? EMPTY_SERVICE_ACCESSOR;

	let data = $state<TResult | undefined>(undefined);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	let cachedResolved: TResolved | undefined;
	let lastInputKeyJson = '';
	let lastConfigKeyJson = '';
	let refreshCounter = $state(0);
	let runId = 0;

	function serializeKeys(keys: unknown[]): string {
		try {
			return JSON.stringify(keys);
		} catch {
			return String(keys);
		}
	}

	async function runTransformAndFetch(input: TInput, config: TConfig, thisRunId: number) {
		try {
			cachedResolved = await options.transform(input, config, services);
		} catch (e) {
			if (thisRunId !== runId) return;
			error = e instanceof Error ? e.message : 'Transform failed';
			isLoading = false;
			return;
		}
		if (thisRunId !== runId) return;
		await runFetch(cachedResolved!, config, thisRunId);
	}

	async function runFetch(resolved: TResolved, config: TConfig, thisRunId: number) {
		try {
			const result = await options.fetchFn(resolved, config, services);
			if (thisRunId !== runId) return;
			data = result;
			error = null;
		} catch (e) {
			if (thisRunId !== runId) return;
			error = e instanceof Error ? e.message : 'Fetch failed';
		} finally {
			if (thisRunId === runId) {
				isLoading = false;
			}
		}
	}

	$effect(() => {
		const inputRaw = options.input();
		const configRaw = options.config();
		const _refresh = refreshCounter;

		if (!inputRaw) return;

		const inputKeyJson = serializeKeys(options.inputKeys(inputRaw));
		const configKeyJson = serializeKeys(options.configKeys(configRaw));

		const inputChanged = inputKeyJson !== lastInputKeyJson;
		const configChanged = configKeyJson !== lastConfigKeyJson;
		const isRefresh = _refresh > 0 && lastInputKeyJson !== '';

		if (!inputChanged && !configChanged && !isRefresh) return;

		lastInputKeyJson = inputKeyJson;
		lastConfigKeyJson = configKeyJson;

		const thisRunId = ++runId;
		isLoading = true;
		error = null;

		if (inputChanged || isRefresh || !cachedResolved) {
			void runTransformAndFetch(inputRaw, configRaw, thisRunId);
		} else {
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
