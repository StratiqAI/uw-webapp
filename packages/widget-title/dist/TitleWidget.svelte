<script lang="ts">
	import type { TitleWidgetData } from './schema.js';
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
		widgetId = 'title-widget-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<TitleWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('title', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<TitleWidgetData>(() => topic);
	const aiStatus = useAiGenerationStatus(() => topic);
	let widgetData = $derived<TitleWidgetData>(dataStream.current || data);

	const configure = useWidgetConfigure<TitleWidgetData>({
		data: () => widgetData,
		get onUpdateConfig() {
			return onUpdateConfig;
		},
		get onConfigureReady() {
			return onConfigureReady;
		}
	});

	const shellClass = $derived(darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white');
	const flipBackClass = $derived(darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50');
	const inputClass = $derived(
		darkMode
			? 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
			: 'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
	);
	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));

	const alignClass = $derived(
		widgetData.alignment === 'center'
			? 'text-center'
			: widgetData.alignment === 'right'
				? 'text-right'
				: 'text-left'
	);
</script>

<FlipCard isFlipped={configure.isFlipped} {shellClass} {flipBackClass}>
	{#snippet front()}
		<div
			class="title-widget relative flex h-full flex-col justify-center overflow-hidden px-6 {alignClass} {darkMode ? 'bg-transparent' : 'bg-transparent'}"
		>
			{#if aiStatus.generating || aiStatus.error}
				<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
			{:else}
			{#if darkMode}
				<div
					class="pointer-events-none absolute inset-0"
					style="background: radial-gradient(ellipse 70% 120% at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 70%)"
				></div>
				<div
					class="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-30"
					style="background: linear-gradient(to left, rgba(139,92,246,0.06) 0%, transparent 100%)"
				></div>
			{/if}

			<div class="relative z-10 {widgetData.alignment === 'center' ? 'flex flex-col items-center' : ''}">
				<h2 class="text-3xl font-bold tracking-tight {darkMode ? 'text-slate-100' : 'text-slate-900'}">
					{widgetData.title}
				</h2>
				{#if widgetData.subtitle}
					<div class="mt-2 flex items-center gap-3">
						<div class="h-px w-6 rounded-full {darkMode ? 'bg-primary-400/50' : 'bg-primary-400/60'}"></div>
						<p class="text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">{widgetData.subtitle}</p>
						<div class="h-px w-6 rounded-full {darkMode ? 'bg-primary-400/50' : 'bg-primary-400/60'}"></div>
					</div>
				{/if}
			</div>
			{/if}
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="title"
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
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Title</span>
					<input class="{inputClass} mt-1 block" type="text" bind:value={configure.draft.title} />
				</label>
				<label class="block">
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Subtitle</span>
					<input class="{inputClass} mt-1 block" type="text" bind:value={configure.draft.subtitle} />
				</label>
				<label class="block">
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Alignment</span>
					<select class="{inputClass} mt-1 block" bind:value={configure.draft.alignment}>
						<option value="left">Left</option>
						<option value="center">Center</option>
						<option value="right">Right</option>
					</select>
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
