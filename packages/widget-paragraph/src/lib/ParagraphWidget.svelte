<script lang="ts">
	import type { ParagraphWidgetData } from './schema.js';
	import {
		FlipCard,
		WidgetConfigureBack,
		useWidgetConfigure,
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';

	let {
		data,
		widgetId = 'paragraph-widget-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ParagraphWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('paragraph', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<ParagraphWidgetData>(() => topic);

	let widgetData = $derived<ParagraphWidgetData>({
		title: dataStream.current?.title ?? data.title,
		content: dataStream.current?.content ?? data.content,
		markdown: dataStream.current?.markdown ?? data.markdown ?? false
	});

	const configure = useWidgetConfigure<ParagraphWidgetData>({
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
			{#if widgetData.content}
				<div
					class="prose max-w-none text-[0.9375rem] leading-relaxed {darkMode
						? 'prose-invert text-slate-200'
						: 'text-slate-700'}"
				>
					{@html widgetData.content}
				</div>
			{:else}
				<p class="italic {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					No content yet. Open settings to configure the AI prompt.
				</p>
			{/if}
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="paragraph"
			{widgetId}
			{darkMode}
			theme={resolvedTheme}
			{topicOverride}
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
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={configure.draft.markdown} />
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						>Render as Markdown / HTML</span
					>
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
