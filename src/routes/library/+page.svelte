<script lang="ts">
	import { onMount } from 'svelte';
	import { elementTypes, type ElementType, type AIQueryData } from './elementTypes';

	// State
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;
	let customAINodes = $state<ElementType[]>([]);
	let aiGalleryFilter = $state('');
	let creatingCustomAI = $state(false);
	let customAINodeLabel = $state('');
	let customAINodePrompt = $state('');
	let customAINodeModel = $state('gpt-4o');
	let customAINodeSystemPrompt = $state('');

	// Load custom AI nodes from localStorage on mount
	function loadCustomAINodes() {
		try {
			const stored = localStorage.getItem('workflow-custom-ai-nodes');
			if (stored) {
				const parsed = JSON.parse(stored);
				// Reconstruct execute function for each custom node
				customAINodes = parsed.map((node: any) => ({
					...node,
					execute: async (input: any, customData?: AIQueryData) => {
						const data = customData || node.defaultAIQueryData;
						if (!data) return 'AI Query not configured';
						return 'AI Query configured';
					}
				}));
			}
		} catch (e) {
			console.error('Failed to load custom AI nodes:', e);
		}
	}

	// Save custom AI nodes to localStorage (without execute functions)
	function saveCustomAINodes() {
		try {
			const serializable = customAINodes.map(({ execute, ...rest }) => rest);
			localStorage.setItem('workflow-custom-ai-nodes', JSON.stringify(serializable));
		} catch (e) {
			console.error('Failed to save custom AI nodes:', e);
		}
	}

	// Create a custom AI node
	function createCustomAINode() {
		if (!customAINodeLabel.trim() || !customAINodePrompt.trim()) {
			return;
		}

		const newId = `custom-ai-${Date.now()}`;
		const newNode: ElementType = {
			id: newId,
			type: 'ai',
			label: customAINodeLabel.trim(),
			icon: 'AI',
			execute: async (input: any, customData?: AIQueryData) => {
				const data = customData || newNode.defaultAIQueryData;
				if (!data) return 'AI Query not configured';
				return 'AI Query configured';
			},
			defaultAIQueryData: {
				prompt: customAINodePrompt.trim(),
				model: customAINodeModel,
				systemPrompt: customAINodeSystemPrompt.trim() || undefined
			}
		};

		customAINodes = [...customAINodes, newNode];
		saveCustomAINodes();

		// Reset form
		customAINodeLabel = '';
		customAINodePrompt = '';
		customAINodeModel = 'gpt-4o';
		customAINodeSystemPrompt = '';
		creatingCustomAI = false;
	}

	// Delete a custom AI node
	function deleteCustomAINode(nodeId: string) {
		customAINodes = customAINodes.filter((node) => node.id !== nodeId);
		saveCustomAINodes();
	}

	// Cancel creating custom AI node
	function cancelCreateCustomAI() {
		customAINodeLabel = '';
		customAINodePrompt = '';
		customAINodeModel = 'gpt-4o';
		customAINodeSystemPrompt = '';
		creatingCustomAI = false;
	}

	// Dark mode toggle is now handled by the unified store

	// Get query description
	function getQueryDescription(queryId: string): string {
		const element = elementTypes.find((e) => e.id === queryId);
		return element?.description || 'Custom AI analysis query';
	}

	onMount(() => {
		loadCustomAINodes();
		// Dark mode is initialized by the store
	});
</script>

<div class="min-h-screen {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Header -->
	<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							The Automated Professional Library
						</h1>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Packages of AI Agents, Workflows and Dashboards that are right for the job</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<button
						onclick={() => creatingCustomAI = true}
						class="px-4 py-2 text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded-lg transition-colors flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
						</svg>
						Create New
					</button>
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
					bind:value={aiGalleryFilter}
					placeholder="Search queries..."
					class="w-full px-4 py-2 pl-10 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
				/>
				<svg class="absolute left-3 top-2.5 w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				{#if aiGalleryFilter}
					<button
						onclick={() => aiGalleryFilter = ''}
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
		<!-- Default AI Queries -->
		{#if elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length > 0}
			<div class="mb-8">
				<h2 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
					<span class="w-1 h-4 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded"></span>
					Default Queries ({elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each elementTypes.filter((t) => t.type === 'ai' && (!aiGalleryFilter || t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))) as query}
						<div
							class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 transition-all hover:shadow-lg group"
						>
							<div class="flex items-start gap-3">
								<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
									<span class="text-xs font-bold {darkMode ? 'text-indigo-300' : 'text-indigo-600'}">AI</span>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-indigo-400 transition-colors">
										{query.label}
									</h3>
									<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
										{getQueryDescription(query.id)}
									</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Custom AI Queries -->
		{#if customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length > 0}
			<div>
				<h2 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-4 flex items-center gap-2">
					<span class="w-1 h-4 {darkMode ? 'bg-emerald-500' : 'bg-emerald-600'} rounded"></span>
					Your Custom Queries ({customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each customAINodes.filter((q) => !aiGalleryFilter || q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())) as query}
						<div
							class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'} border rounded-lg p-4 transition-all hover:shadow-lg group relative"
						>
							<button
								onclick={() => deleteCustomAINode(query.id)}
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
									<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-emerald-400 transition-colors">
										{query.label}
									</h3>
									{#if query.defaultAIQueryData}
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
											{query.defaultAIQueryData.prompt.slice(0, 80)}...
										</p>
										<div class="mt-2 flex items-center gap-2">
											<span class="text-[10px] px-1.5 py-0.5 {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'} rounded font-medium">
												{query.defaultAIQueryData.model}
											</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else if !aiGalleryFilter}
			<div class="text-center py-12">
				<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
				</svg>
				<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No custom agents yet</p>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">Create your first custom agent to get started</p>
				<button
					onclick={() => creatingCustomAI = true}
					class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
				>
					Create Your First Agent
				</button>
			</div>
		{/if}

		<!-- No Results Message -->
		{#if aiGalleryFilter && elementTypes.filter((t) => t.type === 'ai' && (t.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || t.id.toLowerCase().includes(aiGalleryFilter.toLowerCase()))).length === 0 && customAINodes.filter((q) => q.label.toLowerCase().includes(aiGalleryFilter.toLowerCase()) || q.id.toLowerCase().includes(aiGalleryFilter.toLowerCase())).length === 0}
			<div class="text-center py-12">
				<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
				</svg>
				<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No queries found</p>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Try adjusting your search terms</p>
			</div>
		{/if}
	</div>
</div>

<!-- Create Custom AI Node Modal -->
{#if creatingCustomAI}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
		onclick={cancelCreateCustomAI}
		onkeydown={(e) => e.key === 'Escape' && cancelCreateCustomAI()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-modal-title"
		tabindex="-1"
	>
		<div
			class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="p-6">
				<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
					<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
						</svg>
					</div>
					<div>
						<h2 id="create-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							Create Custom AI Query
						</h2>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Add a new AI analysis query to your library</p>
					</div>
				</div>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						createCustomAINode();
					}}
					class="space-y-4"
				>
					<div>
						<label for="custom-label" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							Query Label
						</label>
						<input
							id="custom-label"
							type="text"
							bind:value={customAINodeLabel}
							placeholder="e.g., Market Analysis for Retail Properties"
							class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
							required
						/>
					</div>

					<div>
						<label for="custom-prompt" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							Prompt
						</label>
						<textarea
							id="custom-prompt"
							bind:value={customAINodePrompt}
							placeholder="Enter the prompt for your AI query. Use {input} as a placeholder for input data."
							rows="4"
							class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
							required
						></textarea>
					</div>

					<div>
						<label for="custom-model" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							Model
						</label>
						<select
							id="custom-model"
							bind:value={customAINodeModel}
							class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
						>
							<option value="gpt-4o">GPT-4o</option>
							<option value="gpt-4-turbo">GPT-4 Turbo</option>
							<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
						</select>
					</div>

					<div>
						<label for="custom-system-prompt" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							System Prompt (Optional)
						</label>
						<textarea
							id="custom-system-prompt"
							bind:value={customAINodeSystemPrompt}
							placeholder="Enter a system prompt to define the AI's role and expertise..."
							rows="3"
							class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
						></textarea>
					</div>

					<div class="flex items-center justify-end gap-3 pt-4 border-t {darkMode ? 'border-slate-700' : 'border-slate-200'}">
						<button
							type="button"
							onclick={cancelCreateCustomAI}
							class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
						>
							Create Query
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

