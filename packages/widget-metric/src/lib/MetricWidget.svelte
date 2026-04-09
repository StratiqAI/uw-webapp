<script lang="ts">
	import type { MetricWidgetData } from './schema.js';
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
		widgetId = 'metric-widget-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<MetricWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('metric', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<MetricWidgetData>(() => topic);
	const aiStatus = useAiGenerationStatus(() => topic);
	let widgetData = $derived<MetricWidgetData>(dataStream.current || data);

	const configure = useWidgetConfigure<MetricWidgetData>({
		widgetId,
		data: () => widgetData,
		get onUpdateConfig() {
			return onUpdateConfig;
		},
		get onConfigureReady() {
			return onConfigureReady;
		}
	});

	const shellClass = $derived(darkMode ? 'bg-slate-800' : 'bg-white');
	const flipBackClass = $derived(darkMode ? 'bg-slate-900' : 'bg-slate-50');
	const inputClass = $derived(
		darkMode
			? 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
			: 'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
	);
	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));
</script>

<FlipCard isFlipped={configure.isFlipped} {shellClass} {flipBackClass}>
	{#snippet front()}
		<div class="metric-widget flex h-full flex-col justify-center">
			{#if aiStatus.generating || aiStatus.error}
				<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
			{:else}
			<p class="mb-1 text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">{widgetData.label}</p>
			<p class="text-3xl font-bold {darkMode ? 'text-slate-100' : 'text-slate-900'}">
				{widgetData.value}{widgetData.unit ? ` ${widgetData.unit}` : ''}
			</p>
			{#if widgetData.change != null}
				<p
					class="mt-2 flex items-center text-sm {widgetData.changeType === 'increase'
						? darkMode
							? 'text-green-400'
							: 'text-green-600'
						: darkMode
							? 'text-red-400'
							: 'text-red-600'}"
				>
					{#if widgetData.changeType === 'increase'}
						<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
								clip-rule="evenodd"
							></path>
						</svg>
					{:else}
						<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							></path>
						</svg>
					{/if}
					{Math.abs(widgetData.change)}%
				</p>
			{/if}
			{/if}
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="metric"
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
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Label</span>
					<input class="{inputClass} mt-1 block" type="text" bind:value={configure.draft.label} />
				</label>
				<label class="block">
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Value</span>
					<input class="{inputClass} mt-1 block" type="text" bind:value={configure.draft.value} />
				</label>
				<label class="block">
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Unit</span>
					<input class="{inputClass} mt-1 block" type="text" bind:value={configure.draft.unit} />
				</label>
				<label class="block">
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Change (%)</span>
					<input class="{inputClass} mt-1 block" type="number" bind:value={configure.draft.change} />
				</label>
				<label class="block">
					<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Change type</span>
					<select
						class="{inputClass} mt-1 block"
						value={configure.draft.changeType ?? ''}
						onchange={(e) => {
							const v = (e.target as HTMLSelectElement).value;
							configure.draft.changeType = v === '' ? null : (v as 'increase' | 'decrease');
						}}
					>
						<option value="">—</option>
						<option value="increase">Increase</option>
						<option value="decrease">Decrease</option>
					</select>
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
