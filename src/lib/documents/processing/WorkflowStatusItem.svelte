<!-- src/lib/components/DocumentProcessing/WorkflowStatusItem.svelte -->
<script lang="ts">
	import ProcessingBadge from './ProcessingBadge.svelte';
	import ProgressIndicator from './ProgressIndicator.svelte';
	import type { WorkflowState } from './types';

	const { workflow } = $props<{
		workflow: WorkflowState;
	}>();

	let isExpanded = $state(false);
</script>

<div
	class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="text-lg">⚙️</span>
			<div>
				<div class="text-sm font-medium text-gray-900 dark:text-white">{workflow.name}</div>
				{#if workflow.message}
					<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">{workflow.message}</div>
				{/if}
			</div>
		</div>
		<ProcessingBadge status={workflow.status} />
	</div>

	{#if workflow.progress !== undefined && workflow.status === 'running'}
		<div class="mt-3">
			<ProgressIndicator progress={workflow.progress} showPercentage={true} />
		</div>
	{/if}

	{#if workflow.error}
		<div class="mt-2 rounded bg-red-50 p-2 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300">
			{workflow.error}
		</div>
	{/if}

	{#if workflow.startedAt || workflow.completedAt}
		<button
			type="button"
			class="mt-2 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
			onclick={() => (isExpanded = !isExpanded)}
		>
			{isExpanded ? 'Hide' : 'Show'} details
		</button>
		{#if isExpanded}
			<div class="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
				{#if workflow.startedAt}
					<div>Started: {new Date(workflow.startedAt).toLocaleString()}</div>
				{/if}
				{#if workflow.completedAt}
					<div>Completed: {new Date(workflow.completedAt).toLocaleString()}</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
