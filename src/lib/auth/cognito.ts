// import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
// import { CognitoIdentityClient, GetIdCommand } from '@aws-sdk/client-cognito-identity';
// import {
// 	CognitoIdentityProviderClient,
// 	GetUserCommand
// } from '@aws-sdk/client-cognito-identity-provider';

// // Environment variables
// import { REGION, COGNITO_USER_POOL_ID, COGNITO_IDENTITY_POOL_ID } from '$env/static/private';

// export const cognito = new CognitoIdentityProviderClient({
// 	region: REGION
// });

// export type CognitoProfile = {
// 	username: string;
// 	attributes: Record<string, string | null>;
// };

// export async function getUserProfile(accessToken: string): Promise<CognitoProfile> {
// 	const out = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
// 	const attributes = Object.fromEntries(
// 		(out.UserAttributes ?? []).map((a) => [a.Name!, a.Value ?? null])
// 	);
// 	return { username: out.Username!, attributes };
// }

// // tiny base64url JWT decoder (no deps) — for ID token claims
// export function decodeJwt<T = Record<string, unknown>>(jwt: string): T {
// 	const [, payload] = jwt.split('.');
// 	const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
// 		'utf8'
// 	);
// 	return JSON.parse(json);
// }

// export const getAWSIdentityId = async ({ idToken }: { idToken: string }) => {

// 	if (!idToken) {
// 		throw new Error('Authentication is required and has failed or is missing.');
// 	}

// 	// 1. Exchange ID token for an Identity ID
// 	const cIdentity = new CognitoIdentityClient({ region: REGION });

// 	try {
// 		const command = new GetIdCommand({
// 			IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
// 			Logins: {
// 				[`cognito-idp.${REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`]: idToken
// 			}
// 		});

// 		const result = await cIdentity.send(command);

// 		if (!result.IdentityId) throw new Error('Failed to get Cognito Identity ID');

// 		return result.IdentityId;
// 	} catch (error) {
// 		console.error('Error getting Cognito Identity ID: ', error);
// 		throw error;
// 	}
// };
