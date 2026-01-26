<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
	import { getAppSyncWsClient, initAppSyncWsClient } from '$lib/realtime/websocket/wsClient';
	import {
		S_ON_UPDATE_WORKFLOW_EXECUTION,
		S_ON_WORKFLOW_NODE_EXECUTION_STATUS_CHANGE
	} from '@agnathan/types-simple';
	import { fetchWorkflowExecutionDetail } from '../../services/backend/workflowExecutionService';
	import type { WorkflowExecution, WorkflowNodeExecution } from '@agnathan/types-simple';

	const { executionId, workflowId, idToken, projectId, darkMode = false, onClose }: {
		executionId: string;
		workflowId: string; // parentId - the Workflow ID (execution's parent)
		idToken: string;
		projectId?: string;
		darkMode?: boolean;
		onClose: () => void;
	} = $props();

	let execution = $state<WorkflowExecution | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	const unsubscribes: Array<() => void> = [];

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
		return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
	}

	function mergeNode(nodes: WorkflowNodeExecution[], updated: WorkflowNodeExecution): WorkflowNodeExecution[] {
		const idx = nodes.findIndex((n) => n.id === updated.id);
		if (idx >= 0) {
			const next = [...nodes];
			next[idx] = updated;
			return next;
		}
		return [updated, ...nodes];
	}

	onMount(async () => {
		if (!executionId || !workflowId || !idToken) {
			console.error('[WorkflowExecutionDetailModal] Missing executionId, workflowId, or idToken', { executionId, workflowId, hasToken: !!idToken });
			return;
		}

		loading = true;
		error = null;
		console.log('[WorkflowExecutionDetailModal] Fetching execution:', { executionId, workflowId, projectId });
		try {
			const result = await fetchWorkflowExecutionDetail(executionId, workflowId, idToken);
			console.log('[WorkflowExecutionDetailModal] Fetched execution:', result);
			if (result) {
				console.log('[WorkflowExecutionDetailModal] Node executions count:', result.nodeExecutions?.items?.length ?? 0);
				console.log('[WorkflowExecutionDetailModal] Node executions:', result.nodeExecutions?.items);
			}
			execution = result;
			if (!result) {
				error = 'Execution not found';
				console.warn('[WorkflowExecutionDetailModal] Execution returned null');
			}
		} catch (e) {
			console.error('[WorkflowExecutionDetailModal] Error fetching execution:', e);
			error = e instanceof Error ? e.message : 'Failed to load execution';
		} finally {
			loading = false;
		}

		const client = getAppSyncWsClient() ?? initAppSyncWsClient({
			graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
			auth: { mode: 'cognito', idToken }
		});

		const h1 = client.subscribe({
			query: S_ON_UPDATE_WORKFLOW_EXECUTION,
			variables: { id: executionId },
			next: (payload: any) => {
				const data = payload?.onUpdateWorkflowExecution;
				if (data && execution) {
					execution = { ...execution, ...data };
				}
			},
			error: (e) => console.error('onUpdateWorkflowExecution sub', e)
		});
		unsubscribes.push(() => h1.unsubscribe());

		const h2 = client.subscribe({
			query: S_ON_WORKFLOW_NODE_EXECUTION_STATUS_CHANGE,
			variables: { parentId: executionId }, // parentId is the WorkflowExecution ID (WorkflowNodeExecution's parent)
			next: (payload: any) => {
				const data = payload?.onWorkflowNodeExecutionStatusChange;
				if (data && execution?.nodeExecutions?.items) {
					const items = mergeNode(execution.nodeExecutions.items, data);
					execution = {
						...execution,
						nodeExecutions: { ...execution.nodeExecutions, items }
					};
				}
			},
			error: (e) => console.error('onWorkflowNodeExecutionStatusChange sub', e)
		});
		unsubscribes.push(() => h2.unsubscribe());
	});

	onDestroy(() => {
		for (const unsub of unsubscribes) unsub();
	});

	const totalNodes = $derived(Number((execution as Record<string, unknown>)?.totalNodes) || 0);
	const completedNodes = $derived(Number((execution as Record<string, unknown>)?.completedNodes) || 0);
	const pct = $derived(totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0);
	
	// Parse nodeExecutions and ensure outputData is parsed if it's a string
	const nodeItems = $derived.by(() => {
		const items = execution?.nodeExecutions?.items ?? [];
		return items.map((node) => {
			// Parse outputData if it's a string (AWSJSON comes as string from GraphQL)
			let parsedOutputData = node.outputData;
			if (typeof node.outputData === 'string') {
				try {
					parsedOutputData = JSON.parse(node.outputData);
				} catch (e) {
					console.warn('[WorkflowExecutionDetailModal] Failed to parse node outputData:', e);
				}
			}
			
			// Parse inputData if it's a string
			let parsedInputData = node.inputData;
			if (typeof node.inputData === 'string') {
				try {
					parsedInputData = JSON.parse(node.inputData);
				} catch (e) {
					// Ignore parse errors for inputData
				}
			}
			
			return {
				...node,
				outputData: parsedOutputData,
				inputData: parsedInputData
			};
		});
	});
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center {darkMode ? 'bg-black/60' : 'bg-black/40'}"
	role="dialog"
	aria-modal="true"
	aria-labelledby="execution-detail-title"
>
	<div
		class="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col {darkMode
			? 'bg-slate-900 border-slate-700'
			: 'bg-white border-slate-200'} border rounded-xl shadow-xl"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between px-5 py-4 border-b {darkMode
				? 'border-slate-700'
				: 'border-slate-200'}"
		>
			<h2 id="execution-detail-title" class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
				Execution details
			</h2>
			<button
				type="button"
				class="p-2 {darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded-lg transition-colors"
				onclick={onClose}
				aria-label="Close"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Body -->
		<div class="flex-1 overflow-y-auto p-5 space-y-4">
			{#if loading}
				<div class="flex items-center gap-2 py-8">
					<div
						class="w-5 h-5 border-2 {darkMode
							? 'border-slate-600 border-t-slate-400'
							: 'border-slate-200 border-t-slate-600'} rounded-full animate-spin"
					></div>
					<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading…</span>
				</div>
			{:else if error}
				<div
					class="p-4 rounded-lg {darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}"
				>
					{error}
				</div>
			{:else if execution}
				<!-- Status & progress -->
				<div class="flex flex-wrap items-center gap-3">
					<span
						class="text-xs font-medium px-2 py-1 rounded {statusColor(execution.status)}"
					>
						{execution.status}
					</span>
					<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
						{completedNodes} / {totalNodes} nodes
					</span>
					<span class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
						Started {formatDate(execution.startedAt || execution.createdAt)}
						{#if execution.completedAt}
							· Finished {formatDate(execution.completedAt)}
						{/if}
					</span>
				</div>

				<!-- Progress bar -->
				{#if totalNodes > 0}
					<div class="space-y-1">
						<div
							class="h-2 rounded-full overflow-hidden {darkMode ? 'bg-slate-800' : 'bg-slate-200'}"
						>
							<div
								class="h-full rounded-full transition-all {execution.status === 'FAILED'
									? 'bg-red-500'
									: 'bg-indigo-500'}"
								style="width: {pct}%"
							></div>
						</div>
					</div>
				{/if}

				{#if execution.errorMessage}
					<div
						class="p-3 rounded-lg {darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border text-sm {darkMode ? 'text-red-300' : 'text-red-700'}"
					>
						{execution.errorMessage}
					</div>
				{/if}

				<!-- Node executions -->
				<div>
					<h3 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
						Nodes ({nodeItems.length})
					</h3>
					{#if nodeItems.length === 0}
						<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'} py-2">
							No node executions yet.
						</p>
					{:else}
						<div class="space-y-2">
							{#each nodeItems as node (node.id)}
							<div
								class="rounded-lg border {darkMode
									? 'bg-slate-800 border-slate-700'
									: 'bg-slate-50 border-slate-200'}"
							>
								<div class="flex items-center justify-between gap-2 py-2 px-3">
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-800'}">
											{node.nodeName || node.nodeId || 'Node'}
										</div>
										<div class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-500'}">
											{node.nodeType || (node as Record<string, unknown>).nodeCategory || '—'}
										</div>
										{#if node.startedAt || node.completedAt}
											<div class="text-[10px] {darkMode ? 'text-slate-600' : 'text-slate-500'} mt-0.5">
												{#if node.startedAt}
													Started {formatDate(node.startedAt)}
												{/if}
												{#if node.completedAt}
													{#if node.startedAt} · {/if}Completed {formatDate(node.completedAt)}
												{/if}
											</div>
										{/if}
									</div>
									<span
										class="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 {statusColor(node.status)}"
									>
										{node.status}
									</span>
								</div>
								{#if node.errorMessage}
									<div class="text-xs px-3 pb-2 {darkMode ? 'text-red-400' : 'text-red-600'}">
										{node.errorMessage}
									</div>
								{/if}
								{#if node.outputData != null}
									{@const output = typeof node.outputData === 'string' ? (() => { try { return JSON.parse(node.outputData); } catch { return node.outputData; } })() : node.outputData}
									<div class="px-3 pb-3 pt-0">
										<div class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1">Result</div>
										{#if typeof output === 'object' && output !== null && output !== undefined}
												{#if typeof (output as Record<string, unknown>).text === 'string'}
													<div class="text-sm {darkMode ? 'text-slate-200' : 'text-slate-800'} whitespace-pre-wrap">{(output as Record<string, unknown>).text}</div>
													<div class="text-xs mt-1.5 {darkMode ? 'text-slate-500' : 'text-slate-500'} flex flex-wrap gap-x-3 gap-y-1">
														{#if (output as Record<string, unknown>).query}
															<span>Query: {(output as Record<string, unknown>).query as string}</span>
														{/if}
														{#if (output as Record<string, unknown>).matchCount != null}
															<span>{(output as Record<string, unknown>).matchCount} chunks</span>
														{/if}
														{#if (output as Record<string, unknown>).type}
															<span>Type: {(output as Record<string, unknown>).type as string}</span>
														{/if}
														{#if (output as Record<string, unknown>).usage && typeof (output as Record<string, unknown>).usage === 'object'}
															{@const usage = (output as Record<string, unknown>).usage as Record<string, unknown>}
															{#if usage.totalTokenCount != null}
																<span>Tokens: {String(usage.totalTokenCount)}</span>
															{/if}
														{/if}
													</div>
											{:else}
												<pre
													class="text-xs p-2 rounded overflow-x-auto max-h-32 {darkMode
														? 'bg-slate-900 text-slate-300'
														: 'bg-white text-slate-700'} border {darkMode ? 'border-slate-700' : 'border-slate-200'}"
												>{JSON.stringify(output, null, 2)}</pre>
											{/if}
										{:else}
											<div class="text-sm {darkMode ? 'text-slate-200' : 'text-slate-800'} whitespace-pre-wrap">{String(output)}</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
						</div>
					{/if}
				</div>

				{#if execution.outputData != null && execution.status === 'COMPLETED'}
					{@const out = execution.outputData as Record<string, unknown>}
					{@const main = typeof out?.text === 'string' ? out : (out?.result != null && typeof (out.result as Record<string, unknown>)?.text === 'string' ? (out.result as Record<string, unknown>) : null)}
					<div>
						<h3 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							Output
						</h3>
						{#if main && typeof main.text === 'string'}
							<div class="text-sm {darkMode ? 'text-slate-200' : 'text-slate-800'} whitespace-pre-wrap p-3 rounded-lg max-h-40 overflow-y-auto {darkMode ? 'bg-slate-800' : 'bg-slate-100'}">{main.text}</div>
							{#if main.query != null || main.matchCount != null}
								<div class="text-xs mt-1 {darkMode ? 'text-slate-500' : 'text-slate-500'}">
									{#if main.query}
										<span>Query: {main.query}</span>
									{/if}
									{#if main.matchCount != null}
										<span> · {main.matchCount} chunks</span>
									{/if}
								</div>
							{/if}
						{:else}
							<pre
								class="text-xs p-3 rounded-lg overflow-x-auto max-h-40 {darkMode
									? 'bg-slate-800 text-slate-300'
									: 'bg-slate-100 text-slate-700'}"
							>{JSON.stringify(execution.outputData, null, 2)}</pre>
						{/if}
					</div>
				{/if}
			{:else if !loading && !error}
				<div class="py-8 text-center text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
					Execution not found.
				</div>
			{/if}
		</div>
	</div>
</div>
