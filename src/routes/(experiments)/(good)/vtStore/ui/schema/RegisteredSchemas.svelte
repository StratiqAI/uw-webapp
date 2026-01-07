<!--
	RegisteredSchemas.svelte
	
	Component for displaying all registered schemas in the ValidatedTopicStore.
	
	Shows a list of all schema patterns and their corresponding JSON schemas,
	allowing users to see what schemas are available for validation.
-->

<script lang="ts">
	interface SchemaEntry {
		pattern: string;
		schema: any;
	}

	interface Props {
		registeredSchemas: SchemaEntry[];
	}

	let { registeredSchemas }: Props = $props();
</script>

<div class="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30 p-4">
	<strong class="dark:text-blue-200">Registered Schemas:</strong>
	{#each registeredSchemas as schemaEntry}
		<div class="mt-3">
			<div class="mb-1 font-semibold text-xs text-blue-900 dark:text-blue-200">
				Pattern: <code class="dark:text-blue-300">{schemaEntry.pattern}</code>
			</div>
			<pre class="overflow-auto rounded border border-blue-100 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-slate-200 p-2 text-xs">
{JSON.stringify(schemaEntry.schema, null, 2)}
			</pre>
		</div>
	{/each}
</div>
