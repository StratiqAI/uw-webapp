// src/lib/stores/auth.svelte.ts
import type { CurrentUser } from '$lib/types/auth';

class AuthStore {
	currentUser = $state<CurrentUser | null>(null);
	idToken = $state<string | null>(null);

	setAuth(user: CurrentUser | null, token: string | null) {
		console.log('setAuth', user, token);
		this.currentUser = user;
		this.idToken = token;
	}

	setCurrentUser(user: CurrentUser | null) {
		console.log('setCurrentUser', user);
		this.currentUser = user;
	}

	setIdToken(token: string | null) {
		console.log('setIdToken', token);
		this.idToken = token;
	}

	clear() {
		console.log('clear');
		this.currentUser = null;
		this.idToken = null;
	}
}

export const authStore = new AuthStore();

