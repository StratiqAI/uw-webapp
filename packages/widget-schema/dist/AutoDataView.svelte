<script lang="ts">
	import { getDashboardWidgetHost } from '@stratiqai/dashboard-widget-sdk';
	import AutoDataView from './AutoDataView.svelte';

	interface Props {
		data: unknown;
		schemaId?: string;
		fieldSchema?: Record<string, unknown>;
		darkMode?: boolean;
	}

	let { data, schemaId, fieldSchema, darkMode = false }: Props = $props();

	const host = getDashboardWidgetHost();

	let rootSchema = $derived(
		!fieldSchema && schemaId ? host.validatedTopicStore.getJsonSchemaById?.(schemaId) ?? null : null
	);

	let currentSchema = $derived(fieldSchema || rootSchema);

	let properties = $derived(
		currentSchema?.type === 'object' && currentSchema.properties
			? Object.entries(currentSchema.properties as Record<string, Record<string, unknown>>)
			: []
	);

	let isArray = $derived(currentSchema?.type === 'array');
	let itemSchema = $derived(
		isArray && currentSchema?.items ? (currentSchema.items as Record<string, unknown>) : null
	);
</script>

{#if data === undefined || data === null}
	<div class="px-4 py-2 text-sm italic {darkMode ? 'text-slate-500' : 'text-slate-400'}">
		No data
	</div>
{:else if currentSchema && properties.length > 0 && typeof data === 'object' && data !== null && !Array.isArray(data)}
	<div class="divide-y {darkMode ? 'divide-slate-700' : 'divide-slate-200'}">
		{#each properties as [key, propSchema]}
			{@const value = (data as Record<string, unknown>)[key]}
			{@const propType = (propSchema as Record<string, unknown>).type as string}
			<div class="px-4 py-2">
				<div class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					{key}
				</div>
				{#if propType === 'object' || propType === 'array'}
					<div class="mt-1 ml-2 rounded border {darkMode ? 'border-slate-700' : 'border-slate-200'}">
						<AutoDataView
							data={value}
							fieldSchema={propSchema as Record<string, unknown>}
							{darkMode}
						/>
					</div>
				{:else}
					<div class="mt-0.5 text-sm {darkMode ? 'text-slate-200' : 'text-slate-700'}">
						{String(value ?? '—')}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{:else if isArray && Array.isArray(data)}
	<div class="divide-y {darkMode ? 'divide-slate-700' : 'divide-slate-200'}">
		{#each data as item, i}
			<div class="px-4 py-2">
				<div class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					[{i}]
				</div>
				{#if itemSchema && typeof item === 'object' && item !== null}
					<div class="mt-1 ml-2 rounded border {darkMode ? 'border-slate-700' : 'border-slate-200'}">
						<AutoDataView
							data={item}
							fieldSchema={itemSchema}
							{darkMode}
						/>
					</div>
				{:else}
					<div class="mt-0.5 text-sm {darkMode ? 'text-slate-200' : 'text-slate-700'}">
						{String(item ?? '—')}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{:else if typeof data === 'object' && data !== null}
	<pre class="whitespace-pre-wrap break-all px-4 py-2 text-xs font-mono {darkMode ? 'text-slate-300' : 'text-slate-600'}">{JSON.stringify(data, null, 2)}</pre>
{:else}
	<div class="px-4 py-2 text-sm {darkMode ? 'text-slate-200' : 'text-slate-700'}">
		{String(data)}
	</div>
{/if}
