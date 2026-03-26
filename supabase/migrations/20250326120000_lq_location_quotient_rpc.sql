-- Location quotient aggregates for the dashboard widget.
-- Apply with Supabase CLI (`supabase db push`) or paste into SQL Editor.
-- PostgREST exposes these as supabase.rpc('lq_location_quotient_sectors', { ... }).
--
-- Intended for quarterly QCEW extracts that include qtr 1–3 only (e.g. 2025 Q1–Q3).

CREATE OR REPLACE FUNCTION public.lq_location_quotient_sectors(
	p_area_fips text,
	p_year text,
	p_own_code text DEFAULT '5',
	p_agglvl_code text DEFAULT '44',
	p_size_code text DEFAULT '0'
)
RETURNS TABLE (
	industry_code text,
	industry_title text,
	lq_avg numeric,
	avg_monthly_emp numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
	SELECT
		q.industry_code::text,
		q.industry_title::text,
		ROUND(
			AVG((q.lq_month1_emplvl + q.lq_month2_emplvl + q.lq_month3_emplvl) / 3.0),
			2
		) AS lq_avg,
		ROUND(
			AVG(q.month1_emplvl + q.month2_emplvl + q.month3_emplvl) / 3.0,
			0
		) AS avg_monthly_emp
	FROM qcew_quarterly_data q
	WHERE
		q.area_fips = p_area_fips
		AND q.own_code = p_own_code
		AND q.year::text = p_year
		AND q.qtr::text IN ('1', '2', '3')
		AND q.agglvl_code = p_agglvl_code
		AND q.size_code = p_size_code
		AND q.lq_month1_emplvl > 0
		AND q.month1_emplvl > 0
	GROUP BY q.industry_code, q.industry_title
	ORDER BY lq_avg DESC;
$$;

-- Total covered employment (MSA all-industry row), same quarter/year/ownership filters.
CREATE OR REPLACE FUNCTION public.lq_total_avg_monthly_employment(
	p_area_fips text,
	p_year text,
	p_own_code text DEFAULT '5',
	p_size_code text DEFAULT '0'
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
	SELECT COALESCE(
		ROUND(
			AVG(q.month1_emplvl + q.month2_emplvl + q.month3_emplvl) / 3.0,
			0
		),
		0
	)
	FROM qcew_quarterly_data q
	WHERE
		q.area_fips = p_area_fips
		AND q.own_code = p_own_code
		AND q.year::text = p_year
		AND q.qtr::text IN ('1', '2', '3')
		AND q.agglvl_code = '80'
		AND q.size_code = p_size_code
		AND q.industry_code::text = '10'
		AND q.lq_month1_emplvl > 0
		AND q.month1_emplvl > 0;
$$;

GRANT EXECUTE ON FUNCTION public.lq_location_quotient_sectors(text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lq_total_avg_monthly_employment(text, text, text, text) TO anon, authenticated;
