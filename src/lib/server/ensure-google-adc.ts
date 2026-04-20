/**
 * Runs before most server code so Application Default Credentials see a credentials file on Vercel
 * (JSON from GOOGLE_APPLICATION_CREDENTIALS_JSON written to temp dir — see google-credentials.ts).
 */
import { env } from '$env/dynamic/private';
import { ensureGoogleApplicationCredentialsFromJsonEnv } from '$lib/agent-tools/DocumentSearch/google-credentials';

/** SvelteKit sometimes exposes private env here before Node `process.env` is populated from `.env`. */
function primeGoogleCredentialsJsonEnvFromKit(): void {
	const keys = [
		'GOOGLE_APPLICATION_CREDENTIALS_JSON',
		'GOOGLE_SERVICE_ACCOUNT_JSON',
		'GOOGLE_SERVICE_ACCOUNT'
	] as const;
	const e = env as Record<string, string | undefined>;
	for (const key of keys) {
		const fromProcess = process.env[key]?.trim();
		const fromKit = typeof e[key] === 'string' ? e[key]!.trim() : '';
		if (!fromProcess && fromKit) {
			process.env[key] = fromKit;
		}
	}
}

primeGoogleCredentialsJsonEnvFromKit();
ensureGoogleApplicationCredentialsFromJsonEnv();
