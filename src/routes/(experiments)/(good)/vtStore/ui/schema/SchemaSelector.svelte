<!--
	SchemaSelector.svelte
	
	Component for selecting a schema pattern from registered schemas.
	
	Provides a dropdown selector that:
	- Lists all available registered schema patterns
	- Allows selection of a schema for AI data generation
	- Disables when loading or when no schemas are available
	- Shows helpful message when no schemas are registered
	
	The selected schema pattern is used to validate and structure AI-generated data.
-->

<script lang="ts">
	interface SchemaEntry {
		pattern: string;
		schema: any;
	}

	interface Props {
		registeredSchemas: SchemaEntry[];
		selectedSchemaPattern: string;
		loading?: boolean;
	}

	// selectedSchemaPattern uses $bindable() for two-way binding with parent
	// This allows parent to set initial value and react to user selections
	let { registeredSchemas, selectedSchemaPattern = $bindable(), loading = false }: Props = $props();
</script>

<div class="space-y-2">
	<label for="schema-select" class="block text-sm font-medium dark:text-slate-200">Schema:</label>
	<!-- 
		Schema dropdown - disabled when loading or no schemas available
		bind:value creates two-way binding with selectedSchemaPattern prop
	-->
	<select
		id="schema-select"
		bind:value={selectedSchemaPattern}
		disabled={loading || registeredSchemas.length === 0}
		class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
	>
		{#if registeredSchemas.length === 0}
			<option value="">No schemas registered</option>
		{:else}
			<!-- Render each registered schema pattern as an option -->
			{#each registeredSchemas as { pattern }}
				<option value={pattern}>{pattern}</option>
			{/each}
		{/if}
	</select>
	{#if registeredSchemas.length === 0}
		<p class="text-xs text-gray-500 dark:text-gray-400">
			Register a schema using the Schema Builder below to get started.
		</p>
	{/if}
</div>
