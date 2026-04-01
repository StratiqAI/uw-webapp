<script lang="ts">
	import type { TourStep, TooltipPosition } from '../types';
	import TourProgress from './TourProgress.svelte';

	interface Props {
		step: TourStep;
		position: TooltipPosition | null;
		stepIndex: number;
		totalSteps: number;
		isFirstStep: boolean;
		isLastStep: boolean;
		darkMode?: boolean;
		onNext: () => void;
		onPrev: () => void;
		onSkip: () => void;
		onDotClick: (index: number) => void;
	}

	let {
		step,
		position,
		stepIndex,
		totalSteps,
		isFirstStep,
		isLastStep,
		darkMode = false,
		onNext,
		onPrev,
		onSkip,
		onDotClick
	}: Props = $props();

	let isCentered = $derived(!step.target);

	let tooltipStyle = $derived.by(() => {
		if (isCentered) {
			return 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);';
		}
		if (!position) return 'visibility: hidden;';
		return `position: fixed; top: ${position.top}px; left: ${position.left}px;`;
	});

	let arrowClasses = $derived.by(() => {
		if (!position || isCentered) return '';
		const base = 'absolute h-3 w-3 rotate-45';
		const color = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
		switch (position.arrowSide) {
			case 'top':
				return `${base} ${color} -top-1.5 left-1/2 -translate-x-1/2 border-l border-t`;
			case 'bottom':
				return `${base} ${color} -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b`;
			case 'left':
				return `${base} ${color} -left-1.5 top-1/2 -translate-y-1/2 border-l border-b`;
			case 'right':
				return `${base} ${color} -right-1.5 top-1/2 -translate-y-1/2 border-r border-t`;
			default:
				return '';
		}
	});
</script>

<div
	class="z-100010 w-[340px] max-w-[calc(100vw-24px)]"
	style={tooltipStyle}
	role="dialog"
	aria-modal="true"
	aria-labelledby="tour-step-title"
	aria-describedby="tour-step-content"
>
	<div
		class="relative rounded-xl border shadow-2xl {darkMode
			? 'border-slate-700 bg-slate-800'
			: 'border-slate-200 bg-white'}"
	>
		{#if !isCentered}
			<div class={arrowClasses}></div>
		{/if}

		<div class="p-5">
			<!-- Header -->
			<div class="mb-1 flex items-start justify-between gap-2">
				<h3
					id="tour-step-title"
					class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'}"
				>
					{step.title}
				</h3>
				<button
					type="button"
					onclick={onSkip}
					class="mt-0.5 shrink-0 rounded p-0.5 transition-colors {darkMode
						? 'text-slate-500 hover:text-slate-300'
						: 'text-slate-400 hover:text-slate-600'}"
					aria-label="Close tour"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div
				id="tour-step-content"
				class="mb-4 text-sm leading-relaxed {darkMode ? 'text-slate-300' : 'text-slate-600'}"
			>
				{@html step.content}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between">
				<TourProgress
					total={totalSteps}
					current={stepIndex}
					{darkMode}
					{onDotClick}
				/>

				<div class="flex items-center gap-2">
					{#if !isFirstStep}
						<button
							type="button"
							onclick={onPrev}
							class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {darkMode
								? 'text-slate-300 hover:bg-slate-700 hover:text-white'
								: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
						>
							{step.backLabel ?? 'Back'}
						</button>
					{/if}

					{#if !step.disableNext}
						<button
							type="button"
							onclick={onNext}
							class="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
						>
							{#if isLastStep}
								{step.nextLabel ?? 'Finish'}
							{:else}
								{step.nextLabel ?? 'Next'}
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
