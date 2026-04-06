/**
 * Default Dashboard Values
 *
 * Provides default data and sizing for widgets. Package-based widgets supply
 * defaults via their manifest; this file only keeps fallbacks for any widget
 * types not yet packaged.
 */

import type { AnyWidgetType, Widget, WidgetType } from '$lib/dashboard/types/widget';
import { getWidgetManifest } from '$lib/dashboard/setup/widgetRegistry';

/**
 * Hardcoded fallback default data — only needed for widget types that are NOT
 * registered via a widget package manifest. As widgets migrate to packages,
 * entries here should be removed.
 */
export const DEFAULT_WIDGET_DATA: Partial<Record<WidgetType, Record<string, unknown>>> = {};

export const DEFAULT_WIDGET_SIZES: Partial<Record<WidgetType, { colSpan: number; rowSpan: number }>> = {};

/**
 * Returns default data for a widget by its type. Checks the widget package
 * registry first, then falls back to the hardcoded map.
 */
export function getDefaultDataForWidget(widget: Widget): Record<string, unknown> {
	const manifest = getWidgetManifest(widget.type);
	if (manifest) {
		return { ...(manifest.defaultData as Record<string, unknown>) };
	}
	const d =
		DEFAULT_WIDGET_DATA[widget.type as WidgetType] ?? {
			title: 'Untitled',
			subtitle: null,
			alignment: 'left'
		};
	return { ...d };
}

/**
 * Returns default size for a widget type. Checks the widget package
 * registry first, then falls back to the hardcoded map.
 */
export function getDefaultSizeForWidget(widgetType: AnyWidgetType): { colSpan: number; rowSpan: number } {
	const manifest = getWidgetManifest(widgetType);
	if (manifest) {
		return { ...manifest.defaultSize };
	}
	return DEFAULT_WIDGET_SIZES[widgetType as WidgetType] ?? { colSpan: 4, rowSpan: 2 };
}
