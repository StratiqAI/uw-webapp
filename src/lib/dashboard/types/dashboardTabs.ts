import type { DashboardConfig, Widget } from '$lib/dashboard/types/widget';
import { DEFAULT_DASHBOARD_CONFIG } from '$lib/dashboard/types/widget';

/** Tab IDs are now arbitrary strings; these are the defaults for new workspaces. */
export type DashboardTabId = string;

export interface TabInfo {
	id: DashboardTabId;
	label: string;
}

export const DEFAULT_TABS: readonly TabInfo[] = [
	{ id: 'financial', label: 'Financial' },
	{ id: 'market', label: 'Market' },
	{ id: 'property', label: 'Site/Location' },
	{ id: 'legal', label: 'Government/Legal' }
] as const;

export const DEFAULT_ACTIVE_TAB: DashboardTabId = 'market';

export type WidgetDataSnapshot = Record<string, unknown>;

export interface TabDashboardSlice {
	widgets: Widget[];
	config: DashboardConfig;
	widgetData: WidgetDataSnapshot;
}

export interface MultiTabDashboardState {
	version: string;
	activeTabId: DashboardTabId;
	tabOrder: TabInfo[];
	tabs: Record<DashboardTabId, TabDashboardSlice>;
}

export function createEmptyTabSlice(): TabDashboardSlice {
	return {
		widgets: [],
		config: structuredClone(DEFAULT_DASHBOARD_CONFIG),
		widgetData: {}
	};
}

export function createEmptyMultiTabState(
	activeTabId: DashboardTabId = DEFAULT_ACTIVE_TAB
): MultiTabDashboardState {
	const tabOrder = structuredClone(DEFAULT_TABS) as TabInfo[];
	const tabs: Record<DashboardTabId, TabDashboardSlice> = {};
	for (const t of tabOrder) {
		tabs[t.id] = createEmptyTabSlice();
	}
	return { version: '5.0.0', activeTabId, tabOrder, tabs };
}

export function generateTabId(): string {
	return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
