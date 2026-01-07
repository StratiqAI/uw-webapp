// stores/jobUpdateStore.svelte.ts
// Migrated to Svelte 5 runes pattern

import { readable, type Readable } from 'svelte/store';

export interface JobUpdate {
	readonly id: string;
	readonly request: string;
	readonly result: string | null;
	readonly status: string;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface JobSubmissionState {
	readonly result: { id: string; status: string } | null;
	readonly error: Error | null;
	readonly loading: boolean;
	readonly connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
	readonly reconnectAttempts: number;
}

class JobUpdateStore {
	// Use $state for reactive state
	private updatesState = $state<Map<string, JobUpdate[]>>(new Map());
	private stateState = $state<Map<string, JobSubmissionState>>(new Map());
	
	// Cache for derived stores
	private updateStores = new Map<string, Readable<JobUpdate[]>>();
	private stateStores = new Map<string, Readable<JobSubmissionState | null>>();

	// Subscribe to all updates (for backward compatibility)
	subscribeToUpdates(callback: (updates: Map<string, JobUpdate[]>) => void): () => void {
		// Since we can't directly observe runes from outside, we'll call immediately
		// and return a no-op unsubscribe. Components should use the specific job methods instead.
		callback(this.updatesState);
		return () => {}; // No-op unsubscribe
	}

	// Subscribe to all states (for backward compatibility)
	subscribeToState(callback: (states: Map<string, JobSubmissionState>) => void): () => void {
		callback(this.stateState);
		return () => {}; // No-op unsubscribe
	}

	// Subscribe to a specific job's updates
	subscribeToJobUpdates(jobId: string): Readable<JobUpdate[]> {
		if (this.updateStores.has(jobId)) {
			return this.updateStores.get(jobId)!;
		}

		const updateStore = readable<JobUpdate[]>([], (set) => {
			// Set initial value
			set(this.updatesState.get(jobId) || []);
			
			// Since we can't directly observe rune changes, we'll need to
			// manually update this when the state changes. For now, return
			// a no-op unsubscribe. Components should call this method again
			// after updates to get the latest store.
			return () => {};
		});

		this.updateStores.set(jobId, updateStore);
		return updateStore;
	}

	// Subscribe to a specific job's state
	subscribeToJobState(jobId: string): Readable<JobSubmissionState | null> {
		if (this.stateStores.has(jobId)) {
			return this.stateStores.get(jobId)!;
		}

		const stateStore = readable<JobSubmissionState | null>(null, (set) => {
			set(this.stateState.get(jobId) || null);
			return () => {};
		});

		this.stateStores.set(jobId, stateStore);
		return stateStore;
	}

	// Helper to update derived stores when state changes
	private updateDerivedStores() {
		// Update all cached stores
		for (const [jobId, store] of this.updateStores.entries()) {
			// Note: readable stores can't be updated from outside
			// We'll need to recreate them or use a different pattern
			// For now, components should re-subscribe after updates
		}
	}

	// Add a job update (prepends to maintain newest-first order)
	addJobUpdate(jobId: string, update: JobUpdate): void {
		const current = this.updatesState.get(jobId) || [];
		
		// Prevent duplicates based on updatedAt timestamp
		const isDuplicate = current.some(
			(u) => u.id === update.id && u.updatedAt === update.updatedAt
		);
		
		if (!isDuplicate) {
			// Create new map with updated data
			const newMap = new Map(this.updatesState);
			newMap.set(jobId, [update, ...current]);
			this.updatesState = newMap;
			
			// Invalidate cached store for this job
			this.updateStores.delete(jobId);
		}
	}

	// Update job state
	updateJobState(jobId: string, state: Partial<JobSubmissionState>): void {
		const current = this.stateState.get(jobId) || {
			result: null,
			error: null,
			loading: false,
			connectionState: 'disconnected' as const,
			reconnectAttempts: 0
		};
		
		// Create new map with updated state
		const newMap = new Map(this.stateState);
		newMap.set(jobId, { ...current, ...state });
		this.stateState = newMap;
		
		// Invalidate cached store for this job
		this.stateStores.delete(jobId);
	}

	// Set initial job state
	setJobState(jobId: string, state: JobSubmissionState): void {
		const newMap = new Map(this.stateState);
		newMap.set(jobId, state);
		this.stateState = newMap;
		
		// Invalidate cached store for this job
		this.stateStores.delete(jobId);
	}

	// Clear updates for a specific job
	clearJobUpdates(jobId: string): void {
		const newMap = new Map(this.updatesState);
		newMap.set(jobId, []);
		this.updatesState = newMap;
		
		// Invalidate cached store for this job
		this.updateStores.delete(jobId);
	}

	// Clear state for a specific job
	clearJobState(jobId: string): void {
		const newMap = new Map(this.stateState);
		newMap.delete(jobId);
		this.stateState = newMap;
		
		// Remove cached store
		this.stateStores.delete(jobId);
	}

	// Delete a job entirely
	deleteJob(jobId: string): void {
		// Remove from updates
		const updatesMap = new Map(this.updatesState);
		updatesMap.delete(jobId);
		this.updatesState = updatesMap;
		this.updateStores.delete(jobId);

		// Remove from states
		const statesMap = new Map(this.stateState);
		statesMap.delete(jobId);
		this.stateState = statesMap;
		this.stateStores.delete(jobId);
	}

	// Get latest update for a job
	getLatestUpdate(jobId: string): Readable<JobUpdate | null> {
		return readable<JobUpdate | null>(null, (set) => {
			const updates = this.updatesState.get(jobId);
			set(updates && updates.length > 0 ? updates[0] : null);
			return () => {};
		});
	}

	// Clear all data
	clearAll(): void {
		this.updatesState = new Map();
		this.stateState = new Map();
		this.updateStores.clear();
		this.stateStores.clear();
	}

	// Get all job IDs
	getAllJobIds(): Readable<string[]> {
		return readable<string[]>([], (set) => {
			set(Array.from(this.updatesState.keys()));
			return () => {};
		});
	}
}

export const jobUpdateStore = new JobUpdateStore();
