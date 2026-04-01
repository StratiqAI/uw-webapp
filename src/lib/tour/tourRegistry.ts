import type { TourDefinition } from './types';

const tours = new Map<string, TourDefinition>();

export function registerTour(tour: TourDefinition): void {
	tours.set(tour.id, tour);
}

export function getTour(id: string): TourDefinition | undefined {
	return tours.get(id);
}

export function getAllTours(): TourDefinition[] {
	return Array.from(tours.values());
}

export function getAutoTours(pathname: string): TourDefinition[] {
	return getAllTours().filter((t) => {
		if (t.trigger.type !== 'auto') return false;
		if (!t.trigger.route) return true;
		if (t.trigger.route instanceof RegExp) {
			return t.trigger.route.test(pathname);
		}
		if (t.trigger.route.includes('*')) {
			const pattern = t.trigger.route.replace(/\*/g, '.*');
			return new RegExp(`^${pattern}$`).test(pathname);
		}
		return pathname === t.trigger.route || pathname.startsWith(t.trigger.route + '/');
	});
}

export function removeTour(id: string): void {
	tours.delete(id);
}
