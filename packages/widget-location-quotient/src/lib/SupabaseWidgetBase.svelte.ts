import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_MISSING_SUPABASE_MESSAGE =
	'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.';

export interface SupabaseWidgetBaseOptions {
	missingClientMessage?: string;
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
		this.#getClient = options?.getClient ?? (() => null);
	}

	get isLoading(): boolean {
		return this.#isLoading;
	}

	get error(): string | null {
		return this.#error;
	}

	setError(message: string | null): void {
		this.#error = message;
	}

	get missingClientMessage(): string {
		return this.#missingClientMessage;
	}

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
