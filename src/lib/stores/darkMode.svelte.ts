/**
 * Unified Dark Mode Store
 * Provides a single source of truth for dark mode across the entire application
 */

// Create reactive state object
const state = $state({ darkMode: false });

function initialize() {
	if (typeof window === 'undefined') return;

	// Sync with what's already on the document (set by blocking script in app.html)
	if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
		state.darkMode = true;
		return; // Already set, don't override
	}

	try {
		const saved = localStorage.getItem('darkMode');
		if (saved !== null) {
			state.darkMode = saved === 'true';
		} else {
			// Check system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			state.darkMode = prefersDark;
		}
	} catch (e) {
		console.warn('Failed to load dark mode preference:', e);
	}

	// Apply to document (should already be set, but ensure sync)
	updateDocumentClass();
}

function toggle() {
	state.darkMode = !state.darkMode;
	save();
	updateDocumentClass();
}

function set(value: boolean) {
	state.darkMode = value;
	save();
	updateDocumentClass();
}

function save() {
	try {
		localStorage.setItem('darkMode', String(state.darkMode));
	} catch (e) {
		console.warn('Failed to save dark mode preference:', e);
	}
}

function updateDocumentClass() {
	if (typeof document === 'undefined') return;
	if (state.darkMode) {
		document.documentElement.classList.add('dark');
	} else {
		document.documentElement.classList.remove('dark');
	}
}

// Don't auto-initialize on module load - let the blocking script in app.html handle it first
// The layout will sync the store state after mount

export const darkModeStore = {
	get darkMode() {
		return state.darkMode;
	},
	toggle,
	set,
	initialize
};

