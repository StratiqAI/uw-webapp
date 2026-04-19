/**
 * Runs before most server code so Application Default Credentials see a credentials file on Vercel
 * (JSON from GOOGLE_APPLICATION_CREDENTIALS_JSON written to temp dir — see google-credentials.ts).
 */
import { ensureGoogleApplicationCredentialsFromJsonEnv } from '$lib/agent-tools/DocumentSearch/google-credentials';

ensureGoogleApplicationCredentialsFromJsonEnv();
