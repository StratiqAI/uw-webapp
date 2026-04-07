/**
 * Reactive hook for the unified AppSync WebSocket connection state.
 *
 * Usage in a Svelte component:
 *   const conn = useConnectionState();
 *   {#if conn.isReconnecting}
 *     <Banner>Reconnecting (attempt {conn.reconnectAttempt})…</Banner>
 *   {/if}
 */

import { connectionState } from '$lib/services/realtime/websocket/connectionState.svelte';

export function useConnectionState() {
	return {
		get status() {
			return connectionState.status;
		},
		get isConnected() {
			return connectionState.status === 'connected';
		},
		get isReconnecting() {
			return connectionState.status === 'reconnecting';
		},
		get isDisconnected() {
			return connectionState.status === 'disconnected';
		},
		get reconnectAttempt() {
			return connectionState.reconnectAttempt;
		},
		get lastConnectedAt() {
			return connectionState.lastConnectedAt;
		},
		get error() {
			return connectionState.error;
		}
	};
}
