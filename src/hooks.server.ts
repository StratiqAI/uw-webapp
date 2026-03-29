// src/hooks.server.ts
import '$lib/server/retainSubscriptionDocumentsForSsr';
import { type CurrentUser } from '$lib/types/auth';
import { createSupabaseServerClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { REGION, COGNITO_USER_POOL_ID } from '$env/static/private';

const JWKS = createRemoteJWKSet(
	new URL(`https://cognito-idp.${REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
);

const verify = async (token: string) => {
	const { payload } = await jwtVerify(token, JWKS);
	return claimsToCurrentUser(payload);
};

function claimsToCurrentUser(payload: JWTPayload) {
	// Extract tenant - check custom:tenant first (AWS Cognito custom attribute format)
	// then fall back to tenant, then to a default
	const tenant = 
		(payload['custom:tenant'] as string) ?? 
		(payload['tenant'] as string) ?? 
		'default';

	// Extract sub - this is the Cognito user unique identifier (required)
	const sub = payload.sub as string;

	const cu: CurrentUser = {
		isAuthenticated: true,
		sub: sub,
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
		tenant: tenant,
		locale: payload['locale'] as string,
		timezone: payload['custom:timezone'] as string,
		amr: payload['amr'] as string[],
		exp: payload['exp'] as number,
		iat: payload['iat'] as number
	};

	return cu;
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event.cookies);
	// console.log("*******************************************************************************")
	// console.log("event", event);
	// console.log("*******************************************************************************")
	// Don't protect the /auth/login and /auth/callback routes
	if (
		// event.url.pathname.startsWith('/') ||
		event.url.pathname.startsWith('/auth/login') ||
		event.url.pathname.startsWith('/auth/callback')
	) {
		event.locals.currentUser = { 
			isAuthenticated: false,
			sub: '',
			tenant: 'default'
		};
		return resolve(event);
	}

	// Read token from HttpOnly cookies
	const id_token = event.cookies.get('id_token');
	const access_token = event.cookies.get('access_token');
	const refresh_token = event.cookies.get('refresh_token');

	// If user is not logged in, redirect to login
	if (!id_token || !access_token || !refresh_token) {
		event.locals.currentUser = { 
			isAuthenticated: false,
			sub: '',
			tenant: 'default'
		};
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
		event.locals.currentUser = { 
			isAuthenticated: false,
			sub: '',
			tenant: 'default'
		};
		throw redirect(302, '/auth/login');
	}

	return resolve(event);
};
