<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import type { Widget } from '../types/widget';
	import { findAvailablePosition } from '../utils/grid';

	import { getRegisteredManifests } from '$lib/dashboard/setup/widgetRegistry';
	import { getDefaultDataForWidget, getDefaultSizeForWidget } from '$lib/dashboard/setup/defaultDashboardValues';
	import { generateWidgetId } from '$lib/dashboard/utils/idGenerator';
	import type { DashboardTabId } from '$lib/dashboard/types/dashboardTabs';
	import { themeStore, type AppTheme } from '$lib/stores/themeStore.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import AddWidgetDialog from '$lib/dashboard/components/AddWidgetDialog.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';

	interface Props {
		onProjectChange?: (projectId: string | null) => void;
		showAddWidgetDialog?: boolean;
	}

	let {
		onProjectChange,
		showAddWidgetDialog = $bindable(false)
	}: Props = $props();

	const darkMode = $derived(themeStore.darkMode);
	const currentTheme = $derived(themeStore.theme);

	let showExportDialog = $state(false);
	let showImportDialog = $state(false);
	let exportedJson = $state('');
	let importJson = $state('');
	let importError = $state('');
	let renamingTabId = $state<DashboardTabId | null>(null);
	let renameValue = $state('');
	let showDeleteConfirm = $state<DashboardTabId | null>(null);
	let showClearConfirm = $state(false);

	const widgetCount = $derived(dashboard.widgets.length);
	const allWidgetsLocked = $derived(dashboard.allWidgetsLocked);

	function selectTab(id: DashboardTabId) {
		if (renamingTabId) return;
		dashboard.switchTab(id);
	}

	function handleAddTab() {
		const label = `Dashboard ${dashboard.tabOrder.length + 1}`;
		dashboard.addTab(label);
	}

	function handleDeleteTab(id: DashboardTabId) {
		if (dashboard.tabOrder.length <= 1) return;
		showDeleteConfirm = id;
	}

	function confirmDeleteTab() {
		if (showDeleteConfirm) {
			dashboard.removeTab(showDeleteConfirm);
			showDeleteConfirm = null;
		}
	}

	function startRename(id: DashboardTabId, currentLabel: string) {
		renamingTabId = id;
		renameValue = currentLabel;
	}

	function commitRename() {
		if (renamingTabId && renameValue.trim()) {
			dashboard.renameTab(renamingTabId, renameValue.trim());
		}
		renamingTabId = null;
		renameValue = '';
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitRename();
		if (e.key === 'Escape') { renamingTabId = null; renameValue = ''; }
	}

	function selectTabFromMenu(id: DashboardTabId) {
		selectTab(id);
		tabSwitcherOpen = false;
	}

	// When the tab strip would need a horizontal scrollbar, use a project-switcher-style dropdown instead.
	let compactTabs = $state(false);
	let tabStripOuterEl = $state<HTMLDivElement | null>(null);
	let tabScrollEl = $state<HTMLDivElement | null>(null);
	let tabMeasureEl = $state<HTMLDivElement | null>(null);
	let tabSwitcherOpen = $state(false);
	let tabSwitcherTriggerEl = $state<HTMLButtonElement | null>(null);
	/** Viewport position for fixed panel (parent tabs slot uses overflow-x-auto, which clips absolute dropdowns). */
	let tabSwitcherPanelPos = $state<{ top: number; left: number } | null>(null);

	const TAB_SWITCHER_PANEL_W = 256; // w-64

	const activeTabLabel = $derived(
		dashboard.tabOrder.find((t) => t.id === dashboard.activeTabId)?.label ?? 'Dashboard'
	);

	function handleTabSwitcherClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (
			target.closest('.dashboard-tab-switcher') ||
			target.closest('.dashboard-tab-switcher-panel')
		) {
			return;
		}
		tabSwitcherOpen = false;
	}

	$effect(() => {
		if (tabSwitcherOpen) {
			document.addEventListener('click', handleTabSwitcherClickOutside);
			return () => {
				document.removeEventListener('click', handleTabSwitcherClickOutside);
			};
		}
	});

	function placeTabSwitcherPanel() {
		const el = tabSwitcherTriggerEl;
		if (!el) return;
		const r = el.getBoundingClientRect();
		let left = r.left;
		const maxLeft = window.innerWidth - TAB_SWITCHER_PANEL_W - 8;
		if (left > maxLeft) left = Math.max(8, maxLeft);
		if (left < 8) left = 8;
		tabSwitcherPanelPos = { top: r.bottom + 8, left };
	}

	$effect(() => {
		if (!tabSwitcherOpen) {
			tabSwitcherPanelPos = null;
			return;
		}

		function onViewportChange() {
			placeTabSwitcherPanel();
		}

		void tick().then(() => {
			placeTabSwitcherPanel();
			requestAnimationFrame(() => placeTabSwitcherPanel());
		});

		window.addEventListener('resize', onViewportChange);
		window.addEventListener('scroll', onViewportChange, true);

		return () => {
			window.removeEventListener('resize', onViewportChange);
			window.removeEventListener('scroll', onViewportChange, true);
		};
	});

	$effect(() => {
		const outer = tabStripOuterEl;
		const scroll = tabScrollEl;
		const measure = tabMeasureEl;
		if (!outer) return;

		const check = () => {
			if (!compactTabs && scroll && scroll.scrollWidth > scroll.clientWidth + 1) {
				compactTabs = true;
			} else if (compactTabs && measure && measure.offsetWidth <= outer.clientWidth - 6) {
				compactTabs = false;
			}
		};

		const ro = new ResizeObserver(check);

		ro.observe(outer);
		if (scroll) ro.observe(scroll);
		if (measure) ro.observe(measure);

		untrack(check);

		return () => ro.disconnect();
	});

	// Re-check overflow when tab set / labels change (ResizeObserver may not fire for text-only reflow).
	$effect(() => {
		dashboard.tabOrder;
		dashboard.activeTabId;
		renamingTabId;
		queueMicrotask(() => {
			const scroll = tabScrollEl;
			const outer = tabStripOuterEl;
			const measure = tabMeasureEl;
			untrack(() => {
				const shouldCompact = !!(scroll && scroll.scrollWidth > scroll.clientWidth + 1);
				const canExpand = !!(outer && measure && measure.offsetWidth <= outer.clientWidth - 6);
				if (!compactTabs && shouldCompact) {
					compactTabs = true;
				} else if (compactTabs && canExpand) {
					compactTabs = false;
				}
			});
		});
	});

	// ── Dashboard actions ──────────────────────────────────────────
	let isPushingToCloud = $state(false);
	let isReloadingFromCloud = $state(false);

	function handleSave() {
		const success = dashboard.save();
		if (success) {
			toastStore.success('Dashboard saved successfully.');
		} else {
			toastStore.error('Failed to save dashboard. Please check browser settings.');
		}
	}

	async function handlePushToCloud() {
		if (isPushingToCloud) return;
		isPushingToCloud = true;
		try {
			const success = await dashboard.syncToCloud();
			if (success) {
				toastStore.success('Dashboard saved to the cloud.');
			} else {
				toastStore.error('Could not save to the cloud. Check your connection.');
			}
		} catch {
			toastStore.error('Cloud save failed unexpectedly.');
		} finally {
			isPushingToCloud = false;
		}
	}

	async function handleReloadFromCloud() {
		if (isReloadingFromCloud || isPushingToCloud) return;
		isReloadingFromCloud = true;
		try {
			const hadCloudLayout = await dashboard.reloadFromCloud();
			if (hadCloudLayout) {
				toastStore.success('Local cache cleared; loaded dashboard from the cloud.');
			} else {
				toastStore.info(
					'Local cache cleared. No cloud layout for this project yet — showing an empty dashboard.'
				);
			}
		} catch {
			toastStore.error('Could not reload from the cloud.');
		} finally {
			isReloadingFromCloud = false;
		}
	}

	function handleClear() {
		showClearConfirm = true;
	}

	function confirmClearLayout() {
		dashboard.resetToDefault();
	}

	function handleExport() {
		const json = dashboard.exportDashboard();
		if (json) {
			exportedJson = json;
			showExportDialog = true;
		} else {
			toastStore.error('Failed to export dashboard.');
		}
	}

	function handleImport() {
		importError = '';
		const success = dashboard.importDashboard(importJson);
		if (success) {
			showImportDialog = false;
			importJson = '';
			toastStore.success('Dashboard imported successfully.');
		} else {
			importError = 'Invalid dashboard configuration. Please check the JSON format.';
		}
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(exportedJson).then(() => {
			toastStore.success('Dashboard configuration copied to clipboard.');
		});
	}

	function downloadJson() {
		const blob = new Blob([exportedJson], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── Widget creation ────────────────────────────────────────────
	function createDefaultWidget(type: string): Widget | null {
		const widgetId = generateWidgetId();
		const config = dashboard.config;
		const size = getDefaultSizeForWidget(type);
		const data = getDefaultDataForWidget({ type, id: widgetId } as Widget);

		const position = findAvailablePosition(
			size.colSpan,
			size.rowSpan,
			config.gridColumns,
			config.gridRows,
			dashboard.widgets
		);

		if (!position) {
			toastStore.info(
				'No available space for this widget. Try removing some widgets or expanding the grid.'
			);
			return null;
		}

		return {
			id: widgetId,
			type,
			gridColumn: position.gridColumn,
			gridRow: position.gridRow,
			colSpan: size.colSpan,
			rowSpan: size.rowSpan,
			minWidth: 1,
			minHeight: 1,
			data
		} as Widget;
	}

	function handleAddWidget(type: string) {
		const widget = createDefaultWidget(type);
		if (widget) {
			const success = dashboard.addWidget(widget);
			if (success) {
				showAddWidgetDialog = false;
			} else {
				toastStore.error('Failed to add widget. Please try again.');
			}
		}
	}

	const widgetTypes = $derived.by(() => {
		return getRegisteredManifests().map(m => {
			const pal = (m as unknown as { palette?: { icon?: string; category?: string } }).palette;
			return {
				type: m.kind,
				label: m.displayName,
				icon: pal?.icon ?? '🧩',
				category: pal?.category ?? 'other'
			};
		});
	});
</script>

<TopBar
	pageTitle="Dashboard"
	{onProjectChange}
>
	{#snippet tabs()}
		<div
			bind:this={tabStripOuterEl}
			class="relative flex w-full max-w-full min-w-0 flex-1 items-center gap-1"
			role="presentation"
		>
			{#if compactTabs}
				<!-- Trigger stays in flow; panel is fixed so UnifiedTopBar overflow-x-auto does not clip it. -->
				<div class="dashboard-tab-switcher shrink-0">
					<button
						type="button"
						bind:this={tabSwitcherTriggerEl}
						onclick={() => (tabSwitcherOpen = !tabSwitcherOpen)}
						class="flex items-center gap-2 px-3 py-2 {darkMode
							? 'bg-slate-700 hover:bg-slate-600 text-white'
							: 'bg-slate-100 hover:bg-slate-200 text-slate-900'} rounded-lg transition-colors text-sm font-medium"
						aria-label="Select dashboard tab"
						aria-expanded={tabSwitcherOpen}
						title="Switch dashboard tab — add, rename, or remove from the list"
					>
						<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
							/>
						</svg>
						<span class="max-w-[200px] truncate">{activeTabLabel}</span>
						<svg
							class="w-4 h-4 shrink-0 transition-transform {tabSwitcherOpen ? 'rotate-180' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>

				{#if tabSwitcherOpen && tabSwitcherPanelPos}
					<div
						class="dashboard-tab-switcher-panel fixed z-200 w-64 {darkMode
							? 'bg-slate-800 border-slate-700'
							: 'bg-white border-slate-200'} border rounded-lg shadow-xl max-h-96 overflow-y-auto"
						style="top: {tabSwitcherPanelPos.top}px; left: {tabSwitcherPanelPos.left}px;"
						role="menu"
					>
							<div class="p-2">
								{#each dashboard.tabOrder as tab (tab.id)}
									{#if renamingTabId === tab.id}
										<div class="px-1 py-0.5">
											<!-- svelte-ignore a11y_autofocus -->
											<input
												type="text"
												bind:value={renameValue}
												onblur={commitRename}
												onkeydown={handleRenameKeydown}
												title="Rename tab — Enter to save, Esc to cancel"
												aria-label="Rename dashboard tab"
												class="w-full rounded-md border px-3 py-2 text-sm outline-none
													{darkMode ? 'border-indigo-500 bg-slate-700 text-white' : 'border-indigo-400 bg-white text-slate-900'}"
												autofocus
											/>
										</div>
									{:else}
										<div class="flex items-stretch gap-0.5">
											<button
												type="button"
												class="min-w-0 flex-1 text-left rounded-md text-sm transition-colors px-3 py-2
													{darkMode
														? dashboard.activeTabId === tab.id
															? 'bg-indigo-900 text-indigo-300'
															: 'text-slate-300 hover:bg-slate-700'
														: dashboard.activeTabId === tab.id
															? 'bg-indigo-100 text-indigo-700'
															: 'text-slate-700 hover:bg-slate-100'}"
												onclick={() => selectTabFromMenu(tab.id)}
												title="Switch to this tab"
											>
												<div class="flex items-center gap-2">
													<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
														/>
													</svg>
													<span class="truncate">{tab.label}</span>
													{#if dashboard.activeTabId === tab.id}
														<svg
															class="w-4 h-4 ml-auto shrink-0 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M5 13l4 4L19 7"
															/>
														</svg>
													{/if}
												</div>
											</button>
											<button
												type="button"
												class="shrink-0 self-center rounded-md p-2 transition-colors
													{darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}"
												onclick={(e: MouseEvent) => {
													e.stopPropagation();
													startRename(tab.id, tab.label);
												}}
												title="Rename tab"
												aria-label="Rename tab"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
													/>
												</svg>
											</button>
											{#if dashboard.tabOrder.length > 1}
												<button
													type="button"
													class="shrink-0 self-center rounded-md p-2 transition-colors
														{darkMode ? 'text-slate-400 hover:bg-red-900/30 hover:text-red-300' : 'text-slate-500 hover:bg-red-50 hover:text-red-700'}"
													onclick={(e: MouseEvent) => {
														e.stopPropagation();
														tabSwitcherOpen = false;
														handleDeleteTab(tab.id);
													}}
													title="Remove this dashboard tab"
													aria-label="Remove this dashboard tab"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											{/if}
										</div>
									{/if}
								{/each}

								<div class="h-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'} my-2"></div>
								<button
									type="button"
									class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors {darkMode
										? 'text-indigo-400 hover:bg-slate-700'
										: 'text-indigo-600 hover:bg-slate-100'}"
									onclick={() => {
										tabSwitcherOpen = false;
										handleAddTab();
									}}
									title="Add a new dashboard tab"
									aria-label="Add a new dashboard tab"
								>
									<div class="flex items-center gap-2">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										<span>Add dashboard tab</span>
									</div>
								</button>
							</div>
					</div>
				{/if}
			{:else}
			<div
				bind:this={tabScrollEl}
				class="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-gutter:stable]"
				role="tablist"
				aria-label="Dashboard views"
			>
					{#each dashboard.tabOrder as tab (tab.id)}
						{#if renamingTabId === tab.id}
							<!-- svelte-ignore a11y_autofocus -->
							<input
								type="text"
								bind:value={renameValue}
								onblur={commitRename}
								onkeydown={handleRenameKeydown}
								title="Rename tab — Enter to save, Esc to cancel"
								aria-label="Rename dashboard tab"
								class="w-24 rounded-md border px-2 py-0.5 text-[13px] font-medium outline-none
									{darkMode ? 'bg-slate-700 border-indigo-500 text-white' : 'bg-white border-indigo-400 text-slate-900'}"
								autofocus
							/>
						{:else}
							<button
								type="button"
								role="tab"
								aria-selected={dashboard.activeTabId === tab.id}
								class="group relative flex items-center gap-1 rounded-md px-2.5 py-1 text-[13px] font-medium transition-all duration-150 whitespace-nowrap
									{dashboard.activeTabId === tab.id
										? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-900/40'
										: darkMode
											? 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
											: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}"
								onclick={() => selectTab(tab.id)}
								ondblclick={() => startRename(tab.id, tab.label)}
								title="Switch to this tab — double-click to rename"
							>
								{tab.label}
								{#if dashboard.tabOrder.length > 1}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<span
										role="button"
										tabindex="-1"
									class="ml-0.5 inline-flex rounded-sm p-0.5 opacity-40 transition-opacity hover:opacity-100
										{dashboard.activeTabId === tab.id
											? 'hover:bg-indigo-700/80'
											: darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}"
										onclick={(e: MouseEvent) => {
											e.stopPropagation();
											handleDeleteTab(tab.id);
										}}
										title="Remove this dashboard tab"
										aria-label="Remove this dashboard tab"
									>
										<svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
											<path d="M6 18L18 6M6 6l12 12" />
										</svg>
									</span>
								{/if}
							</button>
						{/if}
					{/each}
				</div>
			{/if}

			{#if !compactTabs}
				<button
					type="button"
					class="shrink-0 rounded-md p-1 transition-colors
						{darkMode ? 'text-slate-500 hover:bg-slate-700/60 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}"
					onclick={handleAddTab}
					title="Add a new dashboard tab"
					aria-label="Add a new dashboard tab"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<path d="M12 5v14m-7-7h14" />
					</svg>
				</button>
			{/if}

			<!-- Off-screen width probe: full tab strip + add control (must match gap-1 layout above). -->
			<div
				bind:this={tabMeasureEl}
				class="pointer-events-none fixed top-0 -left-[10000px] z-0 flex w-max items-center gap-1"
				aria-hidden="true"
			>
				<div class="flex items-center gap-0.5">
					{#each dashboard.tabOrder as tab (tab.id)}
						<span
							class="rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap
								{darkMode ? 'text-slate-400' : 'text-slate-500'}"
						>
							{tab.label}
						</span>
					{/each}
				</div>
				<span class="rounded-md p-1 {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<path d="M12 5v14m-7-7h14" />
					</svg>
				</span>
			</div>
		</div>
	{/snippet}

	{#snippet actions()}
		<button
			type="button"
			onclick={() => (showAddWidgetDialog = true)}
			title="Add a widget to the current tab"
			aria-label="Add a widget to the current tab"
			class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[13px] font-semibold transition-all duration-150
				bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white
				shadow-md shadow-indigo-900/40 hover:shadow-lg hover:shadow-indigo-900/50 hover:-translate-y-px"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
			Widget
		</button>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<button
			type="button"
			onclick={() => dashboard.undo()}
			disabled={!dashboard.canUndo}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} disabled:opacity-30 disabled:pointer-events-none"
			title="Undo last layout change (Ctrl+Z)"
			aria-label="Undo last layout change"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/>
			</svg>
		</button>

		<button
			type="button"
			onclick={() => dashboard.redo()}
			disabled={!dashboard.canRedo}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} disabled:opacity-30 disabled:pointer-events-none"
			title="Redo layout change (Ctrl+Shift+Z)"
			aria-label="Redo layout change"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"/>
			</svg>
		</button>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<button
			type="button"
			onclick={handlePushToCloud}
			disabled={dashboard.cloudSyncStatus === 'unavailable' || isPushingToCloud || isReloadingFromCloud}
			class="relative rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} disabled:opacity-30 disabled:pointer-events-none"
			title={dashboard.cloudSyncStatus === 'unavailable'
				? 'Push to cloud unavailable (no project or connection)'
				: isPushingToCloud
					? 'Saving to cloud…'
					: dashboard.cloudSyncStatus === 'synced'
						? 'Push current dashboard to the cloud now'
						: dashboard.cloudSyncStatus === 'error'
							? 'Last cloud save failed — click to retry'
							: 'Push current dashboard to the cloud'}
			aria-label="Export dashboard layout to cloud"
		>
			{#if isPushingToCloud}
				<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
			{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12"/>
				</svg>
			{/if}
			{#if dashboard.cloudSyncStatus === 'synced' && !isPushingToCloud}
				<span class="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full bg-emerald-400 ring-1 {darkMode ? 'ring-slate-800' : 'ring-white'}"></span>
			{:else if dashboard.cloudSyncStatus === 'error' && !isPushingToCloud}
				<span class="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full bg-red-400 ring-1 {darkMode ? 'ring-slate-800' : 'ring-white'}"></span>
			{/if}
		</button>

		<button
			type="button"
			onclick={handleReloadFromCloud}
			disabled={dashboard.cloudSyncStatus === 'unavailable' || isReloadingFromCloud || isPushingToCloud}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} disabled:opacity-30 disabled:pointer-events-none"
			title={dashboard.cloudSyncStatus === 'unavailable'
				? 'Import from cloud unavailable (no project or connection)'
				: isReloadingFromCloud
					? 'Importing from cloud…'
					: 'Clear local cache and import the latest layout from the cloud'}
			aria-label="Import dashboard layout from cloud"
		>
			{#if isReloadingFromCloud}
				<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
			{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
				</svg>
			{/if}
		</button>

		<button
			type="button"
			onclick={handleClear}
			disabled={widgetCount === 0}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} disabled:opacity-30 disabled:pointer-events-none"
			title="Clear all widgets from the current tab"
			aria-label="Clear dashboard"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
			</svg>
		</button>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<div
			class="flex items-center rounded-lg p-0.5 gap-0.5 shrink-0 {darkMode
				? 'bg-slate-800/80 border border-slate-700/60'
				: currentTheme === 'warm'
					? 'bg-[#2d2010]/10 border border-[#c8a870]/30'
					: 'bg-slate-100 border border-slate-200/80'}"
			role="group"
			aria-label="Widget lock mode"
		>
			<button
				type="button"
				disabled={widgetCount === 0}
				title="Lock all widgets — prevent moving and resizing"
				aria-label="Lock all widgets"
				aria-pressed={allWidgetsLocked}
				onclick={() => dashboard.setAllWidgetsLocked(true)}
				class="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all duration-150 disabled:opacity-35 disabled:pointer-events-none
					{allWidgetsLocked
						? darkMode
							? 'bg-slate-700 shadow-sm text-amber-300'
							: currentTheme === 'warm'
								? 'bg-[#f5f0e5] text-[#5a4530] shadow-sm'
								: 'bg-white text-slate-800 shadow-sm'
						: darkMode
							? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
							: currentTheme === 'warm'
								? 'text-[#c8a870]/80 hover:text-[#3a2e1c] hover:bg-white/15'
								: 'text-slate-500 hover:text-slate-800 hover:bg-white'}"
			>
				<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
				</svg>
				<span class="hidden sm:inline whitespace-nowrap">Lock all widgets</span>
			</button>
			<button
				type="button"
				disabled={widgetCount === 0}
				title="Unlock all widgets — allow moving and resizing"
				aria-label="Unlock all widgets"
				aria-pressed={widgetCount > 0 && !allWidgetsLocked}
				onclick={() => dashboard.setAllWidgetsLocked(false)}
				class="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all duration-150 disabled:opacity-35 disabled:pointer-events-none
					{widgetCount > 0 && !allWidgetsLocked
						? darkMode
							? 'bg-slate-700 shadow-sm text-emerald-400'
							: currentTheme === 'warm'
								? 'bg-[#f5f0e5] text-[#2d5018] shadow-sm'
								: 'bg-white text-emerald-700 shadow-sm'
						: darkMode
							? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
							: currentTheme === 'warm'
								? 'text-[#c8a870]/80 hover:text-[#3a2e1c] hover:bg-white/15'
								: 'text-slate-500 hover:text-slate-800 hover:bg-white'}"
			>
				<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
				</svg>
				<span class="hidden sm:inline whitespace-nowrap">Unlock all widgets</span>
			</button>
		</div>
	{/snippet}
</TopBar>

<!-- ═══════════════════ DIALOGS ═══════════════════ -->

<ConfirmModal
	bind:open={showClearConfirm}
	title="Clear dashboard?"
	message="This will remove all widgets from the current tab."
	confirmLabel="Clear"
	cancelLabel="Cancel"
	{darkMode}
	onConfirm={confirmClearLayout}
/>

<!-- Export Dialog -->
{#if showExportDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 shadow-2xl">
			<h3 class="mb-4 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Export Dashboard</h3>
			<div class="mb-4 flex-1 overflow-auto">
				<textarea readonly value={exportedJson} class="h-64 w-full rounded-lg border {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50 text-slate-900 border-slate-300'} p-3 font-mono text-xs"></textarea>
			</div>
			<div class="flex justify-end gap-2">
				<button onclick={copyToClipboard} class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-sm">Copy</button>
				<button onclick={downloadJson} class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'} rounded-md transition-colors shadow-sm">Download</button>
				<button onclick={() => (showExportDialog = false)} class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors">Close</button>
			</div>
		</div>
	</div>
{/if}

<!-- Import Dialog -->
{#if showImportDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-2xl rounded-xl {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 shadow-2xl">
			<h3 class="mb-4 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Import Dashboard</h3>
			<div class="mb-4">
				<textarea
					bind:value={importJson}
					placeholder="Paste your dashboard JSON configuration here..."
					class="h-64 w-full rounded-lg border {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400' : 'bg-slate-50 text-slate-900 border-slate-300 placeholder-slate-500'} p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
				></textarea>
			</div>
			{#if importError}
				<p class="mb-4 text-sm {darkMode ? 'text-red-400' : 'text-red-600'}">{importError}</p>
			{/if}
			<div class="flex justify-end gap-2">
				<button onclick={handleImport} disabled={!importJson.trim()} class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50">Import</button>
				<button onclick={() => { showImportDialog = false; importJson = ''; importError = ''; }} class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors">Cancel</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Tab Confirmation -->
{#if showDeleteConfirm}
	{@const tabLabel = dashboard.tabOrder.find(t => t.id === showDeleteConfirm)?.label ?? 'this dashboard'}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-sm rounded-xl {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 shadow-2xl">
			<h3 class="mb-2 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Delete Dashboard</h3>
			<p class="mb-5 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
				Are you sure you want to delete <strong>"{tabLabel}"</strong>? All widgets on this dashboard will be removed.
			</p>
			<div class="flex justify-end gap-2">
				<button onclick={() => (showDeleteConfirm = null)} class="px-4 py-2 text-sm font-medium rounded-md transition-colors {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}">Cancel</button>
				<button onclick={confirmDeleteTab} class="px-4 py-2 text-sm font-medium rounded-md bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors">Delete</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Widget Dialog -->
<AddWidgetDialog
	bind:open={showAddWidgetDialog}
	{darkMode}
	{widgetTypes}
	onAddWidget={handleAddWidget}
/>
