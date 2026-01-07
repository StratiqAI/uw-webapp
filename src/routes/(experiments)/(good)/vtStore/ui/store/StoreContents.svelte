<!--
	StoreContents.svelte
	
	Container component for displaying the complete state of the ValidatedTopicStore.
	
	Shows:
	- The full store tree structure
	- Validation errors across all topics
	- Store statistics (size, error count, etc.)
	
	This component provides a comprehensive view of the store's internal state
	for debugging and monitoring purposes.
-->

<script lang="ts">
	import ValidationErrors from '../errors/ValidationErrors.svelte';
	import StoreStatistics from './StoreStatistics.svelte';

	interface Props {
		storeTree: Record<string, any>;
		storeErrors: Record<string, any>;
	}

	let { storeTree, storeErrors }: Props = $props();
</script>

<div class="space-y-4">
	<h2 class="text-xl font-semibold">Store Contents</h2>

	<!-- Store Tree - Full JSON representation of all stored data -->
	<div class="rounded-md border border-gray-300 bg-white p-4">
		<strong class="mb-2 block">Store Tree:</strong>
		<!-- Display entire store tree as formatted JSON for debugging -->
		<pre
			class="mt-2 max-h-96 overflow-auto rounded border bg-gray-50 p-3 text-xs">{JSON.stringify(
				storeTree,
				null,
				2
			)}</pre>
	</div>

	<!-- Store Errors - Validation errors component -->
	<ValidationErrors {storeErrors} />

	<!-- Store Statistics - Summary metrics component -->
	<StoreStatistics {storeTree} {storeErrors} />
</div>
