<script lang="ts">
	import type { ParagraphData } from './schema.js';
	import {
		FlipCard,
		AiStatusOverlay,
		WidgetConfigureBack,
		useWidgetConfigure,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';

	let {
		data,
		widgetId = 'simple-paragraph-widget-default',
		topicOverride,
		darkMode = false,
		theme,
		extraction,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ParagraphData> = $props();

	const generating = $derived(extraction?.loading ?? false);
	const error = $derived(extraction?.error ?? undefined);

	let widgetData = $derived<ParagraphData>({
		title: (extraction?.result?.title as string) ?? data.title,
		description: (extraction?.result?.description as string) ?? data.description,
		content: (extraction?.result?.content as string) ?? data.content
	});

	const configure = useWidgetConfigure<ParagraphData>({
		widgetId,
		data: () => widgetData,
		get onUpdateConfig() {
			return onUpdateConfig;
		},
		get onConfigureReady() {
			return onConfigureReady;
		}
	});

	const shellClass = $derived(
		darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
	);
	const flipBackClass = $derived(
		darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'
	);
	const inputClass = $derived(
		darkMode
			? 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
			: 'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
	);
	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));
</script>

<FlipCard isFlipped={configure.isFlipped} {shellClass} {flipBackClass}>
	{#snippet front()}
		<div class="relative h-full overflow-auto px-4 py-4">
			{#if generating || error}
				<AiStatusOverlay {generating} {error} {darkMode} />
			{:else if widgetData.content}
				<p
					class="text-[0.9375rem] leading-relaxed {darkMode
						? 'text-slate-200'
						: 'text-slate-700'}"
				>
					{widgetData.content}
				</p>
			{:else}
				<p class="italic {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					No content yet. Open settings to configure the AI prompt.
				</p>
			{/if}
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="simpleParagraph"
			{widgetId}
			{darkMode}
			theme={resolvedTheme}
			{topicOverride}
			showAITab={true}
			onApply={() => configure.applyConfig()}
			onCancel={configure.cancelConfig}
		>
			{#snippet userFields()}
				<label class="block">
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						>Content</span
					>
					<textarea
						class="{inputClass} mt-1 block min-h-24 resize-y"
						bind:value={configure.draft.content}
					></textarea>
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
