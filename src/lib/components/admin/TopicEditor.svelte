<script lang="ts">
	import { browser } from '$app/environment';
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import JsonSchemaFormField from './JsonSchemaFormField.svelte';
	import type { JsonSchemaDefinition, DynamicSchemaDefinition } from '$lib/types/models';
	import type { WidgetType } from '$lib/dashboard/types/widget';
	
	// Import widget components
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

	// Topic list and filtering
	let inspectorData = $state<Array<{ topic: string; schemaId?: string; producers: number; consumers: number; hasValue: boolean }>>([]);
	let selectedTopic = $state<string | null>(null);
	let schemaFilter = $state<string>('');
	let searchQuery = $state<string>('');
	let viewMode = $state<'form' | 'json'>('form');
	let showTable = $state(false);

	// Get all available schemas for filter dropdown
	let availableSchemas = $derived(schemaRegistry.getAllDefinitions());

	// Filtered and searched topics
	let filteredTopics = $derived.by(() => {
		let topics = inspectorData;

		// Apply schema filter
		if (schemaFilter) {
			topics = topics.filter(item => item.schemaId === schemaFilter);
		}

		// Apply search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			topics = topics.filter(item => 
				item.topic.toLowerCase().includes(query) ||
				item.schemaId?.toLowerCase().includes(query)
			);
		}

		return topics;
	});

	// Selected topic data
	let topicData = $state<unknown>(null);
	let topicSchema = $derived<DynamicSchemaDefinition | null>(null);
	let formData = $state<Record<string, unknown>>({});
	let jsonData = $state<string>('');
	let publishError = $state<string | null>(null);
	let publishSuccess = $state(false);
	// Use a ref object to avoid closure issues
	let isEditingRef = { value: false };
	let lastPublishedData = $state<unknown>(null); // Track last published data to avoid overwriting edits
	let editingTimeout: ReturnType<typeof setTimeout> | null = null;
	let isUpdatingFromSubscription = false; // Flag to prevent recursive updates
	
	// Reactive getter for UI
	let isEditing = $derived(isEditingRef.value);

	// Initialize inspector data and poll for changes
	$effect(() => {
		if (!browser) return;

		inspectorData = mapStore.getInspectorData();

		const interval = setInterval(() => {
			inspectorData = mapStore.getInspectorData();
		}, 1000);

		return () => clearInterval(interval);
	});

	// Subscribe to selected topic for live updates
	let unsubscribeStream: (() => void) | null = null;
	
	$effect(() => {
		if (!browser || !selectedTopic) {
			if (unsubscribeStream) {
				unsubscribeStream();
				unsubscribeStream = null;
			}
			topicData = null;
			formData = {};
			jsonData = '';
			isEditingRef.value = false;
			lastPublishedData = null;
			if (editingTimeout) {
				clearTimeout(editingTimeout);
				editingTimeout = null;
			}
			return;
		}

		// Reset editing state when topic changes
		isEditingRef.value = false;
		if (editingTimeout) {
			clearTimeout(editingTimeout);
			editingTimeout = null;
		}

		const stream = mapStore.getStream(selectedTopic, 'topic-editor');
		
		// Get initial value first (before subscribing)
		const initialValue = stream.get();
		if (initialValue && typeof initialValue === 'object' && !Array.isArray(initialValue)) {
			formData = { ...(initialValue as Record<string, unknown>) };
			jsonData = JSON.stringify(initialValue, null, 2);
		} else {
			formData = {};
			jsonData = initialValue !== undefined ? JSON.stringify(initialValue, null, 2) : '';
		}
		lastPublishedData = initialValue;
		topicData = initialValue;

		// Subscribe to updates - but pause updates while editing
		unsubscribeStream = stream.subscribe((val: unknown) => {
			// Skip updates while user is editing or if we're already updating
			// Use ref directly to avoid closure issues
			if (isEditingRef.value || isUpdatingFromSubscription) return;
			
			isUpdatingFromSubscription = true;
			try {
				topicData = val;
				const dataStr = JSON.stringify(val);
				const lastStr = JSON.stringify(lastPublishedData);
				// Only update if data changed from external source
				if (dataStr !== lastStr) {
					if (val && typeof val === 'object' && !Array.isArray(val)) {
						formData = { ...(val as Record<string, unknown>) };
						jsonData = JSON.stringify(val, null, 2);
					} else {
						formData = {};
						jsonData = val !== undefined ? JSON.stringify(val, null, 2) : '';
					}
					lastPublishedData = val;
				}
			} finally {
				isUpdatingFromSubscription = false;
			}
		});

		// Get schema for this topic
		const entry = inspectorData.find(item => item.topic === selectedTopic);
		if (entry?.schemaId) {
			topicSchema = schemaRegistry.getDefinition(entry.schemaId) || null;
		} else {
			topicSchema = null;
		}

		return () => {
			if (unsubscribeStream) {
				unsubscribeStream();
				unsubscribeStream = null;
			}
			if (editingTimeout) {
				clearTimeout(editingTimeout);
				editingTimeout = null;
			}
		};
	});


	// Initialize form data when schema changes (only if not editing and no data)
	$effect(() => {
		if (!selectedTopic || !topicSchema || isEditingRef.value) {
			return;
		}

		const jsonSchema = topicSchema.jsonSchema;
		if (jsonSchema.type === 'object' && jsonSchema.properties) {
			// Only initialize if we don't have data yet
			if (Object.keys(formData).length === 0) {
				formData = initializeFormData(jsonSchema);
				jsonData = JSON.stringify(formData, null, 2);
			}
		}
	});

	function initializeFormData(schema: JsonSchemaDefinition): Record<string, unknown> {
		if (schema.type !== 'object' || !schema.properties) {
			return {};
		}

		const data: Record<string, unknown> = {};
		for (const [key, propSchema] of Object.entries(schema.properties)) {
			if (schema.required?.includes(key)) {
				data[key] = getDefaultValue(propSchema);
			} else {
				data[key] = getOptionalDefaultValue(propSchema);
			}
		}
		return data;
	}

	function getDefaultValue(schema: JsonSchemaDefinition): unknown {
		if (schema.default !== undefined) return schema.default;
		if (schema.type === 'string') return '';
		if (schema.type === 'number' || schema.type === 'integer') return 0;
		if (schema.type === 'boolean') return false;
		if (schema.type === 'array') return [];
		if (schema.type === 'object') return {};
		return null;
	}

	function getOptionalDefaultValue(schema: JsonSchemaDefinition): unknown {
		if (Array.isArray(schema.type)) {
			const nonNullType = schema.type.find(t => t !== 'null');
			if (nonNullType === 'string') return '';
			if (nonNullType === 'number' || nonNullType === 'integer') return null;
			if (nonNullType === 'boolean') return null;
			if (nonNullType === 'array') return null;
			if (nonNullType === 'object') return null;
			return null;
		}
		if (schema.anyOf && schema.anyOf.length > 0) {
			const nonNullSchema = schema.anyOf.find(s => {
				if (Array.isArray(s.type)) {
					return s.type.some(t => t !== 'null');
				}
				return s.type && s.type !== 'null';
			});
			if (nonNullSchema) {
				return getDefaultValue(nonNullSchema);
			}
		}
		return null;
	}

	function handleFieldChange(fieldName: string, value: unknown) {
		// Clear any existing timeout
		if (editingTimeout) {
			clearTimeout(editingTimeout);
			editingTimeout = null;
		}
		
		// Set editing flag immediately - use ref to avoid closure issues
		isEditingRef.value = true;
		
		// Update data - create new object to trigger reactivity properly
		formData = { ...formData, [fieldName]: value };
		jsonData = JSON.stringify(formData, null, 2);
		publishSuccess = false;
		publishError = null;
	}

	function handleJsonChange(newJson: string) {
		// Clear any existing timeout
		if (editingTimeout) {
			clearTimeout(editingTimeout);
			editingTimeout = null;
		}
		
		// Set editing flag immediately - use ref
		isEditingRef.value = true;
		jsonData = newJson;
		
		try {
			const parsed = JSON.parse(newJson);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				formData = parsed;
			}
			publishError = null;
		} catch (e) {
			// Invalid JSON - don't update formData
		}
	}

	function resetToTopicData() {
		isEditingRef.value = false;
		if (topicData && typeof topicData === 'object' && !Array.isArray(topicData)) {
			formData = { ...(topicData as Record<string, unknown>) };
			jsonData = JSON.stringify(topicData, null, 2);
			lastPublishedData = topicData;
		} else {
			formData = {};
			jsonData = topicData !== undefined ? JSON.stringify(topicData, null, 2) : '';
			lastPublishedData = topicData;
		}
	}

	function publishChanges() {
		if (!selectedTopic) return;

		// Clear editing timeout
		if (editingTimeout) {
			clearTimeout(editingTimeout);
			editingTimeout = null;
		}

		publishError = null;
		publishSuccess = false;

		try {
			let dataToPublish: unknown;
			
			if (viewMode === 'json') {
				// Parse JSON editor content
				dataToPublish = JSON.parse(jsonData);
			} else {
				// Use form data
				dataToPublish = formData;
			}

			const publisher = mapStore.getPublisher(selectedTopic, 'topic-editor');
			publisher.publish(dataToPublish);
			publisher.dispose();
			
			// Update tracking after successful publish
			lastPublishedData = dataToPublish;
			isEditingRef.value = false;
			publishSuccess = true;
			setTimeout(() => {
				publishSuccess = false;
			}, 3000);
		} catch (error: any) {
			publishError = error?.message || String(error);
		}
	}

	function clearFilters() {
		schemaFilter = '';
		searchQuery = '';
	}

	// Parse widget type and ID from topic name (format: widget:${type}:${widgetId})
	const widgetType = $derived<WidgetType | null>(() => {
		if (!selectedTopic || !selectedTopic.startsWith('widget:')) return null;
		const parts = selectedTopic.split(':');
		if (parts.length < 3) return null;
		const type = parts[1] as WidgetType;
		// Valid widget types
		const validTypes: WidgetType[] = ['title', 'paragraph', 'table', 'image', 'lineChart', 'barChart', 'metric', 'map', 'schema'];
		return validTypes.includes(type) ? type : null;
	});

	const widgetId = $derived(() => {
		if (!selectedTopic || !selectedTopic.startsWith('widget:')) return '';
		const parts = selectedTopic.split(':');
		if (parts.length < 3) return '';
		return parts.slice(2).join(':'); // Handle widget IDs that might contain colons
	});

	// Keyboard shortcuts
	$effect(() => {
		if (!browser || !selectedTopic) return;

		function handleKeyDown(e: KeyboardEvent) {
			// Ctrl/Cmd + S to save
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault();
				publishChanges();
			}
			// Escape to clear selection
			if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
				selectedTopic = null;
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div class="flex flex-col h-full {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
	<!-- Top Bar: Search and Filters -->
	<div class="p-4 border-b {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
		<div class="flex items-center gap-4 flex-wrap">
			<!-- Search -->
			<div class="flex-1 min-w-[200px]">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search topics..."
					class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				/>
			</div>

			<!-- Schema Filter -->
			<div class="min-w-[200px]">
				<select
					bind:value={schemaFilter}
					class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white'
						: 'bg-white border-slate-300 text-slate-900'}"
				>
					<option value="">All Schemas</option>
					{#each availableSchemas as schema}
						<option value={schema.id}>
							{schema.name} ({mapStore.getTopicsBySchema(schema.id).length})
						</option>
					{/each}
				</select>
			</div>

			<!-- View Toggle -->
			<div class="flex gap-2">
				<button
					onclick={() => (showTable = !showTable)}
					class="px-3 py-2 text-sm font-medium rounded-md transition-colors {showTable
						? darkMode
							? 'bg-indigo-600 text-white'
							: 'bg-indigo-600 text-white'
						: darkMode
							? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
							: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
					title="Toggle table view"
				>
					📊 Table
				</button>
				{#if (schemaFilter || searchQuery)}
					<button
						onclick={clearFilters}
						class="px-3 py-2 text-sm font-medium rounded-md transition-colors {darkMode
							? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
							: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
						title="Clear filters"
					>
						✕ Clear
					</button>
				{/if}
			</div>

			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				{filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''}
			</div>
		</div>
	</div>

	<div class="flex-1 flex overflow-hidden">
		<!-- Left Sidebar: Topic List -->
		<div class="w-80 border-r overflow-y-auto {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}">
			{#if showTable}
				<!-- Table View -->
				<table class="w-full text-sm">
					<thead class="sticky top-0 {darkMode ? 'bg-slate-800' : 'bg-white'} border-b">
						<tr>
							<th class="text-left p-3 font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">Topic</th>
							<th class="text-left p-3 font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">Schema</th>
							<th class="text-center p-3 font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">Data</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTopics as item}
							<tr
								class="border-b cursor-pointer transition-colors {selectedTopic === item.topic
									? darkMode
										? 'bg-indigo-900/50'
										: 'bg-indigo-50'
									: darkMode
										? 'hover:bg-slate-700'
										: 'hover:bg-slate-100'}"
								onclick={() => (selectedTopic = item.topic)}
							>
								<td class="p-3 {darkMode ? 'text-white' : 'text-slate-900'} font-mono text-xs break-all">
									{item.topic}
								</td>
								<td class="p-3">
									{#if item.schemaId}
										<span class="px-2 py-1 rounded text-xs {darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'}">
											{item.schemaId}
										</span>
									{:else}
										<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">—</span>
									{/if}
								</td>
								<td class="p-3 text-center">
									{#if item.hasValue}
										<span class="px-2 py-1 rounded text-xs {darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'}">
											✓
										</span>
									{:else}
										<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<!-- List View -->
				<div class="p-2 space-y-2">
					{#each filteredTopics as item}
						<button
							class="w-full text-left p-3 rounded-md transition-colors border {selectedTopic === item.topic
								? darkMode
									? 'bg-indigo-900/50 border-indigo-700'
									: 'bg-indigo-50 border-indigo-300'
								: darkMode
									? 'bg-slate-700 border-slate-600 hover:bg-slate-600'
									: 'bg-white border-slate-200 hover:bg-slate-100'}"
							onclick={() => (selectedTopic = item.topic)}
						>
							<div class="font-semibold text-sm {darkMode ? 'text-white' : 'text-slate-900'} break-all">
								{item.topic}
							</div>
							<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} flex gap-2 mt-1.5 flex-wrap">
								<span>📤 {item.producers}</span>
								<span>📥 {item.consumers}</span>
								{#if item.hasValue}
									<span class="px-1.5 py-0.5 rounded {darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'}">
										Has Data
									</span>
								{/if}
							</div>
							{#if item.schemaId}
								<div class="mt-2">
									<span class="px-1.5 py-0.5 rounded text-xs {darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'}">
										{item.schemaId}
									</span>
								</div>
							{/if}
						</button>
					{:else}
						<div class="p-4 text-center {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							{#if schemaFilter || searchQuery}
								No topics match your filters
							{:else}
								No topics yet
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right Panel: Editor -->
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			{#if selectedTopic}
				<div class="p-6">
					<!-- Header -->
					<div class="mb-6 flex items-start justify-between">
						<div class="flex-1">
							<h2 class="text-2xl font-bold mb-2 break-all {darkMode ? 'text-white' : 'text-slate-900'}">
								{selectedTopic}
							</h2>
							{#if topicSchema}
								<div class="flex items-center gap-2">
									<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
										Schema:
									</span>
									<span class="px-2 py-1 rounded text-sm font-medium {darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'}">
										{topicSchema.name || topicSchema.id}
									</span>
								</div>
							{:else}
								<div class="text-sm {darkMode ? 'text-amber-400' : 'text-amber-600'}">
									⚠️ No schema enforced
								</div>
							{/if}
						</div>
						<button
							onclick={() => (selectedTopic = null)}
							class="p-2 rounded-lg {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'} transition-colors"
							title="Close (Esc)"
						>
							✕
						</button>
					</div>

					{#if topicSchema && topicSchema.jsonSchema.type === 'object' && topicSchema.jsonSchema.properties}
						<!-- Editor Mode Toggle -->
						<div class="mb-4 flex gap-2">
							<button
								onclick={() => (viewMode = 'form')}
								class="px-4 py-2 text-sm font-medium rounded-md transition-colors {viewMode === 'form'
									? darkMode
										? 'bg-indigo-600 text-white'
										: 'bg-indigo-600 text-white'
									: darkMode
										? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
										: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
							>
								📝 Form Editor
							</button>
							<button
								onclick={() => (viewMode = 'json')}
								class="px-4 py-2 text-sm font-medium rounded-md transition-colors {viewMode === 'json'
									? darkMode
										? 'bg-indigo-600 text-white'
										: 'bg-indigo-600 text-white'
									: darkMode
										? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
										: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
							>
								📄 JSON Editor
							</button>
						</div>

						{#if viewMode === 'form'}
							<!-- Form Editor -->
							<div class="rounded-lg border p-6 mb-6 shadow-sm {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
								<div class="space-y-4">
									{#each Object.entries(topicSchema.jsonSchema.properties) as [fieldName, fieldSchema]}
										{@const required = topicSchema.jsonSchema.required?.includes(fieldName) || false}
										<JsonSchemaFormField
											{fieldName}
											{fieldSchema}
											value={formData[fieldName]}
											{required}
											{darkMode}
											onChange={(value) => handleFieldChange(fieldName, value)}
										/>
									{/each}
								</div>
							</div>
						{:else}
							<!-- JSON Editor -->
							<div class="rounded-lg border p-6 mb-6 shadow-sm {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
								<textarea
									bind:value={jsonData}
									oninput={(e) => handleJsonChange(e.currentTarget.value)}
									class="w-full rounded-md border px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 {darkMode
										? 'bg-slate-950 border-slate-600 text-slate-300'
										: 'bg-slate-50 border-slate-300 text-slate-900'}"
									rows="20"
									spellcheck="false"
								></textarea>
								{#if publishError && publishError.includes('JSON')}
									<div class="mt-2 text-sm text-red-600 dark:text-red-400">
										Invalid JSON: {publishError}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Actions -->
						<div class="rounded-lg border p-6 shadow-sm {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
							<div class="flex items-center justify-between gap-4">
								<div class="flex-1">
									{#if publishError}
										<div class="text-sm text-red-600 dark:text-red-400">
											Error: {publishError}
										</div>
									{:else if publishSuccess}
										<div class="text-sm text-green-600 dark:text-green-400">
											✅ Changes published successfully!
										</div>
									{:else if isEditing}
										<div class="text-xs {darkMode ? 'text-amber-400' : 'text-amber-600'}">
											✏️ You have unsaved changes
										</div>
									{:else}
										<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
											Press <kbd class="px-1.5 py-0.5 rounded {darkMode ? 'bg-slate-700' : 'bg-slate-100'}">Ctrl+S</kbd> to save
										</div>
									{/if}
								</div>
								<div class="flex gap-2">
									{#if isEditing}
										<button
											onclick={resetToTopicData}
											class="px-4 py-2.5 text-sm font-medium {darkMode
												? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
												: 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded-lg transition-colors"
											title="Reset to current topic data"
										>
											↺ Reset
										</button>
									{/if}
									<button
										onclick={publishChanges}
										disabled={!isEditing && !publishSuccess}
										class="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
									>
										💾 Publish Changes
									</button>
								</div>
							</div>
						</div>
					{:else if topicSchema}
						<div class="rounded-lg border p-6 {darkMode ? 'bg-amber-900/20 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}">
							<p class="font-medium">⚠️ Schema is not an object type</p>
							<p class="text-sm mt-2">This editor only supports object schemas. Current type: {topicSchema.jsonSchema.type || 'unknown'}</p>
						</div>
					{:else}
						<div class="rounded-lg border p-6 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
							<div class="text-center py-8">
								<p class="text-lg font-medium mb-2 {darkMode ? 'text-slate-300' : 'text-slate-700'}">
									No Schema Available
								</p>
								<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									This topic doesn't have a schema enforced. Use the Store Inspector to enforce a schema first.
								</p>
							</div>
						</div>
				{/if}
			</div>
		{:else}
			<div class="flex items-center justify-center h-full">
				<div class="text-center {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					<div class="text-4xl mb-4">👈</div>
					<div class="text-lg font-medium mb-2">Select a topic to edit</div>
					<div class="text-sm">Use search or filters to find topics quickly</div>
				</div>
			</div>
		{/if}
		</div>

		<!-- Right Panel: Widget Preview -->
		{#if selectedTopic && widgetType && widgetId && widgetId !== ''}
			<div class="w-96 overflow-y-auto border-l {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
				<div class="p-4 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} sticky top-0 {darkMode ? 'bg-slate-800' : 'bg-white'} z-10">
					<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Widget Preview</h3>
					<p class="text-xs mt-1 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						{widgetType} widget
					</p>
				</div>
				<div class="p-4 h-full">
					<div class="rounded-lg border {darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'} p-4 min-h-[400px]">
						{#if widgetType === 'title'}
							<TitleWidget data={formData} widgetId={widgetId} {darkMode} />
						{:else if widgetType === 'paragraph'}
							<ParagraphWidget data={formData} widgetId={widgetId} {darkMode} />
						{:else if widgetType === 'table'}
							<TableWidget data={formData} widgetId={widgetId} {darkMode} />
						{:else if widgetType === 'image'}
							<ImageWidget data={formData} widgetId={widgetId} {darkMode} />
						{:else if widgetType === 'lineChart'}
							<LineChartWidget data={formData} widgetId={widgetId} {darkMode} />
						{:else if widgetType === 'barChart'}
							<BarChartWidget data={formData} widgetId={widgetId} {darkMode} />
						{:else if widgetType === 'metric'}
							<MetricWidget data={formData} widgetId={widgetId} {darkMode} />
						{:else if widgetType === 'map'}
							<MapWidget data={formData} widgetId={widgetId} {darkMode} />
						{:else if widgetType === 'schema'}
							<SchemaWidget data={{ schemaId: topicSchema?.id, data: formData }} widgetId={widgetId} {darkMode} />
						{/if}
					</div>
				</div>
			</div>
		{:else if selectedTopic}
			<div class="w-96 overflow-y-auto border-l {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
				<div class="flex items-center justify-center h-full">
					<div class="text-center p-6 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						<div class="text-2xl mb-2">📦</div>
						<div class="text-sm">Not a widget topic</div>
						<div class="text-xs mt-1">Widget preview only available for widget topics</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
