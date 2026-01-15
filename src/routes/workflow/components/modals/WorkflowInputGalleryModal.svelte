<script lang="ts">
	import type { ElementType, GridElement } from '../../types';
	import WorkflowModal from './WorkflowModal.svelte';

	let {
		darkMode = false,
		elementTypes = [],
		gridContainer = null,
		panX = 0,
		panY = 0,
		zoomLevel = 1,
		gridElements = $bindable([]),
		onClose,
		generateId
	}: {
		darkMode?: boolean;
		elementTypes?: ElementType[];
		gridContainer?: HTMLDivElement | null;
		panX?: number;
		panY?: number;
		zoomLevel?: number;
		gridElements?: GridElement[];
		onClose?: () => void;
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
			height: 80
		};
		gridElements = [...gridElements, newElement];
		onClose?.();
	}
</script>

<WorkflowModal {darkMode} labelledBy="input-gallery-modal-title" containerClass="overflow-hidden flex flex-col" {onClose}>
	<!-- Header -->
	<div class="p-6 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 {darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg flex items-center justify-center">
				<svg class="w-5 h-5 {darkMode ? 'text-blue-300' : 'text-blue-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
				</svg>
			</div>
			<div>
				<h2 id="input-gallery-modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Property Data Library
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Browse and add property data input nodes</p>
			</div>
		</div>
		<button
			onclick={onClose}
			class="p-1.5 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded transition-colors"
			aria-label="Close gallery"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
			</svg>
		</button>
	</div>

	<!-- Gallery Content -->
	<div class="flex-1 overflow-y-auto p-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each elementTypes.filter((t) => t.type === 'input') as query}
				<div
					class="{darkMode ? 'bg-slate-700 border-slate-600 hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-300'} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg group"
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
						<div class="w-10 h-10 flex-shrink-0 {darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg flex items-center justify-center">
							<span class="text-sm font-semibold {darkMode ? 'text-blue-300' : 'text-blue-600'}">{query.icon}</span>
						</div>
						<div class="flex-1 min-w-0">
							<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover:text-blue-400 transition-colors">
								{query.label}
							</h4>
							<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
								{query.description || 'Property data input node'}
							</p>
						</div>
						<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'} transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
						</svg>
					</div>
				</div>
			{/each}
		</div>
	</div>
</WorkflowModal>
