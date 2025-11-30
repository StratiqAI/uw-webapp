<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	const tools = [
		{
			title: 'Schema Builder',
			description: 'Build and register dynamic schema definitions for runtime validation',
			route: '/admin/datatypes/schema-builder',
			icon: '🔧',
			color: 'indigo'
		},
		{
			title: 'Schema Registry',
			description: 'View all registered schemas and their definitions',
			route: '/admin/datatypes/mapstore-admin',
			icon: '📋',
			color: 'blue',
			note: 'Open Schema Registry tab'
		},
		{
			title: 'Store Inspector',
			description: 'Inspect live MapStore topics, enforce schemas, and test data publishing',
			route: '/admin/datatypes/store-inspector',
			icon: '🔍',
			color: 'green'
		},
		{
			title: 'MapStore Admin',
			description: 'Complete admin interface with Schema Builder, Registry, and Inspector',
			route: '/admin/datatypes/mapstore-admin',
			icon: '⚙️',
			color: 'purple'
		},
		{
			title: 'Universal Rendering',
			description: 'Demo pages for the Universal Rendering Engine',
			route: '/admin/datatypes/universal-rendering',
			icon: '🎨',
			color: 'orange'
		},
		{
			title: 'Universal Widget Demo',
			description: 'Interactive demo of the Universal Widget component',
			route: '/admin/datatypes/universal-widget-demo',
			icon: '🚀',
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
					Data Types Admin
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					Manage schemas, inspect data flow, and test rendering
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
						Data Types Management System
					</h2>
					<p class="text-sm mb-4 {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						This section provides tools for managing dynamic data types, schemas, and the Universal
						Rendering Engine. Build schemas, inspect live data flow, and test auto-generated UIs.
					</p>
					<div class="grid grid-cols-3 gap-4 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						<div>
							<strong class="block mb-1 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Schema Builder</strong>
							Create dynamic schemas
						</div>
						<div>
							<strong class="block mb-1 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Store Inspector</strong>
							Monitor data flow
						</div>
						<div>
							<strong class="block mb-1 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Universal Rendering</strong>
							Auto-generated UIs
						</div>
					</div>
				</div>

				<!-- Tool Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each tools as tool}
						<a
							href={tool.route}
							class="block p-6 rounded-lg border transition-all hover:shadow-lg hover:scale-[1.02] {darkMode
								? 'bg-slate-800 border-slate-700 hover:border-slate-600'
								: 'bg-white border-slate-200 hover:border-slate-300'}"
						>
							<div class="flex items-start gap-4">
								<div class="text-4xl">{tool.icon}</div>
								<div class="flex-1">
									<h3 class="text-lg font-semibold mb-2 {darkMode ? 'text-white' : 'text-slate-900'}">
										{tool.title}
									</h3>
									<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2">
										{tool.description}
									</p>
									{#if tool.note}
										<p class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-500'} italic">
											{tool.note}
										</p>
									{/if}
									<div
										class="inline-flex items-center gap-1 text-xs font-medium mt-2 {darkMode
											? 'text-indigo-400'
											: 'text-indigo-600'}"
									>
										Open Tool
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
			</div>
		</div>
	</div>
</div>

