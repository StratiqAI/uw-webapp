<script lang="ts">
	import WorkflowResultsPanel from './WorkflowResultsPanel.svelte';
	import WorkflowExecutionsPanel from './WorkflowExecutionsPanel.svelte';
	import type { WorkflowResult } from '../../types';
	import type { WorkflowExecutionListItem } from '../../services/backend/workflowExecutionService';

	type TabId = 'run' | 'executions';

	const {
		results = [],
		onClearResults,
		executions = [],
		executionsLoading = false,
		selectedWorkflowId = null,
		onSelectExecution,
		darkMode = false
	}: {
		results?: WorkflowResult[];
		onClearResults?: () => void;
		executions?: WorkflowExecutionListItem[];
		executionsLoading?: boolean;
		selectedWorkflowId?: string | null;
		onSelectExecution?: (exec: WorkflowExecutionListItem) => void;
		darkMode?: boolean;
	} = $props();

	let activeTab = $state<TabId>('run');
</script>

<div
	class="flex-shrink-0 h-72 flex flex-col {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t"
	style="min-height: 0;"
>
	<!-- Tab bar -->
	<div
		class="flex border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} px-4"
		role="tablist"
	>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'run'}
			class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'run'
				? darkMode
					? 'border-indigo-500 text-indigo-400'
					: 'border-indigo-600 text-indigo-600'
				: darkMode
					? 'border-transparent text-slate-400 hover:text-slate-200'
					: 'border-transparent text-slate-500 hover:text-slate-700'}"
			onclick={() => (activeTab = 'run')}
		>
			Run Results
			{#if results.length > 0}
				<span
					class="ml-1.5 text-xs {activeTab === 'run'
						? darkMode
							? 'text-indigo-300'
							: 'text-indigo-600'
						: darkMode
							? 'text-slate-500'
							: 'text-slate-400'}"
				>
					({results.length})
				</span>
			{/if}
		</button>
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
	</div>

	<!-- Tab content -->
	<div class="flex-1 overflow-y-auto p-5 min-h-0 max-h-64">
		{#if activeTab === 'run'}
			{#if results.length > 0}
				<WorkflowResultsPanel {results} onClear={onClearResults} {darkMode} />
			{:else}
				<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
					Run the workflow (Execute) to see local results here. This is a preview only; AI and backend runs appear under Executions.
				</p>
			{/if}
		{:else}
			<WorkflowExecutionsPanel
				{executions}
				loading={executionsLoading}
				{selectedWorkflowId}
				{darkMode}
				onSelectExecution={onSelectExecution}
			/>
		{/if}
	</div>
</div>
