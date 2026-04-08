<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { DashboardAppTheme, StreamEntry, WidgetPromptEditData } from './types.js';
	import { getDashboardWidgetHost } from './context.svelte.js';
	import { peekConfigureTab, consumeConfigureTab } from './configureTabSignal.svelte.js';
	import PromptEditor from './PromptEditor.svelte';

	interface Props {
		kind: string;
		widgetId: string;
		darkMode?: boolean;
		theme?: DashboardAppTheme;
		topicOverride?: string;
		schemaId?: string;
		showAITab?: boolean;
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
		showAITab = false,
		externalData,
		onApply,
		onCancel,
		userFields,
		promptChooser,
		promptEditor
	}: Props = $props();

	const host = getDashboardWidgetHost();

	const hasAI = $derived(showAITab && !!host.loadWidgetPrompt);
	let activeTab = $state<'settings' | 'ai'>('settings');

	$effect(() => {
		const pending = peekConfigureTab(widgetId);
		if (pending === 'ai' && hasAI) {
			consumeConfigureTab(widgetId);
			activeTab = 'ai';
		}
	});

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

	function selectTopic(topic: string) {
		selectedTopic = topic;
	}

	function shortTopicId(topic: string): string {
		const parts = topic.split('/');
		return parts[parts.length - 1] ?? topic;
	}

	function formatPreviewEntries(data: Record<string, unknown>): Array<{ key: string; value: string }> {
		const entries: Array<{ key: string; value: string }> = [];
		for (const [key, val] of Object.entries(data)) {
			if (val == null) continue;
			let display: string;
			if (typeof val === 'string') {
				display = val.length > 40 ? val.slice(0, 37) + '...' : val;
			} else if (typeof val === 'number') {
				display = String(val);
			} else if (typeof val === 'boolean') {
				display = val ? 'Yes' : 'No';
			} else if (Array.isArray(val)) {
				display = `[${val.length} items]`;
			} else if (typeof val === 'object') {
				display = '{...}';
			} else {
				display = String(val);
			}
			entries.push({ key, value: display });
		}
		return entries;
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
		host.setWidgetFullscreen?.(widgetId, false);
		onApply();
	}

	function handleCancel() {
		host.setWidgetFullscreen?.(widgetId, false);
		onCancel();
	}

	// --- AI tab state ---
	let aiLoading = $state(false);
	let aiError = $state('');
	let aiRunning = $state(false);
	let aiPromptLoaded = $state(false);
	let aiPromptId = $state<string | undefined>(undefined);

	let pePromptName = $state('');
	let pePromptDescription = $state('');
	let peUserPrompt = $state('');
	let peSystemInstruction = $state('');
	let peModel = $state('');
	let peResponseFormatType = $state<'text' | 'json_object' | 'json_schema'>('json_schema');
	let peSchemaProperties = $state<Record<string, Record<string, unknown>>>({});
	let peSchemaRequired = $state<string[]>([]);
	let peFieldOrder = $state<string[]>([]);
	let peTemperature = $state<number | undefined>(undefined);
	let peMaxTokens = $state<number | undefined>(undefined);
	let peTopP = $state<number | undefined>(undefined);
	let peFrequencyPenalty = $state<number | undefined>(undefined);
	let peStopSequences = $state('');

	// #region agent log
	let _dbgEffectRunCount = 0;
	// #endregion

	$effect(() => {
		// #region agent log
		const _cnt = ++_dbgEffectRunCount;
		console.error('[DBG-474345] AI-effect fired', { runCount: _cnt, activeTab, aiPromptLoaded, aiLoading, aiError });
		// #endregion
		if (activeTab === 'ai' && !aiPromptLoaded && !aiLoading && !aiError) {
			loadPrompt();
		}
	});

	async function loadPrompt() {
		if (!host.loadWidgetPrompt) return;
		// #region agent log
		console.error('[DBG-474345] loadPrompt called', { aiLoading, aiPromptLoaded, activeTab });
		// #endregion
		aiLoading = true;
		aiError = '';
		try {
			const data = await host.loadWidgetPrompt(kind, widgetId);
			// #region agent log
			console.error('[DBG-474345] loadWidgetPrompt resolved', { hasData: !!data, promptId: data?.promptId });
			// #endregion
			if (data) {
				aiPromptId = data.promptId;
				pePromptName = data.name;
				pePromptDescription = data.description;
				peUserPrompt = data.userPrompt;
				peSystemInstruction = data.systemInstruction;
				peModel = data.model;
				peResponseFormatType = data.responseFormatType;
				peSchemaProperties = data.schemaProperties;
				peSchemaRequired = data.schemaRequired;
				peFieldOrder = data.fieldOrder;
				peTemperature = data.temperature;
				peMaxTokens = data.maxTokens;
				peTopP = data.topP;
				peFrequencyPenalty = data.frequencyPenalty;
				peStopSequences = data.stopSequences;
			}
			aiPromptLoaded = true;
		} catch (e) {
			aiError = e instanceof Error ? e.message : 'Failed to load prompt';
			// #region agent log
			console.error('[DBG-474345] loadPrompt ERROR — this would have caused an infinite loop before the fix', { error: String(e), aiError });
			// #endregion
		} finally {
			aiLoading = false;
			// #region agent log
			console.error('[DBG-474345] loadPrompt finally', { aiLoading: false, aiPromptLoaded });
			// #endregion
		}
	}

	function gatherPromptData(): WidgetPromptEditData {
		return {
			promptId: aiPromptId,
			name: pePromptName,
			description: pePromptDescription,
			userPrompt: peUserPrompt,
			systemInstruction: peSystemInstruction,
			model: peModel,
			responseFormatType: peResponseFormatType,
			schemaProperties: peSchemaProperties,
			schemaRequired: peSchemaRequired,
			fieldOrder: peFieldOrder,
			temperature: peTemperature,
			maxTokens: peMaxTokens,
			topP: peTopP,
			frequencyPenalty: peFrequencyPenalty,
			stopSequences: peStopSequences
		};
	}

	async function handleGenerate() {
		if (!host.saveAndRunWidgetPrompt) return;
		aiRunning = true;
		aiError = '';
		try {
			await host.saveAndRunWidgetPrompt(kind, widgetId, gatherPromptData());
		} catch (e) {
			aiError = e instanceof Error ? e.message : 'AI generation failed';
		} finally {
			aiRunning = false;
		}
	}
</script>

<div class="flex h-full flex-col overflow-auto {panelBg}">
	<div class="flex-1 space-y-4 px-4 py-4 sm:px-6">
		<header class="mb-2">
			<h3 class="text-lg font-bold">Configure</h3>
			<p class={labelClass}>{kind} &bull; {widgetId}</p>
		</header>

		{#if hasAI}
			<nav class="flex border-b {sectionBorder}">
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium transition-colors -mb-px
						{activeTab === 'settings'
							? (darkMode ? 'border-b-2 border-indigo-400 text-indigo-400' : 'border-b-2 border-indigo-600 text-indigo-600')
							: (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}"
					onclick={() => { activeTab = 'settings'; }}
				>Settings</button>
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium transition-colors -mb-px
						{activeTab === 'ai'
							? (darkMode ? 'border-b-2 border-indigo-400 text-indigo-400' : 'border-b-2 border-indigo-600 text-indigo-600')
							: (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}"
					onclick={() => { activeTab = 'ai'; }}
				>AI</button>
			</nav>
		{/if}

		{#if activeTab === 'settings'}
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

				<span class={labelClass}>Topic</span>
				<div class="mt-1 max-h-52 space-y-1.5 overflow-y-auto">
					{#each availableTopics as t (t.topic)}
						{@const isSelected = selectedTopic === t.topic}
						{@const preview = t.data ? formatPreviewEntries(t.data) : []}
						<button
							type="button"
							class="w-full rounded-md border px-3 py-2 text-left text-xs transition-colors
								{isSelected
									? (darkMode ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50' : 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400/50')
									: (darkMode ? 'border-slate-700 bg-slate-800 hover:border-slate-500' : 'border-slate-200 bg-white hover:border-slate-400')}"
							onclick={() => selectTopic(t.topic)}
						>
							<div class="flex items-center gap-2">
								<span class="font-mono font-medium truncate {darkMode ? 'text-slate-200' : 'text-slate-800'}">
									{shortTopicId(t.topic)}
								</span>
								{#if t.isCurrent}
									<span class="shrink-0 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium {darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}">
										<span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
										current
									</span>
								{/if}
							</div>
							{#if preview.length > 0}
								<div class="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
									{#each preview as entry (entry.key)}
										<span class="truncate {darkMode ? 'text-slate-500' : 'text-slate-400'}">{entry.key}</span>
										<span class="truncate {darkMode ? 'text-slate-300' : 'text-slate-600'}">{entry.value}</span>
									{/each}
								</div>
							{:else}
								<p class="mt-1 italic {darkMode ? 'text-slate-600' : 'text-slate-400'}">No data yet</p>
							{/if}
						</button>
					{/each}
					{#if availableTopics.length === 0}
						<div class="rounded-md border px-3 py-2 text-xs {darkMode ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}">
							<span class="font-mono">{currentTopic}</span>
							<div class="mt-1 flex items-center gap-1.5">
								<span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
								Currently subscribed
							</div>
						</div>
					{/if}
				</div>

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
		{:else if activeTab === 'ai'}
			{#if aiLoading}
				<div class="flex items-center justify-center py-12">
					<svg class="h-5 w-5 animate-spin {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
					<span class="ml-2 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading prompt...</span>
				</div>
			{:else if aiError && !aiPromptLoaded}
				<div class="rounded-lg border px-4 py-3 text-sm {darkMode ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-red-200 bg-red-50 text-red-600'}">
					{aiError}
				</div>
			{:else}
				<PromptEditor
					{darkMode}
					bind:promptName={pePromptName}
					bind:promptDescription={pePromptDescription}
					bind:userPrompt={peUserPrompt}
					bind:systemInstruction={peSystemInstruction}
					bind:model={peModel}
					bind:responseFormatType={peResponseFormatType}
					bind:schemaProperties={peSchemaProperties}
					bind:schemaRequired={peSchemaRequired}
					bind:fieldOrder={peFieldOrder}
					bind:temperature={peTemperature}
					bind:maxTokens={peMaxTokens}
					bind:topP={peTopP}
					bind:frequencyPenalty={peFrequencyPenalty}
					bind:stopSequences={peStopSequences}
					isGenerating={aiRunning}
					generateError={aiError}
					onGenerate={handleGenerate}
				/>
			{/if}
		{/if}
	</div>

	<div class="flex justify-end gap-2 border-t px-4 py-3 sm:px-6 {sectionBorder}">
		<button type="button" class={btnSecondary} onclick={handleCancel}>Cancel</button>
		<button type="button" class={btnPrimary} onclick={handleApply}>Apply</button>
	</div>
</div>
