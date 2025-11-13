// Simple, persistent UI store for the right sidebar
const LOC_KEY_WIDTH = 'ui.sidebarWidth';
const LOC_KEY_OPEN = 'ui.sidebarOpen';

function loadWidth(): number {
	if (typeof localStorage === 'undefined') return 448; // 28rem default
	const v = Number(localStorage.getItem(LOC_KEY_WIDTH));
	return Number.isFinite(v) && v >= 240 ? v : 448;
}

function loadOpen(): boolean {
	if (typeof localStorage === 'undefined') return false; // default closed
	const v = localStorage.getItem(LOC_KEY_OPEN);
	return v === null ? false : v === 'true'; // default to false if not set
}

class UIStore {
	sidebarOpen = $state(loadOpen());
	sidebarWidth = $state(loadWidth()); // pixels

	setWidth(px: number) {
		const min = 280; // px
		const max = Math.min(Math.round(globalThis?.innerWidth ? innerWidth * 0.6 : 900), 900);
		const clamped = Math.max(min, Math.min(max, Math.round(px)));
		this.sidebarWidth = clamped;
		try { localStorage.setItem(LOC_KEY_WIDTH, String(clamped)); } catch {}
	}

	setOpen(open: boolean) {
		this.sidebarOpen = open;
		try { localStorage.setItem(LOC_KEY_OPEN, String(open)); } catch {}
	}
}

export const ui = new UIStore();