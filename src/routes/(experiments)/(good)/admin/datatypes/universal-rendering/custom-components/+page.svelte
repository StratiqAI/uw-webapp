<script lang="ts">
	import UniversalWidget from '$lib/components/UniversalWidget.svelte';
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import { uiRegistry } from '$lib/stores/ComponentRegistry';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Example custom component (simplified version)
	const CustomPropertyCard = `
		<div class="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg shadow-xl">
			<h2 class="text-2xl font-bold mb-2">{data.name}</h2>
			<p class="text-indigo-100 mb-4">{data.address}</p>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-sm text-indigo-200">Asset Class</div>
					<div class="text-lg font-semibold">{data.assetClass}</div>
				</div>
				<div>
					<div class="text-sm text-indigo-200">Square Feet</div>
					<div class="text-lg font-semibold">{data.sqFt?.toLocaleString()}</div>
				</div>
			</div>
		</div>
	`;

	const exampleSchema = {
		id: 'custom:property',
		name: 'Custom Property',
		fields: [
			{ name: 'id', type: 'string', required: true },
			{ name: 'name', type: 'string', required: true },
			{ name: 'address', type: 'string', required: true },
			{ name: 'assetClass', type: 'enum', required: true, options: ['Office', 'Retail'] },
			{ name: 'sqFt', type: 'number', required: true }
		]
	};

	const exampleData = {
		id: 'prop-001',
		name: 'Sunset Office Complex',
		address: '123 Main St, Portland, OR 97201',
		assetClass: 'Office',
		sqFt: 50000
	};

	let isRegistered = $state(false);
	let registeredSchemas = $derived(uiRegistry.getRegisteredSchemas());

	// Simple custom component for demo
	function createCustomComponent() {
		// In a real scenario, you'd import an actual Svelte component
		// For demo purposes, we'll show the concept
		return {
			// This would be an actual Svelte component
			name: 'CustomPropertyCard'
		};
	}

	function registerCustomComponent() {
		// Note: In real usage, you'd import an actual component
		// uiRegistry.register('custom:property', CustomPropertyCard);
		isRegistered = true;
		alert('Custom component registered! (Demo - actual component would be imported)');
	}

	function setupDemo() {
		try {
			schemaRegistry.register(exampleSchema);
			mapStore.enforceTopicSchema('custom:property:1', exampleSchema.id);
			const pub = mapStore.getPublisher('custom:property:1', 'demo');
			pub.publish(exampleData);
			pub.dispose();
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
					Custom Component Registration
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					Register specialized components for specific schemas
				</span>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 p-6 overflow-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-6xl mx-auto space-y-6">
				<!-- Instructions -->
				<div
					class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-blue-50 border border-blue-200'}"
				>
					<h2 class="text-lg font-semibold mb-2 {darkMode ? 'text-white' : 'text-blue-900'}">
						How Custom Components Work
					</h2>
					<ol class="text-sm space-y-2 {darkMode ? 'text-slate-300' : 'text-blue-800'} list-decimal list-inside">
						<li>Create a Svelte component for your specialized UI</li>
						<li>Register it with ComponentRegistry using the schema ID</li>
						<li>UniversalWidget will automatically use your custom component</li>
						<li>If no custom component exists, AutoDataView is used as fallback</li>
					</ol>
				</div>

				<!-- Code Example -->
				<div class="grid grid-cols-2 gap-6">
					<div class="space-y-4">
						<div
							class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
						>
							<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-white' : 'text-slate-900'}">
								Registration Code
							</h3>
							<pre
								class="text-xs font-mono overflow-auto {darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-900'} p-3 rounded"
							>{`import { uiRegistry } from 
  '$lib/stores/ComponentRegistry';
import CustomPropertyCard from 
  '$lib/components/custom/
  PropertyCard.svelte';

// Register for exact schema match
uiRegistry.register(
  'custom:property',
  CustomPropertyCard,
  {
    showActions: true,
    editable: false
  }
);`}</pre>
						</div>

						<div
							class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
						>
							<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-white' : 'text-slate-900'}">
								Pattern Matching
							</h3>
							<pre
								class="text-xs font-mono overflow-auto {darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-900'} p-3 rounded"
							>{`// Register for topic pattern
uiRegistry.registerPattern(
  /^sys:alert:/,
  AlertBanner,
  { dismissible: true }
);`}</pre>
						</div>

						<button
							onclick={registerCustomComponent}
							class="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors font-medium"
						>
							Register Custom Component (Demo)
						</button>
					</div>

					<div
						class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
					>
						<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-white' : 'text-slate-900'}">
							Rendered Widget
						</h3>
						<div class="h-[400px] rounded border {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<UniversalWidget topic="custom:property:1" />
						</div>
					</div>
				</div>

				<!-- Registered Schemas -->
				<div
					class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
				>
					<h3 class="text-sm font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
						Currently Registered Schemas
					</h3>
					{#if registeredSchemas.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each registeredSchemas as schemaId}
								<span
									class="px-2 py-1 text-xs rounded {darkMode ? 'bg-indigo-900/50 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}"
								>
									{schemaId}
								</span>
							{/each}
						</div>
					{:else}
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							No custom components registered yet
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

