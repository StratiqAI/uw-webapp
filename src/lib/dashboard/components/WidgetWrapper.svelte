<script lang="ts">
	import type { Widget, WidgetAction } from '$lib/dashboard/types/widget';
	import { createDragHandlers } from '$lib/dashboard/utils/drag-drop';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import WidgetDropdown from './WidgetDropdown.svelte';
	import TitleWidget from '$lib/dashboard/components/widgets/TitleWidget.svelte';
	import ParagraphWidget from '$lib/dashboard/components/widgets/ParagraphWidget.svelte';
	import TableWidget from '$lib/dashboard/components/widgets/TableWidget.svelte';
	import ImageWidget from '$lib/dashboard/components/widgets/ImageWidget.svelte';
	import LineChartWidget from '$lib/dashboard/components/widgets/LineChartWidget.svelte';
	import BarChartWidget from '$lib/dashboard/components/widgets/BarChartWidget.svelte';
	import MetricWidget from '$lib/dashboard/components/widgets/MetricWidget.svelte';
	import MapWidget from '$lib/dashboard/components/widgets/MapWidget.svelte';

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

	function handleWidgetAction(action: WidgetAction) {
		switch (action) {
			case 'customInstructions':
				if (widgetFlipFn) {
					widgetFlipFn();
				}
				break;

			case 'edit':
				showEditDialog = true;
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

			case 'bringToFront':
				dashboard.bringWidgetToFront(widget.id);
				break;

			case 'sendToBack':
				dashboard.sendWidgetToBack(widget.id);
				break;

			case 'exportData':
				exportWidgetData();
				break;

			case 'refresh':
				refreshWidgetData();
				break;

			case 'settings':
				showEditDialog = true;
				break;

			case 'remove':
				if (confirm(`Are you sure you want to remove this ${widget.type} widget?`)) {
					dashboard.removeWidget(widget.id);
				}
				break;
		}
	}

	function exportWidgetData() {
		const dataStr = JSON.stringify(widget.data, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${widget.type}-${widget.id}-data.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function refreshWidgetData() {
		// Implement data refresh logic here
		console.log('Refreshing widget data:', widget.id);
		// You could emit an event or call an API to refresh the widget's data
	}

	// Calculate z-index for layering
	let zIndex = $derived(dashboard.getWidgetZIndex(widget.id));
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
				<TitleWidget data={widget.data} widgetId={widget.id} {darkMode} />
			{:else if widget.type === 'paragraph'}
				<ParagraphWidget 
					data={widget.data} 
					{darkMode}
					onAIGenerationReady={handleAIGenerationReady}
					onFlipControlReady={handleFlipControlReady}
				/>
			{:else if widget.type === 'table'}
				<TableWidget data={widget.data} {darkMode} />
			{:else if widget.type === 'image'}
				<ImageWidget data={widget.data} {darkMode} />
			{:else if widget.type === 'lineChart'}
				<LineChartWidget data={widget.data} {darkMode} />
			{:else if widget.type === 'barChart'}
				<BarChartWidget data={widget.data} {darkMode} />
			{:else if widget.type === 'metric'}
				<MetricWidget data={widget.data} {darkMode} />
			{:else if widget.type === 'map'}
				<MapWidget data={widget.data} {darkMode} />
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

<!-- Edit Dialog -->
{#if showEditDialog}
	<div
		class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4"
		style="z-index: 10000;"
	>
		<div class="w-full max-w-md rounded-lg {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 shadow-xl">
			<h3 class="mb-4 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Edit Widget</h3>

			<div class="space-y-4">
				<div>
					<label
						for="widget-title-{widget.id}"
						class="mb-1 block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}"
					>
						Widget Title
					</label>
					<input
						id="widget-title-{widget.id}"
						type="text"
						value={widget.title || ''}
						oninput={(e) => dashboard.updateWidget(widget.id, { title: e.currentTarget.value })}
						class="w-full rounded-md border {darkMode ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400' : 'border-slate-300 bg-white text-slate-900'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						placeholder="Enter widget title..."
					/>
				</div>

				<div>
					<label
						for="widget-description-{widget.id}"
						class="mb-1 block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}"
					>
						Description
					</label>
					<textarea
						id="widget-description-{widget.id}"
						value={widget.description || ''}
						oninput={(e) =>
							dashboard.updateWidget(widget.id, { description: e.currentTarget.value })}
						class="w-full rounded-md border {darkMode ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400' : 'border-slate-300 bg-white text-slate-900'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						rows="3"
						placeholder="Enter widget description..."
					></textarea>
				</div>

				<div>
					<div class="mb-1 block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Widget Type</div>
					<p class="rounded {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-600'} px-3 py-2 text-sm">
						{widget.type}
					</p>
				</div>

				<div>
					<div class="mb-1 block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Position & Size</div>
					<div class="grid grid-cols-2 gap-2 text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						<div class="rounded {darkMode ? 'bg-slate-700' : 'bg-slate-50'} px-3 py-2">
							Column: {widget.gridColumn}, Row: {widget.gridRow}
						</div>
						<div class="rounded {darkMode ? 'bg-slate-700' : 'bg-slate-50'} px-3 py-2">
							Width: {widget.colSpan}, Height: {widget.rowSpan}
						</div>
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-2">
				<button
					onclick={() => (showEditDialog = false)}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
				>
					Close
				</button>
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
