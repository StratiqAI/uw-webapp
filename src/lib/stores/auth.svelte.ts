// src/lib/stores/auth.svelte.ts
import type { CurrentUser } from '$lib/types/auth';

class AuthStore {
	currentUser = $state<CurrentUser | null>(null);
	idToken = $state<string | null>(null);

	setAuth(user: CurrentUser | null, token: string | null) {
		this.currentUser = user;
		this.idToken = token;
	}

	setCurrentUser(user: CurrentUser | null) {
		this.currentUser = user;
	}

	setIdToken(token: string | null) {
		this.idToken = token;
	}

	clear() {
		this.currentUser = null;
		this.idToken = null;
	}
}

export const authStore = new AuthStore();

