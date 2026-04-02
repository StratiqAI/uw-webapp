<script lang="ts">
	import { setContext } from 'svelte';
	import type { Widget, WidgetAction } from '$lib/dashboard/types/widget';
	import {
		WIDGET_TITLE_BAR_CONTEXT,
		type AiConnectionState,
		type WidgetTitleBarContext
	} from '$lib/dashboard/context/widgetTitleBarContext';
	import { createDragHandlers } from '$lib/dashboard/utils/drag-drop';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetTopic, getWidgetSchemaId, getWidgetTopicsByType } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import ResizeHandles from './ResizeHandles.svelte';
	import WidgetDropdown from './WidgetDropdown.svelte';
	import TitleWidget from '$lib/dashboard/components/widgets/TitleWidget.svelte';
	import ParagraphWidget from '$lib/dashboard/components/widgets/ParagraphWidget.svelte';
	import ImageWidget from '$lib/dashboard/components/widgets/ImageWidget.svelte';
	import LineChartWidget from '$lib/dashboard/components/widgets/LineChartWidget.svelte';
	import BarChartWidget from '$lib/dashboard/components/widgets/BarChartWidget.svelte';
	import DonutChartWidget from '$lib/dashboard/components/widgets/DonutChartWidget.svelte';
	import AreaChartWidget from '$lib/dashboard/components/widgets/AreaChartWidget.svelte';
	import GaugeWidget from '$lib/dashboard/components/widgets/GaugeWidget.svelte';
	import SparklineWidget from '$lib/dashboard/components/widgets/SparklineWidget.svelte';
	import HeatmapWidget from '$lib/dashboard/components/widgets/HeatmapWidget.svelte';
	import DivergingBarChartWidget from '$lib/dashboard/components/widgets/DivergingBarChartWidget.svelte';
	import MapWidget from '$lib/dashboard/components/widgets/MapWidget.svelte';
	import { getWidgetComponent } from '$lib/dashboard/setup/widgetRegistry';
	import SchemaWidget from '$lib/dashboard/components/widgets/SchemaWidget.svelte';
	import LocationQuotientWidget from '$lib/dashboard/components/widgets/LocationQuotientWidget.svelte';
	import ConfirmModal from '$lib/components/Dialog/ConfirmModal.svelte';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import StreamPicker from '$lib/components/streams/StreamPicker.svelte';
	import { streamCatalog, type DataStream } from '$lib/stores/streamCatalog.svelte';

	const DEFAULT_LQ_MENU_SIGNALS = { refresh: 0, exportRequest: 0 };

	let titleBarAiConnection = $state<AiConnectionState | null>(null);

	setContext<WidgetTitleBarContext>(WIDGET_TITLE_BAR_CONTEXT, {
		setAiConnectionState: (v) => {
			titleBarAiConnection = v;
		}
	});

	interface Props {
		widget: Widget;
		darkMode?: boolean;
		onDragStart: (widget: Widget) => void;
		onDragEnd: () => void;
	}

	let { widget, darkMode = false, onDragStart, onDragEnd }: Props = $props();

	/** Configure-dialog chrome: no indigo/purple gradients; align with light / dark / warm. */
	const configureHeaderBar = $derived.by(() => {
		if (darkMode) return 'border-slate-700 bg-slate-800';
		if (themeStore.theme === 'warm') return 'border-[#ddd4c4] bg-[#ebe4d8]';
		return 'border-slate-200 bg-slate-50';
	});

	const configurePrimaryBtn = $derived.by(() => {
		if (darkMode) {
			return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-black/25';
		}
		if (themeStore.theme === 'warm') {
			return 'bg-[#5c4436] hover:bg-[#4a3629] text-[#faf7f2] shadow-md shadow-[#2d2010]/20';
		}
		return 'bg-slate-800 hover:bg-slate-700 text-white shadow-md shadow-slate-900/10';
	});

	const topicCountBadge = $derived.by(() => {
		if (darkMode) return 'bg-slate-700 text-slate-300';
		if (themeStore.theme === 'warm') return 'bg-[#dfe6d4] text-[#3d4a32]';
		return 'bg-slate-200 text-slate-700';
	});

	const configureFooterBar = $derived.by(() => {
		if (darkMode) return 'border-slate-700 bg-slate-800';
		if (themeStore.theme === 'warm') return 'border-[#e8dfd2] bg-[#f7f4ef]';
		return 'border-slate-200 bg-slate-50';
	});

	/** Native <select> list follows color-scheme; without this, OS dark mode can show an illegible dropdown on a light modal. */
	const configureColorSchemeClass = $derived(darkMode ? '[color-scheme:dark]' : '[color-scheme:light]');

	let showEditDialog = $state(false);
	let configureTab = $state<'defaults' | 'ai-streams'>('defaults');
	let widgetAIGenerateFn: ((prompt: string) => Promise<void>) | null = null;
	let widgetFlipFn: (() => void) | null = null;
	let widgetConfigureFlipFn: (() => void) | null = null;
	let lqMenuSignals = $state<Record<string, { refresh: number; exportRequest: number }>>({});
	let removeConfirmOpen = $state(false);
	let selectedTopic = $state<string>('');
	let previewData = $state<unknown>(null);
	let lastRefreshedAt = $state<Date | null>(null);

	let registeredRefreshCounter = $state(0);
	let registeredConfigureFn: (() => void) | null = null;

	const isWidgetFullscreen = $derived(dashboard.fullscreenWidgetId === widget.id);

	$effect(() => {
		if (!isWidgetFullscreen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') dashboard.setFullscreenWidget(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const currentTopic = $derived(widget.topicOverride || getWidgetTopic(widget.type, widget.id));
	const schemaId = $derived.by(() => {
		try {
			return getWidgetSchemaId(widget.type);
		} catch {
			return widget.type === 'schema' ? (widget.data as any).schemaId : null;
		}
	});
	
	// Get available topics from ValidatedTopicStore for this widget type
	const availableTopics = $derived.by(() => {
		// Access store.tree to create reactive dependency
		const _ = validatedTopicStore.tree;
		
		// Get all topics for this widget type
		const widgetTypeTopics = getWidgetTopicsByType(widget.type as any);
		return widgetTypeTopics.map(item => `widgets/${widget.type}/${item.id}`);
	});

	// Get preview data from ValidatedTopicStore reactively
	$effect(() => {
		if (!selectedTopic || !showEditDialog) {
			previewData = null;
			return;
		}

		// Access store.tree to create reactive dependency
		const _ = validatedTopicStore.tree;
		previewData = validatedTopicStore.at(selectedTopic);
	});

	const dragHandlers = $derived.by(() =>
		createDragHandlers(widget, {
			onDragStart,
			onDragEnd,
			onDrop: () => {}
		})
	);
	
	function handleAIGenerationReady(generateFn: (prompt: string) => Promise<void>) {
		widgetAIGenerateFn = generateFn;
	}
	
	function handleFlipControlReady(flipFn: () => void) {
		widgetFlipFn = flipFn;
	}

	function handleConfigureFlipReady(flipFn: () => void) {
		widgetConfigureFlipFn = flipFn;
	}

	function bumpLqRefresh(id: string) {
		const cur = lqMenuSignals[id] ?? { refresh: 0, exportRequest: 0 };
		lqMenuSignals = { ...lqMenuSignals, [id]: { ...cur, refresh: cur.refresh + 1 } };
	}

	function bumpLqExport(id: string) {
		const cur = lqMenuSignals[id] ?? { refresh: 0, exportRequest: 0 };
		lqMenuSignals = { ...lqMenuSignals, [id]: { ...cur, exportRequest: cur.exportRequest + 1 } };
	}

	function handleWidgetAction(action: WidgetAction) {
		switch (action) {
			case 'configure':
			case 'edit':
			case 'settings':
				if (RegisteredComp && registeredConfigureFn) {
					registeredConfigureFn();
					break;
				}
				if (widget.type === 'locationQuotient') {
					widgetConfigureFlipFn?.();
					break;
				}
				selectedTopic = currentTopic;
				configureTab = 'defaults';
				showEditDialog = true;
				break;

			case 'duplicate':
				dashboard.duplicateWidget(widget.id);
				break;

			case 'exportData':
				exportWidgetData();
				break;

			case 'refresh':
				if (RegisteredComp) {
					registeredRefreshCounter++;
				}
				if (widget.type === 'locationQuotient') {
					bumpLqRefresh(widget.id);
				}
				refreshWidgetData();
				lastRefreshedAt = new Date();
				break;

			case 'viewFullscreen':
				dashboard.setFullscreenWidget(
					dashboard.fullscreenWidgetId === widget.id ? null : widget.id
				);
				break;

			case 'remove':
				removeConfirmOpen = true;
				break;
		}
	}

	function exportWidgetData() {
		if (widget.type === 'locationQuotient') {
			bumpLqExport(widget.id);
			return;
		}
		const blob = new Blob([JSON.stringify(widget.data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${widget.type}-${widget.id}-data.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function refreshWidgetData() {
		console.log('Refreshing widget data:', widget.id);
	}

	function applyTopicChange() {
		const defaultTopic = getWidgetTopic(widget.type, widget.id);
		const newTopicOverride = selectedTopic === defaultTopic ? undefined : selectedTopic;
		dashboard.updateWidget(widget.id, { topicOverride: newTopicOverride });
		console.log(`✅ Changed topic for ${widget.id}: ${currentTopic} → ${selectedTopic}`);
		showEditDialog = false;
	}

	function handleStreamSelect(stream: DataStream) {
		selectedTopic = stream.topic;
		applyTopicChange();
	}

	/** Active stream (if current topic is an AI stream topic) */
	const activeStream = $derived(streamCatalog.getStreamByTopic(currentTopic));

	const zIndex = $derived(dashboard.getWidgetZIndex(widget.id));
	const isBeingDragged = $derived(
		dashboard.dragState.isDragging && dashboard.dragState.activeWidgetId === widget.id
	);
	const displacedPos = $derived(dashboard.displacementPreview[widget.id]);

	// Dynamic component lookup for package-based widgets (registry-first)
	const RegisteredComp = $derived(getWidgetComponent(widget.type));

	/**
	 * Read live data reactively from the ValidatedTopicStore so that when AI or
	 * another publisher updates the topic, the header title/description reflects
	 * the new values immediately — without a full widget reconfigure.
	 *
	 * The TitleWidget is excluded: its data.title IS the rendered content, not a
	 * chrome header label, so lifting it would duplicate the text.
	 */
	const liveData = $derived.by(() => {
		const _ = validatedTopicStore.tree; // reactive dependency
		return validatedTopicStore.at(currentTopic);
	});

	const displayTitle = $derived.by(() => {
		if (widget.type === 'title') return widget.title;
		const d = liveData as Record<string, unknown> | undefined | null;
		if (d && typeof d === 'object') {
			const t = d.title;
			if (typeof t === 'string' && t.trim()) return t;
		}
		return widget.title;
	});

	const displayDescription = $derived.by(() => {
		if (widget.type === 'title') return widget.description;
		const d = liveData as Record<string, unknown> | undefined | null;
		if (d && typeof d === 'object') {
			const desc = d.description;
			if (typeof desc === 'string' && desc.trim()) return desc;
		}
		return widget.description;
	});

	const widgetBodyPaddingClass = $derived(
		widget.type === 'brokerCard'
			? 'min-h-0 flex-1 overflow-hidden p-0'
			: displayTitle
				? 'p-4'
				: 'h-full p-4'
	);

	const widgetBodyBgClass = $derived(
		widget.type === 'brokerCard'
			? 'bg-transparent'
			: darkMode
				? 'bg-transparent'
				: 'bg-white/60'
	);
</script>

<div
	role="button"
	tabindex="0"
	class="widget-wrapper group relative h-full"
	class:widget-wrapper--fullscreen={isWidgetFullscreen}
	class:widget-wrapper--dragging={isBeingDragged}
	style={isWidgetFullscreen
		? `position: fixed; inset: 1rem; width: calc(100vw - 2rem); height: calc(100vh - 2rem); z-index: 100050; max-width: none;`
		: `
    grid-column: ${(displacedPos?.gridColumn ?? widget.gridColumn)} / span ${widget.colSpan};
    grid-row: ${(displacedPos?.gridRow ?? widget.gridRow)} / span ${widget.rowSpan};
    z-index: ${isBeingDragged ? 0 : zIndex};
  `}
	draggable={!widget.locked && !isWidgetFullscreen}
	ondragstart={(e) => {
		if (widget.locked || isWidgetFullscreen) {
			e.preventDefault();
			return;
		}
		dragHandlers.handleDragStart(e);
	}}
	ondragend={dragHandlers.handleDragEnd}
>
	<div
		class="widget-content h-full overflow-hidden rounded-2xl border
		{widget.type === 'brokerCard' ? 'flex min-h-0 flex-col' : ''}
		{darkMode
			? 'border-slate-700/35 bg-linear-to-b from-slate-800/96 to-slate-900/94 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]'
			: 'border-slate-200/60 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]'}
		transition-all duration-200
		{darkMode
			? 'hover:border-slate-600/45 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.42)] hover:-translate-y-px'
			: 'hover:border-slate-300/70 hover:shadow-[0_8px_28px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-px'}"
	>
		<!-- Subtle top edge — was a strong bevel highlight -->
		<div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-px {darkMode ? 'bg-linear-to-r from-transparent via-primary-400/15 to-transparent' : 'bg-linear-to-r from-transparent via-primary-400/18 to-transparent'}"></div>

		<!-- Widget Header (if a title is available — static or from live data) -->
		{#if displayTitle}
			<div
				class="widget-header shrink-0 border-b {darkMode ? 'border-slate-700/30 bg-linear-to-r from-slate-800/95 to-slate-800/88' : 'border-slate-200/55 bg-linear-to-r from-slate-50 to-white'} flex items-center gap-2 px-4 py-1"
			>
				<div class="min-w-0 flex-1">
					<h3 class="text-base font-semibold leading-snug tracking-wide {darkMode ? 'text-slate-100' : 'text-slate-700'}">
						{displayTitle}
					</h3>
					{#if displayDescription}
						<p class="mt-0 text-xs leading-snug {darkMode ? 'text-slate-400' : 'text-slate-500'}">{displayDescription}</p>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-1.5">
					{#if widget.type === 'paragraph' && titleBarAiConnection !== null}
						<div class="flex items-center gap-1.5 pr-0.5">
							<div
								class="h-2 w-2 shrink-0 rounded-full"
								class:bg-green-500={titleBarAiConnection === 'Researching' && !darkMode}
								class:bg-green-400={titleBarAiConnection === 'Researching' && darkMode}
								class:bg-yellow-500={titleBarAiConnection === 'Ready' && !darkMode}
								class:bg-yellow-400={titleBarAiConnection === 'Ready' && darkMode}
								class:bg-blue-500={titleBarAiConnection === 'Complete' && !darkMode}
								class:bg-blue-400={titleBarAiConnection === 'Complete' && darkMode}
							></div>
							<span class="whitespace-nowrap text-xs {darkMode ? 'text-slate-300' : 'text-slate-600'}">
								{titleBarAiConnection}
							</span>
						</div>
					{/if}
					{#if widget.locked}
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 {darkMode ? 'text-slate-400' : 'text-gray-400'}"
							title="Widget locked"
							aria-label="Widget locked"
						>
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
								></path>
							</svg>
						</div>
					{/if}
					<WidgetDropdown
						{widget}
						{darkMode}
						isFullscreen={isWidgetFullscreen}
						{lastRefreshedAt}
						inTitleBar
						onAction={handleWidgetAction}
					/>
				</div>
			</div>
		{/if}

		{#if !displayTitle}
			<WidgetDropdown
				{widget}
				{darkMode}
				isFullscreen={isWidgetFullscreen}
				{lastRefreshedAt}
				onAction={handleWidgetAction}
			/>
		{/if}

		<!-- Widget Body -->
		<div class="widget-body {widgetBodyBgClass} {widgetBodyPaddingClass}">
		{#if RegisteredComp}
			<RegisteredComp
				data={widget.data} widgetId={widget.id}
				topicOverride={widget.topicOverride} {darkMode}
				theme={themeStore.theme}
				refreshSignal={registeredRefreshCounter}
				onUpdateConfig={(d: any) => dashboard.updateWidget(widget.id, { data: d })}
				onConfigureReady={(fn: () => void) => { registeredConfigureFn = fn; }} />
			{:else if widget.type === 'title'}
				<TitleWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'paragraph'}
				<ParagraphWidget 
					data={widget.data} 
					widgetId={widget.id}
					topicOverride={widget.topicOverride}
					{darkMode}
					showTitleInChrome={!!displayTitle}
					onAIGenerationReady={handleAIGenerationReady}
					onFlipControlReady={handleFlipControlReady}
				/>
			{:else if widget.type === 'image'}
				<ImageWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'lineChart'}
				<LineChartWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'barChart'}
				<BarChartWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'donutChart'}
				<DonutChartWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'areaChart'}
				<AreaChartWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'gauge'}
				<GaugeWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'sparkline'}
				<SparklineWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'heatmap'}
				<HeatmapWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'divergingBarChart'}
				<DivergingBarChartWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'map'}
				<MapWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'schema'}
				<SchemaWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'locationQuotient'}
				<LocationQuotientWidget
					data={widget.data}
					widgetId={widget.id}
					topicOverride={widget.topicOverride}
					{darkMode}
					onConfigureFlipReady={handleConfigureFlipReady}
					onUpdateData={(d) => dashboard.updateWidget(widget.id, { data: d })}
					lqSignals={lqMenuSignals[widget.id] ?? DEFAULT_LQ_MENU_SIGNALS}
				/>
			{/if}
		</div>

		<!-- Lock indicator (title bar shows lock when a header exists; otherwise float next to the "..." button) -->
		{#if widget.locked && !displayTitle}
			<div class="absolute right-12 top-2.5 opacity-0 transition-opacity group-hover:opacity-100">
				<svg class="h-4 w-4 {darkMode ? 'text-slate-400' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					></path>
				</svg>
			</div>
		{/if}
	</div>

	<!-- Resize Handles -->
	{#if !widget.locked && !isWidgetFullscreen}
		<ResizeHandles widgetId={widget.id} />
	{/if}
</div>

<ConfirmModal
	bind:open={removeConfirmOpen}
	title="Remove widget?"
	message={`Are you sure you want to remove this ${widget.type} widget?`}
	confirmLabel="Remove"
	cancelLabel="Cancel"
	{darkMode}
	onConfirm={() => dashboard.removeWidget(widget.id)}
/>

<!-- Configure Dialog -->
{#if showEditDialog}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="dialog-title"
		tabindex="-1"
		class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 z-[10000]"
		onclick={(e) => {
			if (e.target === e.currentTarget) showEditDialog = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showEditDialog = false;
		}}
	>
		<div
			class="configure-widget-dialog w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden {configureColorSchemeClass} {darkMode
				? 'bg-slate-800 border-slate-700'
				: themeStore.theme === 'warm'
					? 'bg-[#faf8f4] border-[#e5dcc8]'
					: 'bg-white border-slate-200'}"
			data-configure-mode={darkMode ? 'dark' : themeStore.theme === 'warm' ? 'warm' : 'light'}
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b {configureHeaderBar}">
				<div class="flex items-center justify-between">
					<div>
						<h3 id="dialog-title" class="text-xl font-bold {darkMode ? 'text-white' : 'text-slate-900'}">Configure Widget</h3>
						<p class="mt-1 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
							{widget.type} • {schemaId || 'No schema'}
						</p>
					</div>
					<button
						onclick={() => (showEditDialog = false)}
						class="rounded-lg p-2 {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'} transition-colors"
						aria-label="Close"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="p-6 max-h-[70vh] overflow-y-auto">
				<div class="space-y-6">
					<!-- Widget Title -->
					<div>
						<label
							for="widget-title-{widget.id}"
							class="mb-2 block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}"
						>
							Widget Title
						</label>
						<input
							id="widget-title-{widget.id}"
							type="text"
							value={widget.title || ''}
							oninput={(e) => dashboard.updateWidget(widget.id, { title: e.currentTarget.value })}
							class="w-full rounded-lg border {darkMode ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400' : 'border-slate-300 bg-white text-slate-900'} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							placeholder="Enter widget title..."
						/>
					</div>

					<!-- Description -->
					<div>
						<label
							for="widget-description-{widget.id}"
							class="mb-2 block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}"
						>
							Description
						</label>
						<textarea
							id="widget-description-{widget.id}"
							value={widget.description || ''}
							oninput={(e) =>
								dashboard.updateWidget(widget.id, { description: e.currentTarget.value })}
							class="w-full rounded-lg border {darkMode ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400' : 'border-slate-300 bg-white text-slate-900'} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
							rows="2"
							placeholder="Enter widget description..."
						></textarea>
					</div>

					<!-- Data Source — tab switcher -->
					<div>
						<p class="mb-2 text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">Data Source</p>

						<!-- Active stream badge -->
						{#if activeStream}
							<div class="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs {darkMode ? 'bg-indigo-900/20 border border-indigo-700/40 text-indigo-300' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}">
								<svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
								</svg>
								Connected to AI stream: <strong>{activeStream.title}</strong>
							</div>
						{/if}

						<!-- Tabs -->
						<div class="mb-3 flex gap-1 rounded-lg p-0.5 {darkMode ? 'bg-slate-700' : 'bg-slate-100'}">
							<button
								type="button"
								onclick={() => configureTab = 'defaults'}
								class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
									{configureTab === 'defaults'
										? (darkMode ? 'bg-slate-600 text-white shadow' : 'bg-white text-slate-900 shadow')
										: (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}"
							>Default topics</button>
							<button
								type="button"
								onclick={() => configureTab = 'ai-streams'}
								class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
									{configureTab === 'ai-streams'
										? (darkMode ? 'bg-slate-600 text-white shadow' : 'bg-white text-slate-900 shadow')
										: (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}"
							>
								AI Streams
								{#if streamCatalog.streams.length > 0}
									<span class="ml-1 rounded-full px-1.5 py-0.5 text-xs
										{configureTab === 'ai-streams'
											? (darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
											: (darkMode ? 'bg-slate-500 text-slate-300' : 'bg-slate-200 text-slate-600')}"
									>{streamCatalog.streams.length}</span>
								{/if}
							</button>
						</div>

						<!-- Default topics tab -->
						{#if configureTab === 'defaults'}
							<div class="mb-3 flex items-center justify-between">
								<label
									for="widget-topic-select-{widget.id}"
									class="block text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}"
								>
									Widget-type topics
								</label>
								<span class="text-xs px-2 py-1 rounded-full {topicCountBadge}">
									{availableTopics.length} available
								</span>
							</div>
							
							<select
								id="widget-topic-select-{widget.id}"
								bind:value={selectedTopic}
								class="w-full rounded-lg border {darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-900'} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
							>
								<option value={currentTopic}>{currentTopic} (current)</option>
								{#each availableTopics as topic}
									{#if topic !== currentTopic}
										<option value={topic}>{topic}</option>
									{/if}
								{/each}
							</select>
							
							{#if selectedTopic}
								<div class="mt-2 flex items-center gap-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									{#if selectedTopic === currentTopic}
										<span class="flex items-center gap-1">
											<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
											</svg>
											Currently subscribed
										</span>
									{:else}
										<span class="flex items-center gap-1">
											<svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
											</svg>
											Will change on apply
										</span>
									{/if}
								</div>
							{/if}
						{/if}

						<!-- AI Streams tab -->
						{#if configureTab === 'ai-streams'}
							<div class="max-h-52 overflow-y-auto">
								<StreamPicker
									{darkMode}
									filterSchemaId={schemaId ?? undefined}
									selectedStreamId={activeStream?.id}
									currentTopic={currentTopic}
									onselect={handleStreamSelect}
								/>
							</div>
						{/if}
					</div>

					<!-- Data Preview -->
					{#if selectedTopic}
						<div>
							<div class="mb-2 flex items-center justify-between">
								<span class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">
									Data Preview
								</span>
								{#if previewData == null}
									<span class="text-xs px-2 py-1 rounded-full {darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}">
										No data yet
									</span>
								{/if}
							</div>
							<div class="rounded-lg border {darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'} p-4 max-h-64 overflow-auto">
								{#if previewData == null}
									<div class="text-center py-8">
										<svg class="w-12 h-12 mx-auto mb-2 {darkMode ? 'text-slate-600' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
										</svg>
										<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No data available on this topic</p>
									</div>
								{:else}
									<pre class="text-xs font-mono {darkMode ? 'text-slate-300' : 'text-slate-700'} whitespace-pre-wrap break-words">{JSON.stringify(previewData, null, 2)}</pre>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t {configureFooterBar} flex justify-end gap-3">
				<button
					onclick={() => (showEditDialog = false)}
					class="px-5 py-2.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'} rounded-lg transition-colors"
				>
					Cancel
				</button>
				{#if selectedTopic !== currentTopic}
					<button
						onclick={applyTopicChange}
						class="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors {configurePrimaryBtn}"
					>
						Apply Changes
					</button>
				{:else}
					<button
						onclick={() => (showEditDialog = false)}
						class="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors {configurePrimaryBtn}"
					>
						Done
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}


<style>
	.widget-wrapper {
		cursor: move;
		position: relative;
	}

	.widget-wrapper[draggable='false'] {
		cursor: default;
	}

	.widget-wrapper--fullscreen {
		cursor: default;
	}

	.widget-wrapper--dragging {
		opacity: 0.3;
		transform: scale(0.97);
		transition: opacity 0.15s ease, transform 0.15s ease;
	}

	.widget-content {
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.widget-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
	}

	/* Legible native select lists (Windows/Chrome + OS dark mode often ignore surface colors on <option>) */
	.configure-widget-dialog[data-configure-mode='light'] :global(select option) {
		background-color: #ffffff;
		color: #0f172a;
	}
	.configure-widget-dialog[data-configure-mode='warm'] :global(select option) {
		background-color: #faf8f4;
		color: #1c1917;
	}
	.configure-widget-dialog[data-configure-mode='dark'] :global(select option) {
		background-color: #1e293b;
		color: #f1f5f9;
	}
</style>
