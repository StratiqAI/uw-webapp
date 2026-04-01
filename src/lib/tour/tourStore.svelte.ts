import type { TourDefinition, TourStep } from './types';
import { getTour } from './tourRegistry';
import { isCompleted, markCompleted } from './persistence';

export type TourEventType = 'start' | 'next' | 'prev' | 'skip' | 'complete' | 'step-change';

export interface TourEvent {
	type: TourEventType;
	tourId: string;
	stepIndex: number;
	step: TourStep | null;
}

type TourListener = (event: TourEvent) => void;

class TourStore {
	activeTour = $state<TourDefinition | null>(null);
	currentStepIndex = $state(0);
	isActive = $derived(this.activeTour !== null);
	currentStep = $derived(this.activeTour?.steps[this.currentStepIndex] ?? null);
	totalSteps = $derived(this.activeTour?.steps.length ?? 0);
	progress = $derived(this.totalSteps > 0 ? (this.currentStepIndex + 1) / this.totalSteps : 0);
	isFirstStep = $derived(this.currentStepIndex === 0);
	isLastStep = $derived(this.activeTour !== null && this.currentStepIndex === this.activeTour.steps.length - 1);

	private listeners: Set<TourListener> = new Set();

	on(listener: TourListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private emit(type: TourEventType): void {
		if (!this.activeTour) return;
		const event: TourEvent = {
			type,
			tourId: this.activeTour.id,
			stepIndex: this.currentStepIndex,
			step: this.currentStep
		};
		this.listeners.forEach((fn) => fn(event));
	}

	async start(tourId: string): Promise<boolean> {
		const tour = getTour(tourId);
		if (!tour || tour.steps.length === 0) return false;

		this.activeTour = tour;
		this.currentStepIndex = 0;

		const firstStep = tour.steps[0];
		if (firstStep.onBeforeShow) {
			const result = await firstStep.onBeforeShow();
			if (result === false) {
				this.activeTour = null;
				return false;
			}
		}

		this.emit('start');
		firstStep.onAfterShow?.();
		return true;
	}

	async next(): Promise<void> {
		if (!this.activeTour) return;

		const current = this.currentStep;
		if (current?.onBeforeLeave) {
			await current.onBeforeLeave();
		}

		if (this.isLastStep) {
			this.complete();
			return;
		}

		let nextIndex = this.currentStepIndex + 1;
		while (nextIndex < this.activeTour.steps.length) {
			const step = this.activeTour.steps[nextIndex];
			if (step.onBeforeShow) {
				const result = await step.onBeforeShow();
				if (result === false) {
					nextIndex++;
					continue;
				}
			}
			break;
		}

		if (nextIndex >= this.activeTour.steps.length) {
			this.complete();
			return;
		}

		this.currentStepIndex = nextIndex;
		this.emit('next');
		this.activeTour.steps[nextIndex].onAfterShow?.();
	}

	async prev(): Promise<void> {
		if (!this.activeTour || this.isFirstStep) return;

		const current = this.currentStep;
		if (current?.onBeforeLeave) {
			await current.onBeforeLeave();
		}

		let prevIndex = this.currentStepIndex - 1;
		while (prevIndex >= 0) {
			const step = this.activeTour.steps[prevIndex];
			if (step.onBeforeShow) {
				const result = await step.onBeforeShow();
				if (result === false) {
					prevIndex--;
					continue;
				}
			}
			break;
		}

		if (prevIndex < 0) return;

		this.currentStepIndex = prevIndex;
		this.emit('prev');
		this.activeTour.steps[prevIndex].onAfterShow?.();
	}

	skip(): void {
		if (!this.activeTour) return;
		const current = this.currentStep;
		current?.onBeforeLeave?.();
		this.emit('skip');
		this.activeTour = null;
		this.currentStepIndex = 0;
	}

	complete(): void {
		if (!this.activeTour) return;
		const tourId = this.activeTour.id;
		this.emit('complete');
		markCompleted(tourId);
		this.activeTour = null;
		this.currentStepIndex = 0;
	}

	goToStep(index: number): void {
		if (!this.activeTour) return;
		if (index < 0 || index >= this.activeTour.steps.length) return;
		this.currentStepIndex = index;
		this.emit('step-change');
		this.activeTour.steps[index].onAfterShow?.();
	}

	/** Check if a tour has already been completed by the user. */
	hasCompleted(tourId: string): boolean {
		return isCompleted(tourId);
	}
}

export const tourStore = new TourStore();
