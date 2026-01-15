<!--
	SchemaDataViewer.svelte
	
	Component for selecting a schema and displaying all data from the ValidatedTopicStore
	that matches that schema pattern.
	
	Features:
	- Schema selector dropdown
	- Displays all data items matching the selected schema pattern
	- Generic display that works with any schema structure
	- Shows empty state when no data exists
	- Reactive updates when store data changes
	
	This component allows users to view all data stored under a specific schema pattern.
-->

<script lang="ts">
	import type { Schema } from 'ajv';
	import type { ValidatedTopicStore } from '../../ValidatedTopicStore.svelte';

	interface SchemaEntry {
		pattern: string;
		schema: Schema;
	}

	interface Props {
		store: ValidatedTopicStore;
		registeredSchemas: SchemaEntry[];
	}

	let { store, registeredSchemas }: Props = $props();

	// Selected schema pattern (starts with first schema if available)
	let selectedPattern = $state(registeredSchemas[0]?.pattern || '');

	/**
	 * Extract base path from schema pattern by removing wildcards
	 * Examples:
	 *   'app/users/+' -> 'app/users'
	 *   'app/products/+' -> 'app/products'
	 *   'app/tasks/+' -> 'app/tasks'
	 */
	function getBasePath(pattern: string): string {
		return pattern.replace(/\/[+#]$/, '').replace(/\/[+#]\/.*$/, '');
	}

	/**
	 * Get all data items for the selected schema pattern
	 * Reactive: updates when store.tree changes
	 */
	let items = $derived.by(() => {
		if (!selectedPattern) return [];
		
		const basePath = getBasePath(selectedPattern);
		return store.getAllAt(basePath, {
			filter: (key, value) => value && typeof value === 'object' && !Array.isArray(value)
		});
	});

	/**
	 * Format value for display (handles objects, arrays, primitives)
	 */
	function formatValue(value: any): string {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}

	/**
	 * Get a display-friendly title from the pattern
	 */
	function getTitle(pattern: string): string {
		const parts = pattern.split('/');
		const lastPart = parts[parts.length - 1];
		const secondLastPart = parts[parts.length - 2];
		
		// Convert 'app/users/+' to 'Users'
		if (secondLastPart) {
			return secondLastPart.charAt(0).toUpperCase() + secondLastPart.slice(1);
		}
		return pattern;
	}
</script>

<div class="rounded-md border border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30 p-4">
	<div class="mb-4">
		<label for="schema-data-select" class="block text-sm font-medium dark:text-blue-200 mb-2">
			Select Schema:
		</label>
		<select
			id="schema-data-select"
			bind:value={selectedPattern}
			class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2"
		>
			{#if registeredSchemas.length === 0}
				<option value="">No schemas registered</option>
			{:else}
				{#each registeredSchemas as { pattern }}
					<option value={pattern}>{pattern}</option>
				{/each}
			{/if}
		</select>
	</div>

	{#if selectedPattern}
		<div class="mb-2 flex items-center justify-between">
			<strong class="dark:text-blue-200">
				{getTitle(selectedPattern)} Data ({items.length}):
			</strong>
		</div>

		{#if items.length > 0}
			<!-- Render each item as a card -->
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each items as { id, data }}
					<div
						class="group relative overflow-hidden rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
					>
						<div class="p-5">
							<!-- ID badge -->
							<div class="mb-3 text-xs text-gray-400 dark:text-gray-500">
								#{id.split('/').pop()}
							</div>

							<!-- Data fields as key-value pairs -->
							<div class="space-y-3">
								{#each Object.entries(data) as [key, value]}
									<div class="flex flex-col gap-1">
										<div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
											{key}
										</div>
										<div class="text-sm text-gray-900 dark:text-slate-200 break-words">
											{#if typeof value === 'object' && value !== null}
												<pre class="text-xs bg-gray-50 dark:bg-slate-900 p-2 rounded overflow-auto max-h-32">{formatValue(value)}</pre>
											{:else}
												{formatValue(value)}
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Empty state -->
			<p class="mt-4 text-sm text-gray-600 dark:text-gray-300">
				No data found for schema pattern "{selectedPattern}".
				Generate some data to see it here!
			</p>
		{/if}
	{:else}
		<p class="text-sm text-gray-600 dark:text-gray-300">
			Please select a schema to view its data.
		</p>
	{/if}
</div>