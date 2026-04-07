import { SchemaFingerprint } from '@stratiqai/types-simple';
import { getRegisteredManifests, getWidgetManifest } from '$lib/dashboard/setup/widgetRegistry';
import type { WidgetManifest } from '@stratiqai/dashboard-widget-sdk';

const hashCache = new Map<string, string>();

async function ensureHashes(): Promise<void> {
	for (const m of getRegisteredManifests()) {
		if (hashCache.has(m.kind)) continue;
		const zod = m.inputSchema ?? m.zodSchema;
		if (!zod) continue;
		const fp = SchemaFingerprint.fromZod(zod);
		hashCache.set(m.kind, await fp.generateStructuralHash());
	}
}

export const FALLBACK_WIDGET_KINDS = ['jsonViewer', 'table'] as const;

export async function getMatchingWidgets(
	entityStructuralHash: string
): Promise<{ matches: WidgetManifest[]; fallbacks: WidgetManifest[] }> {
	await ensureHashes();
	const matches: WidgetManifest[] = [];
	for (const [kind, hash] of hashCache) {
		if (hash === entityStructuralHash) {
			const m = getWidgetManifest(kind);
			if (m) matches.push(m);
		}
	}
	const fallbacks = FALLBACK_WIDGET_KINDS
		.filter((k) => !matches.some((m) => m.kind === k))
		.map((k) => getWidgetManifest(k))
		.filter(Boolean) as WidgetManifest[];
	return { matches, fallbacks };
}
