/**
 * Shared controller for dashboard widgets that load data via the browser Supabase client (RPC, etc.).
 * Subclasses may extend this class; widgets may also compose a single instance per component.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '$lib/services/supabase/browser';

export const DEFAULT_MISSING_SUPABASE_MESSAGE =
	'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.';

export interface SupabaseWidgetBaseOptions {
	/** Shown when `getClient()` returns null (default: env-backed browser client missing). */
	missingClientMessage?: string;
	/** Override for tests or non-default wiring; defaults to `createSupabaseBrowserClient`. */
	getClient?: () => SupabaseClient | null;
}

export class SupabaseWidgetBase {
	#isLoading = $state(false);
	#error = $state<string | null>(null);
	readonly #missingClientMessage: string;
	readonly #getClient: () => SupabaseClient | null;

	constructor(options?: SupabaseWidgetBaseOptions) {
		this.#missingClientMessage =
			options?.missingClientMessage ?? DEFAULT_MISSING_SUPABASE_MESSAGE;
		this.#getClient = options?.getClient ?? createSupabaseBrowserClient;
	}

	get isLoading(): boolean {
		return this.#isLoading;
	}

	get error(): string | null {
		return this.#error;
	}

	/** For widget-specific messages after a successful `runLoad` (e.g. empty result). */
	setError(message: string | null): void {
		this.#error = message;
	}

	/** Use to tell a `undefined` result from `runLoad` apart from missing config vs RPC/error. */
	get missingClientMessage(): string {
		return this.#missingClientMessage;
	}

	/**
	 * Resolves with the work result when a client exists and work succeeds.
	 * If there is no client: sets `error` to `missingClientMessage`, does not toggle loading, returns `undefined`.
	 * If work throws: sets `error` from the exception, returns `undefined`.
	 */
	async runLoad<T>(work: (client: SupabaseClient) => Promise<T>): Promise<T | undefined> {
		const client = this.#getClient();
		if (!client) {
			this.#error = this.#missingClientMessage;
			return undefined;
		}

		this.#error = null;
		this.#isLoading = true;
		try {
			return await work(client);
		} catch (e) {
			this.#error = e instanceof Error ? e.message : 'Failed to load data';
			return undefined;
		} finally {
			this.#isLoading = false;
		}
	}
}
