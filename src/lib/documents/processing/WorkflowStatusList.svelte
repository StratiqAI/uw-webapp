<!-- src/lib/components/DocumentProcessing/WorkflowStatusList.svelte -->
<script lang="ts">
	import WorkflowStatusItem from './WorkflowStatusItem.svelte';
	import type { WorkflowState } from './types';

	const { workflows } = $props<{
		workflows: WorkflowState[];
	}>();
</script>

<div class="space-y-2">
	{#each workflows as workflow (workflow.id)}
		<WorkflowStatusItem {workflow} />
	{/each}
</div>
