export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TourStep {
	id: string;
	/** CSS selector for the target element. Omit for a centered "welcome" modal step. */
	target?: string;
	title: string;
	/** Plain text or HTML string (rendered via {@html}). */
	content: string;
	placement?: TourPlacement;
	/** Extra padding (px) around the spotlight cutout. Default 8. */
	spotlightPadding?: number;
	/** Border-radius (px) for the spotlight cutout. Default 8. */
	spotlightRadius?: number;
	/** Called before the step is shown. Return false to skip it. */
	onBeforeShow?: () => boolean | void | Promise<boolean | void>;
	/** Called after the step becomes visible. */
	onAfterShow?: () => void | Promise<void>;
	/** Called when leaving this step (next, prev, or skip). */
	onBeforeLeave?: () => void | Promise<void>;
	/** If true, the "Next" button is hidden and advancing is handled programmatically. */
	disableNext?: boolean;
	/** Custom label for the "Next" button on this step. */
	nextLabel?: string;
	/** Custom label for the "Back" button on this step. */
	backLabel?: string;
}

export interface TourTrigger {
	/** 'auto' starts the tour on route match; 'manual' requires programmatic start. */
	type: 'auto' | 'manual';
	/** Route path or regex string to match. Checked against $page.url.pathname. */
	route?: string;
	/** If true, tour auto-triggers only once (tracked via localStorage). */
	showOnce?: boolean;
	/** Delay in ms before auto-starting. Default 500. */
	delay?: number;
}

export interface TourDefinition {
	id: string;
	name: string;
	description?: string;
	trigger: TourTrigger;
	steps: TourStep[];
}

export interface TooltipPosition {
	top: number;
	left: number;
	placement: Exclude<TourPlacement, 'auto'>;
	arrowSide: 'top' | 'bottom' | 'left' | 'right';
}

export interface SpotlightRect {
	x: number;
	y: number;
	width: number;
	height: number;
	radius: number;
}
