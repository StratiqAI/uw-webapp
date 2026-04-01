import type { Action } from 'svelte/action';

/**
 * Svelte action that marks an element as a tour step target.
 *
 * Usage:
 *   <button use:tourTarget={'sidebar-nav'}>Navigate</button>
 *
 * This sets `data-tour="sidebar-nav"` on the element and keeps it in
 * sync if the parameter changes.
 */
export const tourTarget: Action<HTMLElement, string> = (node, stepId) => {
	node.setAttribute('data-tour', stepId as string);

	return {
		update(newStepId: string) {
			node.setAttribute('data-tour', newStepId);
		},
		destroy() {
			node.removeAttribute('data-tour');
		}
	};
};
