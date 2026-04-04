/**
 * Converts an AWS AppSync HTTP endpoint URL to its corresponding WebSocket realtime URL.
 *
 * @param {URL} httpUrl - The HTTP URL of the AppSync GraphQL endpoint (e.g., https://<id>.appsync-api.<region>.amazonaws.com/graphql).
 * @returns {string} The WebSocket (wss://) URL for AppSync realtime subscriptions.
 *
 * For standard AWS AppSync endpoints, replaces 'appsync-api' with 'appsync-realtime-api'.
 * For custom domains, appends '/graphql/realtime' to the path.
 */

export function toRealtimeUrl(httpUrl: URL): string {
	// Standard AppSync domains:
	// https://<id>.appsync-api.<region>.amazonaws.com/graphql
	// -> wss://<id>.appsync-realtime-api.<region>.amazonaws.com/graphql
	if (httpUrl.host.includes('appsync-api')) {
		return `wss://${httpUrl.host.replace('appsync-api', 'appsync-realtime-api')}${httpUrl.pathname}`;
	}

	// Custom domain case:
	// https://api.example.com/graphql  -> wss://api.example.com/graphql/realtime
	const basePath = httpUrl.pathname.replace(/\/graphql\/?$/, '');
	return `wss://${httpUrl.host}${basePath}/graphql/realtime`;
}


/**
 * Encodes a string to base64url format (URL-safe base64).
 * 
 * @param {string} s - The input string to encode.
 * @returns {string} The base64url-encoded string.
 */
export function base64Url(s: string): string {
	// Browser-safe base64url encode
	// eslint-disable-next-line no-undef
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Safely parses a JSON string.
 * 
 * @param {string} s - The JSON string to parse.
 * @returns {any | null} The parsed object, or null if parsing fails.
 */ 
export function safeJsonParse(s: string): any | null {
	try {
		return JSON.parse(s);
	} catch {
		return null;
	}
}


/**
 * Generates a random UUID.
 * 
 * @returns {string} The generated UUID.
 */
export function uuid(): string {
	// eslint-disable-next-line no-undef
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		// eslint-disable-next-line no-undef
		return crypto.randomUUID();
	}
	return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/**
 * Utility: safe dot-path lookup ("a.b.c")
 * 
 * @param {any} obj - The object to lookup.
 * @param {string} path - The path to lookup.
 * @returns {any} The value at the path, or undefined if the path is not valid.
 */
/** Utility: safe dot-path lookup ("a.b.c") */
export function pluck(obj: any, path?: string) {
	if (!path) return obj;
	return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}
