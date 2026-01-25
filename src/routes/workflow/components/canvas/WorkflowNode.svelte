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
		/** WORKFLOW_NODE_EXECUTION status: RUNNING, COMPLETED, FAILED, CANCELLED */
		nodeStatus = undefined,
		onDelete,
		onDragStart,
		onDoubleClick,
		onConnectionPointClick
	}: {
		element: GridElement;
		darkMode?: boolean;
		isDragged?: boolean;
		nodeStatus?: string;
		onDelete?: (id: string, event: MouseEvent) => void;
		onDragStart?: (element: GridElement, event: MouseEvent) => void;
		onDoubleClick?: (element: GridElement, event: MouseEvent) => void;
		onConnectionPointClick?: (elementId: string, side: ConnectionSide, event: MouseEvent) => void;
	} = $props();

	const isExecuting = $derived(nodeStatus === 'RUNNING');
	const hasStatus = $derived(!!nodeStatus);

	/** Border/ring, overlay, badge and arrow colors by status */
	function statusStyles(status: string) {
		switch (status) {
			case 'RUNNING':
				return {
					border: darkMode ? 'border-amber-400/80' : 'border-amber-500/80',
					ring: darkMode ? 'ring-2 ring-amber-400/50' : 'ring-2 ring-amber-500/50',
					overlay: darkMode ? 'bg-amber-500/20' : 'bg-amber-500/10',
					badge: darkMode ? 'bg-amber-500/90 text-amber-100' : 'bg-amber-500 text-white',
					arrow: darkMode ? 'bg-amber-500/40' : 'bg-amber-500/30',
					arrowIcon: darkMode ? 'text-amber-200' : 'text-amber-700'
				};
			case 'COMPLETED':
				return {
					border: darkMode ? 'border-emerald-400/80' : 'border-emerald-500/80',
					ring: darkMode ? 'ring-2 ring-emerald-400/50' : 'ring-2 ring-emerald-500/50',
					overlay: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-500/5',
					badge: darkMode ? 'bg-emerald-500/90 text-emerald-100' : 'bg-emerald-500 text-white',
					arrow: darkMode ? 'bg-emerald-500/40' : 'bg-emerald-500/30',
					arrowIcon: darkMode ? 'text-emerald-200' : 'text-emerald-700'
				};
			case 'FAILED':
				return {
					border: darkMode ? 'border-red-400/80' : 'border-red-500/80',
					ring: darkMode ? 'ring-2 ring-red-400/50' : 'ring-2 ring-red-500/50',
					overlay: darkMode ? 'bg-red-500/10' : 'bg-red-500/5',
					badge: darkMode ? 'bg-red-500/90 text-red-100' : 'bg-red-500 text-white',
					arrow: darkMode ? 'bg-red-500/40' : 'bg-red-500/30',
					arrowIcon: darkMode ? 'text-red-200' : 'text-red-700'
				};
			case 'CANCELLED':
				return {
					border: darkMode ? 'border-slate-400/80' : 'border-slate-400/80',
					ring: darkMode ? 'ring-2 ring-slate-400/50' : 'ring-2 ring-slate-500/50',
					overlay: darkMode ? 'bg-slate-500/10' : 'bg-slate-500/5',
					badge: darkMode ? 'bg-slate-500/90 text-slate-200' : 'bg-slate-500 text-white',
					arrow: darkMode ? 'bg-slate-500/40' : 'bg-slate-500/30',
					arrowIcon: darkMode ? 'text-slate-200' : 'text-slate-700'
				};
			default:
				return {
					border: darkMode ? 'border-slate-400/60' : 'border-slate-400/60',
					ring: darkMode ? 'ring-2 ring-slate-400/40' : 'ring-2 ring-slate-500/40',
					overlay: darkMode ? 'bg-slate-500/10' : 'bg-slate-500/5',
					badge: darkMode ? 'bg-slate-500/90 text-slate-200' : 'bg-slate-500 text-white',
					arrow: darkMode ? 'bg-slate-500/40' : 'bg-slate-500/30',
					arrowIcon: darkMode ? 'text-slate-200' : 'text-slate-700'
				};
		}
	}
	const styles = $derived(nodeStatus ? statusStyles(nodeStatus) : null);

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
			? 'border-2 ' + (hasStatus && styles ? styles.border : (darkMode ? 'border-slate-600/60 border-l-indigo-400/60' : 'border-slate-200 border-l-indigo-400/70'))
			: element.type.type === 'output'
			? 'border-2 ' + (hasStatus && styles ? styles.border : (darkMode ? 'border-slate-600/60 border-r-emerald-400/60' : 'border-slate-200 border-r-emerald-400/70'))
			: 'border-2 ' + (hasStatus && styles ? styles.border : getElementBorderColor(element.type.type, darkMode))
		} 
		{hasStatus && styles ? styles.ring : ''}
		{isDragged ? '' : 'hover:shadow-2xl hover:scale-[1.02] transition-all'} 
		{!hasStatus && getNodeAccentColor(element.type.type, darkMode) ? getNodeAccentColor(element.type.type, darkMode) + ' ring-1' : ''}"
		style="width: {element.width}px; height: {element.height}px; {isDragged ? 'transition: none;' : ''}"
		onmousedown={handleDragStart}
		ondblclick={handleDoubleClickEvent}
		role="button"
		tabindex="0"
	>
		<div class="relative w-full h-full flex flex-col items-center justify-center group overflow-visible">
			{#if hasStatus && styles}
				<!-- Status overlay -->
				<div class="absolute inset-0 {styles.overlay} rounded-xl z-0 {isExecuting ? 'animate-pulse' : ''}"></div>
			{/if}
			{#if element.type.type === 'input'}
				<!-- Entry indicator arrow on the left -->
				<div class="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 {hasStatus && styles ? styles.arrow : (darkMode ? 'bg-indigo-500/30' : 'bg-indigo-500/20')} rounded-full flex items-center justify-center z-10">
					<svg class="w-3 h-3 {hasStatus && styles ? styles.arrowIcon : (darkMode ? 'text-indigo-300' : 'text-indigo-600')}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
					</svg>
				</div>
			{/if}
			{#if element.type.type === 'output'}
				<!-- Exit indicator arrow on the right -->
				<div class="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 {hasStatus && styles ? styles.arrow : (darkMode ? 'bg-emerald-500/30' : 'bg-emerald-500/20')} rounded-full flex items-center justify-center z-10">
					<svg class="w-3 h-3 {hasStatus && styles ? styles.arrowIcon : (darkMode ? 'text-emerald-300' : 'text-emerald-600')}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
					</svg>
				</div>
			{/if}
			<!-- Hover Options Icons (appear above node on hover) -->
			<div class="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-auto">
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

	<!-- Status indicator next to node (WORKFLOW_NODE_EXECUTION status) -->
	{#if hasStatus && styles && nodeStatus}
		<div
			class="absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20 pointer-events-none"
			style="left: {element.width + 6}px;"
			title="Node execution status: {nodeStatus}"
		>
			{#if isExecuting}
				<div class="w-5 h-5 {styles.badge} rounded-full flex items-center justify-center shadow-md shrink-0">
					<svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
					</svg>
				</div>
			{:else if nodeStatus === 'COMPLETED'}
				<div class="w-5 h-5 {styles.badge} rounded-full flex items-center justify-center shadow-md shrink-0">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
				</div>
			{:else if nodeStatus === 'FAILED'}
				<div class="w-5 h-5 {styles.badge} rounded-full flex items-center justify-center shadow-md shrink-0">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
				</div>
			{:else if nodeStatus === 'CANCELLED'}
				<div class="w-5 h-5 {styles.badge} rounded-full flex items-center justify-center shadow-md shrink-0">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
				</div>
			{/if}
			<span class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded {styles.badge} shadow-sm whitespace-nowrap" aria-label="Status: {nodeStatus}">{nodeStatus}</span>
		</div>
	{/if}

	<!-- Description/Label (below the node) -->
	<div class="text-center whitespace-nowrap pointer-events-none mt-3" style="width: {element.width}px; {element.type.type === 'input' ? 'margin-left: 6px;' : element.type.type === 'output' ? 'margin-left: -6px;' : ''}">
		<div class="text-sm font-semibold {getNodeLabelColor(darkMode)} leading-tight">
			{element.type.label}
		</div>
	</div>
</div>
