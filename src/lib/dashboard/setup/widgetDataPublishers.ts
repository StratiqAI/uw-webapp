/**
 * Widget Data Publishers
 *
 * Publishes default data to widget topics using ValidatedTopicStore.
 * Widgets get their defaults from the package manifest (defineWidget defaultData)
 * or from DEFAULT_WIDGET_DATA for built-in types.
 *
 * Widgets subscribe to their topics and receive data reactively.
 */

import { createWidgetPublisher, getWidgetData } from '$lib/dashboard/utils/widgetPublisher';
import { getDefaultDataForWidget } from '$lib/dashboard/setup/defaultDashboardValues';
import type { Widget, WidgetType } from '$lib/dashboard/types/widget';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('widgets');

export interface PublishWidgetDataOptions {
	/** When true, skip widgets that already have data in the store (e.g. after restore from localStorage) */
	onlyIfMissing?: boolean;
}

/**
 * Returns true when the stored value should be treated as "missing" so we republish.
 * Handles undefined, null, {}, and common placeholder/empty values that would
 * render as an empty widget.
 */
function isEffectivelyEmpty(data: unknown, widgetType: WidgetType): boolean {
	if (data == null) return true;
	if (typeof data !== 'object') return true;
	const d = data as Record<string, unknown>;
	if (Object.keys(d).length === 0) return true;
	switch (widgetType) {
		case 'title':
			return !d.title;
		case 'metric':
			return (d.value === '—' || d.value === '' || d.value == null) && (d.label === '—' || d.label === '' || d.label == null);
		case 'paragraph':
			return !d.content;
		case 'table':
			return !Array.isArray(d.rows) || d.rows.length === 0;
		case 'image':
			return !d.src;
		case 'map':
			return (d.apiKey === '' || d.apiKey == null) && (d.lat == null || d.lon == null);
		case 'lineChart':
		case 'barChart':
		case 'areaChart':
			return !Array.isArray(d.labels) || d.labels.length === 0;
		case 'donutChart':
			return !Array.isArray(d.labels) || d.labels.length === 0 || !Array.isArray(d.values) || d.values.length === 0;
		case 'gauge':
			return d.value == null && d.label == null;
		case 'sparkline':
			return !Array.isArray(d.values) || d.values.length === 0;
		case 'heatmap':
			return !Array.isArray(d.rows) || d.rows.length === 0 || !Array.isArray(d.cols) || d.cols.length === 0 || !Array.isArray(d.values);
		case 'divergingBarChart':
			return !Array.isArray(d.labels) || d.labels.length === 0 || !Array.isArray(d.values) || d.values.length === 0;
		case 'schema':
			return !d.schemaId;
		default:
			return false;
	}
}

/**
 * Publish default data for all widgets into ValidatedTopicStore.
 * Uses manifest defaultData (for package widgets) or DEFAULT_WIDGET_DATA (for built-ins).
 */
export function publishWidgetData(widgets: Widget[], options?: PublishWidgetDataOptions): void {
	const onlyIfMissing = options?.onlyIfMissing ?? false;
	log.debug('Publishing to ValidatedTopicStore', onlyIfMissing ? '(only if missing)' : '');

	let published = 0;
	for (const widget of widgets) {
		if (onlyIfMissing && getWidgetData(widget.type, widget.id) !== undefined) {
			continue;
		}
		const data = getDefaultDataForWidget(widget);
		try {
			const publisher = createWidgetPublisher(
				widget.type,
				widget.id,
				'widget-config-publisher'
			);
			const ok = publisher.publish(data);
			if (ok) {
				published++;
				log.debug(`${widget.id} (${widget.type})`);
			} else {
				log.warn(`Validation failed for ${widget.id} (${widget.type})`);
			}
		} catch (error) {
			log.error(`Failed to publish for ${widget.id}:`, error);
		}
	}

	log.info(`Published ${published}/${widgets.length} widgets`);
}

