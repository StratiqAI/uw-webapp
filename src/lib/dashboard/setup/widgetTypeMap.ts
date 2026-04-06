import type { Component } from 'svelte';
import { getWidgetComponent } from '$lib/dashboard/setup/widgetRegistry';

export function resolveWidgetComponent(type: string): Component<any> | undefined {
	return getWidgetComponent(type);
}
