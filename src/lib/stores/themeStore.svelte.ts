/**
 * Unified Theme Store
 * Manages three visual themes: 'light', 'dark', and 'warm'.
 * Applies the active theme via:
 *  - The `.dark` CSS class on <html> (drives Tailwind dark: variants)
 *  - The `data-theme` attribute on <html> (drives explicit warm-theme CSS overrides)
 */

import { createLogger } from '$lib/utils/logger';

const log = createLogger('app');

export type AppTheme = 'light' | 'dark' | 'warm';

const STORAGE_KEY = 'app-theme';

const THEME_LABELS: Record<AppTheme, string> = {
	light: 'Light',
	dark: 'Dark',
	warm: 'Warm'
};

const state = $state<{ theme: AppTheme }>({ theme: 'dark' });

function initialize() {
	if (typeof window === 'undefined') return;

	// Sync with what the blocking script in app.html already applied to <html>
	const htmlEl = document.documentElement;
	const existingDataTheme = htmlEl.getAttribute('data-theme') as AppTheme | null;

	if (existingDataTheme && isValidTheme(existingDataTheme)) {
		state.theme = existingDataTheme;
		return;
	}

	try {
		const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
		if (saved && isValidTheme(saved)) {
			state.theme = saved;
		} else {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			state.theme = prefersDark ? 'dark' : 'light';
		}
	} catch (e) {
		log.warn('Failed to load theme preference:', e);
	}

	applyToDocument();
}

function isValidTheme(value: string): value is AppTheme {
	return value === 'light' || value === 'dark' || value === 'warm';
}

function setTheme(theme: AppTheme) {
	state.theme = theme;
	save();
	applyToDocument();
}

function save() {
	try {
		localStorage.setItem(STORAGE_KEY, state.theme);
	} catch (e) {
		log.warn('Failed to save theme preference:', e);
	}
}

function applyToDocument() {
	if (typeof document === 'undefined') return;
	const htmlEl = document.documentElement;

	if (state.theme === 'dark') {
		htmlEl.classList.add('dark');
	} else {
		htmlEl.classList.remove('dark');
	}

	htmlEl.setAttribute('data-theme', state.theme);
}

export const themeStore = {
	get theme(): AppTheme {
		return state.theme;
	},
	get darkMode(): boolean {
		return state.theme === 'dark';
	},
	get label(): string {
		return THEME_LABELS[state.theme];
	},
	setTheme,
	initialize,
	toggle() {
		const cycle: Record<AppTheme, AppTheme> = { light: 'dark', dark: 'warm', warm: 'light' };
		setTheme(cycle[state.theme]);
	}
};

/**
 * Backward-compatible darkModeStore alias.
 * Existing components that use darkModeStore continue to work unchanged.
 */
export const darkModeStore = {
	get darkMode(): boolean {
		return state.theme === 'dark';
	},
	toggle() {
		setTheme(state.theme === 'dark' ? 'light' : 'dark');
	},
	set(value: boolean) {
		setTheme(value ? 'dark' : 'light');
	},
	initialize
};
