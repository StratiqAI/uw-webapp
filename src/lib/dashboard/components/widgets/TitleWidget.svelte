<script lang="ts">
	import type { TitleWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';

	interface Props {
		data: TitleWidget['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'title-widget-default', topicOverride, darkMode = false }: Props = $props();
	
	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(getWidgetTopic('title', widgetId, topicOverride));
	
	// Subscribe to data updates - reactive to topic changes
	const dataStream = useReactiveValidatedTopic<TitleWidget['data']>(() => topic);
	let widgetData = $derived<TitleWidget['data']>(dataStream.current || data);
</script>

<div class="title-widget relative flex h-full flex-col justify-center overflow-hidden px-6 text-{widgetData.alignment || 'left'} {darkMode ? 'bg-transparent' : 'bg-transparent'}">
	<!-- Atmospheric background glow -->
	{#if darkMode}
		<div class="pointer-events-none absolute inset-0" style="background: radial-gradient(ellipse 70% 120% at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 70%)"></div>
		<div class="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-30" style="background: linear-gradient(to left, rgba(139,92,246,0.06) 0%, transparent 100%)"></div>
	{/if}

	<div class="relative z-10 {widgetData.alignment === 'center' ? 'flex flex-col items-center' : ''}">
		<h2 class="text-3xl font-bold tracking-tight {darkMode ? 'text-slate-100' : 'text-slate-900'}">
			{widgetData.title}
		</h2>
		{#if widgetData.subtitle}
			<div class="mt-2 flex items-center gap-3 {widgetData.alignment === 'center' ? '' : ''}">
				<div class="h-px w-6 rounded-full {darkMode ? 'bg-primary-400/50' : 'bg-primary-400/60'}"></div>
				<p class="text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">{widgetData.subtitle}</p>
				<div class="h-px w-6 rounded-full {darkMode ? 'bg-primary-400/50' : 'bg-primary-400/60'}"></div>
			</div>
		{/if}
	</div>
</div>
