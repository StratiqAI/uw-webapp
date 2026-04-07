/**
 * Per-tab browser client identifier for echo cancellation.
 *
 * Each tab gets a unique UUID on first access. The ID is kept in a
 * module-level variable (not sessionStorage) so every tab is guaranteed
 * its own identity even when opened from the same session.
 */

import { browser } from '$app/environment';
import { uuid } from '$lib/services/realtime/websocket/utils';

let _clientId: string | null = null;

export function getBrowserClientId(): string {
	if (!_clientId) {
		_clientId = browser ? uuid() : 'ssr-placeholder';
	}
	return _clientId;
}
