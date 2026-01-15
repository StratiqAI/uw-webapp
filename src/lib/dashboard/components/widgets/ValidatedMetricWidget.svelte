<script lang="ts">
	import type { ValidatedMetricWidget } from '$lib/dashboard/types/widget';
	import { ValidatedTopicStore } from '../../../../routes/(experiments)/(good)/vtStore/ValidatedTopicStore.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: ValidatedMetricWidget['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'validated-metric-widget-default', topicOverride, darkMode = false }: Props = $props();
	
	// Use topic override if provided, otherwise use data.topic, otherwise use default pattern
	const defaultTopic = `app/metrics/${widgetId}`;
	const topic = $derived(topicOverride || data.topic || defaultTopic);
	
	// Get or create shared ValidatedTopicStore instance
	// Try to use the global store instance from the page, otherwise create a new one
	let store = $state<ValidatedTopicStore | null>(null);
	
	// Initialize store on mount
	onMount(() => {
		if (browser) {
			// Try to use the shared store from the page (if available)
			// This allows widgets to access data generated on the vtStore page
			const sharedStore = (window as any).validatedTopicStore;
			
			if (sharedStore && sharedStore instanceof ValidatedTopicStore) {
				store = sharedStore;
				console.log(`📊 ValidatedMetricWidget:${widgetId} - Using shared store instance`);
			} else {
				// Fallback: create a new instance if shared store not available
				store = new ValidatedTopicStore();
				console.log(`📊 ValidatedMetricWidget:${widgetId} - Created new store instance`);
			}
			
			console.log(`   Topic: ${topic}`);
			console.log(`   Initial data:`, data);
		}
	});
	
	// Get data from ValidatedTopicStore reactively
	// The store.tree is reactive, so accessing it creates a reactive subscription
	let widgetData = $derived.by(() => {
		if (!store) {
			// Return initial data if store not initialized yet
			return data;
		}
		
		// Access store.tree to create reactive dependency
		// This ensures the component updates when the store changes
		const _ = store.tree;
		
		// Get data from the topic path
		const currentTopic = topic; // Capture current topic value
		let topicData = store.at<ValidatedMetricWidget['data']>(currentTopic);
		
		// If specific topic not found and we're looking at app/metrics, try to find any metric
		// This handles cases where data is stored with auto-generated IDs (e.g., item-1-1768343171071)
		if (!topicData && currentTopic.startsWith('app/metrics/')) {
			// Get all metrics under app/metrics
			const allMetrics = store.getAllAt<ValidatedMetricWidget['data']>('app/metrics', {
				filter: (key, value) => {
					// Filter to only include objects with metric-like properties
					return value && typeof value === 'object' && 'label' in value && 'value' in value;
				}
			});
			
			// Use the most recent metric (last one in the array)
			// You could also sort by timestamp if available, or use the first one
			if (allMetrics.length > 0) {
				const mostRecentMetric = allMetrics[allMetrics.length - 1];
				topicData = mostRecentMetric.data;
			}
		}
		
		// If data exists at topic, use it; otherwise use initial data
		if (topicData) {
			return {
				...data,
				...topicData
			};
		}
		
		return data;
	});
	
	// Get validation errors for this topic (for debugging/display)
	let topicErrors = $derived.by(() => {
		if (!store) return null;
		// Access store.errors to create reactive dependency
		const _ = store.errors;
		const currentTopic = topic; // Capture current topic value
		return store.errors.get(currentTopic) || null;
	});
</script>
  
<div class="validated-metric-widget h-full flex flex-col justify-center">
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
	
	<!-- Debug: Show validation errors if any (only in dev mode) -->
	{#if topicErrors && browser && import.meta.env.DEV}
		<div class="mt-2 text-xs {darkMode ? 'text-red-400' : 'text-red-600'}">
			⚠️ Validation errors detected
		</div>
	{/if}
</div>
