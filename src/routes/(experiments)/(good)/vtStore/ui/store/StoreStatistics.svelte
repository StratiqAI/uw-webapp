<!--
	StoreStatistics.svelte
	
	Component for displaying statistics about the ValidatedTopicStore.
	
	Shows:
	- Whether topics with data exist
	- Number of topics with validation errors
	- Total store size in bytes
	
	Provides a quick overview of the store's health and usage.
-->

<script lang="ts">
	interface Props {
		storeTree: Record<string, any>;
		storeErrors: Record<string, any>;
	}

	let { storeTree, storeErrors }: Props = $props();
</script>

	<div class="rounded-md border border-purple-200 bg-purple-50 p-4">
		<strong class="mb-2 block">Store Statistics:</strong>
		<div class="space-y-1 text-sm">
			<!-- Check if store has any data at root level -->
			<p>
				<strong>Topics with data:</strong>
				{Object.keys(storeTree).length > 0 ? 'Yes' : 'No'}
			</p>
			<!-- Count number of topics that have validation errors -->
			<p><strong>Topics with errors:</strong> {Object.keys(storeErrors).length}</p>
			<!-- Calculate approximate size by stringifying the tree -->
			<p><strong>Total store size:</strong> {JSON.stringify(storeTree).length} bytes</p>
		</div>
	</div>
