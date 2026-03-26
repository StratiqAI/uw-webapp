-- RPC for connectivity checks from the web app (`supabase.rpc('smoke_test_ping')`).
-- Returns a JSON array of up to 5 rows from qcew_quarterly_data (RLS applies via SECURITY INVOKER).

CREATE OR REPLACE FUNCTION public.smoke_test_ping()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
	SELECT COALESCE(
		(
			SELECT jsonb_agg(to_jsonb(q))
			FROM (
				SELECT * FROM qcew_quarterly_data LIMIT 5
			) AS q
		),
		'[]'::jsonb
	);
$$;

GRANT EXECUTE ON FUNCTION public.smoke_test_ping() TO anon, authenticated;
