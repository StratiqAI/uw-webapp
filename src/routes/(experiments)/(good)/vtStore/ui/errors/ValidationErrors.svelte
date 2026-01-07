<!--
	ValidationErrors.svelte
	
	Component for displaying validation errors from the ValidatedTopicStore.
	
	Shows all validation errors that have occurred when publishing data to topics.
	Errors are displayed in a formatted JSON view for easy debugging.
	
	If no errors exist, displays a friendly message indicating the store is error-free.
-->

<script lang="ts">
	interface Props {
		storeErrors: Record<string, any>;
	}

	let { storeErrors }: Props = $props();
</script>

<div class="rounded-md border border-red-200 bg-red-50 p-4">
	<strong class="mb-2 block">Validation Errors:</strong>
	{#if Object.keys(storeErrors).length > 0}
		<!-- Display all validation errors as formatted JSON -->
		<pre
			class="mt-2 max-h-96 overflow-auto rounded border bg-white p-3 text-xs">{JSON.stringify(
				storeErrors,
				null,
				2
			)}</pre>
	{:else}
		<!-- Show friendly message when no errors exist -->
		<p class="text-sm text-gray-600">No validation errors</p>
	{/if}
</div>
