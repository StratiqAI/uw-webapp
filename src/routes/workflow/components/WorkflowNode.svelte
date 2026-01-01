<script lang="ts">
	import type { GridElement, ConnectionSide } from '../types';
	import {
		getElementColor,
		getElementBorderColor,
		getNodeIconBgColor,
		getNodeIconTextColor,
		getNodeLabelColor,
		getNodeAccentColor
	} from '../utils/nodeStyling';

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
</script>

<div
	class="absolute {getElementColor(element.type.type, darkMode)} rounded-xl {darkMode ? 'shadow-2xl shadow-black/50' : 'shadow-lg'} cursor-move border-2 {getElementBorderColor(element.type.type, darkMode)} {isDragged ? '' : 'hover:shadow-2xl hover:scale-[1.02] transition-all'} {getNodeAccentColor(element.type.type, darkMode) ? getNodeAccentColor(element.type.type, darkMode) + ' ring-1' : ''}"
	style="left: {element.x}px; top: {element.y}px; width: {element.width}px; height: {element.height}px; {isDragged ? 'transition: none;' : ''}"
	onmousedown={handleDragStart}
	ondblclick={handleDoubleClickEvent}
	role="button"
	tabindex="0"
>
	<div class="relative w-full h-full p-4 flex flex-col items-center justify-center group">
		<!-- Delete Button -->
		{#if onDelete}
			<button
				class="absolute -top-2 -right-2 w-5 h-5 {darkMode ? 'bg-slate-700 hover:bg-red-600' : 'bg-slate-200 hover:bg-red-500'} rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg hover:shadow-xl hover:scale-110"
				onclick={handleDelete}
				aria-label="Delete node"
				title="Delete node"
			>
				<svg class="w-3 h-3 {darkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-white'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
			</button>
		{/if}

		<!-- Icon Container -->
		<div class="w-12 h-12 flex items-center justify-center {getNodeIconBgColor(element.type.type, darkMode)} rounded-lg mb-2.5 shadow-sm">
			<span class="text-lg {getNodeIconTextColor(element.type.type, darkMode)} font-semibold">
				{element.type.icon}
			</span>
		</div>

		<!-- Label -->
		<div class="text-xs font-semibold {getNodeLabelColor(darkMode)} text-center leading-tight px-1 mb-1">
			{element.type.label}
		</div>

		<!-- Output Display -->
		{#if element.output !== undefined}
			<div class="text-[10px] mt-1.5 truncate max-w-full px-2 py-1 font-mono {darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'} rounded border {darkMode ? 'border-slate-600' : 'border-slate-200'}">
				{String(element.output).slice(0, 20)}
			</div>
		{/if}

		<!-- Connection Points -->
		{#if onConnectionPointClick}
			<button
				class="connection-point absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
				onclick={(e) => handleConnectionClick('top', e)}
				aria-label="Top connection point"
			></button>
			<button
				class="connection-point absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
				onclick={(e) => handleConnectionClick('right', e)}
				aria-label="Right connection point"
			></button>
			<button
				class="connection-point absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
				onclick={(e) => handleConnectionClick('bottom', e)}
				aria-label="Bottom connection point"
			></button>
			<button
				class="connection-point absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 {darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-slate-300'} border-2 rounded-full hover:bg-indigo-500 hover:border-indigo-600 hover:scale-125 hover:shadow-md transition-all cursor-crosshair z-10"
				onclick={(e) => handleConnectionClick('left', e)}
				aria-label="Left connection point"
			></button>
		{/if}
	</div>
</div>
