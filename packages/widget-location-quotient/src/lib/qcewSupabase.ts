import type { SupabaseClient } from '@supabase/supabase-js';
import type { QcewSectorAggregate } from './schema.js';

export interface LocationQuotientRpcInput {
	areaFips: string;
	year: number;
}

export async function loadLocationQuotientData(
	client: SupabaseClient,
	input: LocationQuotientRpcInput
): Promise<{ sectors: QcewSectorAggregate[]; totalAvgMonthlyEmp: number }> {
	const { data: rows, error } = await client.rpc('get_qcew_lq_sectors', {
		p_area_fips: input.areaFips,
		p_year: input.year
	});

	if (error) throw new Error(`QCEW RPC error: ${error.message}`);

	const sectors: QcewSectorAggregate[] = (rows ?? []).map((r: any) => ({
		industry_code: r.industry_code,
		industry_title: r.industry_title,
		lq_avg: Number(r.lq_avg),
		avg_monthly_emp: Number(r.avg_monthly_emp)
	}));

	const { data: totalRows, error: totalError } = await client.rpc('get_qcew_total_emp', {
		p_area_fips: input.areaFips,
		p_year: input.year
	});

	if (totalError) throw new Error(`QCEW total-emp RPC error: ${totalError.message}`);

	const totalAvgMonthlyEmp = Number(totalRows?.[0]?.avg_monthly_emp ?? 0);

	return { sectors, totalAvgMonthlyEmp };
}
