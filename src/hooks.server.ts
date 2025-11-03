// src/hooks.server.ts
import { type CurrentUser } from '$lib/types/auth';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import { REGION, COGNITO_USER_POOL_ID } from '$env/static/private';
import { logger } from '$lib/logging/debug';

const JWKS = createRemoteJWKSet(
	new URL(`https://cognito-idp.${REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
);

const verify = async (token: string) => {
	// console.log("JWT token: -----------------------2222222222222222222222222222222>>>>>>>>>>>", token)
	const { payload } = await jwtVerify(token, JWKS);
	return claimsToCurrentUser(payload);
};

function claimsToCurrentUser(payload: JWTPayload) {
	const cu: CurrentUser = {
		isAuthenticated: true,
		sub: payload.sub as string,
		username: (payload['cognito:username'] as string) ?? (payload['preferred_username'] as string),
		email: payload['email'] as string,
		emailVerified: payload['email_verified'] as boolean,
		phoneNumber: payload['phone_number'] as string,
		phoneNumberVerified: payload['phone_number_verified'] as boolean,
		givenName: payload['given_name'] as string,
		familyName: payload['family_name'] as string,
		name: payload['name'] as string,
		preferredUsername: payload['preferred_username'] as string,
		pictureUrl: payload['picture'] as string,
		groups: (payload['cognito:groups'] as string[]) ?? [],
		tenant: payload['tenant'] as string,
		locale: payload['locale'] as string,
		timezone: payload['custom:timezone'] as string,
		// amr: Authentication Methods References (array of strings indicating how the user was authenticated)
		amr: payload['amr'] as string[],
		// exp: Expiration time (epoch seconds when the token expires)
		exp: payload['exp'] as number,
		// iat: Issued at time (epoch seconds when the token was issued)
		iat: payload['iat'] as number
	};
	return cu;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Don't protect the /auth/login and /auth/callback routes
	if (
		// event.url.pathname.startsWith('/') ||
		event.url.pathname.startsWith('/auth/login') ||
		event.url.pathname.startsWith('/auth/callback')
	) {
		event.locals.currentUser = { isAuthenticated: false };
		return resolve(event);
	}

	// Read token from HttpOnly cookies
	const id_token = event.cookies.get('id_token');
	const access_token = event.cookies.get('access_token');
	// console.log("access_token: -----------------------3333333333333333333333333333333>>>>>>>>>>>", access_token)
	const refresh_token = event.cookies.get('refresh_token');

	// logger('id_token:', id_token);

	// If user is not logged in, redirect to login
	if (!id_token || !access_token || !refresh_token) {
		event.locals.currentUser = { isAuthenticated: false };
		throw redirect(302, '/auth/login');
	}

	try {
		const user = await verify(id_token);
		event.locals.currentUser = { ...user, idToken: id_token };
	} catch (error) {
		event.cookies.delete('id_token', { path: '/' });
		event.cookies.delete('access_token', { path: '/' });
		event.cookies.delete('refresh_token', { path: '/' });
		console.error('Error verifying token:', error);
		event.locals.currentUser = { isAuthenticated: false };
		throw redirect(302, '/auth/login');
	}

	return resolve(event);
};
