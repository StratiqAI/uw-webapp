<script lang="ts">
	import type { Widget, WidgetAction } from '$lib/dashboard/types/widget';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { getWidgetPromptConfig } from '$lib/dashboard/setup/widgetRegistry';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';

	interface MenuRow {
		kind: 'action';
		action: WidgetAction;
		label: string;
		icon: string;
		subtext?: string;
		danger?: boolean;
	}

	interface SubMenuRow {
		kind: 'submenu';
		id: string;
		label: string;
		icon: string;
	}

	type MenuItem = MenuRow | SubMenuRow | { kind: 'divider' };

	interface Props {
		widget: Widget;
		isFullscreen?: boolean;
		lastRefreshedAt?: Date | null;
		onAction: (action: WidgetAction) => void;
		onMoveToDashboard?: (tabId: string) => void;
		inTitleBar?: boolean;
	}

	let {
		widget,
		isFullscreen = false,
		lastRefreshedAt = null,
		onAction,
		onMoveToDashboard,
		inTitleBar = false
	}: Props = $props();

	const darkMode = $derived(themeStore.darkMode);

	let isOpen = $state(false);
	let dropdownEl = $state<HTMLElement>();
	let buttonEl = $state<HTMLElement>();
	let buttonRect = $state<DOMRect | null>(null);

	// Submenu state
	let submenuOpen = $state(false);
	let submenuEl = $state<HTMLElement>();
	let submenuAnchorRect = $state<DOMRect | null>(null);
	let submenuCloseTimer: ReturnType<typeof setTimeout> | null = null;

	const otherTabs = $derived(
		dashboard.tabOrder.filter((t) => t.id !== dashboard.activeTabId)
	);

	const PORTAL_Z = 100070;

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				if (node.parentNode === document.body) {
					document.body.removeChild(node);
				}
			}
		};
	}

	$effect(() => {
		if (!isOpen) return;
		window.addEventListener('scroll', updateButtonPosition, true);
		return () => window.removeEventListener('scroll', updateButtonPosition, true);
	});

	function updateButtonPosition() {
		if (buttonEl && isOpen) {
			buttonRect = buttonEl.getBoundingClientRect();
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (
			isOpen &&
			dropdownEl &&
			buttonEl &&
			!dropdownEl.contains(event.target as Node) &&
			!buttonEl.contains(event.target as Node) &&
			(!submenuEl || !submenuEl.contains(event.target as Node))
		) {
			isOpen = false;
			submenuOpen = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (isOpen && event.key === 'Escape') {
			isOpen = false;
			submenuOpen = false;
		}
	}

	function toggleDropdown(event: MouseEvent) {
		event.stopPropagation();
		if (!isOpen && buttonEl) {
			buttonRect = buttonEl.getBoundingClientRect();
		}
		isOpen = !isOpen;
		if (!isOpen) submenuOpen = false;
	}

	function handleAction(action: WidgetAction, event: MouseEvent) {
		event.stopPropagation();
		onAction(action);
		isOpen = false;
		submenuOpen = false;
	}

	function openSubmenu(rowEl: HTMLElement) {
		if (submenuCloseTimer) { clearTimeout(submenuCloseTimer); submenuCloseTimer = null; }
		submenuAnchorRect = rowEl.getBoundingClientRect();
		submenuOpen = true;
	}

	function scheduleSubmenuClose() {
		submenuCloseTimer = setTimeout(() => { submenuOpen = false; submenuCloseTimer = null; }, 120);
	}

	function cancelSubmenuClose() {
		if (submenuCloseTimer) { clearTimeout(submenuCloseTimer); submenuCloseTimer = null; }
	}

	function handleMoveToTab(tabId: string, event: MouseEvent) {
		event.stopPropagation();
		onMoveToDashboard?.(tabId);
		isOpen = false;
		submenuOpen = false;
	}

	function formatRefreshSubtext(at: Date | null): string {
		if (!at) return 'Not refreshed yet';
		return (
			'Refreshed ' +
			at.toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			})
		);
	}

	const ICONS = {
		refresh:
			'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
		expand:
			'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
		compress:
			'M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25',
		settings:
			'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
		configure:
			'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
		aiAgent:
			'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
		aiConfig:
			'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.299 3.896a2.25 2.25 0 01-2.136 1.554H8.435a2.25 2.25 0 01-2.136-1.554L5 14.5m14 0H5',
		duplicate:
			'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
		export:
			'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
		delete:
			'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
		moveToDashboard:
			'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
		chevronRight: 'M9 5l7 7-7 7'
	} as const;

	function hasDataRefresh(widget: Widget): boolean {
		const t = widget.type;
		return (
			t === 'table' ||
			t === 'lineChart' ||
			t === 'barChart' ||
			t === 'donutChart' ||
			t === 'areaChart' ||
			t === 'gauge' ||
			t === 'sparkline' ||
			t === 'heatmap' ||
			t === 'divergingBarChart'
		);
	}

	function buildMenuItems(
		widget: Widget,
		fullscreen: boolean,
		refreshedAt: Date | null,
		hasOtherTabs: boolean
	): MenuItem[] {
		const items: MenuItem[] = [];

		if (hasDataRefresh(widget)) {
			items.push({
				kind: 'action',
				action: 'refresh',
				label: 'Refresh',
				icon: ICONS.refresh,
				subtext: formatRefreshSubtext(refreshedAt)
			});
		}

		items.push({
			kind: 'action',
			action: 'viewFullscreen',
			label: fullscreen ? 'Exit full screen' : 'View in full screen',
			icon: fullscreen ? ICONS.compress : ICONS.expand
		});

		items.push({
			kind: 'action',
			action: 'settings',
			label: 'Settings',
			icon: ICONS.settings
		});

		if (widget.type !== 'title' && getWidgetPromptConfig(widget.type)) {
			items.push({
				kind: 'action',
				action: 'aiConfiguration',
				label: 'AI Configuration',
				icon: ICONS.aiConfig
			});
		}

		if (hasDataRefresh(widget)) {
			items.push({
				kind: 'action',
				action: 'exportData',
				label: 'Export Data',
				icon: ICONS.export
			});
		}

		if (hasOtherTabs) {
			items.push({
				kind: 'submenu',
				id: 'moveToDashboard',
				label: 'Move to Dashboard',
				icon: ICONS.moveToDashboard
			});
		}

		items.push({ kind: 'divider' });

		items.push({
			kind: 'action',
			action: 'duplicate',
			label: 'Duplicate',
			icon: ICONS.duplicate
		});

		items.push({
			kind: 'action',
			action: 'remove',
			label: 'Delete card',
			icon: ICONS.delete,
			danger: true
		});

		return items;
	}

	let menuItems = $derived(buildMenuItems(widget, isFullscreen, lastRefreshedAt, otherTabs.length > 0));

	let dropdownStyle = $derived(
		buttonRect
			? `position:fixed;top:${buttonRect.top + buttonRect.height + 8}px;left:${Math.min(buttonRect.right - 256, window.innerWidth - 268)}px;z-index:${PORTAL_Z};`
			: ''
	);

	let submenuStyle = $derived.by(() => {
		if (!submenuAnchorRect) return '';
		const menuRight = submenuAnchorRect.right;
		const fitsRight = menuRight + 200 < window.innerWidth;
		const left = fitsRight ? menuRight + 4 : submenuAnchorRect.left - 204;
		return `position:fixed;top:${submenuAnchorRect.top - 4}px;left:${left}px;z-index:${PORTAL_Z + 1};`;
	});
</script>

<svelte:window onkeydown={handleKeydown} onresize={updateButtonPosition} />
<svelte:document onclick={handleClickOutside} />

<div class="widget-dropdown {inTitleBar ? 'relative shrink-0' : 'pointer-events-none relative z-20'}">
	<button
		bind:this={buttonEl}
		onclick={toggleDropdown}
		ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
		class="dropdown-trigger pointer-events-auto flex items-center justify-center rounded-lg border transition-opacity {darkMode
			? 'border-slate-600/80 bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
			: 'border-slate-200 bg-white/95 text-slate-600 hover:bg-slate-50 hover:text-slate-900'} opacity-0 shadow-sm group-hover:opacity-100 {inTitleBar
			? 'relative h-8 w-8'
			: 'absolute right-2 top-2 h-9 w-9'}"
		aria-label="Widget menu"
		aria-expanded={isOpen}
		type="button"
	>
		<svg class={inTitleBar ? 'h-4 w-4' : 'h-5 w-5'} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="6" cy="12" r="1.75" />
			<circle cx="12" cy="12" r="1.75" />
			<circle cx="18" cy="12" r="1.75" />
		</svg>
	</button>
</div>

{#if isOpen && buttonRect}
	<div
		use:portal
		bind:this={dropdownEl}
		class="dropdown-menu animate-in w-64 rounded-xl border py-2 shadow-2xl {darkMode
			? 'border-slate-700/80 bg-[#2d2d30]'
			: 'border-slate-200 bg-white'}"
		style={dropdownStyle}
	>
		{#each menuItems as item, i (item.kind === 'action' ? item.action : item.kind === 'submenu' ? item.id : `divider-${i}`)}
			{#if item.kind === 'divider'}
				<div
					class="mx-2 my-2 border-t {darkMode ? 'border-slate-600/60' : 'border-slate-200'}"
				></div>
			{:else if item.kind === 'submenu'}
				<button
					type="button"
					onmouseenter={(e) => openSubmenu(e.currentTarget as HTMLElement)}
					onmouseleave={scheduleSubmenuClose}
					onclick={(e) => { e.stopPropagation(); openSubmenu(e.currentTarget as HTMLElement); }}
					class="menu-item mx-1 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors {darkMode
						? 'text-slate-100 hover:bg-slate-600/50'
						: 'text-slate-800 hover:bg-slate-100'}"
				>
					<svg
						class="menu-icon mt-0.5 h-[18px] w-[18px] shrink-0 {darkMode
							? 'text-slate-400'
							: 'text-slate-500'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}></path>
					</svg>
					<span class="min-w-0 flex-1 font-medium leading-tight">{item.label}</span>
					<svg class="h-4 w-4 shrink-0 {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={ICONS.chevronRight}></path>
					</svg>
				</button>
			{:else if item.kind === 'action'}
				<button
					type="button"
					onclick={(e) => handleAction(item.action, e)}
					onmouseenter={() => { submenuOpen = false; }}
					class="menu-item mx-1 flex w-[calc(100%-0.5rem)] items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors {darkMode
						? item.danger
							? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
							: 'text-slate-100 hover:bg-slate-600/50'
						: item.danger
							? 'text-red-600 hover:bg-red-50'
							: 'text-slate-800 hover:bg-slate-100'}"
				>
					<svg
						class="menu-icon mt-0.5 h-[18px] w-[18px] shrink-0 {darkMode
							? 'text-slate-400'
							: 'text-slate-500'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d={item.icon}
						></path>
					</svg>
					<span class="min-w-0 flex-1">
						<span class="block font-medium leading-tight">{item.label}</span>
						{#if item.subtext}
							<span
								class="mt-1 block text-xs font-normal leading-snug {darkMode
									? 'text-slate-400'
									: 'text-slate-500'}"
							>
								{item.subtext}
							</span>
						{/if}
					</span>
				</button>
			{/if}
		{/each}
	</div>
{/if}

{#if isOpen && submenuOpen && submenuAnchorRect}
	<div
		use:portal
		bind:this={submenuEl}
		onmouseenter={cancelSubmenuClose}
		onmouseleave={scheduleSubmenuClose}
		class="dropdown-menu animate-in w-48 rounded-xl border py-2 shadow-2xl {darkMode
			? 'border-slate-700/80 bg-[#2d2d30]'
			: 'border-slate-200 bg-white'}"
		style={submenuStyle}
	>
		{#each otherTabs as tab (tab.id)}
			<button
				type="button"
				onclick={(e) => handleMoveToTab(tab.id, e)}
				class="mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors {darkMode
					? 'text-slate-100 hover:bg-slate-600/50'
					: 'text-slate-800 hover:bg-slate-100'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>
{/if}

<style>
	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-in {
		animation: slideDown 0.1s ease-out;
	}

	.dropdown-trigger:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.dropdown-menu {
		box-shadow:
			0 18px 40px rgba(0, 0, 0, 0.35),
			0 8px 16px rgba(0, 0, 0, 0.2);
	}
</style>
