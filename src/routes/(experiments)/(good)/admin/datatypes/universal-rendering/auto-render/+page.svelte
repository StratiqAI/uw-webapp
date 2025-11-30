<script lang="ts">
	import UniversalWidget from '$lib/components/UniversalWidget.svelte';
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Different schema examples
	const schemas = {
		property: {
			id: 'demo:property',
			name: 'Property',
			fields: [
				{ name: 'id', type: 'string', required: true },
				{ name: 'name', type: 'string', required: true },
				{ name: 'address', type: 'string', required: true },
				{
					name: 'assetClass',
					type: 'enum',
					required: true,
					options: ['Office', 'Industrial', 'Multifamily', 'Retail']
				},
				{ name: 'sqFt', type: 'number', required: true },
				{ name: 'yearBuilt', type: 'number', required: false }
			]
		},
		inspection: {
			id: 'demo:inspection',
			name: 'Property Inspection',
			fields: [
				{ name: 'inspectionId', type: 'string', required: true },
				{ name: 'propertyId', type: 'string', required: true },
				{ name: 'inspectionDate', type: 'date', required: true },
				{ name: 'inspectorName', type: 'string', required: true },
				{ name: 'overallCondition', type: 'enum', required: true, options: ['Excellent', 'Good', 'Fair', 'Poor'] },
				{
					name: 'findings',
					type: 'array',
					required: false,
					itemType: 'object',
					subFields: [
						{ name: 'area', type: 'string', required: true },
						{ name: 'issue', type: 'string', required: true },
						{ name: 'severity', type: 'enum', required: true, options: ['Low', 'Medium', 'High'] },
						{ name: 'estimatedCost', type: 'number', required: false }
					]
				}
			]
		},
		financial: {
			id: 'demo:financial',
			name: 'Financial Summary',
			fields: [
				{ name: 'period', type: 'string', required: true },
				{ name: 'revenue', type: 'number', required: true },
				{ name: 'expenses', type: 'number', required: true },
				{ name: 'netIncome', type: 'number', required: true },
				{ name: 'isProfitable', type: 'boolean', required: true }
			]
		}
	};

	const dataSets = {
		property: {
			id: 'prop-001',
			name: 'Sunset Office Complex',
			address: '123 Main St, Portland, OR 97201',
			assetClass: 'Office',
			sqFt: 50000,
			yearBuilt: 2015
		},
		inspection: {
			inspectionId: 'insp-2024-001',
			propertyId: 'prop-001',
			inspectionDate: '2024-01-15',
			inspectorName: 'John Smith',
			overallCondition: 'Good',
			findings: [
				{ area: 'Roof', issue: 'Minor shingle damage', severity: 'Low', estimatedCost: 500 },
				{ area: 'HVAC', issue: 'Unit needs servicing', severity: 'Medium', estimatedCost: 1200 },
				{ area: 'Plumbing', issue: 'Leaky faucet in unit 3', severity: 'Low', estimatedCost: 150 }
			]
		},
		financial: {
			period: 'Q1 2024',
			revenue: 125000,
			expenses: 85000,
			netIncome: 40000,
			isProfitable: true
		}
	};

	let selectedDemo = $state<'property' | 'inspection' | 'financial'>('property');

	function registerAndPublish(demo: typeof selectedDemo) {
		const schema = schemas[demo];
		const data = dataSets[demo];
		const topic = `demo:${demo}:1`;

		try {
			schemaRegistry.register(schema);
			mapStore.enforceTopicSchema(topic, schema.id);
			const pub = mapStore.getPublisher(topic, 'demo');
			pub.publish(data);
			pub.dispose();
			selectedDemo = demo;
		} catch (e: any) {
			alert('Error: ' + (e?.message || String(e)));
		}
	}

	// Initialize first demo
	$effect(() => {
		registerAndPublish('property');
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
					Auto-Rendering Showcase
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					See how AutoDataView renders different data types
				</span>
			</div>
		</div>

		<!-- Demo Selector -->
		<div
			class="p-4 border-b {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
		>
			<div class="flex gap-3">
				<button
					onclick={() => registerAndPublish('property')}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedDemo === 'property'
						? 'bg-indigo-600 text-white'
						: darkMode
							? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
							: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
				>
					Property (Simple Object)
				</button>
				<button
					onclick={() => registerAndPublish('inspection')}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedDemo === 'inspection'
						? 'bg-indigo-600 text-white'
						: darkMode
							? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
							: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
				>
					Inspection (With Array)
				</button>
				<button
					onclick={() => registerAndPublish('financial')}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedDemo === 'financial'
						? 'bg-indigo-600 text-white'
						: darkMode
							? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
							: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
				>
					Financial (Primitives)
				</button>
			</div>
		</div>

		<!-- Widget Display -->
		<div class="flex-1 p-6 overflow-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-5xl mx-auto">
				<div class="mb-4">
					<h2 class="text-lg font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
						Rendering: {schemas[selectedDemo].name}
					</h2>
					<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
						This UI was automatically generated from the schema definition. No custom component code
						was written.
					</p>
				</div>

				<div class="h-[500px] rounded-lg border shadow-lg {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
					<UniversalWidget topic="demo:{selectedDemo}:1" />
				</div>

				<div class="mt-4 grid grid-cols-2 gap-4">
					<div class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-blue-50 border border-blue-200'}">
						<h3 class="text-sm font-semibold mb-2 {darkMode ? 'text-slate-200' : 'text-blue-900'}">
							Schema Definition
						</h3>
						<pre
							class="text-xs font-mono overflow-auto max-h-48 {darkMode ? 'text-slate-300' : 'text-blue-800'}"
						>{JSON.stringify(schemas[selectedDemo], null, 2)}</pre>
					</div>
					<div class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-green-50 border border-green-200'}">
						<h3 class="text-sm font-semibold mb-2 {darkMode ? 'text-slate-200' : 'text-green-900'}">
							Sample Data
						</h3>
						<pre
							class="text-xs font-mono overflow-auto max-h-48 {darkMode ? 'text-slate-300' : 'text-green-800'}"
						>{JSON.stringify(dataSets[selectedDemo], null, 2)}</pre>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

