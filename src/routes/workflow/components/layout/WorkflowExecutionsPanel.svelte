<script lang="ts">
	import type { WorkflowExecutionListItem } from '../../services/backend/workflowExecutionService';
	import type { WorkflowSyncManager } from '$lib/realtime/websocket/syncManagers/WorkflowSyncManager';
	import type { WorkflowExecution, WorkflowNodeExecution } from '@agnathan/types-simple';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';

	const {
		executions = [],
		loading = false,
		selectedWorkflowId = null,
		selectedProjectId = null,
		selectedExecutionId = null,
		darkMode = false,
		onSelectExecution,
		onRefresh,
		syncManager = null
	}: {
		executions?: WorkflowExecutionListItem[];
		loading?: boolean;
		selectedWorkflowId?: string | null;
		selectedProjectId?: string | null;
		selectedExecutionId?: string | null;
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
		// Use projectId as parentId when workflowId is not available (e.g., when saving a new workflow)
		const parentId = selectedWorkflowId || selectedProjectId;
		if (!parentId) {
			storeExecutions = [];
			storeNodeExecutions = new Map();
			return;
		}

		isLoadingFromStore = true;
		try {
			// If sync manager is ready, sync to get latest data and set up subscriptions
			// Backend now filters by workflowId and provides chronological sorting
			// Use projectId as parentId when workflowId is not available
			if (syncManager?.isReady) {
				console.log('[WorkflowExecutionsPanel] Syncing executions for workflow:', selectedWorkflowId, 'or project:', selectedProjectId);
				await syncManager.syncWorkflowExecutionList(selectedWorkflowId ?? undefined, selectedProjectId ?? undefined, {
					setupSubscriptions: true
				});
			}

			// Read from store (backend already filtered by workflowId and sorted chronologically)
			let allExecutions = validatedTopicStore.getAllAtArray<WorkflowExecution>('workflowExecutions');
			console.log('[WorkflowExecutionsPanel] All executions in store:', allExecutions.length);
			
			// Filter by parentId (defensive - in case store has executions from other workflows)
			// Backend should already filter, but this ensures correctness
			let filtered = allExecutions.filter((exec) => exec?.parentId === selectedWorkflowId);
			console.log('[WorkflowExecutionsPanel] Filtered executions for workflow', selectedWorkflowId, ':', filtered.length);

			// Backend provides chronological sorting (newest first), so no client-side sorting needed
			storeExecutions = filtered;

			// Load node executions for each workflow execution
			const nodeExecMap = new Map<string, WorkflowNodeExecution[]>();
			for (const exec of filtered) {
				// Check store first
				let nodeExecs = validatedTopicStore
					.getAllAtArray<WorkflowNodeExecution>('workflowNodeExecutions')
					.filter((ne) => ne?.parentId === exec.id);

				// If sync manager is ready, sync to get latest node executions
				if (syncManager?.isReady) {
					try {
						await syncManager.syncWorkflowNodeExecutionList(exec.id, {
							setupSubscriptions: true
						});
						// Re-read from store after sync
						nodeExecs = validatedTopicStore
							.getAllAtArray<WorkflowNodeExecution>('workflowNodeExecutions')
							.filter((ne) => ne?.parentId === exec.id);
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
			if (exec?.parentId === selectedWorkflowId) {
				// Update or add execution
				// Backend provides chronological sorting, so we maintain order by inserting at correct position
				// or replacing existing item
				const existingIndex = storeExecutions.findIndex((e) => e.id === exec.id);
				if (existingIndex >= 0) {
					// Update existing execution in place
					storeExecutions = [
						...storeExecutions.slice(0, existingIndex),
						exec,
						...storeExecutions.slice(existingIndex + 1)
					];
				} else {
					// New execution - insert at beginning (newest first from backend)
					storeExecutions = [exec, ...storeExecutions];
				}
			}
		});

		// Subscribe to workflow node execution updates
		const nodeUnsub = validatedTopicStore.subscribe('workflowNodeExecutions/+', (value: unknown) => {
			// Value can be either the entity directly or { id, data }
			const nodeExec = (value as any)?.data || (value as WorkflowNodeExecution);
			if (nodeExec?.parentId) {
				const exec = storeExecutions.find((e) => e.id === nodeExec.parentId);
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
				parentId: exec.parentId,
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

	// Separate latest execution from others
	const latestExecution = $derived(displayExecutions.length > 0 ? displayExecutions[0] : null);
	const olderExecutions = $derived(displayExecutions.slice(1));

	// Track which execution is expanded
	let expandedExecutionId = $state<string | null>(null);

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

	// Auto-expand latest execution
	$effect(() => {
		if (latestExecution && !expandedExecutionId) {
			expandedExecutionId = latestExecution.id;
		}
	});

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
				case 'SKIPPED':
					return darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600';
				default:
					return darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600';
			}
		}

	function formatDate(iso: string | null | undefined) {
		if (!iso) return '—';
		const d = new Date(iso);
		return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
	}

	function formatRelativeTime(iso: string | null | undefined): string {
		if (!iso) return '—';
		const d = new Date(iso);
		const now = new Date();
		const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
		if (sec < 60) return 'Just now';
		const min = Math.floor(sec / 60);
		if (min < 60) return `${min} min ago`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr} hr ago`;
		const day = Math.floor(hr / 24);
		if (day === 1) return 'Yesterday';
		if (day < 7) return `${day} days ago`;
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
		<div class="space-y-4">
			<!-- Latest Execution - Prominently Displayed -->
			{#if latestExecution}
				{@const exec = latestExecution}
				{@const isExpanded = expandedExecutionId === exec.id}
				{@const isHighlighted = selectedExecutionId === exec.id}
				{@const nodeExecs = getNodeExecutionsForExecution(exec.id)}
				<div
					role="button"
					tabindex="0"
					class="{darkMode
						? 'bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border-indigo-500/30'
						: 'bg-gradient-to-br from-white via-slate-50 to-slate-100 border-indigo-200'} border-2 rounded-lg shadow-lg {isHighlighted
						? darkMode
							? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-800'
							: 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white'
						: ''} cursor-pointer"
					onclick={(e) => {
						if ((e.target as HTMLElement).closest('[data-expand-toggle]')) return;
						onSelectExecution?.(exec);
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter' && !(e.target as HTMLElement).closest('[data-expand-toggle]')) onSelectExecution?.(exec);
					}}
					title="Click to show this execution on the workflow canvas"
				>
					<!-- Latest Execution Header: chevron = expand/collapse; click header = expand/collapse; "View details" = show on canvas -->
					<div
						class="p-4 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} cursor-pointer"
						role="button"
						tabindex="0"
						onclick={(e) => {
							if ((e.target as HTMLElement).closest('button')) return;
							e.stopPropagation();
							expandedExecutionId = isExpanded ? null : exec.id;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) {
								e.stopPropagation();
								expandedExecutionId = isExpanded ? null : exec.id;
							}
						}}
						title={isExpanded ? 'Collapse details' : 'Expand details'}
					>
						<div class="flex items-center justify-between mb-2 gap-2">
							<div class="flex items-center gap-3 flex-wrap min-w-0">
								<span class="text-sm font-semibold {darkMode ? 'text-slate-100' : 'text-slate-800'}">
									Run 1
								</span>
								<span class="text-xs font-semibold px-2 py-1 rounded {darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}">
									Latest
								</span>
								<span
									class="text-xs font-medium px-2 py-1 rounded {statusColor(exec.status)}"
								>
									{exec.status}
								</span>
								<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}" title={formatDate(exec.startedAt || exec.createdAt)}>
									{formatRelativeTime(exec.startedAt || exec.createdAt)}
								</span>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<button
									type="button"
									data-expand-toggle
									class="p-2 rounded shrink-0 pointer-events-auto {darkMode
										? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
										: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} transition-colors"
									title={isExpanded ? 'Collapse' : 'Expand'}
									aria-label={isExpanded ? 'Collapse execution details' : 'Expand execution details'}
									onclick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										expandedExecutionId = isExpanded ? null : exec.id;
									}}
								>
									<svg
										class="w-4 h-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										onSelectExecution?.(exec);
									}}
									class="px-3 py-1.5 text-xs font-medium {darkMode
										? 'text-indigo-300 hover:text-indigo-200 hover:bg-indigo-900/30'
										: 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors"
								>
									View Details
								</button>
							</div>
						</div>
						<div class="flex items-center gap-3 text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'}">
							<span>{progressText(exec)}</span>
							<span aria-hidden="true">·</span>
							<span>{formatDate(exec.startedAt || exec.createdAt)}</span>
							{#if exec.completedAt}
								<span aria-hidden="true">·</span>
								<span>Completed {formatRelativeTime(exec.completedAt)}</span>
							{/if}
						</div>
						{#if exec.errorMessage}
							<div
								class="mt-2 p-2 text-xs {darkMode ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'} border rounded"
							>
								<strong>Error:</strong> {exec.errorMessage}
							</div>
						{/if}
					</div>

					<!-- Latest Execution Content - Expanded by default -->
					{#if isExpanded}
						<div class="p-4 space-y-4">
							<!-- Workflow Input/Output - Always Visible -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								{#if exec.inputData}
									<div>
										<div class="text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2 flex items-center gap-2">
											<svg class="w-4 h-4 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
											</svg>
											Workflow Input
										</div>
										<pre
											class="text-xs {darkMode
												? 'text-slate-200 bg-slate-900 border-slate-700'
												: 'text-slate-800 bg-white border-slate-200'} p-3 rounded border overflow-x-auto max-h-48 overflow-y-auto"
										>{formatDataForDisplay(exec.inputData)}</pre>
									</div>
								{/if}
								
								{#if exec.outputData}
									{@const outputText = extractOutputText(exec.outputData)}
									<div>
										<div class="text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2 flex items-center gap-2">
											<svg class="w-4 h-4 {darkMode ? 'text-emerald-400' : 'text-emerald-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
											</svg>
											Workflow Output
										</div>
										{#if outputText}
											<div class="text-xs {darkMode ? 'text-slate-200 bg-slate-900 border-slate-700' : 'text-slate-800 bg-white border-slate-200'} p-3 rounded border max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
												{outputText}
											</div>
										{:else}
											<pre
												class="text-xs {darkMode
													? 'text-slate-200 bg-slate-900 border-slate-700'
													: 'text-slate-800 bg-white border-slate-200'} p-3 rounded border overflow-x-auto max-h-48 overflow-y-auto"
											>{formatDataForDisplay(exec.outputData)}</pre>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Node Executions - Improved Layout -->
							{#if nodeExecs.length > 0}
								<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4">
									<div class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-3 flex items-center gap-2">
										<svg class="w-4 h-4 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
										</svg>
										Node Executions ({nodeExecs.length})
									</div>
									<div class="space-y-3">
										{#each nodeExecs as nodeExec (nodeExec.id)}
											<div
												class="{darkMode
													? 'bg-slate-900/50 border-slate-700'
													: 'bg-slate-50 border-slate-200'} border rounded-lg p-3"
											>
												<div class="flex items-center justify-between mb-3">
													<span class="text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-800'}">
														{nodeExec.nodeName || nodeExec.nodeId}
													</span>
													<span
														class="text-xs font-medium px-2 py-1 rounded {statusColor(nodeExec.status)}"
													>
														{nodeExec.status}
													</span>
												</div>
												
												<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
													{#if nodeExec.inputData}
														<div>
															<div class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1.5">
																Input
															</div>
															<pre
																class="text-xs {darkMode
																	? 'text-slate-200 bg-slate-950 border-slate-800'
																	: 'text-slate-700 bg-white border-slate-300'} p-2 rounded border overflow-x-auto max-h-32 overflow-y-auto"
															>{formatDataForDisplay(nodeExec.inputData)}</pre>
														</div>
													{/if}
													
													{#if nodeExec.outputData}
														{@const nodeOutputText = extractOutputText(nodeExec.outputData)}
														<div>
															<div class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1.5">
																Output
															</div>
															{#if nodeOutputText}
																<div class="text-xs {darkMode ? 'text-slate-200 bg-slate-950 border-slate-800' : 'text-slate-700 bg-white border-slate-300'} p-2 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
																	{nodeOutputText}
																</div>
															{:else}
																<pre
																	class="text-xs {darkMode
																		? 'text-slate-200 bg-slate-950 border-slate-800'
																		: 'text-slate-700 bg-white border-slate-300'} p-2 rounded border overflow-x-auto max-h-32 overflow-y-auto"
																>{formatDataForDisplay(nodeExec.outputData)}</pre>
															{/if}
														</div>
													{/if}
												</div>
												
												{#if nodeExec.errorMessage}
													<div
														class="mt-2 p-2 text-xs {darkMode ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'} border rounded"
													>
														<strong>Error:</strong> {nodeExec.errorMessage}
													</div>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Older Executions - Collapsed List -->
			{#if olderExecutions.length > 0}
				<div>
					<div class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2 px-1">
						Older runs ({olderExecutions.length})
					</div>
					<div class="space-y-2 max-h-64 overflow-y-auto">
						{#each olderExecutions as exec, index (exec.id)}
							{@const runNumber = index + 2}
							{@const isExpanded = expandedExecutionId === exec.id}
							{@const isHighlighted = selectedExecutionId === exec.id}
							{@const nodeExecs = getNodeExecutionsForExecution(exec.id)}
							<div
								role="button"
								tabindex="0"
								class="{darkMode
									? 'bg-slate-800 border-slate-700'
									: 'bg-slate-50 border-slate-200'} border rounded-lg {isHighlighted
									? darkMode
										? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-800'
										: 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-100'
									: ''} cursor-pointer"
								onclick={(e) => {
									if ((e.target as HTMLElement).closest('button')) return;
									onSelectExecution?.(exec);
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) onSelectExecution?.(exec);
								}}
								title="Click to show this execution on the workflow canvas"
							>
								<div class="flex items-center gap-2 p-3">
									<button
										type="button"
										class="flex-1 min-w-0 text-left {darkMode
											? 'hover:bg-slate-750'
											: 'hover:bg-slate-100'} transition-colors -m-2 p-2 rounded"
										onclick={() => {
											expandedExecutionId = isExpanded ? null : exec.id;
											onSelectExecution?.(exec);
										}}
									>
										<div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
											<span class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-800'}">
												Run {runNumber}
											</span>
											<span
												class="text-xs font-medium px-2 py-1 rounded {statusColor(exec.status)}"
											>
												{exec.status}
											</span>
										</div>
										<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'}" title={formatDate(exec.startedAt || exec.createdAt)}>
											{progressText(exec)}
											<span aria-hidden="true"> · </span>
											{formatRelativeTime(exec.startedAt || exec.createdAt)}
										</div>
										{#if exec.errorMessage}
											<div
												class="mt-1 text-xs {darkMode ? 'text-red-400' : 'text-red-600'} truncate"
												title={exec.errorMessage}
											>
												{exec.errorMessage}
											</div>
										{/if}
									</button>
									<button
										type="button"
										class="p-2 rounded shrink-0 {darkMode
											? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
											: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} transition-colors"
										title={isExpanded ? 'Collapse' : 'Expand'}
										aria-label={isExpanded ? 'Collapse' : 'Expand'}
										onclick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											expandedExecutionId = isExpanded ? null : exec.id;
										}}
									>
										<svg
											class="w-4 h-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</button>
									<button
										type="button"
										onclick={() => onSelectExecution?.(exec)}
										class="px-2 py-1 text-xs font-medium shrink-0 {darkMode
											? 'text-indigo-300 hover:text-indigo-200 hover:bg-indigo-900/30'
											: 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'} rounded transition-colors"
										title="Show this execution on the workflow canvas"
									>
										View details
									</button>
								</div>
								
								{#if isExpanded}
									<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} p-3 space-y-3">
										<!-- Workflow Input/Output -->
										<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
											{#if exec.inputData}
												<div>
													<div class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1.5">
														Input
													</div>
													<pre
														class="text-xs {darkMode
															? 'text-slate-200 bg-slate-900 border-slate-700'
															: 'text-slate-700 bg-white border-slate-200'} p-2 rounded border overflow-x-auto max-h-32 overflow-y-auto"
													>{formatDataForDisplay(exec.inputData)}</pre>
												</div>
											{/if}
											
											{#if exec.outputData}
												{@const outputText = extractOutputText(exec.outputData)}
												<div>
													<div class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1.5">
														Output
													</div>
													{#if outputText}
														<div class="text-xs {darkMode ? 'text-slate-200 bg-slate-900 border-slate-700' : 'text-slate-700 bg-white border-slate-200'} p-2 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
															{outputText}
														</div>
													{:else}
														<pre
															class="text-xs {darkMode
																? 'text-slate-200 bg-slate-900 border-slate-700'
																: 'text-slate-700 bg-white border-slate-200'} p-2 rounded border overflow-x-auto max-h-32 overflow-y-auto"
														>{formatDataForDisplay(exec.outputData)}</pre>
													{/if}
												</div>
											{/if}
										</div>

										<!-- Node Executions -->
										{#if nodeExecs.length > 0}
											<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} pt-3">
												<div class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2">
													Nodes ({nodeExecs.length})
												</div>
												<div class="space-y-2">
													{#each nodeExecs as nodeExec (nodeExec.id)}
														<div
															class="{darkMode
																? 'bg-slate-900/50 border-slate-700'
																: 'bg-white border-slate-200'} border rounded p-2"
														>
															<div class="flex items-center justify-between mb-2">
																<span class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
																	{nodeExec.nodeName || nodeExec.nodeId}
																</span>
																<span
																	class="text-xs font-medium px-1.5 py-0.5 rounded {statusColor(nodeExec.status)}"
																>
																	{nodeExec.status}
																</span>
															</div>
															
															<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
																{#if nodeExec.inputData}
																	<div>
																		<div class="text-[10px] font-semibold {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1">
																			Input
																		</div>
																		<pre
																			class="text-[10px] {darkMode
																				? 'text-slate-200 bg-slate-950 border-slate-800'
																				: 'text-slate-700 bg-slate-50 border-slate-300'} p-1.5 rounded border overflow-x-auto max-h-24 overflow-y-auto"
																		>{formatDataForDisplay(nodeExec.inputData)}</pre>
																	</div>
																{/if}
																
																{#if nodeExec.outputData}
																	{@const nodeOutputText = extractOutputText(nodeExec.outputData)}
																	<div>
																		<div class="text-[10px] font-semibold {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1">
																			Output
																		</div>
																		{#if nodeOutputText}
																			<div class="text-[10px] {darkMode ? 'text-slate-200 bg-slate-950 border-slate-800' : 'text-slate-700 bg-slate-50 border-slate-300'} p-1.5 rounded border max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
																				{nodeOutputText}
																			</div>
																		{:else}
																			<pre
																				class="text-[10px] {darkMode
																					? 'text-slate-200 bg-slate-950 border-slate-800'
																					: 'text-slate-700 bg-slate-50 border-slate-300'} p-1.5 rounded border overflow-x-auto max-h-24 overflow-y-auto"
																			>{formatDataForDisplay(nodeExec.outputData)}</pre>
																		{/if}
																	</div>
																{/if}
															</div>
															
															{#if nodeExec.errorMessage}
																<div
																	class="mt-1.5 p-1.5 text-[10px] {darkMode ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'} border rounded"
																>
																	<strong>Error:</strong> {nodeExec.errorMessage}
																</div>
															{/if}
														</div>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
