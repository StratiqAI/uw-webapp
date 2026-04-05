<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { DashboardAppTheme, StreamEntry } from './types.js';
	import { getDashboardWidgetHost } from './context.svelte.js';

	interface Props {
		kind: string;
		widgetId: string;
		darkMode?: boolean;
		theme?: DashboardAppTheme;
		topicOverride?: string;
		schemaId?: string;
		externalData?: { isLoading: boolean; error: string | null; refresh?: () => void };
		onApply: () => void;
		onCancel: () => void;
		userFields?: Snippet;
		promptChooser?: Snippet;
		promptEditor?: Snippet;
	}

	let {
		kind,
		widgetId,
		darkMode = false,
		theme = 'dark',
		topicOverride,
		schemaId,
		externalData,
		onApply,
		onCancel,
		userFields,
		promptChooser,
		promptEditor
	}: Props = $props();

	const host = getDashboardWidgetHost();

	const panelBg = $derived(
		darkMode ? 'bg-slate-900 text-slate-100' : theme === 'warm' ? 'bg-[#faf8f4] text-slate-900' : 'bg-slate-50 text-slate-900'
	);
	const sectionBorder = $derived(
		darkMode ? 'border-slate-700' : theme === 'warm' ? 'border-[#e5dcc8]' : 'border-slate-200'
	);
	const labelClass = $derived(
		darkMode ? 'text-xs font-medium text-slate-400' : 'text-xs font-medium text-slate-500'
	);
	const sectionTitle = $derived(
		darkMode ? 'text-sm font-semibold text-slate-200' : 'text-sm font-semibold text-slate-700'
	);
	const fieldClass = $derived(
		darkMode
			? 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
			: 'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
	);
	const btnPrimary = $derived(
		darkMode
			? 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500'
			: 'rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700'
	);
	const btnSecondary = $derived(
		darkMode
			? 'rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700'
			: 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'
	);
	const badgeActive = $derived(
		darkMode ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
	);
	const badgeStream = $derived(
		darkMode ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-700/40' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
	);
	const statusDot = (ok: boolean) =>
		ok ? 'bg-emerald-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300';

	// --- Topic management ---
	const currentTopic = $derived(host.getWidgetTopic(kind, widgetId, topicOverride));
	const availableTopics = $derived(host.getAvailableTopics?.(kind, widgetId) ?? []);
	let selectedTopic = $state('');

	$effect(() => {
		selectedTopic = currentTopic;
	});

	function handleTopicChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		selectedTopic = val;
	}

	// --- Stream catalog ---
	const activeStream = $derived(host.streams?.getByTopic(currentTopic));
	const compatibleStreams = $derived<StreamEntry[]>(
		schemaId ? (host.streams?.filterBySchemaId(schemaId) ?? []) : []
	);

	function selectStream(stream: StreamEntry) {
		host.setTopicOverride?.(widgetId, stream.topic);
	}

	// --- Service status ---
	const serviceStatuses = $derived(host.getServiceStatus?.() ?? []);
	const hasServices = $derived(serviceStatuses.length > 0 && serviceStatuses.some((s) => s.available));

	function handleApply() {
		if (selectedTopic !== currentTopic) {
			host.setTopicOverride?.(widgetId, selectedTopic);
		}
		onApply();
	}
</script>

<div class="flex h-full flex-col overflow-auto {panelBg}">
	<div class="flex-1 space-y-4 px-4 py-4 sm:px-6">
		<header class="mb-2">
			<h3 class="text-lg font-bold">Configure</h3>
			<p class={labelClass}>{kind} &bull; {widgetId}</p>
		</header>

		{#if userFields}
			<section class="space-y-3 border-b pb-4 {sectionBorder}">
				<h4 class={sectionTitle}>Settings</h4>
				{@render userFields()}
			</section>
		{/if}

		{#if promptChooser || promptEditor}
			<section class="space-y-3 border-b pb-4 {sectionBorder}">
				<h4 class={sectionTitle}>AI Prompt</h4>
				{#if promptChooser}
					{@render promptChooser()}
				{/if}
				{#if promptEditor}
					{@render promptEditor()}
				{/if}
			</section>
		{/if}

		<section class="space-y-3 border-b pb-4 {sectionBorder}">
			<h4 class={sectionTitle}>Data Sources</h4>

			{#if activeStream}
				<div class="flex items-center gap-2 rounded-md px-3 py-2 text-xs {badgeStream}">
					<svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
					</svg>
					AI stream: <strong>{activeStream.title}</strong>
				</div>
			{/if}

			<label class="block">
				<span class={labelClass}>Topic</span>
				<select class={fieldClass} value={selectedTopic} onchange={handleTopicChange}>
					{#each availableTopics as t}
						<option value={t.topic}>
							{t.topic}{t.isCurrent ? ' (current)' : ''}
						</option>
					{/each}
					{#if availableTopics.length === 0}
						<option value={currentTopic}>{currentTopic}</option>
					{/if}
				</select>
			</label>

			{#if selectedTopic === currentTopic}
				<div class="flex items-center gap-1.5 text-xs {labelClass}">
					<span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
					Currently subscribed
				</div>
			{/if}

			{#if compatibleStreams.length > 0}
				<div class="mt-2">
					<span class={labelClass}>AI Streams</span>
					<div class="mt-1 max-h-32 space-y-1 overflow-y-auto">
						{#each compatibleStreams as stream}
							<button
								type="button"
								class="w-full rounded-md px-3 py-1.5 text-left text-xs transition-colors {activeStream?.id === stream.id
									? badgeActive
									: darkMode
										? 'hover:bg-slate-700 text-slate-300'
										: 'hover:bg-slate-100 text-slate-600'}"
								onclick={() => selectStream(stream)}
							>
								<span class="font-medium">{stream.title}</span>
								<span class="ml-1 opacity-60">({stream.source})</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		{#if hasServices || externalData}
			<section class="space-y-3 pb-2">
				<h4 class={sectionTitle}>External Data</h4>

				{#if serviceStatuses.length > 0}
					<div class="flex flex-wrap gap-3">
						{#each serviceStatuses as svc}
							<div class="flex items-center gap-1.5 text-xs {labelClass}">
								<span class="inline-block h-2 w-2 rounded-full {statusDot(svc.available)}"></span>
								{svc.name}
							</div>
						{/each}
					</div>
				{/if}

				{#if externalData}
					<div class="flex items-center gap-3">
						{#if externalData.isLoading}
							<span class="text-xs {labelClass}">Loading...</span>
						{:else if externalData.error}
							<span class="text-xs text-amber-500">{externalData.error}</span>
						{:else}
							<span class="text-xs {labelClass}">Data loaded</span>
						{/if}
						{#if externalData.refresh}
							<button
								type="button"
								class="rounded-md px-2 py-1 text-xs {btnSecondary}"
								onclick={externalData.refresh}
							>
								Refresh
							</button>
						{/if}
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<div class="flex justify-end gap-2 border-t px-4 py-3 sm:px-6 {sectionBorder}">
		<button type="button" class={btnSecondary} onclick={onCancel}>Cancel</button>
		<button type="button" class={btnPrimary} onclick={handleApply}>Apply</button>
	</div>
</div>
