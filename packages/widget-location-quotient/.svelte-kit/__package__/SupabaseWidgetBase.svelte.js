export const DEFAULT_MISSING_SUPABASE_MESSAGE = 'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.';
export class SupabaseWidgetBase {
    #isLoading = $state(false);
    #error = $state(null);
    #missingClientMessage;
    #getClient;
    constructor(options) {
        this.#missingClientMessage =
            options?.missingClientMessage ?? DEFAULT_MISSING_SUPABASE_MESSAGE;
        this.#getClient = options?.getClient ?? (() => null);
    }
    get isLoading() {
        return this.#isLoading;
    }
    get error() {
        return this.#error;
    }
    setError(message) {
        this.#error = message;
    }
    get missingClientMessage() {
        return this.#missingClientMessage;
    }
    async runLoad(work) {
        const client = this.#getClient();
        if (!client) {
            this.#error = this.#missingClientMessage;
            return undefined;
        }
        this.#error = null;
        this.#isLoading = true;
        try {
            return await work(client);
        }
        catch (e) {
            this.#error = e instanceof Error ? e.message : 'Failed to load data';
            return undefined;
        }
        finally {
            this.#isLoading = false;
        }
    }
}
