const PREFIX = 'tour-completed';

function key(tourId: string): string {
	return `${PREFIX}:${tourId}`;
}

export function isCompleted(tourId: string): boolean {
	try {
		return localStorage.getItem(key(tourId)) === 'true';
	} catch {
		return false;
	}
}

export function markCompleted(tourId: string): void {
	try {
		localStorage.setItem(key(tourId), 'true');
	} catch {}
}

export function resetTour(tourId: string): void {
	try {
		localStorage.removeItem(key(tourId));
	} catch {}
}

export function resetAll(): void {
	try {
		const toRemove: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k?.startsWith(`${PREFIX}:`)) toRemove.push(k);
		}
		toRemove.forEach((k) => localStorage.removeItem(k));
	} catch {}
}
