<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	const demos = [
		{
			title: 'Auto-Rendering Showcase',
			description: 'See how AutoDataView renders different data types automatically',
			route: '/admin/datatypes/universal-rendering/auto-render',
			icon: '🎨',
			color: 'indigo'
		},
		{
			title: 'Custom Components',
			description: 'Learn how to register specialized components for specific schemas',
			route: '/admin/datatypes/universal-rendering/custom-components',
			icon: '⚙️',
			color: 'purple'
		},
		{
			title: 'Pattern Matching',
			description: 'Register components for topic patterns using regex',
			route: '/admin/datatypes/universal-rendering/pattern-matching',
			icon: '🔍',
			color: 'blue'
		},
		{
			title: 'With vs Without Schema',
			description: 'Compare AutoDataView vs JsonFallback rendering',
			route: '/admin/datatypes/universal-rendering/comparison',
			icon: '⚖️',
			color: 'green'
		},
		{
			title: 'Universal Widget Demo',
			description: 'Complete interactive demo with all features',
			route: '/admin/datatypes/universal-widget-demo',
			icon: '🚀',
			color: 'orange'
		},
		{
			title: 'Multi-Tab Synchronization',
			description: 'Test cross-tab data synchronization using BroadcastChannel',
			route: '/admin/datatypes/universal-rendering/multi-tab-sync',
			icon: '🔄',
			color: 'cyan'
		}
	];
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
					Universal Rendering Engine
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					Demo Pages & Examples
				</span>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 p-6 overflow-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-6xl mx-auto">
				<!-- Introduction -->
				<div
					class="p-6 rounded-lg mb-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
				>
					<h2 class="text-xl font-semibold mb-3 {darkMode ? 'text-white' : 'text-slate-900'}">
						Welcome to the Universal Rendering Engine
					</h2>
					<p class="text-sm mb-4 {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						The Universal Rendering Engine automatically generates UIs from schema definitions,
						enabling zero-code UI generation for AI-generated data structures. Explore the demo
						pages below to see different aspects of the system in action.
					</p>
					<div class="grid grid-cols-3 gap-4 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						<div>
							<strong class="block mb-1 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Auto-Rendering</strong>
							Schemas → UI automatically
						</div>
						<div>
							<strong class="block mb-1 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Custom Components</strong>
							Register specialized UIs
						</div>
						<div>
							<strong class="block mb-1 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Pattern Matching</strong>
							Regex-based routing
						</div>
					</div>
				</div>

				<!-- Demo Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each demos as demo}
						<a
							href={demo.route}
							class="block p-6 rounded-lg border transition-all hover:shadow-lg hover:scale-[1.02] {darkMode
								? 'bg-slate-800 border-slate-700 hover:border-slate-600'
								: 'bg-white border-slate-200 hover:border-slate-300'}"
						>
							<div class="flex items-start gap-4">
								<div class="text-4xl">{demo.icon}</div>
								<div class="flex-1">
									<h3 class="text-lg font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
										{demo.title}
									</h3>
									<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-3">
										{demo.description}
									</p>
									<div
										class="inline-flex items-center gap-1 text-xs font-medium {darkMode
											? 'text-indigo-400'
											: 'text-indigo-600'}"
									>
										View Demo
										<svg
											class="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											></path>
										</svg>
									</div>
								</div>
							</div>
						</a>
					{/each}
				</div>

				<!-- Quick Links -->
				<div
					class="mt-6 p-4 rounded-lg {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}"
				>
					<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-white' : 'text-slate-900'}">
						Related Tools
					</h3>
					<div class="flex flex-wrap gap-2">
						<a
							href="/admin/datatypes/schema-builder"
							class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {darkMode
								? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
								: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
						>
							Schema Builder
						</a>
						<a
							href="/admin/datatypes/store-inspector"
							class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {darkMode
								? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
								: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
						>
							Store Inspector
						</a>
						<a
							href="/admin/datatypes/mapstore-admin"
							class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {darkMode
								? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
								: 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
						>
							MapStore Admin
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

