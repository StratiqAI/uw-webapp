import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('supabase');

/** Must match `CREATE FUNCTION public.smoke_test_ping` in Supabase. */
export const SMOKE_TEST_RPC = 'smoke_test_ping';

export type SmokeTestRpcRow = Record<string, unknown>;

export type SupabaseRpcSmokeTestResult =
	| { success: true; rows: SmokeTestRpcRow[] }
	| { success: false; error: string };

/**
 * Calls `smoke_test_ping` via PostgREST. Returns up to 5 rows from `qcew_quarterly_data` as JSON.
 */
export async function runSupabaseRpcSmokeTest(
	supabase: SupabaseClient
): Promise<SupabaseRpcSmokeTestResult> {
	const { data, error } = await supabase.rpc(SMOKE_TEST_RPC);

	if (error) {
		return { success: false, error: error.message };
	}

	if (!Array.isArray(data)) {
		return { success: false, error: 'Expected JSON array of rows from RPC' };
	}

	return { success: true, rows: data as SmokeTestRpcRow[] };
}

/** Runs the smoke test and logs row count + payload to the console (browser or server). */
export async function logSupabaseRpcSmokeTest(supabase: SupabaseClient): Promise<void> {
	const result = await runSupabaseRpcSmokeTest(supabase);
	if (result.success) {
		log.info('RPC smoke test OK', `(${result.rows.length} rows)`, result.rows);
	} else {
		log.error('RPC smoke test FAILED', result.error);
	}
}
