<script lang="ts">
	import SchemaBuilder from '$lib/components/admin/SchemaBuilder.svelte';
	import StoreInspector from '$lib/components/admin/StoreInspector.svelte';
	import SchemaRegistryView from '$lib/components/admin/SchemaRegistryView.svelte';
	import SchemaPublisher from '$lib/components/admin/SchemaPublisher.svelte';
	import TopicEditor from '$lib/components/admin/TopicEditor.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { mapStore } from '$lib/stores/MapStore';

	let activeTab = $state<'builder' | 'inspector' | 'registry' | 'publisher' | 'editor'>('builder');
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	function dumpMapStore() {
		if (typeof mapStore.dump === 'function') {
			mapStore.dump();
		} else {
			console.error('MapStore.dump is not available. Please restart the dev server.');
			console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(mapStore)));
			console.log('mapStore instance:', mapStore);
		}
	}
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
					MapStore Admin
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					Manage schemas and inspect data flow
				</span>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={dumpMapStore}
					class="px-3 py-1.5 text-sm font-medium {darkMode
						? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
						: 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded-md transition-colors flex items-center gap-2"
					title="Dump MapStore contents to console"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						></path>
					</svg>
					Dump to Console
				</button>
				<button
					class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
					onclick={toggleDarkMode}
					aria-label="Toggle dark mode"
					title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if darkMode}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
							></path>
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
							></path>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Tabs -->
		<div
			class="h-12 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center gap-1 px-6"
		>
			<button
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeTab === 'builder'
					? darkMode
						? 'bg-indigo-600 text-white'
						: 'bg-indigo-600 text-white'
					: darkMode
						? 'text-slate-300 hover:text-white hover:bg-slate-700'
						: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => (activeTab = 'builder')}
			>
				Schema Builder
			</button>
			<button
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeTab === 'inspector'
					? darkMode
						? 'bg-indigo-600 text-white'
						: 'bg-indigo-600 text-white'
					: darkMode
						? 'text-slate-300 hover:text-white hover:bg-slate-700'
						: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => (activeTab = 'inspector')}
			>
				Store Inspector
			</button>
			<button
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeTab === 'registry'
					? darkMode
						? 'bg-indigo-600 text-white'
						: 'bg-indigo-600 text-white'
					: darkMode
						? 'text-slate-300 hover:text-white hover:bg-slate-700'
						: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => (activeTab = 'registry')}
			>
				Schema Registry
			</button>
			<button
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeTab === 'publisher'
					? darkMode
						? 'bg-indigo-600 text-white'
						: 'bg-indigo-600 text-white'
					: darkMode
						? 'text-slate-300 hover:text-white hover:bg-slate-700'
						: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => (activeTab = 'publisher')}
			>
				Schema Publisher
			</button>
			<button
				class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeTab === 'editor'
					? darkMode
						? 'bg-indigo-600 text-white'
						: 'bg-indigo-600 text-white'
					: darkMode
						? 'text-slate-300 hover:text-white hover:bg-slate-700'
						: 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => (activeTab = 'editor')}
			>
				Topic Editor
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 relative {darkMode ? 'bg-slate-900' : 'bg-slate-50'} overflow-auto">
			<div class="h-full">
				{#if activeTab === 'builder'}
					<SchemaBuilder {darkMode} />
				{:else if activeTab === 'inspector'}
					<StoreInspector {darkMode} />
				{:else if activeTab === 'registry'}
					<SchemaRegistryView {darkMode} />
				{:else if activeTab === 'publisher'}
					<SchemaPublisher {darkMode} />
				{:else if activeTab === 'editor'}
					<TopicEditor {darkMode} />
				{/if}
			</div>
		</div>
	</div>
</div>
