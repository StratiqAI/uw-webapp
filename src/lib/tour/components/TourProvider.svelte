<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { tourStore } from '../tourStore.svelte';
	import { getAutoTours } from '../tourRegistry';
	import { isCompleted } from '../persistence';
	import { getSpotlightRect, scrollIntoViewIfNeeded, calculatePosition } from '../positioning';
	import type { SpotlightRect, TooltipPosition } from '../types';
	import TourOverlay from './TourOverlay.svelte';
	import TourTooltip from './TourTooltip.svelte';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let tooltipEl: HTMLDivElement | undefined = $state();
	let spotlight = $state<SpotlightRect | null>(null);
	let tooltipPosition = $state<TooltipPosition | null>(null);
	let autoTriggerTimer: ReturnType<typeof setTimeout> | null = null;
	let positionFrame: number | null = null;

	function findTargetElement(): Element | null {
		const step = tourStore.currentStep;
		if (!step?.target) return null;
		return document.querySelector(step.target);
	}

	async function updatePositions(): Promise<void> {
		const step = tourStore.currentStep;
		if (!step) {
			spotlight = null;
			tooltipPosition = null;
			return;
		}

		if (!step.target) {
			spotlight = null;
			tooltipPosition = null;
			return;
		}

		const targetEl = findTargetElement();
		if (!targetEl) {
			spotlight = null;
			tooltipPosition = null;
			return;
		}

		await scrollIntoViewIfNeeded(targetEl);

		spotlight = getSpotlightRect(
			targetEl,
			step.spotlightPadding ?? 8,
			step.spotlightRadius ?? 8
		);

		if (tooltipEl) {
			tooltipPosition = calculatePosition(targetEl, tooltipEl, step.placement ?? 'auto');
		}
	}

	function schedulePositionUpdate(): void {
		if (positionFrame !== null) cancelAnimationFrame(positionFrame);
		positionFrame = requestAnimationFrame(() => {
			updatePositions();
			positionFrame = null;
		});
	}

	$effect(() => {
		if (!browser || !tourStore.isActive) return;
		// Re-run when step changes
		void tourStore.currentStepIndex;
		void tourStore.activeTour;

		// Small delay to allow DOM to settle (e.g. after scroll)
		const timer = setTimeout(() => updatePositions(), 50);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (!browser || !tourStore.isActive) return;

		const onResize = () => schedulePositionUpdate();
		const onScroll = () => schedulePositionUpdate();

		window.addEventListener('resize', onResize, { passive: true });
		window.addEventListener('scroll', onScroll, { passive: true, capture: true });

		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onScroll, { capture: true });
		};
	});

	// Keyboard navigation
	$effect(() => {
		if (!browser || !tourStore.isActive) return;

		const onKeydown = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'ArrowRight':
				case 'Enter':
					e.preventDefault();
					tourStore.next();
					break;
				case 'ArrowLeft':
					e.preventDefault();
					tourStore.prev();
					break;
				case 'Escape':
					e.preventDefault();
					tourStore.skip();
					break;
			}
		};

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	// Auto-trigger tours based on route
	$effect(() => {
		if (!browser) return;
		const pathname = $page.url.pathname;

		if (tourStore.isActive) return;

		if (autoTriggerTimer) {
			clearTimeout(autoTriggerTimer);
			autoTriggerTimer = null;
		}

		const autoTours = getAutoTours(pathname);
		const eligible = autoTours.find(
			(t) => !(t.trigger.showOnce && isCompleted(t.id))
		);

		if (!eligible) return;

		const delay = eligible.trigger.delay ?? 500;
		autoTriggerTimer = setTimeout(() => {
			if (!tourStore.isActive) {
				tourStore.start(eligible.id);
			}
		}, delay);

		return () => {
			if (autoTriggerTimer) {
				clearTimeout(autoTriggerTimer);
				autoTriggerTimer = null;
			}
		};
	});

	// Re-calculate position when the tooltip element is bound
	$effect(() => {
		if (tooltipEl && tourStore.isActive) {
			updatePositions();
		}
	});

	onDestroy(() => {
		if (autoTriggerTimer) clearTimeout(autoTriggerTimer);
		if (positionFrame !== null) cancelAnimationFrame(positionFrame);
	});

	function handleOverlayClick() {
		tourStore.skip();
	}

	function handleDotClick(index: number) {
		tourStore.goToStep(index);
	}
</script>

{#if tourStore.isActive && tourStore.currentStep}
	<TourOverlay {spotlight} onclick={handleOverlayClick} />

	<div bind:this={tooltipEl} class="fixed z-100010" style="pointer-events: auto;">
		<TourTooltip
			step={tourStore.currentStep}
			position={tooltipPosition}
			stepIndex={tourStore.currentStepIndex}
			totalSteps={tourStore.totalSteps}
			isFirstStep={tourStore.isFirstStep}
			isLastStep={tourStore.isLastStep}
			{darkMode}
			onNext={() => tourStore.next()}
			onPrev={() => tourStore.prev()}
			onSkip={() => tourStore.skip()}
			onDotClick={handleDotClick}
		/>
	</div>
{/if}
