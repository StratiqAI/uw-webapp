// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// ListOperations.ts
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import { createLogger } from '$lib/utils/logger';

const log = createLogger('realtime');

// Generic helpers to manage a list of T by a computed key.
// Works great with Svelte 5 $state deep reactivity (mutations are tracked).

export type KeyFn<T> = (x: T) => string;
export type NormalizeFn<T> = (x: T) => T;

export function keyJoin<T>(...fields: (keyof T)[]): KeyFn<T> {
	return (x) => fields.map((f) => String((x as any)[f])).join('#');
}

export function createListOps<T>(opts: { keyFor: KeyFn<T>; normalize?: NormalizeFn<T> }) {
	const norm: NormalizeFn<T> = opts.normalize ?? ((x) => x);

	function upsertMutable(items: T[], it: T): void {
		it = norm(it);
		log.debug('upsertMutable item:', it);
		const k = opts.keyFor(it);
		const i = items.findIndex((x) => opts.keyFor(x) === k);
		if (i >= 0) items[i] = it;
		else items.unshift(it);
	}

	function removeMutable(items: T[], it: T): void {
		const k = opts.keyFor(norm(it));
		let w = 0;
		for (let r = 0; r < items.length; r++) {
			if (opts.keyFor(items[r]) !== k) items[w++] = items[r];
		}
		items.length = w;
	}

	function upsert(items: T[], it: T): T[] {
		it = norm(it);
		const k = opts.keyFor(it);
		const i = items.findIndex((x) => opts.keyFor(x) === k);
		if (i >= 0) {
			const copy = items.slice();
			copy[i] = it;
			return copy;
		}
		return [it, ...items];
	}

	function remove(items: T[], it: T): T[] {
		const k = opts.keyFor(norm(it));
		return items.filter((x) => opts.keyFor(x) !== k);
	}

	return { keyFor: opts.keyFor, normalize: norm, upsertMutable, removeMutable, upsert, remove };
}

// Pre-configured list operations for UserItem
export const userItemOps = createListOps({
	keyFor: keyJoin('entityType', 'entityId')
});

