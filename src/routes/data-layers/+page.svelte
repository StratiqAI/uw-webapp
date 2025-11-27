<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	interface DataSource {
		id: string;
		name: string;
		description: string;
		icon: string;
	}

	const dataSources: DataSource[] = [
		{
			id: 'us-census',
			name: 'US Census',
			description: 'Access comprehensive demographic and economic data from the United States Census Bureau',
			icon: '📊'
		},
		{
			id: 'geoapify',
			name: 'Geoapify',
			description: 'Geocoding, geocoding API, and location intelligence services for mapping and geospatial analysis',
			icon: '🗺️'
		}
	];

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;
	let searchFilter = $state('');
</script>

<div class="min-h-screen {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Header -->
	<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							Data Sources
						</h1>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and connect to data sources</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<button
						onclick={toggleDarkMode}
						class="p-2 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded-lg transition-colors"
						aria-label="Toggle dark mode"
					>
						{#if darkMode}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
							</svg>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
							</svg>
						{/if}
					</button>
				</div>
			</div>
			<!-- Filter Input -->
			<div class="relative mt-4">
				<input
					type="text"
					bind:value={searchFilter}
					placeholder="Search data sources..."
					class="w-full px-4 py-2 pl-10 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
				/>
				<svg class="absolute left-3 top-2.5 w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				{#if searchFilter}
					<button
						onclick={() => searchFilter = ''}
						class="absolute right-3 top-2.5 p-1 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} rounded transition-colors"
						aria-label="Clear filter"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="max-w-7xl mx-auto px-6 py-8">
		{#if dataSources.filter((ds) => !searchFilter || ds.name.toLowerCase().includes(searchFilter.toLowerCase()) || ds.description.toLowerCase().includes(searchFilter.toLowerCase())).length > 0}
			<div class="mb-8">
				<h2 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
					<span class="w-1 h-4 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded"></span>
					Available Data Sources ({dataSources.filter((ds) => !searchFilter || ds.name.toLowerCase().includes(searchFilter.toLowerCase()) || ds.description.toLowerCase().includes(searchFilter.toLowerCase())).length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each dataSources.filter((ds) => !searchFilter || ds.name.toLowerCase().includes(searchFilter.toLowerCase()) || ds.description.toLowerCase().includes(searchFilter.toLowerCase())) as source}
						<div
							class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 transition-all hover:shadow-lg group cursor-pointer"
						>
							<div class="flex items-start gap-3">
								<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center text-xl">
									{source.icon}
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-indigo-400 transition-colors">
										{source.name}
									</h3>
									<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
										{source.description}
									</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="text-center py-12">
				<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No data sources found</p>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Try adjusting your search terms</p>
			</div>
		{/if}
	</div>
</div>

