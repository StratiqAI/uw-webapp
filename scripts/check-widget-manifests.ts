/**
 * Widget manifest drift checker.
 *
 * Compares each packages/widget-* /widget.manifest.json against the
 * defineWidget() export from the same package to detect mismatches
 * in kind, displayName, schemaVersion, defaultSize, and capabilities.
 *
 * Usage:
 *   npx tsx scripts/check-widget-manifests.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface ManifestJson {
	kind: string;
	schemaVersion: string;
	displayName: string;
	npmName: string;
	capabilities?: string[];
	defaultSize?: { colSpan: number; rowSpan: number };
	input: { schemaId: string; topicPattern: string };
	output: { schemaId: string; topicPattern: string; writeMode: string } | null;
}

interface RuntimeManifest {
	kind: string;
	displayName: string;
	schemaVersion: string;
	defaultSize: { colSpan: number; rowSpan: number };
	capabilities?: string[];
}

const packagesDir = path.resolve(import.meta.dirname ?? __dirname, '..', 'packages');

const widgetDirs = fs
	.readdirSync(packagesDir)
	.filter((d) => d.startsWith('widget-') && d !== 'dashboard-widget-sdk')
	.map((d) => path.join(packagesDir, d));

let errors = 0;
let checked = 0;

for (const dir of widgetDirs) {
	const manifestPath = path.join(dir, 'widget.manifest.json');
	if (!fs.existsSync(manifestPath)) {
		continue;
	}

	const manifest: ManifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
	const pkgName = path.basename(dir);

	let runtimeManifest: RuntimeManifest;
	try {
		const indexPath = path.join(dir, 'dist', 'index.js');
		if (!fs.existsSync(indexPath)) {
			console.warn(`  [skip] ${pkgName}: dist/index.js not found (run build first)`);
			continue;
		}
		const mod = await import(indexPath);
		const exportedManifest = Object.values(mod).find(
			(v): v is RuntimeManifest =>
				typeof v === 'object' && v !== null && 'kind' in v && 'displayName' in v
		);
		if (!exportedManifest) {
			console.warn(`  [skip] ${pkgName}: no WidgetManifest export found`);
			continue;
		}
		runtimeManifest = exportedManifest;
	} catch (e) {
		console.warn(`  [skip] ${pkgName}: failed to import dist — ${(e as Error).message}`);
		continue;
	}

	checked++;
	const mismatches: string[] = [];

	if (manifest.kind !== runtimeManifest.kind) {
		mismatches.push(`kind: manifest="${manifest.kind}" runtime="${runtimeManifest.kind}"`);
	}
	if (manifest.displayName !== runtimeManifest.displayName) {
		mismatches.push(
			`displayName: manifest="${manifest.displayName}" runtime="${runtimeManifest.displayName}"`
		);
	}
	if (manifest.schemaVersion !== runtimeManifest.schemaVersion) {
		mismatches.push(
			`schemaVersion: manifest="${manifest.schemaVersion}" runtime="${runtimeManifest.schemaVersion}"`
		);
	}
	if (manifest.defaultSize) {
		const m = manifest.defaultSize;
		const r = runtimeManifest.defaultSize;
		if (m.colSpan !== r.colSpan || m.rowSpan !== r.rowSpan) {
			mismatches.push(
				`defaultSize: manifest=${JSON.stringify(m)} runtime=${JSON.stringify(r)}`
			);
		}
	}

	const expectedInputSchemaId = `widget:${manifest.kind}-${manifest.schemaVersion}`;
	if (manifest.input.schemaId !== expectedInputSchemaId) {
		mismatches.push(
			`input.schemaId: got "${manifest.input.schemaId}", expected "${expectedInputSchemaId}"`
		);
	}

	if (manifest.output) {
		const expectedOutputSchemaId = `widget:${manifest.kind}-out-${manifest.schemaVersion}`;
		if (manifest.output.schemaId !== expectedOutputSchemaId) {
			mismatches.push(
				`output.schemaId: got "${manifest.output.schemaId}", expected "${expectedOutputSchemaId}"`
			);
		}
	}

	if (mismatches.length > 0) {
		errors++;
		console.error(`\n  [DRIFT] ${pkgName}:`);
		for (const m of mismatches) {
			console.error(`    - ${m}`);
		}
	} else {
		console.log(`  [ok] ${pkgName}`);
	}
}

console.log(`\nChecked ${checked} widget(s), ${errors} with drift.`);
process.exit(errors > 0 ? 1 : 0);
