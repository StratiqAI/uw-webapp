<script lang="ts">
	import type { WorkflowExecutionListItem } from '../../services/backend/workflowExecutionService';

	const {
		executions = [],
		loading = false,
		selectedWorkflowId = null,
		darkMode = false,
		onSelectExecution
	}: {
		executions?: WorkflowExecutionListItem[];
		loading?: boolean;
		selectedWorkflowId?: string | null;
		darkMode?: boolean;
		onSelectExecution?: (exec: WorkflowExecutionListItem) => void;
	} = $props();

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

<div class="space-y-3">
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
			Backend Executions
		</h3>
	</div>

	{#if !selectedWorkflowId}
		<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			Select a workflow to view runs triggered by events (e.g. document upload).
		</p>
	{:else if loading}
		<div class="flex items-center gap-2 py-4">
			<div
				class="w-4 h-4 border-2 {darkMode
					? 'border-slate-600 border-t-slate-400'
					: 'border-slate-200 border-t-slate-600'} rounded-full animate-spin"
			></div>
			<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading…</span>
		</div>
	{:else if executions.length === 0}
		<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			No executions yet. Runs start when this workflow’s trigger (e.g. Doclink Created) fires.
		</p>
	{:else}
		<div class="space-y-2 max-h-48 overflow-y-auto">
			{#each executions as exec (exec.id)}
				<button
					type="button"
					class="w-full text-left {darkMode
						? 'bg-slate-800 border-slate-700 hover:border-slate-600 hover:bg-slate-750'
						: 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'} border rounded-lg p-3 transition-colors"
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
			{/each}
		</div>
	{/if}
</div>
