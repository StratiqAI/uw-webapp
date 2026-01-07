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

<div class="rounded-md border border-blue-200 bg-blue-50 p-4">
	<strong>Registered Schemas:</strong>
	{#each registeredSchemas as schemaEntry}
		<div class="mt-3">
			<div class="mb-1 font-semibold text-xs text-blue-900">
				Pattern: <code>{schemaEntry.pattern}</code>
			</div>
			<pre class="overflow-auto rounded border border-blue-100 bg-white p-2 text-xs">
{JSON.stringify(schemaEntry.schema, null, 2)}
			</pre>
		</div>
	{/each}
</div>
