<script lang="ts">
	import UniversalWidget from '$lib/components/UniversalWidget.svelte';
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	const exampleSchema = {
		id: 'demo:comparison',
		name: 'Property Comparison',
		fields: [
			{ name: 'id', type: 'string', required: true },
			{ name: 'name', type: 'string', required: true },
			{ name: 'address', type: 'string', required: true },
			{ name: 'sqFt', type: 'number', required: true },
			{ name: 'yearBuilt', type: 'number', required: false }
		]
	};

	const exampleData = {
		id: 'prop-001',
		name: 'Sunset Office Complex',
		address: '123 Main St, Portland, OR 97201',
		sqFt: 50000,
		yearBuilt: 2015
	};

	function setupDemo() {
		try {
			schemaRegistry.register(exampleSchema);
			mapStore.enforceTopicSchema('demo:with-schema', exampleSchema.id);
			mapStore.enforceTopicSchema('demo:without-schema', undefined as any);
			
			const pub1 = mapStore.getPublisher('demo:with-schema', 'demo');
			pub1.publish(exampleData);
			pub1.dispose();

			const pub2 = mapStore.getPublisher('demo:without-schema', 'demo');
			pub2.publish(exampleData);
			pub2.dispose();
		} catch (e: any) {
			console.error('Error:', e);
		}
	}

	$effect(() => {
		setupDemo();
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
					With vs Without Schema
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					Compare AutoDataView vs JsonFallback rendering
				</span>
			</div>
		</div>

		<!-- Comparison -->
		<div class="flex-1 p-6 overflow-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-7xl mx-auto space-y-6">
				<!-- Explanation -->
				<div
					class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-blue-50 border border-blue-200'}"
				>
					<h2 class="text-lg font-semibold mb-2 {darkMode ? 'text-white' : 'text-blue-900'}">
						Rendering Comparison
					</h2>
					<p class="text-sm {darkMode ? 'text-slate-300' : 'text-blue-800'}">
						See how the Universal Rendering Engine handles data with and without schema definitions.
						When a schema exists, AutoDataView generates a structured UI. Without a schema,
						JsonFallback displays raw JSON.
					</p>
				</div>

				<!-- Side by Side Comparison -->
				<div class="grid grid-cols-2 gap-6">
					<!-- With Schema -->
					<div
						class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
					>
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								With Schema (AutoDataView)
							</h3>
							<span
								class="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
							>
								Structured UI
							</span>
						</div>
						<div class="h-[400px] rounded border {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<UniversalWidget topic="demo:with-schema" />
						</div>
						<div class="mt-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							Topic: <code>demo:with-schema</code>
						</div>
					</div>

					<!-- Without Schema -->
					<div
						class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
					>
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
								Without Schema (JsonFallback)
							</h3>
							<span
								class="px-2 py-1 text-xs rounded bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
							>
								Raw JSON
							</span>
						</div>
						<div class="h-[400px] rounded border {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<UniversalWidget topic="demo:without-schema" />
						</div>
						<div class="mt-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							Topic: <code>demo:without-schema</code>
						</div>
					</div>
				</div>

				<!-- Benefits -->
				<div class="grid grid-cols-3 gap-4">
					<div
						class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
					>
						<h4 class="text-sm font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
							With Schema
						</h4>
						<ul class="text-xs space-y-1 {darkMode ? 'text-slate-300' : 'text-slate-600'} list-disc list-inside">
							<li>Structured layout</li>
							<li>Type-aware formatting</li>
							<li>Field labels</li>
							<li>Required indicators</li>
							<li>Nested object support</li>
						</ul>
					</div>
					<div
						class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
					>
						<h4 class="text-sm font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
							Without Schema
						</h4>
						<ul class="text-xs space-y-1 {darkMode ? 'text-slate-300' : 'text-slate-600'} list-disc list-inside">
							<li>Raw JSON display</li>
							<li>No formatting</li>
							<li>No structure</li>
							<li>Debugging view</li>
							<li>Fallback option</li>
						</ul>
					</div>
					<div
						class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
					>
						<h4 class="text-sm font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
							Best Practice
						</h4>
						<p class="text-xs {darkMode ? 'text-slate-300' : 'text-slate-600'}">
							Always register schemas for production data. Use JsonFallback only for debugging or
							legacy data without schemas.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

