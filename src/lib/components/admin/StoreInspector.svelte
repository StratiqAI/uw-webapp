<script lang="ts">
	import { browser } from '$app/environment';
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	// 1. Get List of Topics (reactive)
	let inspectorData = $state<Array<{ topic: string; schemaId?: string; producers: number; consumers: number; hasValue: boolean }>>([]);
	let selectedTopic = $state<string | null>(null);

	// Initialize inspector data (only on client)
	$effect(() => {
		if (!browser) return; // Skip SSR

		// Initial load
		inspectorData = mapStore.getInspectorData();

		// Poll for structural changes (new topics created)
		const interval = setInterval(() => {
			inspectorData = mapStore.getInspectorData();
		}, 1000);

		return () => clearInterval(interval);
	});

	// 2. Selected Topic Logic - reactive value
	let topicValue = $state<unknown>(null);

	// Subscribe to selected topic when it changes
	$effect(() => {
		if (!browser || !selectedTopic) {
			topicValue = null;
			return;
		}

		const stream = mapStore.getStream(selectedTopic, 'store-inspector');
		const unsubscribe = stream.subscribe((val: unknown) => {
			topicValue = val;
		});

		return unsubscribe;
	});

	// 3. Manual Publish Logic
	let manualJson = $state('{}');
	let publishError = $state<string | null>(null);

	function publish() {
		if (!selectedTopic) return;
		publishError = null;
		try {
			const data = JSON.parse(manualJson);
			// Create ephemeral publisher
			const pub = mapStore.getPublisher(selectedTopic, 'inspector-manual');
			pub.publish(data);
			pub.dispose();
			// Clear error on success
			publishError = null;
		} catch (e: any) {
			publishError = e?.message || String(e);
		}
	}

	// 4. Schema Enforcement
	let selectedSchemaId = $state<string>('');
	let availableSchemas = $derived(schemaRegistry.getAllDefinitions());

	function enforceSchema() {
		if (selectedTopic && selectedSchemaId) {
			mapStore.enforceTopicSchema(selectedTopic, selectedSchemaId);
			inspectorData = mapStore.getInspectorData(); // Refresh
			selectedSchemaId = ''; // Reset
		}
	}

	// Get schema ID for selected topic
	let topicSchemaId = $derived.by(() => {
		if (!selectedTopic) return null;
		const entry = inspectorData.find((item: any) => item.topic === selectedTopic);
		return entry?.schemaId || null;
	});
</script>

<div class="flex h-full">
	<!-- Sidebar List -->
	<div
		class="w-1/3 border-r overflow-y-auto {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}"
	>
		<div
			class="p-4 border-b {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} sticky top-0 z-10"
		>
			<div class="flex items-center justify-between mb-2">
				<h2 class="font-semibold text-lg {darkMode ? 'text-white' : 'text-slate-900'}">Active Topics</h2>
				<button
					onclick={() => {
						// Create a test topic to verify inspector works
						const testTopic = `test:${Date.now()}`;
						const pub = mapStore.getPublisher(testTopic, 'test-publisher');
						pub.publish({ message: 'Test data', timestamp: Date.now() });
						pub.dispose();
						// Refresh inspector data
						inspectorData = mapStore.getInspectorData();
					}}
					class="px-2 py-1 text-xs font-medium {darkMode
						? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
						: 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded transition-colors"
					title="Create test topic"
				>
					+ Test
				</button>
			</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Total: {inspectorData.length} | Auto-refresh: 1s
			</div>
		</div>
		<div class="p-2 space-y-2">
			{#each inspectorData as item}
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
						<span>Producers: {item.producers}</span>
						<span>Consumers: {item.consumers}</span>
						{#if item.hasValue}
							<span
								class="px-1.5 py-0.5 rounded {darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'}"
							>
								Has Value
							</span>
						{/if}
					</div>
					{#if item.schemaId}
						<div class="mt-2">
							<span
								class="px-1.5 py-0.5 rounded text-xs {darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'}"
							>
								{item.schemaId}
							</span>
						</div>
					{/if}
				</button>
			{:else}
				<div class="p-4 text-center {darkMode ? 'text-slate-400' : 'text-slate-400'}">No topics yet</div>
			{/each}
		</div>
	</div>

	<!-- Detail View -->
	<div class="w-2/3 p-6 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
		{#if selectedTopic}
			<h2 class="text-xl font-semibold mb-4 break-all {darkMode ? 'text-white' : 'text-slate-900'}">
				{selectedTopic}
			</h2>

			<!-- Schema Enforcement Section -->
			<div
				class="rounded-lg border p-4 mb-4 shadow-sm {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			>
				<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-slate-200' : 'text-slate-700'}">
					Schema Enforcement
				</h3>
				{#if topicSchemaId}
					<div
						class="mb-2 p-3 rounded-md {darkMode ? 'bg-green-900/20 border border-green-800/50' : 'bg-green-50 border border-green-200'}"
					>
						<span class="text-sm {darkMode ? 'text-green-300' : 'text-green-800'}">
							✓ Enforced:{' '}
							<code
								class="px-1.5 py-0.5 rounded {darkMode ? 'bg-green-900/50' : 'bg-green-100'}"
							>
								{topicSchemaId}
							</code>
						</span>
					</div>
				{:else}
					<div class="flex gap-2">
						<select
							bind:value={selectedSchemaId}
							class="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
								? 'bg-slate-700 border-slate-600 text-white'
								: 'bg-white border-slate-300 text-slate-900'} disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={availableSchemas.length === 0}
						>
							<option value="">Select schema to enforce...</option>
							{#each availableSchemas as schema}
								<option value={schema.id}>{schema.id} - {schema.name}</option>
							{/each}
						</select>
						<button
							onclick={enforceSchema}
							disabled={!selectedSchemaId}
							class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-md transition-colors shadow-sm hover:shadow-md"
						>
							Enforce
						</button>
					</div>
					{#if availableSchemas.length === 0}
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-2">
							No schemas registered. Use Schema Builder to create one.
						</p>
					{/if}
				{/if}
			</div>

			<!-- Live Value -->
			<div
				class="rounded-lg border p-4 mb-4 shadow-sm {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			>
				<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-slate-200' : 'text-slate-700'}">
					Current Value
				</h3>
				{#if topicValue !== undefined && topicValue !== null}
					<pre
						class="rounded-md p-3 text-sm overflow-auto max-h-96 whitespace-pre-wrap break-words {darkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-900'}"
					>
{JSON.stringify(topicValue, null, 2)}</pre
					>
				{:else}
					<div class="{darkMode ? 'text-slate-400' : 'text-slate-400'} italic p-3">No value set</div>
				{/if}
			</div>

			<!-- Actions -->
			<div
				class="rounded-lg border p-4 shadow-sm {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			>
				<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Inject Data</h3>
				<textarea
					bind:value={manualJson}
					class="w-full rounded-md border px-3 py-2 font-mono h-32 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					placeholder={`{"key": "value"}`}
				></textarea>
				{#if publishError}
					<div
						class="mt-2 p-2 rounded-md text-sm {darkMode ? 'bg-red-900/20 border border-red-800/50 text-red-300' : 'bg-red-50 border border-red-200 text-red-800'}"
					>
						Error: {publishError}
					</div>
				{/if}
				<button
					onclick={publish}
					class="mt-3 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-sm hover:shadow-md"
				>
					Publish JSON
				</button>
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-2">
					{#if topicSchemaId}
						Data will be validated against schema:{' '}
						<code class="{darkMode ? 'bg-slate-700' : 'bg-slate-100'} px-1 rounded">{topicSchemaId}</code>
					{:else}
						No schema enforced - data will be published unchecked
					{/if}
				</p>
			</div>
		{:else}
			<div class="text-center mt-20 {darkMode ? 'text-slate-400' : 'text-slate-400'}">
				<div class="text-2xl mb-2">👈</div>
				<div>Select a topic to inspect</div>
			</div>
		{/if}
	</div>
</div>
