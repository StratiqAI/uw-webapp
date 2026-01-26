// src/routes/auth/callback/+server.ts
import { COGNITO_CLIENT_ID, COGNITO_DOMAIN } from '$env/static/private';
import { error, redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (params) => {
	const { cookies, url } = params;
	const code = url.searchParams.get('code');

	const codeVerifier = cookies.get('pkce_verifier');

	if (!code || !codeVerifier) {
		throw error(400, 'Missing/invalid OAuth2 code, state, or PKCE verifier');
	}

	// Must match the redirect_uri used in the login request (request origin)
	const redirectUri = url.origin + '/auth/callback';

	const myHeaders = new Headers();
	myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');
	myHeaders.append('Accept', 'application/json');

	const urlencoded = new URLSearchParams();
	urlencoded.append('grant_type', 'authorization_code');
	urlencoded.append('client_id', COGNITO_CLIENT_ID);
	urlencoded.append('code', code);
	urlencoded.append('redirect_uri', redirectUri);
	urlencoded.append('code_verifier', codeVerifier);

	// Define request options for the token exchange
	const requestOptions: RequestInit = {
		method: 'POST',
		headers: myHeaders,
		body: urlencoded
	};

	// Log environment variables and request details for debugging
	// Send request to exchange authorization code for tokens
	const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, requestOptions);

	// Handle unsuccessful token exchange
	if (!response.ok) {
		const errorText = await response.text();
		console.error('Token exchange failed:', {
			status: response.status,
			statusText: response.statusText,
			error: errorText
		});
		throw redirect(302, '/auth/login');
	}

	// Parse the response to extract tokens
	const tokens = await response.json();

	// console.log('tokens: ', tokens);
	// Clean up auth cookies (paths must match where they were set in login)
	cookies.delete('auth_state', { path: '/' });
	cookies.delete('pkce_verifier', { path: '/auth/callback' });

	// Set session cookies with the received tokens
	cookies.set('id_token', tokens.id_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: tokens.expires_in
	});

	cookies.set('access_token', tokens.access_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: tokens.expires_in
	});

	cookies.set('refresh_token', tokens.refresh_token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: tokens.expires_in
	});

	// Redirect to the home page after successful authentication
	throw redirect(302, '/');
};
