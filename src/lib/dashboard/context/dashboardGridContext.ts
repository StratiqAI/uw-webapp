/** Context for the inner CSS grid element (not the padded drop-zone wrapper). */
export const GRID_CONTAINER_CONTEXT_KEY = 'dashboard-grid-container';

export type DashboardGridContainerContext = {
	get el(): HTMLElement | undefined;
};
