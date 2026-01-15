<script lang="ts">
	import type { ElementType } from '../../types';
	import { getSidebarButtonColor, getIconBgColor, getIconTextColor, getLabelTextColor } from '../../utils/nodeStyling';

	let {
		allElementTypes = [],
		darkMode = false,
		nodeFilter = $bindable(''),
		draggedElementType = $bindable(null),
		dragOffset = $bindable({ x: 0, y: 0 }),
		onShowInputGallery,
		onShowProcessGallery,
		onShowAIGallery,
		onExecuteWorkflow,
		onAddComment
	}: {
		allElementTypes?: ElementType[];
		darkMode?: boolean;
		nodeFilter?: string;
		draggedElementType?: ElementType | null;
		dragOffset?: { x: number; y: number };
		onShowInputGallery?: () => void;
		onShowProcessGallery?: () => void;
		onShowAIGallery?: () => void;
		onExecuteWorkflow?: () => void;
		onAddComment?: () => void;
	} = $props();

	function handleDragStart(elementType: ElementType, event: MouseEvent) {
		draggedElementType = elementType;
		const rect = (event.target as HTMLElement).getBoundingClientRect();
		dragOffset = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	}

	function filterMatches(elementType: ElementType): boolean {
		if (!nodeFilter) return true;
		const filter = nodeFilter.toLowerCase();
		return elementType.label.toLowerCase().includes(filter) || elementType.id.toLowerCase().includes(filter);
	}

	const filteredInputNodes = $derived(allElementTypes.filter((t) => t.type === 'input' && filterMatches(t)));
	const filteredProcessNodes = $derived(allElementTypes.filter((t) => t.type === 'process' && filterMatches(t)));
	const filteredAINodes = $derived(allElementTypes.filter((t) => t.type === 'ai' && filterMatches(t)));
	const filteredOutputNodes = $derived(allElementTypes.filter((t) => t.type === 'output' && filterMatches(t)));

	let showInputNodes = $state(true);
	let showProcessNodes = $state(true);
	let showAiNodes = $state(true);
	let showOutputNodes = $state(true);
	let showTools = $state(true);
</script>

<div class="w-72 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-r flex flex-col shadow-sm">
	<div class="p-5 border-b {darkMode ? 'border-slate-700 bg-gradient-to-r from-slate-800 to-slate-800' : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white'}">
		<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Workflow Builder</h1>
		<p class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'} mt-1.5 font-medium">Build automated workflows</p>
	</div>

	<!-- Filter Input -->
	<div class="px-5 pt-5 pb-3 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<div class="relative">
			<input
				type="text"
				bind:value={nodeFilter}
				placeholder="Search nodes..."
				class="w-full px-3 py-2 pl-9 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-400' : 'bg-slate-100 text-slate-900 border-slate-300 placeholder-slate-500'} rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
			/>
			<svg class="absolute left-2.5 top-2.5 w-4 h-4 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
			</svg>
			{#if nodeFilter}
				<button
					onclick={() => { nodeFilter = ''; }}
					class="absolute right-2.5 top-2.5 w-5 h-5 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} rounded-full hover:bg-slate-600/20 transition-colors flex items-center justify-center"
					aria-label="Clear search"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<div class="flex-1 overflow-y-auto p-5 space-y-6">
		<!-- Input Nodes -->
		<div>
			<div class="flex items-center justify-between mb-3">
				<button
					class="flex items-center gap-2 text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider"
					onclick={() => (showInputNodes = !showInputNodes)}
					aria-expanded={showInputNodes}
					aria-controls="sidebar-input-nodes"
				>
					<svg
						class="w-4 h-4 transition-transform {showInputNodes ? 'rotate-90' : ''} {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
					</svg>
					Input Nodes
				</button>
				{#if onShowInputGallery}
					<button
						onclick={onShowInputGallery}
						class="px-2 py-1 text-xs font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1"
						title="Browse Property Data nodes"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
						Browse
					</button>
				{/if}
			</div>
			{#if showInputNodes}
				<div id="sidebar-input-nodes" class="space-y-2.5">
					{#each filteredInputNodes as elementType}
						<button
							class="w-full p-3.5 {getSidebarButtonColor(elementType.type, darkMode)} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onmousedown={(e) => handleDragStart(elementType, e)}
						>
							<span class="text-sm font-semibold w-10 h-10 flex items-center justify-center {getIconBgColor(elementType.type, darkMode)} {getIconTextColor(elementType.type, darkMode)} rounded-lg transition-colors group-hover:scale-105">
								{elementType.icon}
							</span>
							<span class="text-sm font-semibold flex-1 text-left {getLabelTextColor(darkMode)}">{elementType.label}</span>
							<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
							</svg>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Process Nodes -->
		<div>
			<div class="flex items-center justify-between mb-3">
				<button
					class="flex items-center gap-2 text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider"
					onclick={() => (showProcessNodes = !showProcessNodes)}
					aria-expanded={showProcessNodes}
					aria-controls="sidebar-process-nodes"
				>
					<svg
						class="w-4 h-4 transition-transform {showProcessNodes ? 'rotate-90' : ''} {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
					</svg>
					Financial Calculations
				</button>
				{#if onShowProcessGallery}
					<button
						onclick={onShowProcessGallery}
						class="px-2 py-1 text-xs font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1"
						title="Browse Financial Calculation nodes"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
						Browse
					</button>
				{/if}
			</div>
			{#if showProcessNodes}
				<div id="sidebar-process-nodes" class="space-y-2.5">
					{#each filteredProcessNodes as elementType}
						<button
							class="w-full p-3.5 {getSidebarButtonColor(elementType.type, darkMode)} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onmousedown={(e) => handleDragStart(elementType, e)}
						>
							<span class="text-sm font-semibold w-10 h-10 flex items-center justify-center {getIconBgColor(elementType.type, darkMode)} {getIconTextColor(elementType.type, darkMode)} rounded-lg transition-colors group-hover:scale-105">
								{elementType.icon}
							</span>
							<span class="text-sm font-semibold flex-1 text-left {getLabelTextColor(darkMode)}">{elementType.label}</span>
							<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
							</svg>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- AI Nodes -->
		<div>
			<div class="flex items-center justify-between mb-3">
				<button
					class="flex items-center gap-2 text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider"
					onclick={() => (showAiNodes = !showAiNodes)}
					aria-expanded={showAiNodes}
					aria-controls="sidebar-ai-nodes"
				>
					<svg
						class="w-4 h-4 transition-transform {showAiNodes ? 'rotate-90' : ''} {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
					</svg>
					AI Analysis
				</button>
				{#if onShowAIGallery}
					<button
						onclick={onShowAIGallery}
						class="px-2 py-1 text-xs font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors flex items-center gap-1"
						title="Browse AI Query library"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
						</svg>
						Browse
					</button>
				{/if}
			</div>
			{#if showAiNodes}
				<div id="sidebar-ai-nodes" class="space-y-2.5">
					{#each filteredAINodes as elementType}
						<button
							class="w-full p-3.5 {getSidebarButtonColor(elementType.type, darkMode)} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onmousedown={(e) => handleDragStart(elementType, e)}
						>
							<span class="text-xs font-bold w-10 h-10 flex items-center justify-center {getIconBgColor(elementType.type, darkMode)} {getIconTextColor(elementType.type, darkMode)} rounded-lg transition-colors group-hover:scale-105">
								{elementType.icon}
							</span>
							<span class="text-sm font-semibold flex-1 text-left {getLabelTextColor(darkMode)}">{elementType.label}</span>
							<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
							</svg>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Output Nodes -->
		<div>
			<button
				class="flex items-center gap-2 text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider mb-3"
				onclick={() => (showOutputNodes = !showOutputNodes)}
				aria-expanded={showOutputNodes}
				aria-controls="sidebar-output-nodes"
			>
				<svg
					class="w-4 h-4 transition-transform {showOutputNodes ? 'rotate-90' : ''} {darkMode ? 'text-slate-400' : 'text-slate-500'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
				Reports & Outputs
			</button>
			{#if showOutputNodes}
				<div id="sidebar-output-nodes" class="space-y-2.5">
					{#each filteredOutputNodes as elementType}
						<button
							class="w-full p-3.5 {getSidebarButtonColor(elementType.type, darkMode)} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onmousedown={(e) => handleDragStart(elementType, e)}
						>
							<span class="text-sm font-semibold w-10 h-10 flex items-center justify-center {getIconBgColor(elementType.type, darkMode)} {getIconTextColor(elementType.type, darkMode)} rounded-lg transition-colors group-hover:scale-105">
								{elementType.icon}
							</span>
							<span class="text-sm font-semibold flex-1 text-left {getLabelTextColor(darkMode)}">{elementType.label}</span>
							<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
							</svg>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Tools -->
		{#if onAddComment}
			<div>
				<button
					class="flex items-center gap-2 text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-600'} uppercase tracking-wider mb-3"
					onclick={() => (showTools = !showTools)}
					aria-expanded={showTools}
					aria-controls="sidebar-tools"
				>
					<svg
						class="w-4 h-4 transition-transform {showTools ? 'rotate-90' : ''} {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
					</svg>
					Tools
				</button>
				{#if showTools}
					<div id="sidebar-tools">
						<button
							class="w-full p-3.5 {darkMode ? 'bg-amber-900/30 hover:bg-amber-900/40 border-amber-600/50' : 'bg-amber-50 hover:bg-amber-100 border-amber-200'} rounded-lg cursor-pointer transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
							onclick={onAddComment}
							title="Add a comment to the canvas"
						>
							<span class="text-lg w-10 h-10 flex items-center justify-center {darkMode ? 'bg-amber-800/50' : 'bg-amber-100'} {darkMode ? 'text-amber-200' : 'text-amber-700'} rounded-lg transition-colors group-hover:scale-105">
								💬
							</span>
							<span class="text-sm font-semibold flex-1 text-left {darkMode ? 'text-slate-200' : 'text-slate-900'}">Add Comment</span>
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Execute Button -->
	{#if onExecuteWorkflow}
		<div class="p-5 border-t {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
			<button
				class="w-full px-4 py-3 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2"
				onclick={onExecuteWorkflow}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				Execute Workflow
			</button>
		</div>
	{/if}
</div>
