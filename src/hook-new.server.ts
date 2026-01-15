// // src/hooks.server.ts
// import { type CurrentUser } from '$lib/types/auth';
// import type { Cookies, Handle } from '@sveltejs/kit';
// import { redirect } from '@sveltejs/kit';
// import { createRemoteJWKSet, jwtVerify, type JWTPayload, errors as joseErrors } from 'jose';
// import {
// 	REGION,
// 	COGNITO_USER_POOL_ID,
// 	COGNITO_CLIENT_ID,
// 	COGNITO_DOMAIN
// } from '$env/static/private';

// // 1. Constants and Configuration
// const COGNITO_ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
// // Ensure this URL is correct for your region/setup. It often looks like this:
// const COGNITO_TOKEN_ENDPOINT = `https://${COGNITO_DOMAIN}.auth.${REGION}.amazoncognito.com/oauth2/token`;

// const JWKS = createRemoteJWKSet(new URL(`${COGNITO_ISSUER}/.well-known/jwks.json`));

// // Define public routes that don't require authentication checking
// // Added '/' to public paths so landing page works without redirect loop
// const PUBLIC_PATHS = new Set(['/', '/auth/login', '/auth/callback', '/auth/logout']);

// const UNAUTHENTICATED_USER: CurrentUser = {
// 	isAuthenticated: false,
// 	sub: '',
// 	tenant: 'default'
// 	// Add other required fields from your CurrentUser type with empty/default values if needed
// } as CurrentUser;

// // 2. Helper Functions

// /** Sets auth cookies with secure defaults */
// function setAuthCookies(cookies: Cookies, tokens: { id_token: string; access_token: string; refresh_token?: string; expires_in: number }) {
// 	const cookieOptions = {
// 		httpOnly: true,
// 		secure: process.env.NODE_ENV === 'production',
// 		sameSite: 'lax' as const,
// 		path: '/'
// 	};

// 	// Set cookies to expire slightly before the token actually does to encourage refresh
// 	// expires_in is usually 3600 seconds (1 hour)
// 	const maxAge = tokens.expires_in - 60;

// 	cookies.set('id_token', tokens.id_token, { ...cookieOptions, maxAge });
// 	cookies.set('access_token', tokens.access_token, { ...cookieOptions, maxAge });

// 	// Refresh tokens last much longer (e.g., 30 days). 
// 	// Important: If a new refresh token wasn't sent, don't overwrite the old one with undefined.
// 	if (tokens.refresh_token) {
// 		cookies.set('refresh_token', tokens.refresh_token, {
// 			...cookieOptions,
// 			maxAge: 60 * 60 * 24 * 30 // Adjust based on your Cognito App Client settings
// 		});
// 	}
// }

// /** Clears all auth cookies to log the user out completely */
// function clearSession(cookies: Cookies) {
// 	const opts = { path: '/' };
// 	cookies.delete('id_token', opts);
// 	cookies.delete('access_token', opts);
// 	cookies.delete('refresh_token', opts);
// }

// /** Maps raw JWT claims to your application's user type */
// function claimsToCurrentUser(payload: JWTPayload): CurrentUser {
// 	const tenant =
// 		(payload['custom:tenant'] as string) ?? (payload['tenant'] as string) ?? 'default';

// 	const cu: CurrentUser = {
// 		isAuthenticated: true,
// 		sub: payload.sub as string,
// 		// idToken: ... (add if your type expects it)
// 		username: (payload['cognito:username'] as string) ?? (payload['preferred_username'] as string),
// 		email: payload['email'] as string,
// 		emailVerified: payload['email_verified'] as boolean,
// 		// Using optional chaining/casting for properties that might not exist on all users
// 		phoneNumber: payload['phone_number'] as string | undefined,
// 		phoneNumberVerified: payload['phone_number_verified'] as boolean | undefined,
// 		givenName: payload['given_name'] as string | undefined,
// 		familyName: payload['family_name'] as string | undefined,
// 		name: payload['name'] as string | undefined,
// 		preferredUsername: payload['preferred_username'] as string | undefined,
// 		pictureUrl: payload['picture'] as string | undefined,
// 		groups: (payload['cognito:groups'] as string[]) ?? [],
// 		tenant: tenant,
// 		locale: payload['locale'] as string | undefined,
// 		timezone: payload['custom:timezone'] as string | undefined,
// 		amr: payload['amr'] as string[] | undefined,
// 		exp: payload['exp'] as number,
// 		iat: payload['iat'] as number
// 	};
// 	return cu;
// }

// /** Verifies the ID token against Cognito's JWKS */
// const verify = async (token: string) => {
// 	const { payload } = await jwtVerify(token, JWKS, {
// 		issuer: COGNITO_ISSUER,
// 		// It is highly recommended to verify the audience (client ID) as well
// 		audience: COGNITO_CLIENT_ID
// 	});
// 	return claimsToCurrentUser(payload);
// };

// /** Calls Cognito to get new tokens using a refresh token */
// async function refreshCognitoTokens(refreshToken: string) {
// 	const params = new URLSearchParams({
// 		grant_type: 'refresh_token',
// 		// When NOT using a client secret, the client_id must be in the body
// 		client_id: COGNITO_CLIENT_ID,
// 		refresh_token: refreshToken
// 	});

// 	const headers: HeadersInit = {
// 		'Content-Type': 'application/x-www-form-urlencoded'
// 	};

// 	// *** UPDATED LOGIC ***
// 	// Only add the Authorization header if a secret is actually provided in env variables.
// 	// If you have configured Cognito NOT to use a secret, this block is skipped.
// 	// if (COGNITO_CLIENT_SECRET && COGNITO_CLIENT_SECRET.trim() !== '') {
// 	// 	 const authHeader = `Basic ${Buffer.from(`${COGNITO_CLIENT_ID}:${COGNITO_CLIENT_SECRET}`).toString('base64')}`;
// 	// 	 headers['Authorization'] = authHeader;
// 	// }

// 	const response = await fetch(COGNITO_TOKEN_ENDPOINT, {
// 		method: 'POST',
// 		headers: headers,
// 		body: params
// 	});

// 	if (!response.ok) {
// 		// Log the error body for debugging if needed
// 		const errBody = await response.text();
// 		console.error('Cognito Refresh Error Body:', errBody);
// 		throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
// 	}

// 	return await response.json();
// }

// // 3. The Main Hook

// export const handle: Handle = async ({ event, resolve }) => {
// 	const { cookies, url, locals } = event;

// 	// Initialize default safe state
// 	locals.currentUser = { ...UNAUTHENTICATED_USER };

// 	// 1. Bypass protection for public routes
// 	if (PUBLIC_PATHS.has(url.pathname)) {
// 		return resolve(event);
// 	}

// 	// 2. Retrieve tokens
// 	const id_token = cookies.get('id_token');
// 	const refresh_token = cookies.get('refresh_token');

// 	// 3. If crucial tokens are missing, force login
// 	// We need at least one to attempt authentication.
// 	if (!id_token && !refresh_token) {
// 		// If you want the landing page '/' to be public, ensure it's in PUBLIC_PATHS above.
// 		// Otherwise, this will redirect.
// 		throw redirect(302, '/auth/login');
// 	}

// 	try {
//         const user = await verify(id_token!); 
// 		locals.currentUser = { ...user, idToken: id_token! };
// 	} catch (error) {
// 		// 5. Handle verification failures

// 		// Check specifically if the error is due to expiration AND we have a refresh token available
// 		if (error instanceof joseErrors.JWTExpired && refresh_token) {
// 			console.log('ID token expired or missing. Attempting silent refresh...');

// 			try {
// 				const newTokens = await refreshCognitoTokens(refresh_token);

// 				// Cognito might not return a NEW refresh token during a refresh flow.
// 				// If it doesn't, we must keep using the old one.
// 				const finalRefreshToken = newTokens.refresh_token ?? refresh_token;

// 				// IMPORTANT: Update cookies immediately so the browser has them for the *next* request
// 				setAuthCookies(cookies, {
// 					id_token: newTokens.id_token,
// 					access_token: newTokens.access_token,
// 					refresh_token: finalRefreshToken,
// 					expires_in: newTokens.expires_in
// 				});

// 				// Verify the NEW id token right now to populate locals for *this* request
// 				const refreshedUser = await verify(newTokens.id_token);
// 				locals.currentUser = { ...refreshedUser, idToken: newTokens.id_token };
// 				console.log('Refreshed successfully.');

// 			} catch (refreshError) {
// 				console.error('Refresh attempt failed:', refreshError);
// 				// The refresh token is likely revoked or expired. Session is completely dead.
// 				clearSession(cookies);
// 				throw redirect(302, '/auth/login?reason=session_expired');
// 			}
// 		} else {
// 			// Case: Token is invalid (wrong signature, malformed) OR expired with no refresh token available.
// 			console.error('Token verification failed unrecoverably:', error);
// 			clearSession(cookies);
// 			throw redirect(302, '/auth/login');
// 		}
// 	}

// 	// 6. Final check for protected routes
// 	// If we reached here and isAuthenticated is still false (which shouldn't happen due to redirects above, but good for safety), block access.
// 	if (!locals.currentUser.isAuthenticated) {
// 		throw redirect(302, '/auth/login');
// 	}

// 	return resolve(event);
// };