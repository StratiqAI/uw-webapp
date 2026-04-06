/**
 * DEPRECATED: Redirects to the unified /api/ai route.
 * This endpoint is kept for backwards compatibility.
 */

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch: svelteKitFetch }) => {
	const body = await request.text();
	return svelteKitFetch('/api/ai', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body
	});
};
