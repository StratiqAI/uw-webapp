<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import type { Widget, WidgetAction } from '$lib/dashboard/types/widget';

	interface Props {
		widget: Widget;
		darkMode?: boolean;
		onAction: (action: WidgetAction) => void;
	}

	let { widget, darkMode = false, onAction }: Props = $props();

	let isOpen = $state(false);
	let dropdownEl = $state<HTMLElement>();
	let buttonEl = $state<HTMLElement>();
	let portalTarget: HTMLElement;
	let buttonRect = $state<DOMRect | null>(null);

	// Create portal target on mount
	onMount(() => {
		// Create a portal container if it doesn't exist
		let portal = document.getElementById('dropdown-portal');
		if (!portal) {
			portal = document.createElement('div');
			portal.id = 'dropdown-portal';
			portal.style.position = 'fixed';
			portal.style.top = '0';
			portal.style.left = '0';
			portal.style.width = '0';
			portal.style.height = '0';
			portal.style.zIndex = '10000';
			document.body.appendChild(portal);
		}
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

		// Clean up portal content when component is destroyed
		if (portalTarget && dropdownEl && portalTarget.contains(dropdownEl)) {
			portalTarget.removeChild(dropdownEl);
		}
	});

	// Update button position when dropdown opens
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

	// Close dropdown when clicking outside
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

			// Move dropdown to portal
			if (portalTarget && dropdownEl) {
				portalTarget.appendChild(dropdownEl);
			}
		} else {
			// Clean up portal
			if (portalTarget && dropdownEl && portalTarget.contains(dropdownEl)) {
				portalTarget.removeChild(dropdownEl);
			}
		}
	}

	function handleAction(action: WidgetAction, event: MouseEvent) {
		event.stopPropagation();
		onAction(action);
		isOpen = false;

		// Clean up portal
		if (portalTarget && dropdownEl && portalTarget.contains(dropdownEl)) {
			portalTarget.removeChild(dropdownEl);
		}
	}

	// Widget-specific menu items
	const getMenuItems = (
		widget: Widget
	): Array<{ action: WidgetAction; label: string; icon: string; divider?: boolean }> => {
		const items = [];

		// Configure item at the top
		items.push({
			action: 'configure' as WidgetAction,
			label: 'Configure',
			icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
		});

		items.push({ divider: true } as any);

		// Common items for all widgets
		items.push({
			action: 'customInstructions' as WidgetAction,
			label: 'AI Agent',
			icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
		});

		items.push({
			action: 'duplicate' as WidgetAction,
			label: 'Duplicate',
			icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
		});

		// Lock/Unlock
		if (widget.locked) {
			items.push({
				action: 'unlock' as WidgetAction,
				label: 'Unlock',
				icon: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z'
			});
		} else {
			items.push({
				action: 'lock' as WidgetAction,
				label: 'Lock Position',
				icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
			});
		}

		items.push({ divider: true } as any);

		// Widget-specific items
		if (widget.type === 'table' || widget.type === 'lineChart' || widget.type === 'barChart') {
			items.push({
				action: 'exportData' as WidgetAction,
				label: 'Export Data',
				icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
			});

			items.push({
				action: 'refresh' as WidgetAction,
				label: 'Refresh Data',
				icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
			});
		}

		// Settings for all widgets
		items.push({
			action: 'settings' as WidgetAction,
			label: 'Settings',
			icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
		});

		items.push({ divider: true } as any);

		// Remove (always last)
		items.push({
			action: 'remove' as WidgetAction,
			label: 'Remove Widget',
			icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
		});

		return items;
	};

	let menuItems = $derived(getMenuItems(widget));

	// Calculate dropdown position
	let dropdownStyle = $derived(
		buttonRect
			? `
      position: fixed;
      top: ${buttonRect.top + buttonRect.height + 8}px;
      left: ${Math.min(buttonRect.left - 148 + buttonRect.width, window.innerWidth - 200)}px;
      z-index: 10000;
    `
			: ''
	);
</script>

<div class="widget-dropdown relative z-[9999]">
	<!-- Dropdown Button -->
	<button
		bind:this={buttonEl}
		onclick={toggleDropdown}
		class="dropdown-button absolute right-2 top-2 z-[9999] rounded-md border {darkMode ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800' : 'border-slate-200 bg-white/80 hover:bg-white'} p-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
		aria-label="Widget menu"
		aria-expanded={isOpen}
	>
		<img src="/images/icons/robot2.png" alt="Robot" class="h-8 w-8" />
	</button>

	<!-- Dropdown Menu (rendered conditionally) -->
	{#if isOpen && buttonRect}
		<div
			bind:this={dropdownEl}
			class="dropdown-menu animate-in w-48 rounded-lg border {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} py-1 shadow-xl"
			style={dropdownStyle}
		>
			{#each menuItems as item}
				{#if item.divider}
					<div class="my-1 border-t {darkMode ? 'border-slate-700' : 'border-slate-200'}"></div>
				{:else}
					<button
						onclick={(e) => handleAction(item.action, e)}
						class="menu-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm {darkMode ? 'text-slate-200 hover:bg-slate-700 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'} {item.action ===
						'remove'
							? darkMode ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300' : 'text-red-600 hover:bg-red-50 hover:text-red-700'
							: ''}"
					>
						<svg
							class="h-4 w-4 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}
							></path>
						</svg>
						<span>{item.label}</span>
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
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-in {
		animation: slideDown 0.2s ease-out;
	}

	.dropdown-button:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.dropdown-menu {
		box-shadow:
			0 10px 25px rgba(0, 0, 0, 0.1),
			0 6px 10px rgba(0, 0, 0, 0.08);
	}
</style>
