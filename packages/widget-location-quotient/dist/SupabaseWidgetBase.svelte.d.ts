import type { SupabaseClient } from '@supabase/supabase-js';
export declare const DEFAULT_MISSING_SUPABASE_MESSAGE = "Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.";
export interface SupabaseWidgetBaseOptions {
    missingClientMessage?: string;
    getClient?: () => SupabaseClient | null;
}
export declare class SupabaseWidgetBase {
    #private;
    constructor(options?: SupabaseWidgetBaseOptions);
    get isLoading(): boolean;
    get error(): string | null;
    setError(message: string | null): void;
    get missingClientMessage(): string;
    runLoad<T>(work: (client: SupabaseClient) => Promise<T>): Promise<T | undefined>;
}
