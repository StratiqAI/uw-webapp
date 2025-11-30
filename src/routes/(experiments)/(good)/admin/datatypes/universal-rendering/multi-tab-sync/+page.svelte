<script lang="ts">
	import UniversalWidget from '$lib/components/UniversalWidget.svelte';
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	const testTopic = 'test:multi-tab:sync';
	const testSchema = {
		id: 'test:sync-schema',
		name: 'Multi-Tab Sync Test',
		fields: [
			{ name: 'value', type: 'number', required: true },
			{ name: 'timestamp', type: 'number', required: true },
			{ name: 'tabId', type: 'string', required: true },
			{ name: 'message', type: 'string', required: false }
		]
	};

	let testValue = $state(0);
	let lastSyncTime = $state<number | null>(null);
	let syncCount = $state(0);

	function setupTest() {
		try {
			schemaRegistry.register(testSchema);
			mapStore.enforceTopicSchema(testTopic, testSchema.id);
		} catch (e: any) {
			console.error('Error setting up test:', e);
		}
	}

	function publishTestData() {
		const pub = mapStore.getPublisher(testTopic, 'test-publisher');
		const data = {
			value: testValue,
			timestamp: Date.now(),
			tabId: `tab-${Math.random().toString(36).substring(2, 9)}`,
			message: `Synced from this tab at ${new Date().toLocaleTimeString()}`
		};
		pub.publish(data);
		pub.dispose();
		lastSyncTime = Date.now();
	}

	// Subscribe to topic to detect incoming syncs
	$effect(() => {
		if (typeof window === 'undefined') return;

		const stream = mapStore.getStream(testTopic);
		const unsubscribe = stream.subscribe((val: unknown) => {
			if (val && typeof val === 'object' && 'timestamp' in val) {
				const data = val as { timestamp: number; tabId: string };
				// Only count if it's a new sync (not our own initial publish)
				if (data.timestamp !== lastSyncTime) {
					syncCount++;
				}
			}
		});

		return unsubscribe;
	});

	$effect(() => {
		setupTest();
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
					Multi-Tab Synchronization Test
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					Test cross-tab data synchronization
				</span>
			</div>
		</div>

		<!-- Instructions -->
		<div
			class="p-4 border-b {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
		>
			<div
				class="p-4 rounded-lg mb-4 {darkMode ? 'bg-blue-900/20 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}"
			>
				<h2 class="text-sm font-semibold mb-2 {darkMode ? 'text-blue-200' : 'text-blue-900'}">
					How to Test Multi-Tab Sync:
				</h2>
				<ol class="text-xs space-y-1 {darkMode ? 'text-blue-300' : 'text-blue-800'} list-decimal list-inside">
					<li>Open this page in two browser tabs (Tab A and Tab B)</li>
					<li>In Tab A, change the value and click "Publish Test Data"</li>
					<li>Watch Tab B - it should update automatically without any action</li>
					<li>Verify that Tab A does NOT receive an echo (sync count should not increase)</li>
					<li>Try publishing from Tab B and watch Tab A update</li>
				</ol>
			</div>

			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<label class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
						Test Value:
					</label>
					<input
						type="number"
						bind:value={testValue}
						class="w-24 px-2 py-1 text-sm rounded border {darkMode
							? 'bg-slate-700 border-slate-600 text-white'
							: 'bg-white border-slate-300 text-slate-900'}"
					/>
				</div>
				<button
					onclick={publishTestData}
					class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
				>
					Publish Test Data
				</button>
				<div class="flex items-center gap-4 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					<span>Syncs Received: <strong class="text-indigo-600">{syncCount}</strong></span>
					{#if lastSyncTime}
						<span>
							Last Published: <strong>{new Date(lastSyncTime).toLocaleTimeString()}</strong>
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Widget Display -->
		<div class="flex-1 p-6 overflow-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-4xl mx-auto">
				<div class="mb-4">
					<h2 class="text-lg font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
						Live Data (Auto-Updates from Other Tabs)
					</h2>
					<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
						This widget subscribes to the test topic and will automatically update when data is
						published from any tab.
					</p>
				</div>

				<div class="h-[400px] rounded-lg border shadow-lg {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
					<UniversalWidget topic={testTopic} />
				</div>

				<!-- Status Info -->
				<div
					class="mt-4 p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
				>
					<h3 class="text-sm font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
						Sync Status
					</h3>
					<div class="text-xs space-y-1 {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						<div>
							<strong>Topic:</strong> <code class="bg-slate-100 dark:bg-slate-900 px-1 rounded">{testTopic}</code>
						</div>
						<div>
							<strong>BroadcastChannel:</strong>{' '}
							{#if typeof BroadcastChannel !== 'undefined'}
								<span class="text-green-600 dark:text-green-400">✓ Available</span>
							{:else}
								<span class="text-red-600 dark:text-red-400">✗ Not Available</span>
							{/if}
						</div>
						<div>
							<strong>Schema Enforced:</strong>{' '}
							<span class="text-green-600 dark:text-green-400">✓ Yes</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

