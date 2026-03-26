<script lang="ts">
	import type { Widget, WidgetAction } from '$lib/dashboard/types/widget';
	import { createDragHandlers } from '$lib/dashboard/utils/drag-drop';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetTopic, getWidgetSchemaId, getWidgetTopicsByType } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import ResizeHandles from './ResizeHandles.svelte';
	import WidgetDropdown from './WidgetDropdown.svelte';
	import TitleWidget from '$lib/dashboard/components/widgets/TitleWidget.svelte';
	import ParagraphWidget from '$lib/dashboard/components/widgets/ParagraphWidget.svelte';
	import TableWidget from '$lib/dashboard/components/widgets/TableWidget.svelte';
	import ImageWidget from '$lib/dashboard/components/widgets/ImageWidget.svelte';
	import LineChartWidget from '$lib/dashboard/components/widgets/LineChartWidget.svelte';
	import BarChartWidget from '$lib/dashboard/components/widgets/BarChartWidget.svelte';
	import DonutChartWidget from '$lib/dashboard/components/widgets/DonutChartWidget.svelte';
	import AreaChartWidget from '$lib/dashboard/components/widgets/AreaChartWidget.svelte';
	import GaugeWidget from '$lib/dashboard/components/widgets/GaugeWidget.svelte';
	import SparklineWidget from '$lib/dashboard/components/widgets/SparklineWidget.svelte';
	import HeatmapWidget from '$lib/dashboard/components/widgets/HeatmapWidget.svelte';
	import DivergingBarChartWidget from '$lib/dashboard/components/widgets/DivergingBarChartWidget.svelte';
	import MetricWidget from '$lib/dashboard/components/widgets/MetricWidget.svelte';
	import MapWidget from '$lib/dashboard/components/widgets/MapWidget.svelte';
	import SchemaWidget from '$lib/dashboard/components/widgets/SchemaWidget.svelte';
	import LocationQuotientWidget from '$lib/dashboard/components/widgets/LocationQuotientWidget.svelte';

	const DEFAULT_LQ_MENU_SIGNALS = { refresh: 0, exportRequest: 0 };

	interface Props {
		widget: Widget;
		darkMode?: boolean;
		onDragStart: (widget: Widget) => void;
		onDragEnd: () => void;
	}

	let { widget, darkMode = false, onDragStart, onDragEnd }: Props = $props();
	
	let showEditDialog = $state(false);
	let widgetAIGenerateFn: ((prompt: string) => Promise<void>) | null = null;
	let widgetFlipFn: (() => void) | null = null;
	let widgetConfigureFlipFn: (() => void) | null = null;
	let lqMenuSignals = $state<Record<string, { refresh: number; exportRequest: number }>>({});
	let selectedTopic = $state<string>('');
	let previewData = $state<unknown>(null);

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

	const dragHandlers = createDragHandlers(widget, {
		onDragStart,
		onDragEnd,
		onDrop: () => {}
	});
	
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
				if (widget.type === 'locationQuotient') {
					widgetConfigureFlipFn?.();
					break;
				}
				selectedTopic = currentTopic;
				showEditDialog = true;
				break;
			case 'edit':
			case 'settings':
				selectedTopic = currentTopic;
				showEditDialog = true;
				break;

			case 'customInstructions':
				widgetFlipFn?.();
				break;

			case 'duplicate':
				dashboard.duplicateWidget(widget.id);
				break;

			case 'lock':
				dashboard.updateWidget(widget.id, { locked: true });
				break;

			case 'unlock':
				dashboard.updateWidget(widget.id, { locked: false });
				break;

			case 'exportData':
				exportWidgetData();
				break;

			case 'refresh':
				if (widget.type === 'locationQuotient') {
					bumpLqRefresh(widget.id);
				}
				refreshWidgetData();
				break;

			case 'remove':
				if (confirm(`Are you sure you want to remove this ${widget.type} widget?`)) {
					dashboard.removeWidget(widget.id);
				}
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

	const zIndex = $derived(dashboard.getWidgetZIndex(widget.id));
</script>

<div
	role="button"
	tabindex="0"
	class="widget-wrapper group relative h-full"
	style="
    grid-column: {widget.gridColumn} / span {widget.colSpan};
    grid-row: {widget.gridRow} / span {widget.rowSpan};
    z-index: {zIndex};
  "
	draggable={!widget.locked}
	ondragstart={dragHandlers.handleDragStart}
	ondragend={dragHandlers.handleDragEnd}
>
	<div
		class="widget-content h-full overflow-hidden rounded-lg border {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} shadow-md transition-shadow hover:shadow-lg"
	>
		<!-- Widget Header (if title is set) -->
		{#if widget.title}
			<div class="widget-header border-b {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'} px-4 py-2">
				<h3 class="text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">{widget.title}</h3>
				{#if widget.description}
					<p class="mt-0.5 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">{widget.description}</p>
				{/if}
			</div>
		{/if}

		<!-- Dropdown Menu -->
		<WidgetDropdown {widget} {darkMode} onAction={handleWidgetAction} />

		<!-- Widget Body -->
		<div class="widget-body {darkMode ? 'bg-slate-800' : 'bg-slate-50'} {widget.title ? 'p-4' : 'h-full p-4'}">
			{#if widget.type === 'title'}
				<TitleWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
			{:else if widget.type === 'paragraph'}
				<ParagraphWidget 
					data={widget.data} 
					widgetId={widget.id}
					topicOverride={widget.topicOverride}
					{darkMode}
					onAIGenerationReady={handleAIGenerationReady}
					onFlipControlReady={handleFlipControlReady}
				/>
			{:else if widget.type === 'table'}
				<TableWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
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
			{:else if widget.type === 'metric'}
				<MetricWidget data={widget.data} widgetId={widget.id} topicOverride={widget.topicOverride} {darkMode} />
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

		<!-- Lock indicator -->
		{#if widget.locked}
			<div class="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
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
	{#if !widget.locked}
		<ResizeHandles widgetId={widget.id} />
	{/if}
</div>

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
			class="w-full max-w-2xl rounded-xl {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border shadow-2xl overflow-hidden"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50'}">
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

					<!-- Topic Selection -->
					<div>
						<div class="mb-3 flex items-center justify-between">
							<label
								for="widget-topic-select-{widget.id}"
								class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}"
							>
								Data Source Topic
							</label>
							<span class="text-xs px-2 py-1 rounded-full {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-indigo-100 text-indigo-700'}">
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
			<div class="px-6 py-4 border-t {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'} flex justify-end gap-3">
				<button
					onclick={() => (showEditDialog = false)}
					class="px-5 py-2.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'} rounded-lg transition-colors"
				>
					Cancel
				</button>
				{#if selectedTopic !== currentTopic}
					<button
						onclick={applyTopicChange}
						class="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all shadow-lg hover:shadow-xl"
					>
						Apply Changes
					</button>
				{:else}
					<button
						onclick={() => (showEditDialog = false)}
						class="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all shadow-lg hover:shadow-xl"
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

	.widget-content {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.widget-body {
		flex: 1;
		overflow: auto;
	}
</style>
