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
	const filteredToolNodes = $derived(allElementTypes.filter((t) => t.type === 'tools' && filterMatches(t)));

	let showInputNodes = $state(true);
	let showProcessNodes = $state(true);
	let showAiNodes = $state(true);
	let showOutputNodes = $state(true);
	let showTools = $state(true);
</script>

<div class="w-72 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-r flex flex-col shadow-sm">
	<div class="p-5 border-b {darkMode ? 'border-slate-700 bg-gradient-to-r from-slate-800 to-slate-800' : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white'}">
		<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Workflow Editor</h1>
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
				<div id="sidebar-input-nodes" class="space-y-3">
					{#each filteredInputNodes as elementType}
						{@const isDisabled = elementType.id !== 'property-data' && elementType.id !== 'on-document-upload' && elementType.id !== 'event'}
						<button
							disabled={isDisabled}
							class="w-full relative pl-6 pr-4 py-2.5 {isDisabled 
								? darkMode ? 'bg-gradient-to-r from-slate-800/50 via-slate-800/50 to-slate-800/50 border-slate-700/40 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-slate-300/40 cursor-not-allowed opacity-50'
								: darkMode ? 'bg-gradient-to-r from-indigo-500/10 via-slate-700/80 to-slate-800/80 hover:from-indigo-500/15 hover:via-slate-700 hover:to-slate-700 border-slate-600/60 hover:border-indigo-400/50' : 'bg-gradient-to-r from-indigo-50 via-white to-slate-50/50 hover:from-indigo-100/50 hover:via-white hover:to-slate-50 border-slate-200 hover:border-indigo-300/60'} rounded-r-2xl rounded-l-full {isDisabled ? '' : 'cursor-move'} transition-all duration-300 flex items-center gap-3 border-l-2 {isDisabled 
								? darkMode ? 'border-l-slate-600/30' : 'border-l-slate-300/30'
								: darkMode ? 'border-l-indigo-400/60 group-hover:border-l-indigo-400' : 'border-l-indigo-400/70 group-hover:border-l-indigo-500'} {isDisabled ? '' : 'shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.02] hover:-translate-y-0.5'} group overflow-hidden"
							onmousedown={(e) => !isDisabled && handleDragStart(elementType, e)}
						>
							<!-- Entry indicator arrow on the left -->
							<div class="absolute left-0 top-1/2 ml-1 -translate-y-1/2 w-6 h-6 {isDisabled 
								? darkMode ? 'bg-slate-600/20' : 'bg-slate-400/20'
								: darkMode ? 'bg-indigo-500/30 group-hover:bg-indigo-500/40' : 'bg-indigo-500/20 group-hover:bg-indigo-500/30'} rounded-full flex items-center justify-center transition-all duration-300 {isDisabled ? '' : 'group-hover:scale-110'}">
								<svg class="w-3 h-3 {darkMode ? 'text-indigo-300' : 'text-indigo-600'} group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
								</svg>
							</div>
							
							{#if !isDisabled}
								<!-- Subtle gradient overlay on hover -->
								<div class="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-indigo-500/3 group-hover:to-indigo-500/0 transition-all duration-300 pointer-events-none"></div>
							{/if}
							
							<!-- Icon without circular container -->
							<span class="relative z-10 text-lg flex items-center justify-center ml-3">
								{elementType.icon}
							</span>
							
							<!-- Enhanced label with better typography -->
							<span class="relative z-10 text-sm font-semibold flex-1 text-left {isDisabled 
								? darkMode ? 'text-slate-500' : 'text-slate-400'
								: darkMode ? 'text-slate-100 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-900'} transition-colors duration-300 tracking-tight">
								{elementType.label}
							</span>
							
							{#if !isDisabled}
								<!-- Enhanced arrow with animation -->
								<svg class="relative z-10 w-4 h-4 {darkMode ? 'text-indigo-400/60 group-hover:text-indigo-300' : 'text-indigo-400/70 group-hover:text-indigo-500'} opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
								</svg>
								
								<!-- Subtle shine effect on hover -->
								<div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none">
									<div class="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
								</div>
							{/if}
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
					Functions
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
				<div id="sidebar-output-nodes" class="space-y-3">
					{#each filteredOutputNodes as elementType}
						<button
							class="w-full relative pl-4 pr-6 py-2.5 {darkMode ? 'bg-gradient-to-l from-emerald-500/10 via-slate-700/80 to-slate-800/80 hover:from-emerald-500/15 hover:via-slate-700 hover:to-slate-700 border-slate-600/60 hover:border-emerald-400/50' : 'bg-gradient-to-l from-emerald-50 via-white to-slate-50/50 hover:from-emerald-100/50 hover:via-white hover:to-slate-50 border-slate-200 hover:border-emerald-300/60'} rounded-l-2xl rounded-r-full cursor-move transition-all duration-300 flex items-center gap-3 border-r-2 {darkMode ? 'border-r-emerald-400/60 group-hover:border-r-emerald-400' : 'border-r-emerald-400/70 group-hover:border-r-emerald-500'} shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.02] hover:-translate-y-0.5 group overflow-hidden"
							onmousedown={(e) => handleDragStart(elementType, e)}
						>
							<!-- Subtle gradient overlay on hover -->
							<div class="absolute inset-0 bg-gradient-to-l from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:via-emerald-500/3 group-hover:to-emerald-500/0 transition-all duration-300 pointer-events-none"></div>
							
							<!-- Enhanced icon container with gradient and glow -->
							<span class="relative z-10 text-sm w-10 h-10 flex items-center justify-center {darkMode ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-600/30 to-emerald-700/40 group-hover:from-emerald-500/30 group-hover:via-emerald-600/40 group-hover:to-emerald-700/50' : 'bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-100 group-hover:from-emerald-200 group-hover:via-emerald-100 group-hover:to-emerald-200'} {darkMode ? 'text-emerald-300 group-hover:text-emerald-200' : 'text-emerald-600 group-hover:text-emerald-700'} rounded-full transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/30 border {darkMode ? 'border-emerald-500/30 group-hover:border-emerald-400/50' : 'border-emerald-200/50 group-hover:border-emerald-300/70'} backdrop-blur-sm">
								{elementType.icon}
							</span>
							
							<!-- Enhanced label with better typography -->
							<span class="relative z-10 text-sm font-semibold flex-1 text-left {darkMode ? 'text-slate-100 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-900'} transition-colors duration-300 tracking-tight">
								{elementType.label}
							</span>
							
							<!-- Exit indicator arrow on the right -->
							<div class="absolute right-0 top-1/2 mr-1 -translate-y-1/2 w-6 h-6 {darkMode ? 'bg-emerald-500/30 group-hover:bg-emerald-500/40' : 'bg-emerald-500/20 group-hover:bg-emerald-500/30'} rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 z-10">
								<svg class="w-3 h-3 {darkMode ? 'text-emerald-300' : 'text-emerald-600'} group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
								</svg>
							</div>
							
							<!-- Subtle shine effect on hover -->
							<div class="absolute inset-0 translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-in-out pointer-events-none">
								<div class="w-full h-full bg-gradient-to-l from-transparent via-white/10 to-transparent"></div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Tools -->
		{#if filteredToolNodes.length > 0 || onAddComment}
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
					<div id="sidebar-tools" class="space-y-2.5">
						{#each filteredToolNodes as elementType}
							<button
								class="w-full p-3.5 {darkMode ? 'bg-purple-900/30 hover:bg-purple-900/40 border-purple-600/50' : 'bg-purple-50 hover:bg-purple-100 border-purple-200'} rounded-lg cursor-move transition-all flex items-center gap-3 border shadow-sm hover:shadow-md hover:scale-[1.02] group"
								onmousedown={(e) => handleDragStart(elementType, e)}
							>
								<span class="text-sm font-semibold w-10 h-10 flex items-center justify-center {darkMode ? 'bg-purple-800/50' : 'bg-purple-100'} {darkMode ? 'text-purple-200' : 'text-purple-700'} rounded-lg transition-colors group-hover:scale-105">
									{elementType.icon}
								</span>
								<span class="text-sm font-semibold flex-1 text-left {darkMode ? 'text-slate-200' : 'text-slate-900'}">{elementType.label}</span>
								<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
								</svg>
							</button>
						{/each}
						{#if onAddComment}
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
						{/if}
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
