import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP_CREDENTIALS_BASENAME = 'uw-webapp-google-application-credentials.json';

let credentialsFromJsonApplied = false;

function isRecord(v: unknown): v is Record<string, unknown> {
	return v !== null && typeof v === 'object';
}

/** Minimal validation for a Google service account key JSON object. */
function isServiceAccountKeyJson(v: unknown): boolean {
	if (!isRecord(v)) return false;
	if (v.type !== undefined && v.type !== 'service_account') return false;
	const email = v.client_email;
	const pk = v.private_key;
	return typeof email === 'string' && email.includes('@') && typeof pk === 'string' && pk.includes('BEGIN');
}

function readJsonCredentialsFromEnv(): string | undefined {
	const primary = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
	if (primary) return primary;
	const alias1 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
	if (alias1) return alias1;
	const alias2 = process.env.GOOGLE_SERVICE_ACCOUNT?.trim();
	if (alias2) return alias2;
	return undefined;
}

/** Avoid google-auth-library ENOENT when `.env` points at a removed or gitignored key file. */
function clearStaleGoogleApplicationCredentialsFileEnv(): void {
	const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
	if (!raw) return;
	const expanded = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
	try {
		const st = fs.statSync(expanded);
		if (!st.isFile()) {
			delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
		}
	} catch {
		delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
	}
}

/**
 * Writes service account JSON from env to a temp file and sets `GOOGLE_APPLICATION_CREDENTIALS`.
 * Idempotent. Used on Vercel (and similar) where there is no repo file path.
 *
 * Env lookup order: `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SERVICE_ACCOUNT`.
 *
 * @returns true when credentials were applied from JSON env; false when no JSON env was set
 */
export function ensureGoogleApplicationCredentialsFromJsonEnv(): boolean {
	if (credentialsFromJsonApplied) return true;

	clearStaleGoogleApplicationCredentialsFileEnv();

	const raw = readJsonCredentialsFromEnv();
	if (!raw) return false;

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(
			'GOOGLE_APPLICATION_CREDENTIALS_JSON (or GOOGLE_SERVICE_ACCOUNT / GOOGLE_SERVICE_ACCOUNT_JSON) is set but is not valid JSON'
		);
	}

	if (!isServiceAccountKeyJson(parsed)) {
		throw new Error(
			'Google credentials JSON env must be a service account key object (expect type service_account, client_email, private_key)'
		);
	}

	const tmpPath = path.join(os.tmpdir(), TMP_CREDENTIALS_BASENAME);
	fs.writeFileSync(tmpPath, JSON.stringify(parsed), { mode: 0o600 });
	process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
	credentialsFromJsonApplied = true;
	return true;
}

/** Vertex predict/embed APIs need a regional endpoint; `global` often 404s for e.g. multimodal embedding. */
export function normalizeGoogleVertexLocation(raw: string | undefined): string {
	const loc = (raw || '').trim();
	if (!loc || loc === 'global') return 'us-central1';
	return loc;
}

/**
 * Resolves relative `GOOGLE_APPLICATION_CREDENTIALS` once against a working directory.
 * When `GOOGLE_APPLICATION_CREDENTIALS_JSON` (or aliases) is set, materializes that JSON first.
 */
export class GoogleCredentialsEnvNormalizer {
	private resolved = false;

	resolve(cwd: string, rawPath: string | undefined): void {
		if (this.resolved) return;
		const fromJsonEnv = ensureGoogleApplicationCredentialsFromJsonEnv();
		if (!fromJsonEnv && rawPath && !path.isAbsolute(rawPath)) {
			process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(cwd, rawPath);
		}
		this.resolved = true;
	}
}
