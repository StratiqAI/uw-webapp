/**
 * Generation-based async cancellation guard.
 *
 * Each call to `next()` increments an internal generation counter and returns
 * the new value. After an `await`, call `isCurrent(gen)` to check whether a
 * newer operation has started — if it has, the caller should bail out.
 *
 * This is superior to a plain `let cancelled = false` flag because it handles
 * overlapping calls correctly (not just single cancellation).
 */
export function createAsyncGuard() {
	let generation = 0;
	return {
		next(): number {
			return ++generation;
		},
		isCurrent(gen: number): boolean {
			return gen === generation;
		},
		cancel(): void {
			generation++;
		}
	};
}
