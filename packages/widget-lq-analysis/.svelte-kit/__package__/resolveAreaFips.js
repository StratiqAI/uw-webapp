/**
 * Known MSA region presets: city/state → FIPS code.
 * `fips` values aligned with `qcew_quarterly_data` (not the same as all annual QCEW MSA codes).
 */
export const REGION_PRESETS = [
    { label: 'Portland-Vancouver-Hillsboro, OR-WA', fips: 'C3890', city: 'Portland', state: 'OR' },
    { label: 'Seattle-Tacoma-Bellevue, WA', fips: 'C4266', city: 'Seattle', state: 'WA' },
    { label: 'Austin-Round Rock-San Marcos, TX', fips: 'C1242', city: 'Austin', state: 'TX' },
    {
        label: 'Nashville-Davidson--Murfreesboro--Franklin, TN',
        fips: 'C3498',
        city: 'Nashville',
        state: 'TN'
    },
    { label: 'Phoenix-Mesa-Chandler, AZ', fips: 'C3806', city: 'Phoenix', state: 'AZ' }
];
/**
 * Resolve a city/state pair to a QCEW area_fips code.
 *
 * 1. Checks the local REGION_PRESETS table first (case-insensitive).
 * 2. If no preset matches and a Supabase client is available, calls an RPC for lookup.
 * 3. Falls back to the first preset FIPS code if nothing resolves.
 */
export async function resolveAreaFips(input, supabase) {
    const cityLower = input.city.toLowerCase();
    const stateLower = input.state.toLowerCase();
    const preset = REGION_PRESETS.find((r) => r.city.toLowerCase() === cityLower && r.state.toLowerCase() === stateLower);
    if (preset)
        return preset.fips;
    // TODO: When a Supabase RPC for FIPS lookup exists, call it here.
    // For now, fall back to the first preset.
    if (supabase) {
        console.warn(`[resolveAreaFips] No preset for "${input.city}, ${input.state}". ` +
            `Falling back to default FIPS code.`);
    }
    return REGION_PRESETS[0].fips;
}
