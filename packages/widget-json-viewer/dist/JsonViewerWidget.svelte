<script lang="ts">
	import type { JsonViewerWidgetData } from './schema.js';
	import { useReactiveValidatedTopic, getDashboardWidgetHost } from '@stratiqai/dashboard-widget-sdk';

	interface Props {
		data: JsonViewerWidgetData;
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'json-viewer-default', topicOverride, darkMode = false }: Props = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('jsonViewer', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<JsonViewerWidgetData>(() => topic);
	let widgetData = $derived<JsonViewerWidgetData>(dataStream.current || data);

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
		} catch { /* noop */ }
	}
</script>

<div class="json-viewer h-full flex flex-col overflow-hidden">
	<div class="flex items-center justify-between px-3 py-1.5 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<span class="text-xs font-medium uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			Raw JSON
		</span>
		<button
			onclick={copyToClipboard}
			class="text-xs px-2 py-0.5 rounded transition-colors {darkMode
				? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
				: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}"
		>
			{copySuccess ? 'Copied!' : 'Copy'}
		</button>
	</div>
	<pre
		class="flex-1 overflow-auto p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all {darkMode
			? 'bg-slate-900 text-emerald-400'
			: 'bg-slate-50 text-slate-800'}"
	>{formatted}</pre>
</div>
