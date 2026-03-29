<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import type { Widget, WidgetAction } from '$lib/dashboard/types/widget';

	interface MenuRow {
		action: WidgetAction;
		label: string;
		icon: string;
		subtext?: string;
		danger?: boolean;
	}

	interface Props {
		widget: Widget;
		darkMode?: boolean;
		isFullscreen?: boolean;
		lastRefreshedAt?: Date | null;
		onAction: (action: WidgetAction) => void;
		/** When true, trigger is inline in the title row (upper-right cluster) instead of floating over the body. */
		inTitleBar?: boolean;
	}

	let {
		widget,
		darkMode = false,
		isFullscreen = false,
		lastRefreshedAt = null,
		onAction,
		inTitleBar = false
	}: Props = $props();

	let isOpen = $state(false);
	let dropdownEl = $state<HTMLElement>();
	let buttonEl = $state<HTMLElement>();
	let portalTarget: HTMLElement;
	let buttonRect = $state<DOMRect | null>(null);

	const PORTAL_Z = 100070;

	onMount(() => {
		let portal = document.getElementById('dropdown-portal');
		if (!portal) {
			portal = document.createElement('div');
			portal.id = 'dropdown-portal';
			portal.style.position = 'fixed';
			portal.style.top = '0';
			portal.style.left = '0';
			portal.style.width = '0';
			portal.style.height = '0';
			document.body.appendChild(portal);
		}
		portal.style.zIndex = String(PORTAL_Z);
		portalTarget = portal;

		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);
		window.addEventListener('scroll', updateButtonPosition, true);
		window.addEventListener('resize', updateButtonPosition);
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside);
		document.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('scroll', updateButtonPosition, true);
		window.removeEventListener('resize', updateButtonPosition);

		if (portalTarget && dropdownEl && portalTarget.contains(dropdownEl)) {
			portalTarget.removeChild(dropdownEl);
		}
	});

	$effect(() => {
		if (isOpen && buttonEl) {
			updateButtonPosition();
		}
	});

	function updateButtonPosition() {
		if (buttonEl && isOpen) {
			buttonRect = buttonEl.getBoundingClientRect();
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (
			dropdownEl &&
			buttonEl &&
			!dropdownEl.contains(event.target as Node) &&
			!buttonEl.contains(event.target as Node)
		) {
			isOpen = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
		}
	}

	async function toggleDropdown(event: MouseEvent) {
		event.stopPropagation();
		isOpen = !isOpen;

		if (isOpen) {
			await tick();
			updateButtonPosition();

			if (portalTarget && dropdownEl) {
				portalTarget.appendChild(dropdownEl);
			}
		} else {
			if (portalTarget && dropdownEl && portalTarget.contains(dropdownEl)) {
				portalTarget.removeChild(dropdownEl);
			}
		}
	}

	function handleAction(action: WidgetAction, event: MouseEvent) {
		event.stopPropagation();
		onAction(action);
		isOpen = false;

		if (portalTarget && dropdownEl && portalTarget.contains(dropdownEl)) {
			portalTarget.removeChild(dropdownEl);
		}
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
		duplicate:
			'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
		export:
			'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
		delete:
			'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
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
			t === 'divergingBarChart' ||
			t === 'locationQuotient'
		);
	}

	function buildMenuItems(
		widget: Widget,
		fullscreen: boolean,
		refreshedAt: Date | null
	): Array<MenuRow | { divider: true }> {
		const items: Array<MenuRow | { divider: true }> = [];

		if (hasDataRefresh(widget)) {
			items.push({
				action: 'refresh',
				label: 'Refresh',
				icon: ICONS.refresh,
				subtext: formatRefreshSubtext(refreshedAt)
			});
		}

		items.push({
			action: 'viewFullscreen',
			label: fullscreen ? 'Exit full screen' : 'View in full screen',
			icon: fullscreen ? ICONS.compress : ICONS.expand
		});

		items.push({
			action: 'settings',
			label: 'Settings',
			icon: ICONS.settings
		});

		if (hasDataRefresh(widget)) {
			items.push({
				action: 'exportData',
				label: 'Export Data',
				icon: ICONS.export
			});
		}

		items.push({ divider: true });

		items.push({
			action: 'duplicate',
			label: 'Duplicate',
			icon: ICONS.duplicate
		});

		items.push({
			action: 'remove',
			label: 'Delete card',
			icon: ICONS.delete,
			danger: true
		});

		return items;
	}

	let menuItems = $derived(buildMenuItems(widget, isFullscreen, lastRefreshedAt));

	let dropdownStyle = $derived(
		buttonRect
			? `
      position: fixed;
      top: ${buttonRect.top + buttonRect.height + 8}px;
      left: ${Math.min(buttonRect.right - 256, window.innerWidth - 268)}px;
      z-index: ${PORTAL_Z};
    `
			: ''
	);
</script>

<div class="widget-dropdown z-[9999] {inTitleBar ? 'relative shrink-0' : 'relative'}">
	<button
		bind:this={buttonEl}
		onclick={toggleDropdown}
		class="dropdown-trigger z-[9999] flex items-center justify-center rounded-lg border transition-opacity {darkMode
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

	{#if isOpen && buttonRect}
		<div
			bind:this={dropdownEl}
			class="dropdown-menu animate-in w-64 rounded-xl border py-2 shadow-2xl {darkMode
				? 'border-slate-700/80 bg-[#2d2d30]'
				: 'border-slate-200 bg-white'}"
			style={dropdownStyle}
		>
			{#each menuItems as item}
				{#if 'divider' in item && item.divider}
					<div
						class="mx-2 my-2 border-t {darkMode ? 'border-slate-600/60' : 'border-slate-200'}"
					></div>
				{:else if 'action' in item}
					<button
						type="button"
						onclick={(e) => handleAction(item.action, e)}
						class="menu-item mx-1 flex w-[calc(100%-0.5rem)] items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors {darkMode
							? item.danger
								? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
								: 'text-slate-100 hover:bg-slate-600/50'
							: item.danger
								? 'text-red-600 hover:bg-red-50'
								: 'text-slate-800 hover:bg-slate-100'}"
					>
						<svg
							class="menu-icon mt-0.5 h-[18px] w-[18px] flex-shrink-0 {darkMode
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
</div>

<style>
	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-in {
		animation: slideDown 0.2s ease-out;
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
