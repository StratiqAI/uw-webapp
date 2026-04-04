import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Per-request Supabase client for hooks, +layout.server.ts, and server load/actions.
 * Uses SvelteKit cookie APIs so auth session can sync with SSR.
 */
export function createSupabaseServerClient(cookies: Cookies): SupabaseClient {
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet) {
				try {
					for (const { name, value, options } of cookiesToSet) {
						cookies.set(name, value, { ...options, path: '/' });
					}
				} catch {
					// Called from a context where Set-Cookie is not allowed (e.g. some static paths)
				}
			}
		}
	});
}
