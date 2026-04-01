import type { TourPlacement, TooltipPosition, SpotlightRect } from './types';

const ARROW_SIZE = 10;
const TOOLTIP_GAP = 12;
const VIEWPORT_MARGIN = 12;

export function getSpotlightRect(
	el: Element,
	padding = 8,
	radius = 8
): SpotlightRect {
	const rect = el.getBoundingClientRect();
	return {
		x: rect.left - padding,
		y: rect.top - padding,
		width: rect.width + padding * 2,
		height: rect.height + padding * 2,
		radius
	};
}

/**
 * Scroll the target element into the visible viewport if it isn't already.
 * Returns a promise that resolves after the scroll completes (or immediately).
 */
export function scrollIntoViewIfNeeded(el: Element): Promise<void> {
	const rect = el.getBoundingClientRect();
	const inView =
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= window.innerHeight &&
		rect.right <= window.innerWidth;

	if (inView) return Promise.resolve();

	const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	el.scrollIntoView({
		behavior: prefersReduced ? 'instant' : 'smooth',
		block: 'center',
		inline: 'center'
	});

	return new Promise((resolve) => setTimeout(resolve, prefersReduced ? 0 : 400));
}

interface SpaceMap {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

function availableSpace(targetRect: DOMRect): SpaceMap {
	return {
		top: targetRect.top,
		bottom: window.innerHeight - targetRect.bottom,
		left: targetRect.left,
		right: window.innerWidth - targetRect.right
	};
}

function bestPlacement(
	space: SpaceMap,
	tooltipWidth: number,
	tooltipHeight: number
): Exclude<TourPlacement, 'auto'> {
	const needed = TOOLTIP_GAP + ARROW_SIZE;

	const fits: Record<string, boolean> = {
		bottom: space.bottom >= tooltipHeight + needed,
		top: space.top >= tooltipHeight + needed,
		right: space.right >= tooltipWidth + needed,
		left: space.left >= tooltipWidth + needed
	};

	if (fits.bottom) return 'bottom';
	if (fits.top) return 'top';
	if (fits.right) return 'right';
	if (fits.left) return 'left';

	const best = (Object.entries(space) as [Exclude<TourPlacement, 'auto'>, number][]).sort(
		(a, b) => b[1] - a[1]
	)[0][0];
	return best;
}

/**
 * Calculate the absolute position for the tooltip relative to the viewport.
 */
export function calculatePosition(
	targetEl: Element,
	tooltipEl: HTMLElement,
	preferredPlacement: TourPlacement = 'auto'
): TooltipPosition {
	const targetRect = targetEl.getBoundingClientRect();
	const tooltipRect = tooltipEl.getBoundingClientRect();
	const tw = tooltipRect.width;
	const th = tooltipRect.height;

	const space = availableSpace(targetRect);
	const placement =
		preferredPlacement === 'auto'
			? bestPlacement(space, tw, th)
			: preferredPlacement;

	let top = 0;
	let left = 0;
	let arrowSide: TooltipPosition['arrowSide'] = 'top';

	switch (placement) {
		case 'bottom':
			top = targetRect.bottom + TOOLTIP_GAP + ARROW_SIZE;
			left = targetRect.left + targetRect.width / 2 - tw / 2;
			arrowSide = 'top';
			break;
		case 'top':
			top = targetRect.top - th - TOOLTIP_GAP - ARROW_SIZE;
			left = targetRect.left + targetRect.width / 2 - tw / 2;
			arrowSide = 'bottom';
			break;
		case 'right':
			top = targetRect.top + targetRect.height / 2 - th / 2;
			left = targetRect.right + TOOLTIP_GAP + ARROW_SIZE;
			arrowSide = 'left';
			break;
		case 'left':
			top = targetRect.top + targetRect.height / 2 - th / 2;
			left = targetRect.left - tw - TOOLTIP_GAP - ARROW_SIZE;
			arrowSide = 'right';
			break;
	}

	left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - tw - VIEWPORT_MARGIN));
	top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - th - VIEWPORT_MARGIN));

	return { top, left, placement, arrowSide };
}
