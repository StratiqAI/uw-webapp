<script lang="ts">
	import type { ImageWidgetData } from './schema.js';
	import {
		FlipCard,
		AiStatusOverlay,
		WidgetConfigureBack,
		useWidgetConfigure,
		useReactiveValidatedTopic,
		useAiGenerationStatus,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';

	let {
		data,
		widgetId = 'image-widget-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ImageWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('image', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<ImageWidgetData>(() => topic);
	const aiStatus = useAiGenerationStatus(() => topic);
	let widgetData = $derived<ImageWidgetData>(dataStream.current || data);

	const configure = useWidgetConfigure<ImageWidgetData>({
		widgetId,
		data: () => widgetData,
		get onUpdateConfig() { return onUpdateConfig; },
		get onConfigureReady() { return onConfigureReady; }
	});

	const shellClass = $derived(darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white');
	const flipBackClass = $derived(darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50');
	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));
</script>

<FlipCard isFlipped={configure.isFlipped} {shellClass} {flipBackClass}>
	{#snippet front()}
		<div class="image-widget h-full">
			{#if aiStatus.generating || aiStatus.error}
				<div class="flex h-full items-center justify-center px-4 py-4">
					<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
				</div>
			{:else}
				<img
					src={widgetData.src}
					alt={widgetData.alt}
					class="h-full w-full object-{widgetData.objectFit || 'cover'} rounded"
				/>
			{/if}
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="image"
			{widgetId}
			{darkMode}
			theme={resolvedTheme}
			{topicOverride}
			showAITab={true}
			onApply={() => configure.applyConfig()}
			onCancel={configure.cancelConfig}
		/>
	{/snippet}
</FlipCard>
