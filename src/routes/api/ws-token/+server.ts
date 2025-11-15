import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * API endpoint to securely provide WebSocket authentication token
 * This endpoint reads the token from httpOnly cookies (server-side only)
 * and returns it for WebSocket authentication purposes.
 * 
 * Security: The token is only exposed for WebSocket connections which require
 * client-side authentication. Consider implementing token rotation or
 * temporary tokens for enhanced security.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	const idToken = cookies.get('id_token');
	
	if (!idToken) {
		throw error(401, 'Not Authorized');
	}

	// Return the token for WebSocket authentication
	// Note: This is a necessary security trade-off for WebSocket connections
	// which require client-side authentication tokens
	return json({ token: idToken });
};

