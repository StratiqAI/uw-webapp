<script lang="ts">
	import type { ParagraphWidgetData } from './schema.js';
	import {
		FlipCard,
		WidgetConfigureBack,
		useWidgetConfigure,
		useReactiveValidatedTopic,
		useAiGenerationStatus,
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
	const aiStatus = useAiGenerationStatus(() => topic);

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
			{#if aiStatus.generating}
				<div class="flex items-center gap-3 py-6" role="status" aria-live="polite">
					<svg
						class="h-5 w-5 shrink-0 animate-spin {darkMode ? 'text-indigo-400' : 'text-indigo-600'}"
						fill="none" viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
					<span class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						Generating content&hellip;
					</span>
				</div>
			{:else if aiStatus.error}
				<div class="rounded-md border px-3 py-2 text-sm {darkMode ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-red-200 bg-red-50 text-red-600'}">
					{aiStatus.error}
				</div>
			{:else if widgetData.content}
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
