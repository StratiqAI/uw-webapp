<script lang="ts">
	import type { GridElement, ConnectionSide } from '../../types';
	import {
		getElementColor,
		getElementBorderColor,
		getNodeIconBgColor,
		getNodeIconTextColor,
		getNodeLabelColor,
		getNodeAccentColor
	} from '../../utils/nodeStyling';

	const {
		element,
		darkMode = false,
		isDragged = false,
		onDelete,
		onDragStart,
		onDoubleClick,
		onConnectionPointClick
	}: {
		element: GridElement;
		darkMode?: boolean;
		isDragged?: boolean;
		onDelete?: (id: string, event: MouseEvent) => void;
		onDragStart?: (element: GridElement, event: MouseEvent) => void;
		onDoubleClick?: (element: GridElement, event: MouseEvent) => void;
		onConnectionPointClick?: (elementId: string, side: ConnectionSide, event: MouseEvent) => void;
	} = $props();

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		if (onDelete) {
			onDelete(element.id, e);
		}
	}

	function handleDragStart(e: MouseEvent) {
		e.stopPropagation();
		if (onDragStart) {
			onDragStart(element, e);
		}
	}

	function handleDoubleClickEvent(e: MouseEvent) {
		if (onDoubleClick) {
			onDoubleClick(element, e);
		}
	}

	function handleConnectionClick(side: ConnectionSide, e: MouseEvent) {
		if (onConnectionPointClick) {
			onConnectionPointClick(element.id, side, e);
		}
	}

	function handleButtonClick(e: MouseEvent) {
		e.stopPropagation();
	}
</script>

<div class="absolute overflow-visible" style="left: {element.x}px; top: {element.y}px;">
	<!-- Node Container -->
	<div
		class="{element.type.type === 'input' 
			? darkMode ? 'bg-gradient-to-r from-indigo-500/10 via-slate-700/80 to-slate-800/80' : 'bg-gradient-to-r from-indigo-50 via-white to-slate-50/50'
			: element.type.type === 'output'
			? darkMode ? 'bg-gradient-to-l from-emerald-500/10 via-slate-700/80 to-slate-800/80' : 'bg-gradient-to-l from-emerald-50 via-white to-slate-50/50'
			: getElementColor(element.type.type, darkMode)} 
		{element.type.type === 'input' ? 'rounded-r-2xl rounded-l-full' 
			: element.type.type === 'output' ? 'rounded-l-2xl rounded-r-full'
			: 'rounded-xl'} 
		{darkMode ? 'shadow-2xl shadow-black/50' : 'shadow-lg'} 
		cursor-move 
		{element.type.type === 'input' 
			? 'border-2 ' + (darkMode ? 'border-slate-600/60 border-l-indigo-400/60' : 'border-slate-200 border-l-indigo-400/70')
			: element.type.type === 'output'
			? 'border-2 ' + (darkMode ? 'border-slate-600/60 border-r-emerald-400/60' : 'border-slate-200 border-r-emerald-400/70')
			: 'border-2 ' + getElementBorderColor(element.type.type, darkMode)
		} 
		{isDragged ? '' : 'hover:shadow-2xl hover:scale-[1.02] transition-all'} 
		{getNodeAccentColor(element.type.type, darkMode) ? getNodeAccentColor(element.type.type, darkMode) + ' ring-1' : ''}"
		style="width: {element.width}px; height: {element.height}px; {isDragged ? 'transition: none;' : ''}"
		onmousedown={handleDragStart}
		ondblclick={handleDoubleClickEvent}
		role="button"
		tabindex="0"
	>
		<div class="relative w-full h-full flex flex-col items-center justify-center group overflow-visible">
			{#if element.type.type === 'input'}
				<!-- Entry indicator arrow on the left -->
				<div class="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 {darkMode ? 'bg-indigo-500/30' : 'bg-indigo-500/20'} rounded-full flex items-center justify-center z-10">
					<svg class="w-3 h-3 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
					</svg>
				</div>
			{/if}
			{#if element.type.type === 'output'}
				<!-- Exit indicator arrow on the right -->
				<div class="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 {darkMode ? 'bg-emerald-500/30' : 'bg-emerald-500/20'} rounded-full flex items-center justify-center z-10">
					<svg class="w-3 h-3 {darkMode ? 'text-emerald-300' : 'text-emerald-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
					</svg>
				</div>
			{/if}
			<!-- Hover Options Icons (appear above node on hover) -->
			<div class="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-auto">
			<!-- Play Button -->
			<button
				class="w-5 h-5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'} rounded flex items-center justify-center transition-all hover:scale-110 shadow-sm"
				aria-label="Run node"
				title="Run node"
				onclick={handleButtonClick}
			>
				<svg class="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
			</button>
			<!-- Power Button -->
			<button
				class="w-5 h-5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'} rounded flex items-center justify-center transition-all hover:scale-110 shadow-sm"
				aria-label="Toggle node"
				title="Toggle node"
				onclick={handleButtonClick}
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
			</button>
				<!-- Delete Button -->
				{#if onDelete}
					<button
						class="w-5 h-5 {darkMode ? 'bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white' : 'bg-slate-200 hover:bg-red-500 text-slate-600 hover:text-white'} rounded flex items-center justify-center transition-all hover:scale-110 shadow-sm"
						onclick={handleDelete}
						aria-label="Delete node"
						title="Delete node"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				{/if}
			<!-- More Options Button -->
			<button
				class="w-5 h-5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'} rounded flex items-center justify-center transition-all hover:scale-110 shadow-sm"
				aria-label="More options"
				title="More options"
				onclick={handleButtonClick}
			>
				<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
				</svg>
			</button>
			</div>

			<!-- Icon Container (centered in node) -->
			<div class="w-12 h-12 flex items-center justify-center {getNodeIconBgColor(element.type.type, darkMode)} {(element.type.type === 'input' || element.type.type === 'output') ? 'rounded-full' : 'rounded-lg'} shadow-sm">
				<span class="text-lg {getNodeIconTextColor(element.type.type, darkMode)} font-semibold">
					{element.type.icon}
				</span>
			</div>

			<!-- Connection Points (only left input and right output) -->
			{#if onConnectionPointClick}
				<!-- Input Connection Point (left side - flat indicator) - Hidden for input nodes -->
				{#if element.type.type !== 'input'}
					<button
						class="connection-point absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center cursor-crosshair z-20 group/conn"
						onclick={(e) => handleConnectionClick('left', e)}
						aria-label="Input connection point"
					>
						<!-- Flat rectangular indicator -->
						<div class="w-3 h-8 {darkMode ? 'bg-slate-500' : 'bg-slate-400'} group-hover/conn:bg-indigo-500 transition-colors rounded-sm"></div>
					</button>
				{/if}
				<!-- Output Connection Point (right side - circular, centered on edge) - Hidden for output nodes -->
				{#if element.type.type !== 'output'}
					<button
						class="connection-point absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 flex items-center justify-center cursor-crosshair z-20 group/conn"
						onclick={(e) => handleConnectionClick('right', e)}
						aria-label="Output connection point"
					>
						<!-- Circle centered on edge -->
						<div class="w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full group-hover/conn:bg-indigo-500 group-hover/conn:border-indigo-600 transition-all group-hover/conn:scale-125 group-hover/conn:shadow-md"></div>
					</button>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Description/Label (below the node) -->
	<div class="text-center whitespace-nowrap pointer-events-none mt-3" style="width: {element.width}px; {element.type.type === 'input' ? 'margin-left: 6px;' : element.type.type === 'output' ? 'margin-left: -6px;' : ''}">
		<div class="text-sm font-semibold {getNodeLabelColor(darkMode)} leading-tight">
			{element.type.label}
		</div>
	</div>
</div>
