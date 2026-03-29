<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	interface Document {
		id: string;
		name: string;
		description: string;
		type: 'pdf' | 'excel' | 'word' | 'image' | 'other';
		size?: string;
		uploadedAt?: string;
		icon: string;
	}

	const documents: Document[] = [
		{
			id: 'lease-agreement-001',
			name: 'Lease Agreement - ABC Property',
			description: 'Commercial lease agreement for ABC Property including terms, conditions, and tenant obligations',
			type: 'pdf',
			size: '2.4 MB',
			uploadedAt: '2024-03-15',
			icon: '📄'
		},
		{
			id: 'financial-statements-q1',
			name: 'Q1 Financial Statements',
			description: 'Quarterly financial statements including income statement, balance sheet, and cash flow',
			type: 'excel',
			size: '1.8 MB',
			uploadedAt: '2024-03-10',
			icon: '📊'
		},
		{
			id: 'property-photos',
			name: 'Property Photo Gallery',
			description: 'Comprehensive photo documentation of property condition, exterior, interior, and key features',
			type: 'image',
			size: '15.2 MB',
			uploadedAt: '2024-03-08',
			icon: '📷'
		},
		{
			id: 'market-analysis-doc',
			name: 'Market Analysis Document',
			description: 'Detailed market analysis report with comparable properties, market trends, and valuation insights',
			type: 'word',
			size: '3.1 MB',
			uploadedAt: '2024-03-05',
			icon: '📝'
		},
		{
			id: 'inspection-report',
			name: 'Property Inspection Report',
			description: 'Comprehensive property inspection report covering building systems, condition assessment, and recommendations',
			type: 'pdf',
			size: '4.7 MB',
			uploadedAt: '2024-02-28',
			icon: '🔍'
		},
		{
			id: 'rent-roll-spreadsheet',
			name: 'Current Rent Roll',
			description: 'Detailed rent roll spreadsheet with tenant information, lease terms, and rent schedules',
			type: 'excel',
			size: '856 KB',
			uploadedAt: '2024-02-25',
			icon: '📋'
		},
		{
			id: 'zoning-documentation',
			name: 'Zoning Documentation',
			description: 'Zoning permits, compliance documentation, and land use regulations for the property',
			type: 'pdf',
			size: '1.2 MB',
			uploadedAt: '2024-02-20',
			icon: '🏛️'
		},
		{
			id: 'environmental-assessment',
			name: 'Environmental Assessment Report',
			description: 'Phase I environmental site assessment report with risk evaluation and compliance analysis',
			type: 'pdf',
			size: '5.3 MB',
			uploadedAt: '2024-02-15',
			icon: '🌱'
		}
	];

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let searchFilter = $state('');

	function getTypeColor(type: string) {
		switch (type) {
			case 'pdf':
				return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700';
			case 'excel':
				return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700';
			case 'word':
				return darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700';
			case 'image':
				return darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700';
			default:
				return darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700';
		}
	}

	function formatDate(dateString?: string) {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<div class="min-h-screen {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Header -->
	<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m5 10v-2m3 2v-6m3 6v-3m4-11v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"></path>
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							Documents
						</h1>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Upload, organize, and manage your documents</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<button
						onclick={() => {}}
						class="px-4 py-2 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded-lg transition-colors flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
						</svg>
						Upload Document
					</button>
				</div>
			</div>
			<!-- Filter Input -->
			<div class="relative mt-4">
				<input
					type="text"
					bind:value={searchFilter}
					placeholder="Search documents..."
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
		{#if documents.filter((d) => !searchFilter || d.name.toLowerCase().includes(searchFilter.toLowerCase()) || d.description.toLowerCase().includes(searchFilter.toLowerCase()) || d.type.toLowerCase().includes(searchFilter.toLowerCase())).length > 0}
			<div class="mb-8">
				<h2 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
					<span class="w-1 h-4 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded"></span>
					All Documents ({documents.filter((d) => !searchFilter || d.name.toLowerCase().includes(searchFilter.toLowerCase()) || d.description.toLowerCase().includes(searchFilter.toLowerCase()) || d.type.toLowerCase().includes(searchFilter.toLowerCase())).length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each documents.filter((d) => !searchFilter || d.name.toLowerCase().includes(searchFilter.toLowerCase()) || d.description.toLowerCase().includes(searchFilter.toLowerCase()) || d.type.toLowerCase().includes(searchFilter.toLowerCase())) as document}
						<div
							class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 transition-all hover:shadow-lg group cursor-pointer"
						>
							<div class="flex items-start gap-3">
								<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center text-xl">
									{document.icon}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2 mb-1">
										<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} group-hover:text-indigo-400 transition-colors">
											{document.name}
										</h3>
									</div>
									<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2 mb-2">
										{document.description}
									</p>
									<div class="flex items-center gap-2 flex-wrap">
										<span class="px-2 py-0.5 text-[10px] font-medium rounded {getTypeColor(document.type)}">
											{document.type.toUpperCase()}
										</span>
										{#if document.size}
											<span class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">
												{document.size}
											</span>
										{/if}
										{#if document.uploadedAt}
											<span class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">
												{formatDate(document.uploadedAt)}
											</span>
										{/if}
									</div>
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
				<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No documents found</p>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Try adjusting your search terms</p>
			</div>
		{/if}
	</div>
</div>

