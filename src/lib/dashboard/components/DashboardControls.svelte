<script lang="ts">
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { mapStore } from '$lib/stores/mapObjectStore';
	import type { ParagraphWidget, Widget, WidgetType } from '../types/widget';
	import { findAvailablePosition } from '../utils/grid';
	import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let showExportDialog = $state(false);
	let showImportDialog = $state(false);
	let showAddWidgetDialog = $state(false);
	let exportedJson = $state('');
	let importJson = $state('');
	let importError = $state('');

	function handleSave() {
		const success = dashboard.save();
		if (success) {
			alert('Dashboard saved successfully!');
		} else {
			alert('Failed to save dashboard. Please check browser settings.');
		}
	}

	function handleClear() {
		//   if (confirm('Are you sure you want to clear the saved dashboard layout? This cannot be undone.')) {
		dashboard.clearSavedDashboard();
		//     alert('Saved dashboard cleared. Refresh to see default layout.');
		//   }
	}

	function handleReset() {
		if (
			confirm('Are you sure you want to reset to the default layout? This will clear all widgets.')
		) {
			dashboard.resetToDefault();
		}
	}

	function handleExport() {
		const json = dashboard.exportDashboard();
		if (json) {
			exportedJson = json;
			showExportDialog = true;
		} else {
			alert('Failed to export dashboard');
		}
	}

	function handleImport() {
		importError = '';
		const success = dashboard.importDashboard(importJson);
		if (success) {
			showImportDialog = false;
			importJson = '';
			alert('Dashboard imported successfully!');
		} else {
			importError = 'Invalid dashboard configuration. Please check the JSON format.';
		}
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(exportedJson).then(() => {
			alert('Dashboard configuration copied to clipboard!');
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

	function handleUpdateParagraphWidget() {
		let contentProducer = mapStore.registerProducer<ParagraphWidget['data']>(
			'paragraph-content',
			'content-generator-agent'
		);

		const topics = [
			{
				title: 'AI Dashboard Update',
				content:
					'The AI-powered dashboard is now processing **12,543 events per second** with an average latency of _15ms_. Machine learning models have achieved a 94% accuracy rate in predicting user behavior patterns.',
				markdown: true
			},
			{
				title: 'System Performance',
				content:
					'All systems are operating normally. CPU usage: 45%, Memory: 62%, Network throughput: optimal. No anomalies detected in the last hour.',
				markdown: false
			},
			{
				title: 'Market Analysis',
				content:
					"Today's market shows **strong growth** in the technology sector with a _3.2% increase_. AI and machine learning companies are leading the surge with unprecedented investor interest.",
				markdown: true
			},
			{
				title: 'Weather Report',
				content:
					'Current conditions: Partly cloudy, 72°F. Forecast: Mild temperatures continuing through the week with a 20% chance of rain on Thursday.',
				markdown: false
			},
			{
				title: 'Breaking News',
				content:
					'**Breaking:** Scientists announce breakthrough in quantum computing, achieving stable qubit coherence for over _100 microseconds_. This represents a ***10x improvement*** over previous records.',
				markdown: true
			}
		];
		// Pick a random topic
		const topic = topics[Math.floor(Math.random() * topics.length)];

		// Add timestamp to content
		const timestamp = new Date().toLocaleTimeString();
		const contentWithTime = `${topic.content}\n\n_Last updated: ${timestamp}_`;

		const data: ParagraphWidget['data'] = {
			title: topic.title,
			content: topic.markdown ? contentWithTime : `${topic.content}\n\nLast updated: ${timestamp}`,
			markdown: topic.markdown
		};

		console.log(`🤖 AI Agent generated new content: "${topic.title}"`);
		contentProducer.publish(data);
	}

	function generateWidgetId(): string {
		return `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	function createDefaultWidget(type: WidgetType): Widget | null {
		const widgetId = generateWidgetId();
		const config = dashboard.config;
		
		// Default sizes for each widget type
		const defaultSizes: Record<WidgetType, { colSpan: number; rowSpan: number }> = {
			title: { colSpan: 12, rowSpan: 1 },
			metric: { colSpan: 2, rowSpan: 1 },
			paragraph: { colSpan: 6, rowSpan: 2 },
			table: { colSpan: 6, rowSpan: 4 },
			image: { colSpan: 6, rowSpan: 4 },
			map: { colSpan: 8, rowSpan: 4 },
			lineChart: { colSpan: 6, rowSpan: 3 },
			barChart: { colSpan: 6, rowSpan: 3 }
		};

		const { colSpan, rowSpan } = defaultSizes[type];
		
		// Find available position
		const position = findAvailablePosition(
			colSpan,
			rowSpan,
			config.gridColumns,
			config.gridRows,
			dashboard.widgets
		);

		if (!position) {
			alert('No available space for this widget. Try removing some widgets or expanding the grid.');
			return null;
		}

		// Create widget based on type
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
				return {
					...baseWidget,
					type: 'title',
					data: {
						title: 'New Title',
						subtitle: 'Subtitle text',
						alignment: 'center'
					}
				} as Widget;

			case 'metric':
				return {
					...baseWidget,
					type: 'metric',
					data: {
						label: 'METRIC',
						value: '0'
					}
				} as Widget;

			case 'paragraph':
				return {
					...baseWidget,
					type: 'paragraph',
					data: {
						title: 'New Paragraph',
						content: 'Enter your content here...',
						markdown: false
					}
				} as Widget;

			case 'table':
				return {
					...baseWidget,
					type: 'table',
					data: {
						title: 'New Table',
						headers: ['Column 1', 'Column 2'],
						rows: [
							{ 'Column 1': 'Row 1', 'Column 2': 'Data' },
							{ 'Column 1': 'Row 2', 'Column 2': 'Data' }
						],
						sortable: true,
						paginated: false
					}
				} as Widget;

			case 'image':
				return {
					...baseWidget,
					type: 'image',
					data: {
						title: 'New Image',
						src: 'https://via.placeholder.com/800x600',
						alt: 'Placeholder image',
						objectFit: 'cover'
					}
				} as Widget;

			case 'map':
				return {
					...baseWidget,
					type: 'map',
					data: {
						title: 'New Map',
						lat: 29.416775,
						lon: -98.406103,
						zoom: 15,
						mapType: 'leaflet',
						apiKey: PUBLIC_GEOAPIFY_API_KEY
					}
				} as Widget;

			case 'lineChart':
				return {
					...baseWidget,
					type: 'lineChart',
					data: {
						labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
						datasets: [
							{
								label: 'Dataset 1',
								data: [10, 20, 15, 25, 30],
								color: '#3b82f6'
							}
						],
						options: {
							responsive: true,
							maintainAspectRatio: false
						}
					}
				} as Widget;

			case 'barChart':
				return {
					...baseWidget,
					type: 'barChart',
					data: {
						labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
						datasets: [
							{
								label: 'Dataset 1',
								data: [10, 20, 15, 25, 30],
								backgroundColor: '#3b82f6'
							}
						],
						orientation: 'vertical'
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
				alert('Failed to add widget. Please try again.');
			}
		}
	}

	const widgetTypes: Array<{ type: WidgetType; label: string; icon: string }> = [
		{ type: 'title', label: 'Title', icon: '📝' },
		{ type: 'metric', label: 'Metric', icon: '📊' },
		{ type: 'paragraph', label: 'Paragraph', icon: '📄' },
		{ type: 'table', label: 'Table', icon: '📋' },
		{ type: 'image', label: 'Image', icon: '🖼️' },
		{ type: 'map', label: 'Map', icon: '🗺️' },
		{ type: 'lineChart', label: 'Line Chart', icon: '📈' },
		{ type: 'barChart', label: 'Bar Chart', icon: '📊' }
	];
</script>

<div class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm">
	<div class="flex items-center gap-4">
		<!-- Auto-save toggle -->
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				checked={dashboard.autoSaveEnabled}
				onchange={(e) => dashboard.setAutoSave(e.currentTarget.checked)}
				class="h-4 w-4 rounded {darkMode ? 'text-indigo-500' : 'text-indigo-600'} focus:ring-indigo-500"
			/>
			<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">Auto-save</span>
		</label>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<!-- Dev Mode toggle -->
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="checkbox"
				checked={dashboard.devMode}
				onchange={(e) => dashboard.setDevMode(e.currentTarget.checked)}
				class="h-4 w-4 rounded {darkMode ? 'text-orange-500' : 'text-orange-600'} focus:ring-orange-500"
			/>
			<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">Dev Mode</span>
			<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">(disable storage)</span>
		</label>

		{#if dashboard.hasUnsavedChanges}
			<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
			<span class="text-xs {darkMode ? 'text-orange-400' : 'text-orange-600'}">• Unsaved changes</span>
		{/if}
	</div>

	<div class="flex items-center gap-2">
		<!-- Add Widget -->
		<button
			onclick={() => (showAddWidgetDialog = true)}
			class="px-3 py-1.5 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} rounded-md transition-colors shadow-sm hover:shadow-md"
		>
			+ Add Widget
		</button>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<!-- Manual Save -->
		<button
			onclick={handleSave}
			disabled={!dashboard.hasUnsavedChanges}
			class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			Save Layout
		</button>

		<!-- Export -->
		<button
			onclick={handleExport}
			class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
		>
			Export
		</button>

		<!-- Import -->
		<button
			onclick={() => (showImportDialog = true)}
			class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
		>
			Import
		</button>

		<!-- Reset -->
		<button
			onclick={handleReset}
			class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
		>
			Reset
		</button>

		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

		<!-- Clear Storage -->
		<button
			onclick={handleClear}
			class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
			title="Clear saved dashboard"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
			</svg>
		</button>
	</div>
</div>

<!-- Export Dialog -->
{#if showExportDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
		<div
			class="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 shadow-xl"
		>
			<h3 class="mb-4 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Export Dashboard Configuration</h3>

			<div class="mb-4 flex-1 overflow-auto">
				<textarea
					readonly
					value={exportedJson}
					class="h-64 w-full rounded-lg border {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50 text-slate-900 border-slate-300'} p-3 font-mono text-xs"
				></textarea>
			</div>

			<div class="flex justify-end gap-2">
				<button
					onclick={copyToClipboard}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} rounded-md transition-colors shadow-sm hover:shadow-md"
				>
					Copy to Clipboard
				</button>
				<button
					onclick={downloadJson}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'} rounded-md transition-colors shadow-sm hover:shadow-md"
				>
					Download JSON
				</button>
				<button
					onclick={() => (showExportDialog = false)}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Import Dialog -->
{#if showImportDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
		<div class="w-full max-w-2xl rounded-lg {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 shadow-xl">
			<h3 class="mb-4 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Import Dashboard Configuration</h3>

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
				<button
					onclick={handleImport}
					disabled={!importJson.trim()}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} rounded-md transition-colors shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
				>
					Import
				</button>
				<button
					onclick={() => {
						showImportDialog = false;
						importJson = '';
						importError = '';
					}}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Widget Dialog -->
{#if showAddWidgetDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
		<div class="w-full max-w-3xl rounded-lg {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 shadow-xl">
			<h3 class="mb-2 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Add Widget</h3>
			<p class="mb-4 text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">Select a widget type to add to your dashboard</p>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each widgetTypes as { type, label, icon }}
					<button
						onclick={() => handleAddWidget(type)}
						class="flex flex-col items-center gap-2 rounded-lg border-2 {darkMode ? 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-900/20' : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'} p-4 transition-all hover:shadow-md hover:scale-[1.02]"
					>
						<span class="text-3xl">{icon}</span>
						<span class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">{label}</span>
					</button>
				{/each}
			</div>

			<div class="mt-6 flex justify-end">
				<button
					onclick={() => (showAddWidgetDialog = false)}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
