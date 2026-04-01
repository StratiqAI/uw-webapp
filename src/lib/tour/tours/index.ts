import { registerTour } from '../tourRegistry';
import { welcomeTour } from './welcomeTour';
import { workspaceTour } from './workspaceTour';

export function registerAllTours(): void {
	registerTour(welcomeTour);
	registerTour(workspaceTour);
}
