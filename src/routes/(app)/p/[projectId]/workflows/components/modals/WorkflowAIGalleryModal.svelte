<script lang="ts">
	import type { ElementType, GridElement } from '../../types';
	import WorkflowModal from './WorkflowModal.svelte';
	import WorkflowModalHeader from './WorkflowModalHeader.svelte';

	let {
		darkMode = false,
		aiGalleryFilter = $bindable(''),
		elementTypes = [],
		customAINodes = [],
		gridContainer = null,
		panX = 0,
		panY = 0,
		zoomLevel = 1,
		gridElements = $bindable([]),
		onClose,
		onCreateCustomAI,
		deleteCustomAINode,
		generateId
	}: {
		darkMode?: boolean;
		aiGalleryFilter?: string;
		elementTypes?: ElementType[];
		customAINodes?: ElementType[];
		gridContainer?: HTMLDivElement | null;
		panX?: number;
		panY?: number;
		zoomLevel?: number;
		gridElements?: GridElement[];
		onClose?: () => void;
		onCreateCustomAI?: () => void;
		deleteCustomAINode?: (id: string) => void;
		generateId: () => string;
	} = $props();

	function addNode(query: ElementType) {
		if (!gridContainer) return;
		const rect = gridContainer.getBoundingClientRect();
		const centerX = (rect.width / 2 - panX) / zoomLevel - 60;
		const centerY = (rect.height / 2 - panY) / zoomLevel - 40;

		const newElement: GridElement = {
			id: generateId(),
			type: query,
			x: centerX,
			y: centerY,
			width: 120,
			height: 80,
			...(query.type === 'ai' && query.defaultAIQueryData ? { aiQueryData: query.defaultAIQueryData } : {})
		};
		gridElements = [...gridElements, newElement];
		onClose?.();
	}

	function addCustomNode(query: ElementType) {
		addNode(query);
	}

	const filteredDefault = $derived(
		elementTypes.filter(
			(t) =>
				t.type === 'ai' &&
				(!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))
		)
	);
	const filteredCustom = $derived(
		customAINodes.filter(
			(q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())
		)
	);
</script>

{#snippet aiGalleryIcon()}
	<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
		<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
		</svg>
	</div>
{/snippet}
{#snippet aiGalleryActions()}
	<button
		onclick={onCreateCustomAI}
		class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1.5"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
		</svg>
		Create New
	</button>
	<button
		onclick={onClose}
		class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
		aria-label="Close gallery"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
		</svg>
	</button>
{/snippet}
{#snippet aiGalleryFilterSlot()}
	<div class="relative">
		<input
			type="text"
			bind:value={aiGalleryFilter}
			placeholder="Search queries..."
			class="w-full px-4 py-2 pl-10 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
		/>
		<svg class="absolute left-3 top-2.5 w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
		</svg>
		{#if aiGalleryFilter}
			<button
				onclick={() => (aiGalleryFilter = '')}
				class="absolute right-3 top-2.5 p-1 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} rounded transition-colors"
				aria-label="Clear filter"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
			</button>
		{/if}
	</div>
{/snippet}

<WorkflowModal {darkMode} labelledBy="gallery-modal-title" containerClass="overflow-hidden flex flex-col" {onClose}>
	<WorkflowModalHeader
		{darkMode}
		titleId="gallery-modal-title"
		title="AI Query Library"
		subtitle="Browse and add AI analysis queries to your workflow"
		icon={aiGalleryIcon}
		actions={aiGalleryActions}
		below={aiGalleryFilterSlot}
	/>

	<div class="flex-1 overflow-y-auto p-6">
		{#if filteredDefault.length > 0}
			<div class="mb-8">
				<h3 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
					<span class="w-1 h-4 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded"></span>
					Default Queries ({filteredDefault.length})
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each filteredDefault as query}
						<div
							class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group"
							onclick={() => addNode(query)}
							role="button"
							tabindex="0"
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									addNode(query);
								}
							}}
						>
							<div class="flex items-start gap-3">
								<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
									<span class="text-xs font-bold {darkMode ? 'text-indigo-300' : 'text-indigo-600'}">AI</span>
								</div>
								<div class="flex-1 min-w-0">
									<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-indigo-400 transition-colors">
										{query.label}
									</h4>
									<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
										{query.description || 'Custom AI analysis query'}
									</p>
								</div>
								<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
								</svg>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if filteredCustom.length > 0}
			<div>
				<h3 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
					<span class="w-1 h-4 {darkMode ? 'bg-emerald-500' : 'bg-emerald-600'} rounded"></span>
					Your Custom Queries ({filteredCustom.length})
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each filteredCustom as query}
						<div
							class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-emerald-500' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group relative"
							onclick={() => addCustomNode(query)}
							role="button"
							tabindex="0"
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									addCustomNode(query);
								}
							}}
						>
							<button
								onclick={(event) => {
									event.stopPropagation();
									deleteCustomAINode?.(query.id);
								}}
								class="absolute top-2 right-2 p-1 {darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'} rounded transition-colors opacity-0 group-hover:opacity-100"
								title="Delete custom query"
								aria-label="Delete custom query"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
								</svg>
							</button>
							<div class="flex items-start gap-3 pr-6">
								<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-emerald-900' : 'bg-emerald-100'} rounded-lg flex items-center justify-center">
									<span class="text-xs font-bold {darkMode ? 'text-emerald-300' : 'text-emerald-600'}">AI</span>
								</div>
								<div class="flex-1 min-w-0">
									<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-emerald-400 transition-colors">
										{query.label}
									</h4>
									{#if query.defaultAIQueryData}
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
											{query.defaultAIQueryData.prompt.slice(0, 80)}...
										</p>
										<div class="mt-2 flex items-center gap-2">
											<span class="text-[10px] px-1.5 py-0.5 {darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'} rounded font-medium">
												{query.defaultAIQueryData.model}
											</span>
										</div>
									{/if}
								</div>
								<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
								</svg>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="text-center py-8">
				<svg class="w-12 h-12 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
				</svg>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">No custom queries yet</p>
				<button
					onclick={onCreateCustomAI}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
				>
					Create Your First Custom Query
				</button>
			</div>
		{/if}

		{#if aiGalleryFilter && filteredDefault.length === 0 && filteredCustom.length === 0}
			<div class="text-center py-12">
				<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No queries found</p>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Try adjusting your search terms</p>
			</div>
		{/if}
	</div>
</WorkflowModal>
