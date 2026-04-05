/**
 * Dynamic Widget Registry
 *
 * Maintains a map of widget kind -> WidgetManifest for all package-based widgets.
 * The host app imports manifests from installed widget packages and registers
 * them here at startup. WidgetWrapper and schema-registration code read from
 * this registry instead of hardcoded lists.
 */

import type { WidgetManifest, WidgetPromptConfig, StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
import type { Component } from 'svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const manifests = new Map<string, WidgetManifest<any>>();

export function registerWidget(manifest: WidgetManifest): void {
	manifests.set(manifest.kind, manifest);
}

export function getWidgetComponent(kind: string): Component<StandardWidgetProps<unknown>> | undefined {
	return manifests.get(kind)?.component;
}

export function getWidgetManifest(kind: string): WidgetManifest | undefined {
	return manifests.get(kind);
}

export function getRegisteredManifests(): WidgetManifest[] {
	return Array.from(manifests.values());
}

export function isRegisteredWidget(kind: string): boolean {
	return manifests.has(kind);
}

export function getWidgetPromptConfig(kind: string): WidgetPromptConfig | undefined {
	return manifests.get(kind)?.promptConfig;
}
