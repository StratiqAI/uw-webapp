/**
 * Opt-in server breadcrumbs printed with `console.info`.
 *
 * **Why:** Vite sets `__LOG_ENABLED__: false` in production, so `createLogger()` becomes a no-op on
 * Vercel — you see almost no app logs there. Hard kills (payload cap, memory, timeouts) often do not
 * run `catch` blocks; the **last breadcrumb line** shows how far the request reached.
 *
 * **Enable on Vercel:** Project → Settings → Environment Variables → add for Production (and Preview if needed):
 * `ENABLE_API_BREADCRUMBS` = `true` or `1`
 *
 * Logs appear under **Deployments → [deployment] → Functions** (or Runtime Logs). Filter by `breadcrumb`.
 *
 * 
 * **Privacy:** Only pass counts, ids, lengths — never full prompts, tokens, or message bodies.
 */

import { env } from '$env/dynamic/private';

function enabled(): boolean {
	const v = env.ENABLE_API_BREADCRUMBS;
	return v === 'true' || v === '1';
}

/**
 * One line per stage. Uses JSON for meta so Vercel log search stays structured.
 */
export function apiBreadcrumb(route: string, step: string, meta?: Record<string, unknown>): void {
	if (!enabled()) return;
	try {
		const suffix = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
		console.info(`[breadcrumb] ${route} ${step}${suffix}`);
	} catch {
		// ignore
	}
}

export function apiBreadcrumbsEnabled(): boolean {
	return enabled();
}
