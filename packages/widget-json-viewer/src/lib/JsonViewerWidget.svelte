<script lang="ts">
	import type { JsonViewerWidgetData } from './schema.js';
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
		widgetId = 'json-viewer-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<JsonViewerWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('jsonViewer', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<JsonViewerWidgetData>(() => topic);
	const aiStatus = useAiGenerationStatus(() => topic);
	let widgetData = $derived<JsonViewerWidgetData>(dataStream.current || data);

	const configure = useWidgetConfigure<JsonViewerWidgetData>({
		widgetId: () => widgetId,
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
	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));

	let formatted = $derived(formatJson(widgetData.json));
	let copySuccess = $state(false);

	function formatJson(value: unknown): string {
		try {
			return JSON.stringify(value, null, 2) ?? 'undefined';
		} catch {
			return String(value);
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(formatted);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 1500);
		} catch {
			/* noop */
		}
	}
</script>

<FlipCard isFlipped={configure.isFlipped} {shellClass} {flipBackClass}>
	{#snippet front()}
		<div class="json-viewer flex h-full flex-col overflow-hidden">
			{#if aiStatus.generating || aiStatus.error}
				<div class="px-4 py-4">
					<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
				</div>
			{:else}
			<div
				class="flex items-center justify-between border-b px-3 py-1.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}"
			>
				<span class="text-xs font-medium uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					Raw JSON
				</span>
				<button
					type="button"
					onclick={copyToClipboard}
					class="rounded px-2 py-0.5 text-xs transition-colors {darkMode
						? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
						: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
				>
					{copySuccess ? 'Copied!' : 'Copy'}
				</button>
			</div>
			<pre
				class="flex-1 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-xs leading-relaxed {darkMode
					? 'bg-slate-900 text-emerald-400'
					: 'bg-slate-50 text-slate-800'}"
			>{formatted}		</pre>
			{/if}
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="jsonViewer"
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
