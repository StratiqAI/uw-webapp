/**
 * Reactive connection state for the unified AppSync WebSocket client.
 *
 * Lives in a `.svelte.ts` file so Svelte 5 runes ($state) are available.
 * Imported by wsClient.ts (to mutate) and by UI hooks (to read reactively).
 */

import type { ConnectionState } from './types';

export const connectionState: ConnectionState = $state({
	status: 'disconnected',
	lastConnectedAt: null,
	reconnectAttempt: 0,
	error: null
});

export function setConnectionState(patch: Partial<ConnectionState>): void {
	Object.assign(connectionState, patch);
}

export function resetConnectionState(): void {
	connectionState.status = 'disconnected';
	connectionState.lastConnectedAt = null;
	connectionState.reconnectAttempt = 0;
	connectionState.error = null;
}
