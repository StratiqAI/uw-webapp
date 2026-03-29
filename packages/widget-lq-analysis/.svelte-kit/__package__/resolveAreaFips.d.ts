import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * Known MSA region presets: city/state → FIPS code.
 * `fips` values aligned with `qcew_quarterly_data` (not the same as all annual QCEW MSA codes).
 */
export declare const REGION_PRESETS: ReadonlyArray<{
    label: string;
    fips: string;
    city: string;
    state: string;
}>;
/**
 * Resolve a city/state pair to a QCEW area_fips code.
 *
 * 1. Checks the local REGION_PRESETS table first (case-insensitive).
 * 2. If no preset matches and a Supabase client is available, calls an RPC for lookup.
 * 3. Falls back to the first preset FIPS code if nothing resolves.
 */
export declare function resolveAreaFips(input: {
    city: string;
    state: string;
    zip?: string;
}, supabase: SupabaseClient | undefined): Promise<string>;
