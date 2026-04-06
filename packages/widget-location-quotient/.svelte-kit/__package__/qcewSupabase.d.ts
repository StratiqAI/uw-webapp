import type { SupabaseClient } from '@supabase/supabase-js';
import type { QcewSectorAggregate } from './schema.js';
export interface LocationQuotientRpcInput {
    areaFips: string;
    year: number;
}
export declare function loadLocationQuotientData(client: SupabaseClient, input: LocationQuotientRpcInput): Promise<{
    sectors: QcewSectorAggregate[];
    totalAvgMonthlyEmp: number;
}>;
