<script lang="ts">
	import type { SchemaWidgetData } from './schema.js';
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
	import AutoDataView from './AutoDataView.svelte';

	let {
		data,
		widgetId = 'schema-widget-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<SchemaWidgetData> = $props();

	const host = getDashboardWidgetHost();

	const schemaId = $derived(data.schemaId);
	const topic = $derived(topicOverride || `widgets/schema/${widgetId}-${schemaId}`);
	const dataStream = useReactiveValidatedTopic<unknown>(() => topic);
	const aiStatus = useAiGenerationStatus(() => topic);
	let widgetData = $derived<unknown>(dataStream.current || data.data || {});

	const configure = useWidgetConfigure<SchemaWidgetData>({
		widgetId,
		data: () => data,
		get onUpdateConfig() { return onUpdateConfig; },
		get onConfigureReady() { return onConfigureReady; }
	});

	const shellClass = $derived(darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white');
	const flipBackClass = $derived(darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50');
	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));

	let schemaDefinition = $derived(host.validatedTopicStore.getSchemaById?.(schemaId));
</script>

<FlipCard isFlipped={configure.isFlipped} {shellClass} {flipBackClass}>
	{#snippet front()}
		<div class="schema-widget h-full flex flex-col {darkMode ? 'bg-slate-800' : 'bg-slate-50'}">
			{#if aiStatus.generating || aiStatus.error}
				<div class="flex h-full items-center justify-center px-4 py-4">
					<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
				</div>
			{:else if !schemaId}
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

				<div class="flex-1 overflow-auto">
					<AutoDataView data={widgetData} {schemaId} {darkMode} />
				</div>
			{/if}
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="schema"
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
