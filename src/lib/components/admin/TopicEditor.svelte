<script lang="ts">
	import { browser } from '$app/environment';
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import JsonSchemaFormField from './JsonSchemaFormField.svelte';
	import type { DynamicSchemaDefinition } from '$lib/types/models';
	import type { WidgetType } from '$lib/dashboard/types/widget';
	import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';

	// Import widget components for preview
	import TitleWidget from '$lib/dashboard/components/widgets/TitleWidget.svelte';
	import ParagraphWidget from '$lib/dashboard/components/widgets/ParagraphWidget.svelte';
	import TableWidget from '$lib/dashboard/components/widgets/TableWidget.svelte';
	import ImageWidget from '$lib/dashboard/components/widgets/ImageWidget.svelte';
	import LineChartWidget from '$lib/dashboard/components/widgets/LineChartWidget.svelte';
	import BarChartWidget from '$lib/dashboard/components/widgets/BarChartWidget.svelte';
	import MetricWidget from '$lib/dashboard/components/widgets/MetricWidget.svelte';
	import MapWidget from '$lib/dashboard/components/widgets/MapWidget.svelte';
	import SchemaWidget from '$lib/dashboard/components/widgets/SchemaWidget.svelte';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	// State
	let selectedTopic = $state<string | null>(null);
	let searchQuery = $state<string>('');
	let schemaFilter = $state<string>('');
	let viewMode = $state<'form' | 'json'>('form');
	
	// Editing state
	let localData = $state<Record<string, unknown>>({});
	let localJson = $state<string>('');
	let topicSchema = $state<DynamicSchemaDefinition | null>(null);
	let isDirty = $state(false);
	let publishStatus = $state<'idle' | 'publishing' | 'success' | 'error'>('idle');
	let errorMessage = $state<string | null>(null);
	
	// Topics list
	let topics = $state<Array<{ topic: string; schemaId?: string; producers: number; consumers: number; hasValue: boolean }>>([]);

	// Initialize topics for all widgets when component loads
	// This ensures topics exist even if publishers haven't run yet
	$effect(() => {
		if (!browser) return;
		
		// Known widget IDs from the system
		const knownWidgetIds = [
			'widget-1', 'widget-4', 'widget-5', 'widget-6', 'widget-8',
			'widget-1760034441135', 'widget-1760034444139', 'widget-1760034594067',
			'widget-1760034597055', 'widget-1760034608731', 'widget-1760034608732',
			'widget-1760034605935', 'widget-1760034612393', 'widget-1760034618243',
			'widget-1760034621635', 'widget-1760034624211', 'widget-barchart-1'
		];
		
		const widgetTypes: WidgetType[] = ['title', 'paragraph', 'table', 'image', 'lineChart', 'barChart', 'metric', 'map'];
		
		// Create topics for known widgets by accessing them
		// This ensures they exist in the registry
		// Use setTimeout to avoid state mutation during render
		setTimeout(() => {
			for (const widgetId of knownWidgetIds) {
				// Try to determine widget type from ID (fallback to 'title' if unknown)
				const widgetType = widgetTypes.find(t => widgetId.includes(t)) || 'title';
				const topic = getWidgetTopic(widgetType, widgetId);
				const schemaId = getWidgetSchemaId(widgetType);
				
				// Create stream to ensure topic exists
				const stream = mapStore.getStream(topic, 'topic-editor-init');
				
				// Enforce schema if available
				if (schemaId) {
					mapStore.enforceTopicSchema(topic, schemaId);
				}
			}
		}, 0);
	});

	// Poll for topic updates
	$effect(() => {
		if (!browser) return;
		
		let interval: ReturnType<typeof setInterval> | null = null;
		
		function updateTopics() {
			const inspectorData = mapStore.getInspectorData();
			// Create new array to ensure reactivity
			topics = [...inspectorData];
		}
		
		// Start polling after component is mounted (avoid state mutation during render)
		const timeout = setTimeout(() => {
			updateTopics();
			interval = setInterval(updateTopics, 500);
		}, 100);
		
		return () => {
			clearTimeout(timeout);
			if (interval) {
				clearInterval(interval);
			}
		};
	});

	// Filtered topics
	const filteredTopics = $derived.by(() => {
		let result = [...topics]; // Create a copy to avoid mutation
		
		if (schemaFilter) {
			result = result.filter(t => t.schemaId === schemaFilter);
		}
		
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(t => 
				t.topic.toLowerCase().includes(query) ||
				t.schemaId?.toLowerCase().includes(query)
			);
		}
		
		// Sort on a copy to avoid mutating
		return [...result].sort((a, b) => a.topic.localeCompare(b.topic));
	});

	// Available schemas for filter
	const availableSchemas = $derived.by(() => {
		const schemaIds = new Set(topics.map(t => t.schemaId).filter(Boolean) as string[]);
		return Array.from(schemaIds)
			.map(id => schemaRegistry.getDefinition(id))
			.filter(Boolean) as DynamicSchemaDefinition[];
	});

	// Parse widget info from topic name
	const widgetInfo = $derived.by(() => {
		if (!selectedTopic || !selectedTopic.startsWith('widget:')) return null;
		const parts = selectedTopic.split(':');
		if (parts.length < 3) return null;
		const type = parts[1] as WidgetType;
		const validTypes: WidgetType[] = ['title', 'paragraph', 'table', 'image', 'lineChart', 'barChart', 'metric', 'map', 'schema'];
		if (!validTypes.includes(type)) return null;
		return {
			type,
			id: parts.slice(2).join(':')
		};
	});

	/**
	 * Load topic data
	 */
	function loadTopic(topic: string): void {
		selectedTopic = topic;
		isDirty = false;
		publishStatus = 'idle';
		errorMessage = null;
		
		// Get current data from MapStore
		const stream = mapStore.getStream(topic, 'topic-editor-loader');
		const currentData = stream.get();
		
		// Get schema
		const entry = topics.find(t => t.topic === topic);
		if (entry?.schemaId) {
			topicSchema = schemaRegistry.getDefinition(entry.schemaId) || null;
		} else {
			topicSchema = null;
		}
		
		// Initialize local data
		if (currentData && typeof currentData === 'object' && !Array.isArray(currentData)) {
			localData = { ...(currentData as Record<string, unknown>) };
			localJson = JSON.stringify(currentData, null, 2);
		} else {
			localData = {};
			localJson = currentData !== undefined ? JSON.stringify(currentData, null, 2) : '';
		}
	}

	/**
	 * Handle form field change
	 */
	function handleFieldChange(fieldName: string, value: unknown): void {
		localData[fieldName] = value;
		localJson = JSON.stringify(localData, null, 2);
		isDirty = true;
		publishStatus = 'idle';
	}

	/**
	 * Handle JSON change
	 */
	function handleJsonChange(newJson: string): void {
		localJson = newJson;
		isDirty = true;
		publishStatus = 'idle';
		
		try {
			const parsed = JSON.parse(newJson);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				localData = parsed;
			}
		} catch (e) {
			// Invalid JSON - keep localJson but don't update localData
		}
	}

	/**
	 * Reset to current topic data
	 */
	function resetData(): void {
		if (selectedTopic) {
			loadTopic(selectedTopic);
		}
	}

	/**
	 * Publish changes to topic
	 */
	async function publishChanges(): Promise<void> {
		if (!selectedTopic) return;
		
		publishStatus = 'publishing';
		errorMessage = null;
		
		try {
			let dataToPublish: unknown;
			
			if (viewMode === 'json') {
				// Validate JSON first
				try {
					dataToPublish = JSON.parse(localJson);
				} catch (e) {
					throw new Error('Invalid JSON format');
				}
			} else {
				dataToPublish = localData;
			}
			
			// Publish to MapStore
			const publisher = mapStore.getPublisher(selectedTopic, 'topic-editor');
			publisher.publish(dataToPublish);
			publisher.dispose();
			
			// Update local state
			isDirty = false;
			publishStatus = 'success';
			
			// Reload data to get the latest
			setTimeout(() => {
				loadTopic(selectedTopic!);
				setTimeout(() => {
					publishStatus = 'idle';
				}, 2000);
			}, 100);
		} catch (error: any) {
			publishStatus = 'error';
			errorMessage = error?.message || String(error);
		}
	}

	// Keyboard shortcuts
	$effect(() => {
		if (!browser || !selectedTopic) return;

		function handleKeyDown(e: KeyboardEvent) {
			// Ctrl/Cmd + S to save
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault();
				if (isDirty) {
					publishChanges();
				}
			}
			// Escape to reset
			if (e.key === 'Escape' && isDirty) {
				resetData();
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div class="h-full flex flex-col {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
	<!-- Header -->
	<div class="p-4 border-b {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}">
		<div class="flex items-center gap-4 mb-3">
			<h1 class="text-xl font-bold {darkMode ? 'text-white' : 'text-slate-900'}">Topic Editor</h1>
			<div class="flex-1 max-w-md">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search topics..."
					class="w-full rounded-md border px-3 py-2 text-sm {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				/>
			</div>
			<select
				bind:value={schemaFilter}
				class="rounded-md border px-3 py-2 text-sm {darkMode
					? 'bg-slate-700 border-slate-600 text-white'
					: 'bg-white border-slate-300 text-slate-900'}"
			>
				<option value="">All Schemas</option>
				{#each availableSchemas as schema (schema.id)}
					<option value={schema.id}>{schema.name || schema.id}</option>
				{/each}
			</select>
		</div>
		<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			{filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''} found
		</div>
	</div>

	<div class="flex-1 flex overflow-hidden">
		<!-- Left: Topic List -->
		<div class="w-80 border-r overflow-y-auto {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}">
			<!-- Debug info -->
			<div class="p-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				Total: {topics.length} | Filtered: {filteredTopics.length}
			</div>
			<div class="p-2 space-y-1">
				{#each filteredTopics as item (item.topic)}
					<button
						onclick={() => loadTopic(item.topic)}
						class="w-full text-left p-3 rounded-md transition-colors {selectedTopic === item.topic
							? darkMode
								? 'bg-indigo-600 text-white'
								: 'bg-indigo-100 text-indigo-900'
							: darkMode
								? 'hover:bg-slate-700 text-slate-200'
								: 'hover:bg-slate-100 text-slate-700'}"
					>
						<div class="font-medium text-sm break-all">{item.topic}</div>
						<div class="text-xs mt-1 flex gap-2 flex-wrap items-center">
							<span>{item.producers} 📤</span>
							<span>{item.consumers} 📥</span>
							{#if item.hasValue}
								<span class="text-green-400">●</span>
							{:else}
								<span class="opacity-50">○</span>
							{/if}
						</div>
						{#if item.schemaId}
							<div class="text-xs mt-1 opacity-75 truncate">{item.schemaId}</div>
						{/if}
					</button>
				{:else}
					<div class="p-4 text-center text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						{#if topics.length === 0}
							No topics found in MapStore
							<div class="text-xs mt-2 opacity-75">
								Topics appear when publishers publish or widgets subscribe
							</div>
						{:else}
							No topics match your filters
							<button
								onclick={() => { searchQuery = ''; schemaFilter = ''; }}
								class="mt-2 text-xs underline"
							>
								Clear filters
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Middle: Editor -->
		{#if selectedTopic}
			<div class="flex-1 flex flex-col overflow-hidden">
				<!-- Editor Header -->
				<div class="p-4 border-b {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}">
					<div class="flex items-start justify-between mb-3">
						<div class="flex-1 min-w-0">
							<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} break-all">
								{selectedTopic}
							</h2>
							{#if topicSchema}
								<div class="text-sm mt-1 {darkMode ? 'text-slate-400' : 'text-slate-600'}">
									Schema: <span class="font-medium">{topicSchema.name || topicSchema.id}</span>
								</div>
							{:else}
								<div class="text-sm mt-1 {darkMode ? 'text-amber-400' : 'text-amber-600'}">
									⚠️ No schema enforced
								</div>
							{/if}
						</div>
						<div class="flex gap-2 ml-4">
							<button
								onclick={() => (viewMode = 'form')}
								class="px-3 py-1.5 text-sm rounded-md transition-colors {viewMode === 'form'
									? darkMode
										? 'bg-indigo-600 text-white'
										: 'bg-indigo-600 text-white'
									: darkMode
										? 'bg-slate-700 text-slate-200'
										: 'bg-slate-100 text-slate-700'}"
							>
								📝 Form
							</button>
							<button
								onclick={() => (viewMode = 'json')}
								class="px-3 py-1.5 text-sm rounded-md transition-colors {viewMode === 'json'
									? darkMode
										? 'bg-indigo-600 text-white'
										: 'bg-indigo-600 text-white'
									: darkMode
										? 'bg-slate-700 text-slate-200'
										: 'bg-slate-100 text-slate-700'}"
							>
								📄 JSON
							</button>
						</div>
					</div>
					
					<!-- Action Buttons -->
					<div class="flex items-center gap-2">
						<button
							onclick={publishChanges}
							disabled={!isDirty || publishStatus === 'publishing'}
							class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if publishStatus === 'publishing'}
								<span class="animate-spin">⏳</span>
								Publishing...
							{:else if publishStatus === 'success'}
								<span>✅</span>
								Published!
							{:else if publishStatus === 'error'}
								<span>❌</span>
								Error
							{:else}
								<span>💾</span>
								Publish Changes
							{/if}
						</button>
						{#if isDirty}
							<button
								onclick={resetData}
								class="px-4 py-2 text-sm font-medium {darkMode
									? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
									: 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded-md transition-colors"
							>
								↺ Reset
							</button>
						{/if}
						{#if errorMessage}
							<div class="text-sm text-red-600 dark:text-red-400 ml-2">
								{errorMessage}
							</div>
						{/if}
						{#if isDirty}
							<div class="text-xs ml-auto {darkMode ? 'text-amber-400' : 'text-amber-600'}">
								✏️ Unsaved changes • Ctrl+S to save
							</div>
						{/if}
					</div>
				</div>

				<!-- Editor Content -->
				<div class="flex-1 overflow-y-auto p-6">
					{#if viewMode === 'form' && topicSchema?.jsonSchema.type === 'object' && topicSchema.jsonSchema.properties}
						<div class="space-y-4 max-w-3xl">
							{#each Object.entries(topicSchema.jsonSchema.properties) as [fieldName, fieldSchema]}
								{@const required = topicSchema.jsonSchema.required?.includes(fieldName) || false}
								<JsonSchemaFormField
									fieldName={fieldName}
									fieldSchema={fieldSchema}
									value={localData[fieldName]}
									{required}
									{darkMode}
									onChange={(value) => handleFieldChange(fieldName, value)}
								/>
							{/each}
						</div>
					{:else if viewMode === 'json'}
						<textarea
							bind:value={localJson}
							oninput={(e) => handleJsonChange(e.currentTarget.value)}
							class="w-full h-full rounded-md border px-4 py-3 font-mono text-sm {darkMode
								? 'bg-slate-950 border-slate-600 text-slate-300'
								: 'bg-white border-slate-300 text-slate-900'}"
							spellcheck="false"
							placeholder="Enter JSON data..."
						></textarea>
					{:else}
						<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							{#if !topicSchema}
								<p>No schema available for this topic</p>
								<p class="text-sm mt-2">Use JSON editor to edit raw data</p>
							{:else if topicSchema.jsonSchema.type !== 'object'}
								<p>Form editor only supports object schemas</p>
								<p class="text-sm mt-2">Use JSON editor to edit this data</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Right: Widget Preview -->
			{#if widgetInfo}
				{@const info = widgetInfo}
				<div class="w-96 border-l overflow-y-auto {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}">
					<div class="p-4 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} sticky top-0 {darkMode ? 'bg-slate-800' : 'bg-white'} z-10">
						<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Live Preview</h3>
						<div class="text-xs mt-1 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							{info.type} widget
						</div>
					</div>
					<div class="p-4">
						<div class="rounded-lg border p-4 {darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}">
							{#if info.type === 'title'}
								<TitleWidget data={localData as any} widgetId={info.id} {darkMode} />
							{:else if info.type === 'paragraph'}
								<ParagraphWidget data={localData as any} widgetId={info.id} {darkMode} />
							{:else if info.type === 'table'}
								<TableWidget data={localData as any} widgetId={info.id} {darkMode} />
							{:else if info.type === 'image'}
								<ImageWidget data={localData as any} widgetId={info.id} {darkMode} />
							{:else if info.type === 'lineChart'}
								<LineChartWidget data={localData as any} widgetId={info.id} {darkMode} />
							{:else if info.type === 'barChart'}
								<BarChartWidget data={localData as any} widgetId={info.id} {darkMode} />
							{:else if info.type === 'metric'}
								<MetricWidget data={localData as any} widgetId={info.id} {darkMode} />
							{:else if info.type === 'map'}
								<MapWidget data={localData as any} widgetId={info.id} {darkMode} />
							{:else if info.type === 'schema'}
								<SchemaWidget data={{ schemaId: topicSchema?.id || '', data: localData }} widgetId={info.id} {darkMode} />
							{/if}
						</div>
					</div>
				</div>
			{/if}
		{:else}
			<div class="flex-1 flex items-center justify-center">
				<div class="text-center {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					<div class="text-4xl mb-4">👈</div>
					<p class="text-lg font-medium">Select a topic to edit</p>
					<p class="text-sm mt-2">Use search or filters to find topics</p>
				</div>
			</div>
		{/if}
	</div>
</div>

