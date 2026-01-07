<!--
	PathLookup.svelte
	
	Component for looking up and displaying values at specific paths in the store.
	
	Allows users to:
	- Enter a topic path to query
	- View the value stored at that path
	- See validation errors if the path has validation issues
	
	Useful for debugging and inspecting the store's internal state.
-->

<script lang="ts">
	import type { ValidatedTopicStore } from '../../ValidatedTopicStore.svelte';

	interface Props {
		store: ValidatedTopicStore;
	}

	let { store }: Props = $props();

	// Path lookup state - component manages its own state
	let pathInput = $state(''); // User input for path
	let lookupPath = $state(''); // Actual path to query (set on form submit)
	
	// Reactive value lookup - updates when lookupPath or store.tree changes
	let pathValue = $derived.by(() => {
		if (!lookupPath) return null;
		// store.at() navigates the tree using path segments (e.g., 'app/users/item-1')
		return store.at(lookupPath);
	});
	
	// Reactive error lookup - updates when lookupPath or store.errors changes
	let pathErrors = $derived.by(() => {
		if (!lookupPath) return null;
		// Check if there are validation errors for this specific path
		return store.errors[lookupPath];
	});

	function handlePathLookup(e: Event) {
		e.preventDefault(); // Prevent form default submission
		// Only set lookupPath if user entered something (trimmed)
		if (pathInput.trim()) {
			lookupPath = pathInput.trim();
		}
	}
</script>

<div class="rounded-md border border-purple-300 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/30 p-4">
	<strong class="mb-2 block dark:text-purple-200">Path Lookup:</strong>
	<form onsubmit={handlePathLookup} class="space-y-2">
		<input
			type="text"
			bind:value={pathInput}
			placeholder="Enter store path (e.g., app/users/user-1-1234567890)"
			class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2"
		/>
		<button
			type="submit"
			class="rounded-md bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700"
		>
			Lookup Path
		</button>
	</form>

	{#if lookupPath}
		<div class="mt-4 space-y-2">
			<!-- Display the path being queried -->
			<div class="text-sm text-gray-600 dark:text-gray-300">
				<strong>Path:</strong> <code class="rounded bg-gray-200 dark:bg-gray-700 dark:text-gray-200 px-1">{lookupPath}</code>
			</div>

			<!-- Show validation errors if they exist for this path -->
			{#if pathErrors}
				<div class="rounded-md border border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/30 p-3">
					<strong class="text-red-700 dark:text-red-300">Validation Errors:</strong>
					<pre class="mt-2 overflow-auto text-xs text-red-600 dark:text-red-300">{JSON.stringify(
							pathErrors,
							null,
							2
						)}</pre>
				</div>
			{/if}

			<!-- Show value if found, otherwise show "not found" message -->
			{#if pathValue !== null && pathValue !== undefined}
				<div class="rounded-md border border-green-300 bg-green-50 dark:border-green-500 dark:bg-green-900/30 p-3">
					<strong class="text-green-700 dark:text-green-300">Value:</strong>
					<pre
						class="mt-2 max-h-64 overflow-auto rounded border bg-white dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 p-2 text-xs">{JSON.stringify(
							pathValue,
							null,
							2
						)}</pre>
				</div>
			{:else if lookupPath}
				<!-- Path was queried but no value exists -->
				<div class="rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-500 dark:bg-yellow-900/30 p-3 text-yellow-700 dark:text-yellow-300">
					No value found at this path
				</div>
			{/if}
		</div>
	{/if}
</div>
