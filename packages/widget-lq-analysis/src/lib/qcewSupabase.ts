/**
 * BLS QCEW location quotient data via Supabase RPC (Postgres functions).
 * The SQL lives in `supabase/migrations/20250326120000_lq_location_quotient_rpc.sql`.
 *
 * Aggregations run in the database; the client calls `supabase.rpc(...)`.
 *
 * Data scope (current Supabase `qcew_quarterly_data`): **2025**, quarters **1–3** only (no Q4 in extract).
 * RPCs filter `qtr IN ('1','2','3')` accordingly.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Must match `CREATE FUNCTION public.lq_location_quotient_sectors`. */
export const LQ_RPC_SECTORS = 'lq_location_quotient_sectors';

/** Must match `CREATE FUNCTION public.lq_total_avg_monthly_employment`. */
export const LQ_RPC_TOTAL_AVG_MONTHLY_EMP = 'lq_total_avg_monthly_employment';

export interface QcewSectorAggregate {
	industry_code: string;
	industry_title: string;
	lq_avg: number;
	avg_monthly_emp: number;
}

function num(v: unknown): number {
	if (v == null || v === '') return 0;
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function mapRpcSectorRow(row: Record<string, unknown>): QcewSectorAggregate {
	return {
		industry_code: String(row.industry_code ?? ''),
		industry_title: String(row.industry_title ?? ''),
		lq_avg: num(row.lq_avg),
		avg_monthly_emp: num(row.avg_monthly_emp)
	};
}

export interface LoadLocationQuotientParams {
	areaFips: string;
	year: number;
	/** BLS ownership code; default in SQL is `'5'`. */
	ownCode?: string;
	/** BLS aggregation level; default in SQL is `'44'` (MSA NAICS sector per spec query). */
	agglvlCode?: string;
	sizeCode?: string;
}

/** Loads sector LQ aggregates + total local employment for one MSA/year. */
export async function loadLocationQuotientData(
	supabase: SupabaseClient,
	query: LoadLocationQuotientParams
): Promise<{ sectors: QcewSectorAggregate[]; totalAvgMonthlyEmp: number }> {
	const p_year = String(query.year);
	const p_own_code = query.ownCode ?? '5';
	const p_agglvl_code = query.agglvlCode ?? '44';
	const p_size_code = query.sizeCode ?? '0';

	const rpcSectorsArgs = {
		p_area_fips: query.areaFips,
		p_year,
		p_own_code,
		p_agglvl_code,
		p_size_code
	};

	const rpcTotalArgs = {
		p_area_fips: query.areaFips,
		p_year,
		p_own_code,
		p_size_code
	};

	const [sectorsRes, totalRes] = await Promise.all([
		supabase.rpc(LQ_RPC_SECTORS, rpcSectorsArgs),
		supabase.rpc(LQ_RPC_TOTAL_AVG_MONTHLY_EMP, rpcTotalArgs)
	]);

	if (sectorsRes.error) {
		throw new Error(`QCEW sectors RPC failed: ${sectorsRes.error.message}`);
	}
	if (totalRes.error) {
		throw new Error(`QCEW total employment RPC failed: ${totalRes.error.message}`);
	}

	const raw = sectorsRes.data;
	const rows = Array.isArray(raw)
		? (raw as Record<string, unknown>[]).map(mapRpcSectorRow)
		: [];

	const totalAvgMonthlyEmp = num(totalRes.data);

	return { sectors: rows, totalAvgMonthlyEmp };
}
