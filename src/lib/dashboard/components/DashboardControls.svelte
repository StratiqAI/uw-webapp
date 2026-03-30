<script lang="ts">
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import type { Widget, WidgetType } from '../types/widget';
	import { findAvailablePosition } from '../utils/grid';
	import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';
	import type { DashboardTabId } from '$lib/dashboard/types/dashboardTabs';
	import type { Project } from '@stratiqai/types-simple';
	import type { AppTheme } from '$lib/stores/themeStore.svelte';
	import ProjectSwitcher from './ProjectSwitcher.svelte';
	import ConfirmModal from '$lib/components/Dialog/ConfirmModal.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';

	interface Props {
		darkMode?: boolean;
		currentTheme?: AppTheme;
		defaultWidgets?: Widget[];
		projects?: Project[];
		selectedProjectId?: string | null;
		onProjectChange?: (projectId: string | null) => void;
	}

	let {
		darkMode = false,
		currentTheme = 'dark',
		defaultWidgets,
		projects = [],
		selectedProjectId = null,
		onProjectChange
	}: Props = $props();

	let showExportDialog = $state(false);
	let showImportDialog = $state(false);
	let showAddWidgetDialog = $state(false);
	let exportedJson = $state('');
	let importJson = $state('');
	let importError = $state('');
	let renamingTabId = $state<DashboardTabId | null>(null);
	let renameValue = $state('');
	let showDeleteConfirm = $state<DashboardTabId | null>(null);
	let showResetConfirm = $state(false);

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

	// ── Dashboard actions ──────────────────────────────────────────
	function handleSave() {
		const success = dashboard.save();
		if (success) {
			toastStore.success('Dashboard saved successfully.');
		} else {
			toastStore.error('Failed to save dashboard. Please check browser settings.');
		}
	}

	function handleReset() {
		showResetConfirm = true;
	}

	function confirmResetLayout() {
		dashboard.resetToDefault(defaultWidgets);
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
	function generateWidgetId(): string {
		return `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	function createDefaultWidget(type: WidgetType): Widget | null {
		const widgetId = generateWidgetId();
		const config = dashboard.config;

		const defaultSizes: Record<WidgetType, { colSpan: number; rowSpan: number }> = {
			title: { colSpan: 12, rowSpan: 1 },
			metric: { colSpan: 2, rowSpan: 1 },
			paragraph: { colSpan: 6, rowSpan: 2 },
			table: { colSpan: 6, rowSpan: 4 },
			image: { colSpan: 6, rowSpan: 4 },
			map: { colSpan: 8, rowSpan: 4 },
			lineChart: { colSpan: 6, rowSpan: 3 },
			barChart: { colSpan: 6, rowSpan: 3 },
			donutChart: { colSpan: 4, rowSpan: 3 },
			areaChart: { colSpan: 6, rowSpan: 3 },
			gauge: { colSpan: 3, rowSpan: 2 },
			sparkline: { colSpan: 4, rowSpan: 1 },
			heatmap: { colSpan: 6, rowSpan: 4 },
			divergingBarChart: { colSpan: 6, rowSpan: 3 },
			schema: { colSpan: 6, rowSpan: 3 },
			locationQuotient: { colSpan: 12, rowSpan: 4 },
			jsonViewer: { colSpan: 6, rowSpan: 3 },
			brokerCard: { colSpan: 3, rowSpan: 2 },
			lqAnalysis: { colSpan: 12, rowSpan: 4 },
			proFormaRevenue: { colSpan: 12, rowSpan: 3 },
			proFormaOpEx: { colSpan: 12, rowSpan: 3 },
			proFormaNoi: { colSpan: 12, rowSpan: 2 },
			proFormaUnleveredCf: { colSpan: 12, rowSpan: 3 },
			proFormaLeveredCf: { colSpan: 12, rowSpan: 3 },
			proFormaUnleveredReturns: { colSpan: 12, rowSpan: 2 },
			proFormaLeveredReturns: { colSpan: 12, rowSpan: 2 }
		};

		const { colSpan, rowSpan } = defaultSizes[type];

		const position = findAvailablePosition(
			colSpan,
			rowSpan,
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

		const baseWidget = {
			id: widgetId,
			gridColumn: position.gridColumn,
			gridRow: position.gridRow,
			colSpan,
			rowSpan,
			minWidth: 1,
			minHeight: 1
		};

		switch (type) {
			case 'title':
				return { ...baseWidget, type: 'title', data: { title: 'New Title', subtitle: 'Subtitle text', alignment: 'center' } } as Widget;
			case 'metric':
				return { ...baseWidget, type: 'metric', data: { label: 'METRIC', value: '0' } } as Widget;
			case 'paragraph':
				return { ...baseWidget, type: 'paragraph', data: { title: 'New Paragraph', content: 'Enter your content here...', markdown: false } } as Widget;
			case 'table':
				return { ...baseWidget, type: 'table', data: { title: 'New Table', headers: ['Column 1', 'Column 2'], rows: [{ 'Column 1': 'Row 1', 'Column 2': 'Data' }, { 'Column 1': 'Row 2', 'Column 2': 'Data' }], sortable: true, paginated: false } } as Widget;
			case 'image':
				return { ...baseWidget, type: 'image', data: { title: 'New Image', src: 'https://via.placeholder.com/800x600', alt: 'Placeholder image', objectFit: 'cover' } } as Widget;
			case 'map':
				return { ...baseWidget, type: 'map', data: { title: 'New Map', lat: 29.416775, lon: -98.406103, zoom: 15, mapType: 'leaflet', apiKey: PUBLIC_GEOAPIFY_API_KEY } } as Widget;
			case 'lineChart':
				return { ...baseWidget, type: 'lineChart', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], datasets: [{ label: 'Dataset 1', data: [10, 20, 15, 25, 30], color: '#3b82f6' }], options: { responsive: true, maintainAspectRatio: false } } } as Widget;
			case 'barChart':
				return { ...baseWidget, type: 'barChart', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], datasets: [{ label: 'Dataset 1', data: [10, 20, 15, 25, 30], backgroundColor: '#3b82f6' }], orientation: 'vertical' } } as Widget;
			case 'donutChart':
				return { ...baseWidget, type: 'donutChart', data: { labels: ['A', 'B', 'C', 'D'], values: [28, 22, 35, 15], colors: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc'], centerLabel: 'Total' } } as Widget;
			case 'areaChart':
				return { ...baseWidget, type: 'areaChart', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [{ label: 'Series 1', data: [20, 35, 45, 40, 55, 60], color: '#06b6d4' }, { label: 'Series 2', data: [10, 25, 30, 35, 40, 50], color: '#8b5cf6' }] } } as Widget;
			case 'gauge':
				return { ...baseWidget, type: 'gauge', data: { value: 65, min: 0, max: 100, label: 'Score', unit: '%', color: '#22c55e' } } as Widget;
			case 'sparkline':
				return { ...baseWidget, type: 'sparkline', data: { values: [12, 19, 15, 25, 22, 30, 28, 35], label: 'Trend', color: '#3b82f6' } } as Widget;
			case 'heatmap':
				return { ...baseWidget, type: 'heatmap', data: { rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], cols: ['AM', 'PM'], values: [[4, 6], [3, 5], [5, 7], [2, 4], [6, 8]] } } as Widget;
			case 'divergingBarChart':
				return { ...baseWidget, type: 'divergingBarChart', data: { labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'], values: [-24, -18, 12, 32, 42], positiveColor: '#3b82f6', negativeColor: '#ef4444' } } as Widget;
			case 'schema':
				return { ...baseWidget, type: 'schema', data: { schemaId: 'example-schema', data: {} } } as Widget;
			case 'locationQuotient':
				return { ...baseWidget, type: 'locationQuotient', data: { areaFips: 'C3890', year: 2025, regionLabel: 'Portland-Vancouver-Hillsboro, OR-WA', sortOrder: 'lq_desc', exportBaseThreshold: 1.08, localBandLow: 0.92, localBandHigh: 1.08 } } as Widget;
			case 'jsonViewer':
				return { ...baseWidget, type: 'jsonViewer', data: { title: null, description: null, json: {} } } as Widget;
			case 'brokerCard':
				return {
					...baseWidget,
					type: 'brokerCard',
					data: {
						title: null,
						description: null,
						fullName: 'Pete Beihea',
						company: 'Newmark',
						phone: '310-407-3830',
						email: 'pete.beihea@nmrk.com',
						initials: 'PB',
						avatarUrl: null
					}
				} as Widget;
			case 'lqAnalysis':
				return {
					...baseWidget,
					type: 'lqAnalysis',
					data: {
						city: 'Portland',
						state: 'OR',
						year: 2025,
						regionLabel: 'Portland-Vancouver-Hillsboro, OR-WA',
						sortOrder: 'lq_desc',
						exportBaseThreshold: 1.08,
						localBandLow: 0.92,
						localBandHigh: 1.08
					}
				} as Widget;
			case 'proFormaRevenue':
				return {
					...baseWidget,
					type: 'proFormaRevenue',
					data: {
						unitType: 'units',
						totalUnits: 100,
						totalSqFt: 0,
						marketRentPerUnit: 1500,
						rentGrowthRate: 0.03,
						vacancyRate: 0.05,
						otherIncomeAnnual: 24000,
						otherIncomeGrowthRate: 0.02,
						projectionYears: 5,
						propertyName: ''
					}
				} as Widget;
			case 'proFormaOpEx':
				return {
					...baseWidget,
					type: 'proFormaOpEx',
					data: {
						unitType: 'units',
						totalUnits: 100,
						totalSqFt: 0,
						egiYear1: 1734000,
						egiGrowthRate: 0.03,
						baseOperatingExpenses: 480000,
						expenseGrowthRate: 0.03,
						managementFeeRate: 0.04,
						reservePerUnit: 250,
						applyGrowthToReserves: false,
						customExpenses: [],
						projectionYears: 5,
						propertyName: ''
					}
				} as Widget;
			case 'proFormaNoi':
				return {
					...baseWidget,
					type: 'proFormaNoi',
					data: {
						egiYear1: 1734000,
						egiGrowthRate: 0.03,
						totalOpexYear1: 920000,
						opexGrowthRate: 0.03,
						projectionYears: 5,
						propertyName: '',
						showBreakdown: false
					}
				} as Widget;
			case 'proFormaUnleveredCf':
				return {
					...baseWidget,
					type: 'proFormaUnleveredCf',
					data: {
						projectionYears: 5,
						purchasePrice: 12_000_000,
						acquisitionCosts: 180_000,
						initialCapEx: 0,
						egiYear1: 1_734_000,
						egiGrowthRate: 0.03,
						totalOpexYear1: 920_000,
						opexGrowthRate: 0.03,
						terminalCapRate: 0.055,
						costOfSalePercent: 0.03,
						propertyName: ''
					}
				} as Widget;
			case 'proFormaLeveredCf':
				return {
					...baseWidget,
					type: 'proFormaLeveredCf',
					data: {
						projectionYears: 5,
						purchasePrice: 12_000_000,
						acquisitionCosts: 180_000,
						initialCapEx: 0,
						egiYear1: 1_734_000,
						egiGrowthRate: 0.03,
						totalOpexYear1: 920_000,
						opexGrowthRate: 0.03,
						terminalCapRate: 0.055,
						costOfSalePercent: 0.03,
						propertyName: '',
						loanLtv: 0.65,
						loanInterestRate: 0.065,
						amortizationYears: 30,
						interestOnly: false
					}
				} as Widget;
			case 'proFormaUnleveredReturns':
				return {
					...baseWidget,
					type: 'proFormaUnleveredReturns',
					data: {
						projectionYears: 5,
						purchasePrice: 12_000_000,
						acquisitionCosts: 180_000,
						initialCapEx: 0,
						egiYear1: 1_734_000,
						egiGrowthRate: 0.03,
						totalOpexYear1: 920_000,
						opexGrowthRate: 0.03,
						terminalCapRate: 0.055,
						costOfSalePercent: 0.03,
						propertyName: '',
						unleveredDiscountRate: 0.1
					}
				} as Widget;
			case 'proFormaLeveredReturns':
				return {
					...baseWidget,
					type: 'proFormaLeveredReturns',
					data: {
						projectionYears: 5,
						purchasePrice: 12_000_000,
						acquisitionCosts: 180_000,
						initialCapEx: 0,
						egiYear1: 1_734_000,
						egiGrowthRate: 0.03,
						totalOpexYear1: 920_000,
						opexGrowthRate: 0.03,
						terminalCapRate: 0.055,
						costOfSalePercent: 0.03,
						propertyName: '',
						loanLtv: 0.65,
						loanInterestRate: 0.065,
						amortizationYears: 30,
						interestOnly: false,
						leveredDiscountRate: 0.12
					}
				} as Widget;
			default:
				return null;
		}
	}

	function handleAddWidget(type: WidgetType) {
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

	const widgetTypes: Array<{ type: WidgetType; label: string; icon: string }> = [
		{ type: 'title', label: 'Title', icon: '📝' },
		{ type: 'metric', label: 'Metric', icon: '📊' },
		{ type: 'paragraph', label: 'Paragraph', icon: '📄' },
		{ type: 'table', label: 'Table', icon: '📋' },
		{ type: 'image', label: 'Image', icon: '🖼' },
		{ type: 'map', label: 'Map', icon: '🗺' },
		{ type: 'lineChart', label: 'Line Chart', icon: '📈' },
		{ type: 'barChart', label: 'Bar Chart', icon: '📊' },
		{ type: 'donutChart', label: 'Donut Chart', icon: '🍩' },
		{ type: 'areaChart', label: 'Area Chart', icon: '📉' },
		{ type: 'gauge', label: 'Gauge', icon: '⏱' },
		{ type: 'sparkline', label: 'Sparkline', icon: '〰' },
		{ type: 'heatmap', label: 'Heatmap', icon: '🔥' },
		{ type: 'divergingBarChart', label: 'Diverging Bar', icon: '↔' },
		{ type: 'schema', label: 'Schema Widget', icon: '📋' },
		{ type: 'locationQuotient', label: 'Location Quotient', icon: '📍' },
		{ type: 'jsonViewer', label: 'JSON Viewer', icon: '{ }' },
		{ type: 'brokerCard', label: 'Broker Card', icon: '👤' },
		{ type: 'lqAnalysis', label: 'LQ Analysis', icon: '📍' },
		{ type: 'proFormaRevenue', label: 'Pro Forma Revenue', icon: '💰' },
		{ type: 'proFormaOpEx', label: 'Pro Forma OpEx', icon: '📋' },
		{ type: 'proFormaNoi', label: 'Pro Forma NOI', icon: '📐' },
		{ type: 'proFormaUnleveredCf', label: 'Pro Forma Unlevered CF', icon: '💵' },
		{ type: 'proFormaLeveredCf', label: 'Pro Forma Levered CF', icon: '🏦' },
		{ type: 'proFormaUnleveredReturns', label: 'Pro Forma Unlevered Returns', icon: '📈' },
		{ type: 'proFormaLeveredReturns', label: 'Pro Forma Levered Returns', icon: '📊' }
	];
</script>

<!-- ═══════════════════ UNIFIED TOP BAR ═══════════════════ -->
<header
	class="dashboard-topbar flex h-12 items-center gap-3 border-b px-4 sm:px-5 {darkMode
		? 'bg-linear-to-r from-slate-900 via-slate-800/95 to-slate-900 border-slate-700/50 shadow-sm shadow-black/20'
		: 'bg-white/95 backdrop-blur-sm border-slate-200/80 shadow-sm'}"
>
	<!-- ── LEFT: Project + Tabs ──────────────────────────── -->
	<div class="flex items-center gap-2 min-w-0">
		{#if projects.length > 0 && onProjectChange}
			<ProjectSwitcher
				{projects}
				{selectedProjectId}
				{darkMode}
				onProjectChange={onProjectChange}
			/>
			<div class="h-5 w-px shrink-0 {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
		{/if}

		<div class="flex items-center gap-0.5" role="tablist" aria-label="Dashboard views">
			{#each dashboard.tabOrder as tab (tab.id)}
				{#if renamingTabId === tab.id}
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="text"
						bind:value={renameValue}
						onblur={commitRename}
						onkeydown={handleRenameKeydown}
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
						title="Click to switch, double-click to rename"
					>
						{tab.label}
						{#if dashboard.tabOrder.length > 1}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<span
								role="button"
								tabindex="-1"
								class="ml-0.5 hidden rounded-sm p-0.5 opacity-0 transition-opacity group-hover:inline-flex group-hover:opacity-70 hover:opacity-100!
									{dashboard.activeTabId === tab.id
										? 'hover:bg-indigo-700/80'
										: darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}"
								onclick={(e: MouseEvent) => { e.stopPropagation(); handleDeleteTab(tab.id); }}
								title="Delete dashboard"
							>
								<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
							</span>
						{/if}
					</button>
				{/if}
			{/each}

			<button
				type="button"
				class="rounded-md p-1 transition-colors
					{darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}"
				onclick={handleAddTab}
				title="Add dashboard"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
			</button>
		</div>
	</div>

	<!-- ── RIGHT: Actions ────────────────────────────────── -->
	<div class="ml-auto flex items-center gap-1 shrink-0">
		<!-- Widget actions -->
		<button
			onclick={() => (showAddWidgetDialog = true)}
			class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[13px] font-semibold transition-all duration-150
				bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white
				shadow-md shadow-indigo-900/40 hover:shadow-lg hover:shadow-indigo-900/50 hover:-translate-y-px"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
			Widget
		</button>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<!-- Undo / Redo -->
		<button
			onclick={() => dashboard.undo()}
			disabled={!dashboard.canUndo}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} disabled:opacity-30 disabled:pointer-events-none"
			title="Undo (Ctrl+Z)"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/>
			</svg>
		</button>

		<button
			onclick={() => dashboard.redo()}
			disabled={!dashboard.canRedo}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} disabled:opacity-30 disabled:pointer-events-none"
			title="Redo (Ctrl+Shift+Z)"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"/>
			</svg>
		</button>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<!-- Dashboard actions group -->
		<button
			onclick={handleSave}
			disabled={!dashboard.hasUnsavedChanges}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} disabled:opacity-30 disabled:pointer-events-none"
			title="Save layout"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
			</svg>
		</button>

		<button
			onclick={handleExport}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}"
			title="Export"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
			</svg>
		</button>

		<button
			onclick={() => (showImportDialog = true)}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}"
			title="Import"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12"/>
			</svg>
		</button>

		<button
			onclick={handleReset}
			class="rounded-md p-1.5 transition-colors {darkMode
				? 'text-slate-400 hover:text-white hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}"
			title="Reset to default"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
			</svg>
		</button>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<!-- Lock all / Unlock all (same visual language as theme switcher) -->
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
				title="Lock all widgets"
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
				title="Unlock all widgets"
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

	</div>
</header>

<!-- ═══════════════════ DIALOGS ═══════════════════ -->

<ConfirmModal
	bind:open={showResetConfirm}
	title="Reset dashboard layout?"
	message="This will replace the current layout with the default. Widget positions and tabs may change."
	confirmLabel="Reset"
	cancelLabel="Cancel"
	{darkMode}
	onConfirm={confirmResetLayout}
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
{#if showAddWidgetDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-3xl rounded-xl {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 shadow-2xl">
			<h3 class="mb-1 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Add Widget</h3>
			<p class="mb-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Select a widget type to add to the current tab</p>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each widgetTypes as { type, label, icon }}
					<button
						onclick={() => handleAddWidget(type)}
						class="flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:shadow-md hover:scale-[1.02]
							{darkMode
								? 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-900/20'
								: 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'}"
					>
						<span class="text-2xl">{icon}</span>
						<span class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">{label}</span>
					</button>
				{/each}
			</div>
			<div class="mt-6 flex justify-end">
				<button onclick={() => (showAddWidgetDialog = false)} class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors">Cancel</button>
			</div>
		</div>
	</div>
{/if}
