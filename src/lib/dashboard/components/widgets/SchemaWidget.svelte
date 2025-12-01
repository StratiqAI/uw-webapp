<script lang="ts">
	import type { SchemaWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/MapStore';
	import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import AutoDataView from '$lib/components/auto/AutoDataView.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: SchemaWidget['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'schema-widget-default', topicOverride, darkMode = false }: Props = $props();

	// Get schema ID from widget data
	const schemaId = $derived(data.schemaId);
	
	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(topicOverride || `widget:schema:${widgetId}:${schemaId}`);

	// Subscribe to data updates using useTopic hook
	// Note: We use `unknown` here since the schema is dynamic
	const dataStream = useTopic<unknown>(topic, `schema-widget-consumer-${widgetId}`);
	let widgetData = $derived<unknown>(dataStream.current || data.data || {});

	// Get schema definition from registry (full definition with metadata)
	let schemaDefinition = $derived(schemaRegistry.getDefinition(schemaId));

	// Enforce schema on mount
	onMount(() => {
		if (browser && schemaId) {
			mapStore.enforceTopicSchema(topic, schemaId);
			console.log(`📋 SchemaWidget:${widgetId} - Schema enforced: ${schemaId} on topic: ${topic}`);
		}
	});

	console.log(`📋 SchemaWidget:${widgetId} - Initialized`);
	console.log(`   Schema ID: ${schemaId}`);
	console.log(`   Topic: ${topic}`);
	console.log(`   Initial data:`, data.data);
</script>

<div class="schema-widget h-full flex flex-col {darkMode ? 'bg-slate-800' : 'bg-slate-50'}">
	{#if !schemaId}
		<div class="flex h-full items-center justify-center p-4">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				No schema ID provided
			</p>
		</div>
	{:else if !schemaDefinition}
		<div class="flex h-full items-center justify-center p-4">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Schema "{schemaId}" not found in registry
			</p>
		</div>
	{:else}
		<!-- Schema Info Header -->
		<div class="border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} px-4 py-2">
			<h3 class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">
				{schemaDefinition?.name || schemaId}
			</h3>
			{#if schemaDefinition?.description}
				<p class="mt-1 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					{schemaDefinition.description}
				</p>
			{/if}
		</div>

		<!-- Auto-rendered data view -->
		<div class="flex-1 overflow-auto">
			<AutoDataView data={widgetData} {schemaId} {darkMode} />
		</div>
	{/if}
</div>

