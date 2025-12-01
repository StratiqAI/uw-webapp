<script lang="ts">
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import type { DynamicSchemaDefinition, JsonSchemaDefinition } from '$lib/types/models';
	import { browser } from '$app/environment';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let registeredSchemas = $state<DynamicSchemaDefinition[]>([]);
	let selectedSchema = $state<DynamicSchemaDefinition | null>(null);

	// Refresh schemas list
	function refreshSchemas() {
		if (browser) {
			registeredSchemas = schemaRegistry.getAllDefinitions();
		}
	}

	// Auto-refresh periodically
	$effect(() => {
		if (!browser) return;
		refreshSchemas();
		const interval = setInterval(refreshSchemas, 1000);
		return () => clearInterval(interval);
	});

	function formatSchemaType(schema: JsonSchemaDefinition): string {
		let typeStr = schema.type || 'unknown';
		if (schema.type === 'array' && schema.items) {
			typeStr = `array<${schema.items.type || 'any'}>`;
		}
		if (schema.type === 'string' && schema.enum) {
			typeStr = `enum(${schema.enum.join(', ')})`;
		}
		return typeStr;
	}

	function getPropertyCount(schema: JsonSchemaDefinition): number {
		if (schema.type === 'object' && schema.properties) {
			return Object.keys(schema.properties).length;
		}
		return 0;
	}

	function copySchemaJson(schema: DynamicSchemaDefinition) {
		const json = JSON.stringify(schema, null, 2);
		navigator.clipboard.writeText(json);
		alert('Schema JSON copied to clipboard!');
	}
</script>

<div class="flex h-full">
	<!-- Schema List Sidebar -->
	<div
		class="w-1/3 border-r overflow-y-auto {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}"
	>
		<div
			class="p-4 border-b {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} sticky top-0 z-10"
		>
			<div class="flex items-center justify-between mb-2">
				<h2 class="font-semibold text-lg {darkMode ? 'text-white' : 'text-slate-900'}">
					Registered Schemas
				</h2>
				<button
					onclick={refreshSchemas}
					class="px-2 py-1 text-xs font-medium {darkMode
						? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
						: 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded transition-colors"
					title="Refresh"
				>
					↻
				</button>
			</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Total: {registeredSchemas.length}
			</div>
		</div>
		<div class="p-2 space-y-2">
			{#each registeredSchemas as schema}
				<button
					class="w-full text-left p-3 rounded-md transition-colors border {selectedSchema?.id === schema.id
						? darkMode
							? 'bg-indigo-900/50 border-indigo-700'
							: 'bg-indigo-50 border-indigo-300'
						: darkMode
							? 'bg-slate-700 border-slate-600 hover:bg-slate-600'
							: 'bg-white border-slate-200 hover:bg-slate-100'}"
					onclick={() => (selectedSchema = schema)}
				>
					<div class="font-semibold text-sm {darkMode ? 'text-white' : 'text-slate-900'}">
						{schema.id}
					</div>
					<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
						{schema.name}
					</div>
					<div class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'} mt-1">
						{getPropertyCount(schema.jsonSchema)}{' '}
						{getPropertyCount(schema.jsonSchema) === 1 ? 'property' : 'properties'}
					</div>
				</button>
			{:else}
				<div class="p-4 text-center {darkMode ? 'text-slate-400' : 'text-slate-400'}">
					No schemas registered yet
				</div>
			{/each}
		</div>
	</div>

	<!-- Schema Detail View -->
	<div class="w-2/3 p-6 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
		{#if selectedSchema}
			<div class="space-y-4">
				<!-- Header -->
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							{selectedSchema.name}
						</h2>
						<div class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
							ID: <code class="bg-slate-100 dark:bg-slate-800 px-1 rounded">{selectedSchema.id}</code>
						</div>
						{#if selectedSchema.description}
							<div class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
								{selectedSchema.description}
							</div>
						{/if}
					</div>
					<button
						onclick={() => copySchemaJson(selectedSchema)}
						class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
					>
						Copy JSON
					</button>
				</div>

				<!-- Properties List -->
				{#if selectedSchema.jsonSchema.type === 'object' && selectedSchema.jsonSchema.properties}
					<div
						class="rounded-lg border p-4 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
					>
						<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-slate-200' : 'text-slate-700'}">
							Properties ({Object.keys(selectedSchema.jsonSchema.properties).length})
						</h3>
						<div class="space-y-3">
							{#each Object.entries(selectedSchema.jsonSchema.properties) as [propName, propSchema]}
								<div
									class="p-3 rounded border {darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}"
								>
									<div class="flex items-center gap-2 mb-2">
										<span class="font-semibold text-sm {darkMode ? 'text-white' : 'text-slate-900'}">
											{propName}
										</span>
										<span
											class="px-2 py-0.5 text-xs rounded {darkMode
												? 'bg-blue-900/50 text-blue-200'
												: 'bg-blue-100 text-blue-700'}"
										>
											{formatSchemaType(propSchema)}
										</span>
										{#if selectedSchema.jsonSchema.required?.includes(propName)}
											<span
												class="px-2 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
											>
												Required
											</span>
										{/if}
									</div>
									{#if propSchema.description}
										<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-1">
											{propSchema.description}
										</div>
									{/if}
									{#if (propSchema.type === 'number' || propSchema.type === 'integer') &&
										(propSchema.minimum !== undefined || propSchema.maximum !== undefined)}
										<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-1">
											Range: {propSchema.minimum !== undefined ? propSchema.minimum : '—'} to{' '}
											{propSchema.maximum !== undefined ? propSchema.maximum : '—'}
										</div>
									{/if}
									{#if propSchema.type === 'object' && propSchema.properties}
										<div class="mt-2 ml-4 space-y-2">
											<div class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
												Sub-properties:
											</div>
											{#each Object.entries(propSchema.properties) as [subPropName, subPropSchema]}
												<div
													class="pl-3 border-l-2 {darkMode ? 'border-slate-600' : 'border-slate-300'}"
												>
													<div class="flex items-center gap-2">
														<span class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
															{subPropName}
														</span>
														<span
															class="px-1.5 py-0.5 text-xs rounded {darkMode
																? 'bg-blue-900/50 text-blue-200'
																: 'bg-blue-100 text-blue-700'}"
														>
															{formatSchemaType(subPropSchema)}
														</span>
														{#if propSchema.required?.includes(subPropName)}
															<span
																class="px-1.5 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
															>
																Required
															</span>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									{/if}
									{#if propSchema.type === 'array' && propSchema.items}
										<div class="mt-2 ml-4">
											<div class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
												Item type: {formatSchemaType(propSchema.items)}
											</div>
											{#if propSchema.items.type === 'object' && propSchema.items.properties}
												<div class="mt-2 space-y-2">
													{#each Object.entries(propSchema.items.properties) as [itemPropName, itemPropSchema]}
														<div
															class="pl-3 border-l-2 {darkMode ? 'border-slate-600' : 'border-slate-300'}"
														>
															<div class="flex items-center gap-2">
																<span class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
																	{itemPropName}
																</span>
																<span
																	class="px-1.5 py-0.5 text-xs rounded {darkMode
																		? 'bg-blue-900/50 text-blue-200'
																		: 'bg-blue-100 text-blue-700'}"
																>
																	{formatSchemaType(itemPropSchema)}
																</span>
																{#if propSchema.items.required?.includes(itemPropName)}
																	<span
																		class="px-1.5 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
																	>
																		Required
																	</span>
																{/if}
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- JSON View -->
				<div
					class="rounded-lg border p-4 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
				>
					<h3 class="text-sm font-semibold mb-3 {darkMode ? 'text-slate-200' : 'text-slate-700'}">
						JSON Schema Definition
					</h3>
					<pre
						class="text-xs font-mono overflow-auto max-h-96 p-3 rounded {darkMode
							? 'bg-slate-900 text-slate-300'
							: 'bg-slate-100 text-slate-900'}"
					>{JSON.stringify(selectedSchema, null, 2)}</pre>
				</div>
			</div>
		{:else}
			<div class="text-center mt-20 {darkMode ? 'text-slate-400' : 'text-slate-400'}">
				<div class="text-2xl mb-2">👈</div>
				<div>Select a schema to view details</div>
			</div>
		{/if}
	</div>
</div>
