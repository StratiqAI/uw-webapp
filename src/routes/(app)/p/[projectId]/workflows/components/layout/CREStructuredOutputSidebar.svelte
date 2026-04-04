<script lang="ts">
	/**
	 * Sidebar for commercial real estate structured output templates.
	 * Each template has a question sent to the vision query (Pinecone + Gemini).
	 */

	export interface CREStructuredTemplate {
		id: string;
		title: string;
		description: string;
		question: string;
		dataType: 'string' | 'number' | 'boolean' | 'integer' | 'object' | 'array';
		icon: 'document' | 'building' | 'calendar' | 'currency' | 'ruler' | 'map' | 'users' | 'chart' | 'list';
	}

	const CRE_TEMPLATES: CREStructuredTemplate[] = [
		{ id: 'property-address', title: 'Property Address', description: 'Full street address of the property', question: 'What is the full street address or property address shown in the document?', dataType: 'string', icon: 'map' },
		{ id: 'lease-term', title: 'Lease Term', description: 'Duration of the lease (e.g. 5 years, 10 years)', question: 'What is the lease term or duration (e.g. 5 years, 10 years)?', dataType: 'string', icon: 'calendar' },
		{ id: 'square-footage', title: 'Square Footage', description: 'Total rentable or leasable area in sq ft', question: 'What is the total rentable or leasable square footage mentioned?', dataType: 'number', icon: 'ruler' },
		{ id: 'zoning-type', title: 'Zoning Type', description: 'Zoning classification (e.g. commercial, mixed-use)', question: 'What is the zoning type or classification (e.g. commercial, mixed-use)?', dataType: 'string', icon: 'document' },
		{ id: 'cap-rate', title: 'Cap Rate', description: 'Capitalization rate as a percentage', question: 'What is the cap rate or capitalization rate mentioned? Reply with only the number or percentage if present, otherwise state that it was not found.', dataType: 'number', icon: 'chart' },
		{ id: 'noi', title: 'NOI', description: 'Net operating income amount', question: 'What is the net operating income (NOI) amount stated in the document?', dataType: 'number', icon: 'currency' },
		{ id: 'tenant-name', title: 'Tenant Name', description: 'Name of the tenant or lessee', question: 'What is the name of the tenant or lessee?', dataType: 'string', icon: 'users' },
		{ id: 'lease-start', title: 'Lease Start Date', description: 'Effective start date of the lease', question: 'What is the lease start date or effective date?', dataType: 'string', icon: 'calendar' },
		{ id: 'lease-end', title: 'Lease End Date', description: 'Expiration or end date of the lease', question: 'What is the lease expiration or end date?', dataType: 'string', icon: 'calendar' },
		{ id: 'rentable-area', title: 'Rentable Area', description: 'Rentable square footage per suite or unit', question: 'What is the rentable area or square footage per suite or unit?', dataType: 'number', icon: 'ruler' },
		{ id: 'building-class', title: 'Building Class', description: 'Class A, B, or C classification', question: 'What is the building class (Class A, B, or C)?', dataType: 'string', icon: 'building' },
		{ id: 'year-built', title: 'Year Built', description: 'Year the building was constructed', question: 'What year was the building constructed or built?', dataType: 'integer', icon: 'building' },
		{ id: 'occupancy-rate', title: 'Occupancy Rate', description: 'Current occupancy as a percentage', question: 'What is the current or stated occupancy rate (as a percentage)?', dataType: 'number', icon: 'chart' },
		{ id: 'base-rent', title: 'Base Rent', description: 'Base rent amount per period', question: 'What is the base rent amount or rate stated?', dataType: 'number', icon: 'currency' },
		{ id: 'triple-net', title: 'Triple Net Lease', description: 'Whether lease is NNN', question: 'Is this a triple net (NNN) lease? Answer yes or no based on the document.', dataType: 'boolean', icon: 'document' },
		{ id: 'vacancy-rate', title: 'Vacancy Rate', description: 'Current or projected vacancy percentage', question: 'What is the current or projected vacancy rate (percentage)?', dataType: 'number', icon: 'chart' },
		{ id: 'tenant-improvements', title: 'Tenant Improvement Allowance', description: 'TI allowance amount or description', question: 'What is the tenant improvement (TI) allowance amount or description?', dataType: 'string', icon: 'currency' },
		{ id: 'expense-stop', title: 'Expense Stop', description: 'Expense stop amount or type', question: 'What is the expense stop amount or type mentioned?', dataType: 'string', icon: 'document' },
		{ id: 'renewal-option', title: 'Renewal Option', description: 'Whether tenant has renewal option', question: 'Does the tenant have a renewal option? Answer yes or no based on the document.', dataType: 'boolean', icon: 'calendar' },
		{ id: 'purchase-price', title: 'Purchase Price', description: 'Acquisition or asking price', question: 'What is the purchase price, acquisition price, or asking price?', dataType: 'number', icon: 'currency' },
		{ id: 'debt-service', title: 'Annual Debt Service', description: 'Annual debt service amount', question: 'What is the annual debt service amount?', dataType: 'number', icon: 'currency' },
		{ id: 'dscr', title: 'DSCR', description: 'Debt service coverage ratio', question: 'What is the debt service coverage ratio (DSCR) mentioned?', dataType: 'number', icon: 'chart' },
		{ id: 'tenant-list', title: 'Tenant Roster', description: 'List of tenants and suite info', question: 'List the tenants and their suite or unit information mentioned in the document.', dataType: 'array', icon: 'list' },
		{ id: 'lease-summary', title: 'Lease Summary', description: 'Structured lease terms and dates', question: 'Summarize the key lease terms and dates (start, end, rent, options) from the document.', dataType: 'object', icon: 'document' }
	];

	function dataTypeTagClass(dataType: CREStructuredTemplate['dataType'], darkMode: boolean): string {
		const base = 'text-xs font-medium px-2 py-0.5 rounded-full shrink-0';
		const colors: Record<CREStructuredTemplate['dataType'], string> = {
			string: darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800',
			number: darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800',
			boolean: darkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800',
			integer: darkMode ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-800',
			object: darkMode ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-200 text-slate-700',
			array: darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
		};
		return `${base} ${colors[dataType]}`;
	}

	function getIconPath(icon: CREStructuredTemplate['icon']): string {
		const paths: Record<CREStructuredTemplate['icon'], string> = {
			document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
			building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
			calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
			currency: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
			ruler: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
			map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
			users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
			chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
			list: 'M4 6h16M4 10h16M4 14h16M4 18h16'
		};
		return paths[icon] ?? paths.document;
	}

	interface Props {
		darkMode?: boolean;
		onSelectTemplate?: (template: CREStructuredTemplate) => void;
		isLoading?: boolean;
	}

	let { darkMode = true, onSelectTemplate, isLoading = false }: Props = $props();

	let searchQuery = $state('');
	let isOpen = $state(true);

	const filteredTemplates = $derived(
		searchQuery.trim()
			? CRE_TEMPLATES.filter(
					(t) =>
						t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
						t.description.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: CRE_TEMPLATES
	);
</script>

<div
	class="flex shrink-0 flex-col border-l transition-[width] duration-200 ease-out {darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}"
	style="width: {isOpen ? '340px' : '44px'};"
>
	<!-- Toggle tab -->
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="flex h-12 w-full items-center {isOpen ? 'justify-end px-2' : 'justify-center'} {darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'} transition-colors"
		aria-label={isOpen ? 'Close structured output' : 'Open structured output'}
		title="Commercial real estate structured outputs"
	>
		{#if isOpen}
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		{:else}
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		{/if}
	</button>

	{#if isOpen}
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Header -->
			<div class="border-b px-4 py-4 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Structured Output</h2>
				<p class="mt-0.5 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">CRE extracted information</p>
			</div>

			<!-- Create from scratch -->
			<div
				class="mx-4 mt-4 flex items-start gap-3 rounded-lg border p-3 transition-colors {darkMode ? 'border-slate-600 bg-slate-800/60 hover:bg-slate-800' : 'border-slate-300 bg-white hover:bg-slate-50'}"
			>
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}"
				>
					<svg class="h-4 w-4 {darkMode ? 'text-emerald-400' : 'text-emerald-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</div>
				<div class="min-w-0 flex-1">
					<p class="font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Create from Scratch</p>
					<p class="mt-0.5 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">Build a custom schema for your own CRE fields</p>
				</div>
			</div>

			<!-- Divider + search -->
			<p class="mt-4 px-4 text-xs {darkMode ? 'text-slate-500' : 'text-slate-500'}">Or choose from pre-built templates</p>
			<div class="mt-2 px-4">
				<div class="relative">
					<svg
						class="absolute left-2.5 top-2.5 h-4 w-4 {darkMode ? 'text-slate-500' : 'text-slate-400'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search by name or description..."
						class="w-full rounded-lg border py-2 pl-9 pr-3 text-sm {darkMode ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}"
					/>
				</div>
			</div>

			<!-- Template grid -->
			<div class="flex-1 overflow-y-auto px-4 py-4">
				<div class="grid grid-cols-1 gap-2">
					{#each filteredTemplates as template (template.id)}
						<button
							type="button"
							disabled={isLoading}
							onclick={() => onSelectTemplate?.(template)}
							class="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors {darkMode ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'} disabled:opacity-60 disabled:cursor-not-allowed"
						>
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded {darkMode ? 'bg-slate-700' : 'bg-slate-100'}"
							>
								<svg
									class="h-4 w-4 {darkMode ? 'text-slate-300' : 'text-slate-600'}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIconPath(template.icon)} />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<p class="font-medium {darkMode ? 'text-white' : 'text-slate-900'}">{template.title}</p>
								<p class="mt-0.5 line-clamp-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									{template.description}
								</p>
							</div>
							<span class={dataTypeTagClass(template.dataType, darkMode)}>{template.dataType}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Footer actions -->
			<div class="flex justify-end gap-2 border-t px-4 py-3 {darkMode ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}">
				<button
					type="button"
					class="rounded-lg border px-3 py-1.5 text-sm font-medium {darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-200'}"
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500"
				>
					Save
				</button>
			</div>
		</div>
	{/if}
</div>
