<script lang="ts">
	import UniversalWidget from '$lib/components/UniversalWidget.svelte';
	import { mapStore } from '$lib/stores/MapStore';
	import { uiRegistry } from '$lib/stores/ComponentRegistry';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Example topics that match patterns
	const patternTopics = {
		alert: 'sys:alert:security',
		error: 'sys:error:validation',
		notification: 'sys:notification:user',
		metric: 'metrics:cpu:usage',
		event: 'events:user:login'
	};

	let selectedPattern = $state<keyof typeof patternTopics>('alert');

	// Example data for different patterns
	const patternData = {
		alert: {
			level: 'warning',
			message: 'Security threshold exceeded',
			timestamp: Date.now()
		},
		error: {
			code: 'VALIDATION_ERROR',
			message: 'Invalid input format',
			field: 'email'
		},
		notification: {
			type: 'info',
			title: 'New message',
			body: 'You have a new message from John',
			timestamp: Date.now()
		},
		metric: {
			value: 75.5,
			unit: 'percent',
			threshold: 80
		},
		event: {
			userId: 'user-123',
			action: 'login',
			timestamp: Date.now(),
			ip: '192.168.1.1'
		}
	};

	function publishPatternData(pattern: keyof typeof patternTopics) {
		const topic = patternTopics[pattern];
		const data = patternData[pattern];
		const pub = mapStore.getPublisher(topic, 'pattern-demo');
		pub.publish(data);
		pub.dispose();
		selectedPattern = pattern;
	}

	// Register pattern-based components (demo)
	function registerPatterns() {
		// In real usage, you'd register actual components
		// uiRegistry.registerPattern(/^sys:alert:/, AlertBanner);
		// uiRegistry.registerPattern(/^sys:error:/, ErrorDisplay);
		// uiRegistry.registerPattern(/^metrics:/, MetricWidget);
		console.log('Pattern components would be registered here');
	}

	$effect(() => {
		registerPatterns();
		publishPatternData('alert');
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
					Pattern Matching Demo
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					Register components for topic patterns using regex
				</span>
			</div>
		</div>

		<!-- Pattern Selector -->
		<div
			class="p-4 border-b {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
		>
			<div class="flex flex-wrap gap-3">
				{#each Object.entries(patternTopics) as [pattern, topic]}
					<button
						onclick={() => publishPatternData(pattern as keyof typeof patternTopics)}
						class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedPattern === pattern
							? 'bg-indigo-600 text-white'
							: darkMode
								? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
								: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
					>
						{pattern}: {topic}
					</button>
				{/each}
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 p-6 overflow-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-6xl mx-auto space-y-6">
				<!-- Explanation -->
				<div
					class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-blue-50 border border-blue-200'}"
				>
					<h2 class="text-lg font-semibold mb-2 {darkMode ? 'text-white' : 'text-blue-900'}">
						Pattern-Based Component Registration
					</h2>
					<p class="text-sm mb-3 {darkMode ? 'text-slate-300' : 'text-blue-800'}">
						Instead of registering components for individual schema IDs, you can register components
						for topic patterns using regular expressions. This is useful for system-wide components
						like alerts, errors, or metrics.
					</p>
					<div class="text-xs {darkMode ? 'text-slate-400' : 'text-blue-700'}">
						<strong>Example:</strong> Register <code class="bg-blue-100 dark:bg-blue-900 px-1 rounded">AlertBanner</code> for all topics matching <code class="bg-blue-100 dark:bg-blue-900 px-1 rounded">/^sys:alert:/</code>
					</div>
				</div>

				<!-- Code Example -->
				<div class="grid grid-cols-2 gap-6">
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

// Register for alert pattern
uiRegistry.registerPattern(
  /^sys:alert:/,
  AlertBanner,
  { dismissible: true }
);

// Register for error pattern
uiRegistry.registerPattern(
  /^sys:error:/,
  ErrorDisplay,
  { showStack: false }
);

// Register for metrics pattern
uiRegistry.registerPattern(
  /^metrics:/,
  MetricWidget,
  { showChart: true }
);`}</pre>
					</div>

					<div
						class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
					>
						<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-white' : 'text-slate-900'}">
							Rendered Widget
						</h3>
						<div class="h-[300px] rounded border {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<UniversalWidget topic={patternTopics[selectedPattern]} />
						</div>
						<div class="mt-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							Topic: <code>{patternTopics[selectedPattern]}</code>
						</div>
					</div>
				</div>

				<!-- Pattern Examples -->
				<div
					class="p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
				>
					<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-white' : 'text-slate-900'}">
						Pattern Examples
					</h3>
					<div class="space-y-2 text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
						<div>
							<code class="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">/^sys:alert:/</code>
							<span class="ml-2">Matches: sys:alert:security, sys:alert:maintenance</span>
						</div>
						<div>
							<code class="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">/^metrics:/</code>
							<span class="ml-2">Matches: metrics:cpu:usage, metrics:memory:free</span>
						</div>
						<div>
							<code class="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">/^events:user:/</code>
							<span class="ml-2">Matches: events:user:login, events:user:logout</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

