-- Remove smoke_test_ping RPC (app smoke test removed).

DROP FUNCTION IF EXISTS public.smoke_test_ping();
