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
export declare const LQ_RPC_SECTORS = "lq_location_quotient_sectors";
/** Must match `CREATE FUNCTION public.lq_total_avg_monthly_employment`. */
export declare const LQ_RPC_TOTAL_AVG_MONTHLY_EMP = "lq_total_avg_monthly_employment";
export interface QcewSectorAggregate {
    industry_code: string;
    industry_title: string;
    lq_avg: number;
    avg_monthly_emp: number;
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
export declare function loadLocationQuotientData(supabase: SupabaseClient, query: LoadLocationQuotientParams): Promise<{
    sectors: QcewSectorAggregate[];
    totalAvgMonthlyEmp: number;
}>;
