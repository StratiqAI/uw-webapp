#!/usr/bin/env node

/**
 * Build widget packages (and the SDK they depend on).
 *
 * Usage:
 *   node scripts/build-widgets.js          # build SDK + all widget-* packages
 *   node scripts/build-widgets.js map      # build SDK + widget-map only
 *   node scripts/build-widgets.js title metric  # build SDK + widget-title + widget-metric
 *
 * The dashboard-widget-sdk is always built first because every widget
 * imports from it, and its dist/ must be up-to-date for the widget
 * builds to succeed.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const packagesDir = join(rootDir, 'packages');

const SDK_DIR = 'dashboard-widget-sdk';

function getWidgetDirs() {
	return readdirSync(packagesDir)
		.filter((name) => {
			if (!name.startsWith('widget-')) return false;
			const pkgPath = join(packagesDir, name, 'package.json');
			try {
				statSync(pkgPath);
				return true;
			} catch {
				return false;
			}
		})
		.sort();
}

function buildPackage(dirName) {
	const pkgDir = join(packagesDir, dirName);
	const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'));
	const displayName = pkgJson.name ?? dirName;

	process.stdout.write(`  Building ${displayName} ...`);
	const start = performance.now();
	try {
		execSync('npm run build', { cwd: pkgDir, stdio: 'pipe' });
		const ms = Math.round(performance.now() - start);
		console.log(` done (${ms}ms)`);
		return true;
	} catch (err) {
		const ms = Math.round(performance.now() - start);
		console.log(` FAILED (${ms}ms)`);
		console.error(err.stderr?.toString() || err.message);
		return false;
	}
}

// ---- main ----

const args = process.argv.slice(2);
const allWidgetDirs = getWidgetDirs();

let targetDirs;
if (args.length === 0) {
	targetDirs = allWidgetDirs;
} else {
	targetDirs = [];
	for (const arg of args) {
		const normalized = arg.startsWith('widget-') ? arg : `widget-${arg}`;
		if (!allWidgetDirs.includes(normalized)) {
			console.error(`Unknown widget: "${arg}" (looked for packages/${normalized})`);
			console.error(`Available widgets: ${allWidgetDirs.map((d) => d.replace('widget-', '')).join(', ')}`);
			process.exit(1);
		}
		targetDirs.push(normalized);
	}
}

const totalStart = performance.now();

console.log(`\n  Building SDK + ${targetDirs.length} widget package(s)\n`);

// Always build SDK first
const sdkOk = buildPackage(SDK_DIR);
if (!sdkOk) {
	console.error('\nSDK build failed — aborting widget builds.');
	process.exit(1);
}

let failed = 0;
for (const dir of targetDirs) {
	if (!buildPackage(dir)) failed++;
}

const totalMs = Math.round(performance.now() - totalStart);
console.log(
	`\n  Finished in ${totalMs}ms — ${targetDirs.length - failed}/${targetDirs.length} widgets built` +
		(failed > 0 ? ` (${failed} failed)` : '') +
		'\n'
);

if (failed > 0) process.exit(1);
