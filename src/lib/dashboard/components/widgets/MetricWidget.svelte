<script lang="ts">
	import type { MetricWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/MapStore';
	import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
	import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: MetricWidget['data'];
		widgetId?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'metric-widget-default', darkMode = false }: Props = $props();
	
	// Use topic naming convention: widget:metric:${widgetId}
	const topic = $derived(getWidgetTopic('metric', widgetId));
	
	// Subscribe to data updates using useTopic hook
	const dataStream = useTopic(topic, `metric-widget-consumer-${widgetId}`);
	let widgetData = $derived(dataStream.current || data);

	// Enforce schema on mount
	onMount(() => {
		if (browser) {
			const schemaId = getWidgetSchemaId('metric');
			mapStore.enforceTopicSchema(topic, schemaId);
			console.log(`📊 MetricWidget:${widgetId} - Schema enforced: ${schemaId} on topic: ${topic}`);
		}
	});

	console.log(`📊 MetricWidget:${widgetId} - Initialized`);
	console.log(`   Topic: ${topic}`);
	console.log(`   Initial data:`, data);
</script>
  
  <div class="metric-widget h-full flex flex-col justify-center">
    <p class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'} mb-1">{widgetData.label}</p>
    <p class="text-3xl font-bold {darkMode ? 'text-slate-100' : 'text-slate-900'}">
      {widgetData.value}{widgetData.unit ? ` ${widgetData.unit}` : ''}
    </p>
    {#if widgetData.change !== undefined}
      <p class="text-sm mt-2 flex items-center {widgetData.changeType === 'increase' ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600')}">
        {#if widgetData.changeType === 'increase'}
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
          </svg>
        {:else}
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        {/if}
        {Math.abs(widgetData.change)}%
      </p>
    {/if}
  </div>