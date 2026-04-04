<script lang="ts">
	import WorkflowExecutionsPanel from './WorkflowExecutionsPanel.svelte';
	import WorkflowSubscriptionEventsPanel from './WorkflowSubscriptionEventsPanel.svelte';
	import type { WorkflowExecutionListItem } from '../../services/backend/workflowExecutionService';
	import type { WorkflowSyncManager } from '$lib/services/realtime/websocket/sync-managers/WorkflowSyncManager';
	import { onMount } from 'svelte';

	type TabId = 'executions' | 'subscriptions';

	const {
		executions = [],
		executionsLoading = false,
		selectedWorkflowId = null,
		selectedProjectId = null,
		selectedExecutionId = null,
		onSelectExecution,
		onRefreshExecutions,
		syncManager = null,
		darkMode = false
	}: {
		executions?: WorkflowExecutionListItem[];
		executionsLoading?: boolean;
		selectedWorkflowId?: string | null;
		selectedProjectId?: string | null;
		selectedExecutionId?: string | null;
		onSelectExecution?: (exec: WorkflowExecutionListItem) => void;
		onRefreshExecutions?: () => void;
		syncManager?: WorkflowSyncManager | null;
		darkMode?: boolean;
	} = $props();

	let activeTab = $state<TabId>('executions');

	// Resize functionality
	const STORAGE_KEY = 'workflow-bottom-panel-height';
	const DEFAULT_HEIGHT = 288; // h-72 = 18rem = 288px
	const MIN_HEIGHT = 150;
	const MAX_HEIGHT = 800;

	let panelHeight = $state<number>(DEFAULT_HEIGHT);
	let isResizing = $state(false);
	let panelRef: HTMLDivElement | null = $state(null);
	let resizeHandleRef = $state<HTMLButtonElement | null>(null);

	// Load saved height from localStorage
	onMount(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = parseInt(saved, 10);
				if (!isNaN(parsed) && parsed >= MIN_HEIGHT && parsed <= MAX_HEIGHT) {
					panelHeight = parsed;
				}
			}
		}
	});

	function startResize(e: MouseEvent | KeyboardEvent) {
		e.preventDefault();
		
		// For keyboard events, adjust height by a fixed amount
		if (e instanceof KeyboardEvent) {
			if (e.key === 'ArrowUp') {
				panelHeight = Math.min(MAX_HEIGHT, panelHeight + 10);
			} else if (e.key === 'ArrowDown') {
				panelHeight = Math.max(MIN_HEIGHT, panelHeight - 10);
			} else if (e.key === 'Home') {
				panelHeight = MIN_HEIGHT;
			} else if (e.key === 'End') {
				panelHeight = MAX_HEIGHT;
			} else {
				return;
			}
			
			// Save to localStorage
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, panelHeight.toString());
			}
			return;
		}

		// Mouse drag handling
		isResizing = true;
		document.body.style.cursor = 'ns-resize';
		document.body.style.userSelect = 'none';

		const startY = (e as MouseEvent).clientY;
		const startHeight = panelHeight;

		function handleMouseMove(e: MouseEvent) {
			if (!isResizing) return;

			const deltaY = startY - e.clientY; // Inverted because we're dragging up
			const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + deltaY));
			panelHeight = newHeight;

			// Save to localStorage
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, newHeight.toString());
			}
		}

		function handleMouseUp() {
			isResizing = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}
</script>

<div
	bind:this={panelRef}
	class="flex-shrink-0 flex flex-col {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t relative"
	style="height: {panelHeight}px; min-height: 0;"
>
	<!-- Resize handle -->
	<button
		bind:this={resizeHandleRef}
		type="button"
		class="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:h-1.5 transition-all z-10 border-0 bg-transparent p-0 {darkMode ? 'hover:bg-indigo-500' : 'hover:bg-indigo-400'}"
		onmousedown={startResize}
		onkeydown={startResize}
		aria-label="Resize bottom panel. Use arrow keys to adjust height."
		title="Drag to resize or use arrow keys"
	></button>

	<!-- Tab bar -->
	<div
		class="flex border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} px-4 mt-1"
		role="tablist"
	>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'executions'}
			class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'executions'
				? darkMode
					? 'border-indigo-500 text-indigo-400'
					: 'border-indigo-600 text-indigo-600'
				: darkMode
					? 'border-transparent text-slate-400 hover:text-slate-200'
					: 'border-transparent text-slate-500 hover:text-slate-700'}"
			onclick={() => (activeTab = 'executions')}
		>
			Executions
			{#if executions.length > 0}
				<span
					class="ml-1.5 text-xs {activeTab === 'executions'
						? darkMode
							? 'text-indigo-300'
							: 'text-indigo-600'
						: darkMode
							? 'text-slate-500'
							: 'text-slate-400'}"
				>
					({executions.length})
				</span>
			{/if}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'subscriptions'}
			class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'subscriptions'
				? darkMode
					? 'border-indigo-500 text-indigo-400'
					: 'border-indigo-600 text-indigo-600'
				: darkMode
					? 'border-transparent text-slate-400 hover:text-slate-200'
					: 'border-transparent text-slate-500 hover:text-slate-700'}"
			onclick={() => (activeTab = 'subscriptions')}
		>
			Subscription Events
		</button>
	</div>

	<!-- Tab content -->
	<div class="flex-1 overflow-y-auto p-5 min-h-0">
		{#if activeTab === 'executions'}
			<WorkflowExecutionsPanel
				{executions}
				loading={executionsLoading}
				{selectedWorkflowId}
				{selectedProjectId}
				{selectedExecutionId}
				{darkMode}
				onSelectExecution={onSelectExecution}
				onRefresh={onRefreshExecutions}
				{syncManager}
			/>
		{:else}
			<WorkflowSubscriptionEventsPanel
				{syncManager}
				workflowId={selectedWorkflowId}
				{darkMode}
			/>
		{/if}
	</div>
</div>
