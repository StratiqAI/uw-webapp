// src/lib/stores/auth.svelte.ts
import type { CurrentUser } from '$lib/types/auth';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('auth');

class AuthStore {
	currentUser = $state<CurrentUser | null>(null);
	idToken = $state<string | null>(null);

	setAuth(user: CurrentUser | null, token: string | null) {
		log.debug('setAuth', user, token);
		this.currentUser = user;
		this.idToken = token;
	}

	setCurrentUser(user: CurrentUser | null) {
		log.debug('setCurrentUser', user);
		this.currentUser = user;
	}

	setIdToken(token: string | null) {
		log.debug('setIdToken', token);
		this.idToken = token;
	}

	clear() {
		log.debug('clear');
		this.currentUser = null;
		this.idToken = null;
	}
}

export const authStore = new AuthStore();

