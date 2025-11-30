<script lang="ts">
	import UniversalWidget from '$lib/components/UniversalWidget.svelte';
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Test topics
	let testTopic = $state('test:property:1');
	let availableTopics = $state<string[]>([]);

	// Example schema for testing
	const examplePropertySchema = {
		id: 'test:property-schema',
		name: 'Property Example',
		fields: [
			{ name: 'id', type: 'string', required: true },
			{ name: 'name', type: 'string', required: true },
			{ name: 'address', type: 'string', required: true },
			{
				name: 'assetClass',
				type: 'enum',
				required: true,
				options: ['Office', 'Industrial', 'Multifamily', 'Retail', 'Hotel']
			},
			{ name: 'sqFt', type: 'number', required: true, min: 0 },
			{ name: 'yearBuilt', type: 'number', required: false, min: 1800, max: 2100 },
			{
				name: 'units',
				type: 'array',
				required: false,
				itemType: 'object',
				subFields: [
					{ name: 'unitNumber', type: 'string', required: true },
					{ name: 'rent', type: 'number', required: true, min: 0 },
					{ name: 'occupied', type: 'boolean', required: true }
				]
			}
		]
	};

	// Example data
	const examplePropertyData = {
		id: 'prop-001',
		name: 'Sunset Office Complex',
		address: '123 Main St, Portland, OR 97201',
		assetClass: 'Office',
		sqFt: 50000,
		yearBuilt: 2015,
		units: [
			{ unitNumber: '101', rent: 2500, occupied: true },
			{ unitNumber: '102', rent: 2800, occupied: true },
			{ unitNumber: '103', rent: 2400, occupied: false }
		]
	};

	function registerExampleSchema() {
		try {
			schemaRegistry.register(examplePropertySchema);
			alert('Schema registered successfully!');
		} catch (e: any) {
			alert('Error: ' + (e?.message || String(e)));
		}
	}

	function enforceSchema() {
		if (testTopic) {
			mapStore.enforceTopicSchema(testTopic, examplePropertySchema.id);
			alert(`Schema enforced on topic: ${testTopic}`);
		}
	}

	function publishExampleData() {
		const pub = mapStore.getPublisher(testTopic, 'demo-publisher');
		pub.publish(examplePropertyData);
		pub.dispose();
		alert('Data published!');
	}

	function refreshTopics() {
		const inspectorData = mapStore.getInspectorData();
		availableTopics = inspectorData.map((item) => item.topic);
	}

	// Initialize
	$effect(() => {
		refreshTopics();
		const interval = setInterval(refreshTopics, 2000);
		return () => clearInterval(interval);
	});
</script>

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<!-- Header -->
		<div
			class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm"
		>
			<div class="flex items-center gap-4">
				<h1
					class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight"
				>
					Universal Widget Demo
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					Test the Universal Rendering Engine
				</span>
			</div>
		</div>

		<!-- Controls -->
		<div
			class="p-4 border-b {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
		>
			<div class="flex flex-wrap gap-3 items-center">
				<div class="flex items-center gap-2">
					<label class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
						Topic:
					</label>
					<input
						bind:value={testTopic}
						class="px-3 py-1.5 text-sm rounded-md border {darkMode
							? 'bg-slate-700 border-slate-600 text-white'
							: 'bg-white border-slate-300 text-slate-900'} focus:outline-none focus:ring-2 focus:ring-indigo-500"
						placeholder="test:property:1"
					/>
				</div>

				<button
					onclick={registerExampleSchema}
					class="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
				>
					Register Schema
				</button>

				<button
					onclick={enforceSchema}
					class="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
				>
					Enforce Schema
				</button>

				<button
					onclick={publishExampleData}
					class="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
				>
					Publish Data
				</button>

				<button
					onclick={refreshTopics}
					class="px-3 py-1.5 text-sm font-medium {darkMode
						? 'bg-slate-700 hover:bg-slate-600 text-white'
						: 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded-md transition-colors"
				>
					Refresh Topics
				</button>
			</div>

			<div class="mt-3 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Available Topics: {availableTopics.length > 0 ? availableTopics.join(', ') : 'None'}
			</div>
		</div>

		<!-- Widget Display -->
		<div class="flex-1 p-6 overflow-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-6xl mx-auto">
				<div class="mb-4 text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					<h2 class="font-semibold mb-2">Universal Widget Rendering:</h2>
					<p class="text-xs">
						This widget will automatically render data based on the schema. If no custom component
						is registered, it will use AutoDataView to generate a UI from the schema definition.
					</p>
				</div>

				<div class="h-[600px] rounded-lg border shadow-lg {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
					<UniversalWidget topic={testTopic} />
				</div>

				<div class="mt-4 p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-blue-50 border border-blue-200'}">
					<h3 class="text-sm font-semibold mb-2 {darkMode ? 'text-slate-200' : 'text-blue-900'}">
						How to Test:
					</h3>
					<ol class="text-xs space-y-1 {darkMode ? 'text-slate-300' : 'text-blue-800'} list-decimal list-inside">
						<li>Click "Register Schema" to register the example property schema</li>
						<li>Click "Enforce Schema" to bind the schema to the topic</li>
						<li>Click "Publish Data" to publish example property data</li>
						<li>The UniversalWidget will automatically render the data using AutoDataView</li>
					</ol>
				</div>
			</div>
		</div>
	</div>
</div>

