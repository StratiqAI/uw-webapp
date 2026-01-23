<script lang="ts">
	import type { WorkflowExecutionListItem } from '../../services/backend/workflowExecutionService';
	import type { WorkflowSyncManager } from '$lib/realtime/websocket/syncManagers/WorkflowSyncManager';
	import type { WorkflowExecution, WorkflowNodeExecution } from '@stratiqai/types-simple';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { onMount, onDestroy } from 'svelte';

	const {
		executions = [],
		loading = false,
		selectedWorkflowId = null,
		darkMode = false,
		onSelectExecution,
		onRefresh,
		syncManager = null
	}: {
		executions?: WorkflowExecutionListItem[];
		loading?: boolean;
		selectedWorkflowId?: string | null;
		darkMode?: boolean;
		onSelectExecution?: (exec: WorkflowExecutionListItem) => void;
		onRefresh?: () => void;
		syncManager?: WorkflowSyncManager | null;
	} = $props();

	let storeExecutions = $state<WorkflowExecution[]>([]);
	let storeNodeExecutions = $state<Map<string, WorkflowNodeExecution[]>>(new Map());
	let isLoadingFromStore = $state(false);
	let unsubscribeExecutions: (() => void) | null = null;
	let unsubscribeNodeExecutions: (() => void) | null = null;

	// Load executions from store when workflow changes
	async function loadFromStore() {
		if (!selectedWorkflowId) {
			storeExecutions = [];
			storeNodeExecutions = new Map();
			return;
		}

		isLoadingFromStore = true;
		try {
			// First, check if we already have executions in the store (e.g., from project query)
			let allExecutions = validatedTopicStore.getAllAtArray<WorkflowExecution>('workflowExecutions');
			console.log('[WorkflowExecutionsPanel] All executions in store:', allExecutions.length, allExecutions);
			
			let filtered = allExecutions.filter((exec) => exec?.workflowId === selectedWorkflowId);
			console.log('[WorkflowExecutionsPanel] Filtered executions for workflow', selectedWorkflowId, ':', filtered.length, filtered);

			// If sync manager is ready, sync to get latest data and set up subscriptions
			if (syncManager?.isReady) {
				console.log('[WorkflowExecutionsPanel] Syncing executions for workflow:', selectedWorkflowId);
				await syncManager.syncWorkflowExecutionList(selectedWorkflowId, {
					setupSubscriptions: true
				});

				// Re-read from store after sync (in case new data was added)
				allExecutions = validatedTopicStore.getAllAtArray<WorkflowExecution>('workflowExecutions');
				filtered = allExecutions.filter((exec) => exec?.workflowId === selectedWorkflowId);
				console.log('[WorkflowExecutionsPanel] After sync, filtered executions:', filtered.length, filtered);
			}

			storeExecutions = filtered;

			// Load node executions for each workflow execution
			const nodeExecMap = new Map<string, WorkflowNodeExecution[]>();
			for (const exec of filtered) {
				// Check store first
				let nodeExecs = validatedTopicStore
					.getAllAtArray<WorkflowNodeExecution>('workflowNodeExecutions')
					.filter((ne) => ne?.workflowExecutionId === exec.id);

				// If sync manager is ready, sync to get latest node executions
				if (syncManager?.isReady) {
					try {
						await syncManager.syncWorkflowNodeExecutionList(exec.id, {
							setupSubscriptions: true
						});
						// Re-read from store after sync
						nodeExecs = validatedTopicStore
							.getAllAtArray<WorkflowNodeExecution>('workflowNodeExecutions')
							.filter((ne) => ne?.workflowExecutionId === exec.id);
					} catch (err) {
						console.error(`Failed to load node executions for ${exec.id}:`, err);
					}
				}
				nodeExecMap.set(exec.id, nodeExecs);
			}
			storeNodeExecutions = nodeExecMap;
		} catch (err) {
			console.error('Failed to load executions from store:', err);
		} finally {
			isLoadingFromStore = false;
		}
	}

	// Watch for workflow changes and sync manager readiness
	$effect(() => {
		// Trigger load when workflow changes or sync manager becomes ready
		const wfId = selectedWorkflowId;
		const managerReady = syncManager?.isReady;
		// Use void to explicitly handle the promise
		void loadFromStore();
	});

	// Subscribe to store updates for real-time changes
	$effect(() => {
		if (!selectedWorkflowId) {
			if (unsubscribeExecutions) {
				unsubscribeExecutions();
				unsubscribeExecutions = null;
			}
			if (unsubscribeNodeExecutions) {
				unsubscribeNodeExecutions();
				unsubscribeNodeExecutions = null;
			}
			return;
		}

		// Subscribe to workflow execution updates
		const execUnsub = validatedTopicStore.subscribe('workflowExecutions/+', (value: unknown) => {
			// Value can be either the entity directly or { id, data }
			const exec = (value as any)?.data || (value as WorkflowExecution);
			if (exec?.workflowId === selectedWorkflowId) {
				// Update or add execution
				storeExecutions = [
					...storeExecutions.filter((e) => e.id !== exec.id),
					exec
				].sort((a, b) => {
					const aTime = a.startedAt || a.createdAt || '';
					const bTime = b.startedAt || b.createdAt || '';
					return bTime.localeCompare(aTime);
				});
			}
		});

		// Subscribe to workflow node execution updates
		const nodeUnsub = validatedTopicStore.subscribe('workflowNodeExecutions/+', (value: unknown) => {
			// Value can be either the entity directly or { id, data }
			const nodeExec = (value as any)?.data || (value as WorkflowNodeExecution);
			if (nodeExec?.workflowExecutionId) {
				const exec = storeExecutions.find((e) => e.id === nodeExec.workflowExecutionId);
				if (exec) {
					const existing = storeNodeExecutions.get(exec.id) || [];
					const updated = [
						...existing.filter((ne) => ne.id !== nodeExec.id),
						nodeExec
					];
					storeNodeExecutions = new Map(storeNodeExecutions.set(exec.id, updated));
				}
			}
		});

		unsubscribeExecutions = execUnsub;
		unsubscribeNodeExecutions = nodeUnsub;

		return () => {
			if (unsubscribeExecutions) {
				unsubscribeExecutions();
			}
			if (unsubscribeNodeExecutions) {
				unsubscribeNodeExecutions();
			}
		};
	});

	// Combine store executions with passed executions (fallback)
	const displayExecutions = $derived.by(() => {
		if (storeExecutions.length > 0) {
			return storeExecutions.map((exec) => ({
				id: exec.id,
				workflowId: exec.workflowId,
				workflow: exec.workflow,
				status: exec.status,
				startedAt: exec.startedAt,
				completedAt: exec.completedAt,
				errorMessage: exec.errorMessage,
				totalNodes: exec.totalNodes,
				completedNodes: exec.completedNodes,
				currentNodeId: exec.currentNodeId,
				createdAt: exec.createdAt,
				outputData: exec.outputData,
				inputData: exec.inputData
			} as WorkflowExecutionListItem));
		}
		return executions;
	});

	// Extract text from outputData (which is a JSON string)
	function extractOutputText(outputData: any): string | null {
		if (!outputData) return null;
		
		try {
			// outputData might be a string or already parsed
			const parsed = typeof outputData === 'string' ? JSON.parse(outputData) : outputData;
			
			// Check for result.text (from AI nodes)
			if (parsed?.result?.text) {
				return parsed.result.text;
			}
			
			// Check for text at root level
			if (parsed?.text) {
				return parsed.text;
			}
			
			// Check for output.text
			if (parsed?.output?.text) {
				return parsed.output.text;
			}
			
			// If it's a simple string, return it
			if (typeof parsed === 'string') {
				return parsed;
			}
		} catch (err) {
			console.error('Failed to parse outputData:', err);
		}
		
		return null;
	}

	// Format data for display (handles JSON strings and objects)
	function formatDataForDisplay(data: any): string {
		if (!data) return '—';
		
		try {
			// If it's already a string, try to parse it
			if (typeof data === 'string') {
				try {
					const parsed = JSON.parse(data);
					return JSON.stringify(parsed, null, 2);
				} catch {
					// If parsing fails, it's just a plain string
					return data;
				}
			}
			
			// If it's an object, stringify it
			if (typeof data === 'object') {
				return JSON.stringify(data, null, 2);
			}
			
			return String(data);
		} catch (err) {
			return String(data);
		}
	}

	// Check if data has extractable text
	function hasExtractableText(data: any): boolean {
		return extractOutputText(data) !== null;
	}

	const displayLoading = $derived.by(() => loading || isLoadingFromStore);

	async function handleRefresh() {
		if (syncManager?.isReady && selectedWorkflowId) {
			await loadFromStore();
		} else if (onRefresh) {
			onRefresh();
		}
	}

	function getNodeExecutionsForExecution(executionId: string): WorkflowNodeExecution[] {
		return storeNodeExecutions.get(executionId) || [];
	}

	function statusColor(status: string) {
		switch (status) {
			case 'COMPLETED':
				return darkMode ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-800';
			case 'RUNNING':
				return darkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800';
			case 'FAILED':
				return darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800';
			case 'CANCELLED':
				return darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700';
			default:
				return darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600';
		}
	}

	function formatDate(iso: string | null | undefined) {
		if (!iso) return '—';
		const d = new Date(iso);
		return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
	}

	function progressText(exec: WorkflowExecutionListItem) {
		const t = exec.totalNodes ?? 0;
		const c = exec.completedNodes ?? 0;
		if (t === 0) return exec.status === 'RUNNING' ? 'Running…' : '—';
		return `${c} / ${t} nodes`;
	}
</script>

<div class="space-y-4">
	<!-- Executions Section -->
	<div class="flex items-center justify-between">
		<h3
			class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-2"
		>
			<svg
				class="w-4 h-4 {darkMode ? 'text-slate-400' : 'text-slate-500'}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				></path>
			</svg>
			Executions
		</h3>
		{#if selectedWorkflowId && (onRefresh || syncManager)}
			<button
				type="button"
				onclick={handleRefresh}
				disabled={displayLoading}
				class="p-1.5 rounded {darkMode
					? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700 disabled:opacity-50'
					: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50'} transition-colors"
				title="Refresh executions"
				aria-label="Refresh executions"
			>
				<svg
					class="w-4 h-4 {displayLoading ? 'animate-spin' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					></path>
				</svg>
			</button>
		{/if}
	</div>

	{#if !selectedWorkflowId}
		<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			Select a workflow to view runs triggered by events (e.g. document upload).
		</p>
	{:else if displayLoading}
		<div class="flex items-center gap-2 py-4">
			<div
				class="w-4 h-4 border-2 {darkMode
					? 'border-slate-600 border-t-slate-400'
					: 'border-slate-200 border-t-slate-600'} rounded-full animate-spin"
			></div>
			<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading…</span>
		</div>
	{:else if displayExecutions.length === 0}
		<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			No executions yet. Runs start when this workflow's trigger (e.g. Doclink Created) fires.
		</p>
	{:else}
		<div class="space-y-2 max-h-48 overflow-y-auto">
			{#each displayExecutions as exec (exec.id)}
				<div
					class="{darkMode
						? 'bg-slate-800 border-slate-700'
						: 'bg-slate-50 border-slate-200'} border rounded-lg"
				>
					<button
						type="button"
						class="w-full text-left p-3 {darkMode
							? 'hover:border-slate-600 hover:bg-slate-750'
							: 'hover:border-slate-300 hover:bg-slate-100'} transition-colors"
						onclick={() => onSelectExecution?.(exec)}
					>
						<div class="flex items-center justify-between gap-2 mb-1">
							<span class="text-xs font-mono {darkMode ? 'text-slate-500' : 'text-slate-500'} truncate">
								{exec.id.slice(0, 8)}…
							</span>
							<span
								class="text-[10px] font-medium px-1.5 py-0.5 rounded {statusColor(exec.status)}"
							>
								{exec.status}
							</span>
						</div>
						<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'}">
							{progressText(exec)}
							<span class="mx-1">·</span>
							{formatDate(exec.startedAt || exec.createdAt)}
						</div>
						{#if exec.errorMessage}
							<div
								class="mt-1 text-[10px] {darkMode ? 'text-red-400' : 'text-red-600'} truncate"
								title={exec.errorMessage}
							>
								{exec.errorMessage}
							</div>
						{/if}
					</button>
					
					<!-- Execution Input/Output -->
					<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} px-3 py-2 space-y-2">
						{#if exec.inputData}
							<details class="text-[10px]">
								<summary
									class="font-medium {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'} cursor-pointer mb-1"
								>
									Input Data
								</summary>
								<pre
									class="text-xs {darkMode
										? 'text-slate-300 bg-slate-900 border-slate-700'
										: 'text-slate-700 bg-white border-slate-200'} p-2 rounded border overflow-x-auto mt-1"
								>{formatDataForDisplay(exec.inputData)}</pre>
							</details>
						{/if}
						
						{#if exec.outputData}
							{@const outputText = extractOutputText(exec.outputData)}
							{#if outputText}
								<details class="text-[10px]">
									<summary
										class="font-medium {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'} cursor-pointer mb-1"
									>
										Output Text
									</summary>
									<div class="text-xs {darkMode ? 'text-slate-300' : 'text-slate-700'} mt-1 whitespace-pre-wrap break-words">
										{outputText}
									</div>
								</details>
							{:else}
								<details class="text-[10px]">
									<summary
										class="font-medium {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'} cursor-pointer mb-1"
									>
										Output Data
									</summary>
									<pre
										class="text-xs {darkMode
											? 'text-slate-300 bg-slate-900 border-slate-700'
											: 'text-slate-700 bg-white border-slate-200'} p-2 rounded border overflow-x-auto mt-1"
									>{formatDataForDisplay(exec.outputData)}</pre>
								</details>
							{/if}
						{/if}
					</div>

					<!-- Node Executions -->
					{#if getNodeExecutionsForExecution(exec.id).length > 0}
						<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} px-3 py-2">
							<div class="text-[10px] font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2">
								Nodes ({getNodeExecutionsForExecution(exec.id).length}):
							</div>
							<div class="space-y-2">
								{#each getNodeExecutionsForExecution(exec.id) as nodeExec (nodeExec.id)}
									<div
										class="{darkMode
											? 'bg-slate-900 border-slate-700'
											: 'bg-white border-slate-200'} border rounded p-2"
									>
										<div class="flex items-center justify-between mb-1">
											<span class="text-[10px] font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} truncate">
												{nodeExec.nodeName || nodeExec.nodeId}
											</span>
											<span
												class="px-1 py-0.5 rounded text-[9px] {statusColor(nodeExec.status)}"
											>
												{nodeExec.status}
											</span>
										</div>
										
										{#if nodeExec.inputData}
											<details class="text-[10px] mt-1">
												<summary
													class="font-medium {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'} cursor-pointer mb-0.5"
												>
													Input
												</summary>
												<pre
													class="text-[9px] {darkMode
														? 'text-slate-300 bg-slate-950 border-slate-800'
														: 'text-slate-700 bg-slate-50 border-slate-300'} p-1.5 rounded border overflow-x-auto mt-0.5"
												>{formatDataForDisplay(nodeExec.inputData)}</pre>
											</details>
										{/if}
										
										{#if nodeExec.outputData}
											{@const nodeOutputText = extractOutputText(nodeExec.outputData)}
											{#if nodeOutputText}
												<details class="text-[10px] mt-1">
													<summary
														class="font-medium {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'} cursor-pointer mb-0.5"
													>
														Output Text
													</summary>
													<div class="text-[9px] {darkMode ? 'text-slate-300' : 'text-slate-700'} mt-0.5 whitespace-pre-wrap break-words">
														{nodeOutputText}
													</div>
												</details>
											{:else}
												<details class="text-[10px] mt-1">
													<summary
														class="font-medium {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'} cursor-pointer mb-0.5"
													>
														Output
													</summary>
													<pre
														class="text-[9px] {darkMode
															? 'text-slate-300 bg-slate-950 border-slate-800'
															: 'text-slate-700 bg-slate-50 border-slate-300'} p-1.5 rounded border overflow-x-auto mt-0.5"
													>{formatDataForDisplay(nodeExec.outputData)}</pre>
												</details>
											{/if}
										{/if}
										
										{#if nodeExec.errorMessage}
											<div
												class="mt-1 text-[9px] {darkMode ? 'text-red-400' : 'text-red-600'} truncate"
												title={nodeExec.errorMessage}
											>
												Error: {nodeExec.errorMessage}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
