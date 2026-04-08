<script lang="ts">
	import type { Widget } from '$lib/dashboard/types/widget';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import {
		getWidgetStructuralHash,
		getTopicsByStructuralHash
	} from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { toOntologyInstDataTopic } from '$lib/services/realtime/store/ontologyClientHelpers';
	import { streamCatalog, type DataStream } from '$lib/stores/streamCatalog.svelte';
	import StreamPicker from '$lib/components/streams/StreamPicker.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('dashboard');

	interface Props {
		widget: Widget;
		open: boolean;
		currentTopic: string;
		schemaId: string | null;
	}

	let { widget, open = $bindable(), currentTopic, schemaId }: Props = $props();

	const darkMode = $derived(themeStore.darkMode);

	let configureTab = $state<'defaults' | 'ai-streams'>('defaults');
	let selectedTopic = $state<string>('');
	let previewData = $state<unknown>(null);

	$effect(() => {
		if (open) {
			selectedTopic = currentTopic;
			configureTab = 'defaults';
		}
	});

	const configureHeaderBar = $derived.by(() => {
		if (darkMode) return 'border-slate-700 bg-slate-800';
		if (themeStore.theme === 'warm') return 'border-[#ddd4c4] bg-[#ebe4d8]';
		return 'border-slate-200 bg-slate-50';
	});

	const configurePrimaryBtn = $derived.by(() => {
		if (darkMode) {
			return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-black/25';
		}
		if (themeStore.theme === 'warm') {
			return 'bg-[#5c4436] hover:bg-[#4a3629] text-[#faf7f2] shadow-md shadow-[#2d2010]/20';
		}
		return 'bg-slate-800 hover:bg-slate-700 text-white shadow-md shadow-slate-900/10';
	});

	const topicCountBadge = $derived.by(() => {
		if (darkMode) return 'bg-slate-700 text-slate-300';
		if (themeStore.theme === 'warm') return 'bg-[#dfe6d4] text-[#3d4a32]';
		return 'bg-slate-200 text-slate-700';
	});

	const configureFooterBar = $derived.by(() => {
		if (darkMode) return 'border-slate-700 bg-slate-800';
		if (themeStore.theme === 'warm') return 'border-[#e8dfd2] bg-[#f7f4ef]';
		return 'border-slate-200 bg-slate-50';
	});

	const configureColorSchemeClass = $derived(darkMode ? '[color-scheme:dark]' : '[color-scheme:light]');

	const availableTopics = $derived.by(() => {
		const _ = validatedTopicStore.tree;
		const hash = getWidgetStructuralHash(widget.type);
		const pid = dashboard.projectId;
		if (!hash || !pid) return [];
		return getTopicsByStructuralHash(pid, hash).map((item) => item.topic);
	});

	const activeStream = $derived(streamCatalog.getStreamByTopic(currentTopic));

	$effect(() => {
		if (!selectedTopic || !open) {
			previewData = null;
			return;
		}
		const _ = validatedTopicStore.tree;
		previewData = validatedTopicStore.at(selectedTopic);
	});

	function applyTopicChange() {
		const hash = getWidgetStructuralHash(widget.type);
		const pid = dashboard.projectId;
		const instId = widget.entityInstanceId;
		const ownTopic = (instId && hash && pid)
			? toOntologyInstDataTopic(pid, hash, instId)
			: `widgets/${widget.type}/${widget.id}`;
		const newTopicOverride = selectedTopic === ownTopic ? undefined : selectedTopic;
		dashboard.updateWidget(widget.id, { topicOverride: newTopicOverride });
		log.debug(`Changed topic for ${widget.id}: ${currentTopic} → ${selectedTopic}`);
		open = false;
	}

	function handleStreamSelect(stream: DataStream) {
		selectedTopic = stream.topic;
		applyTopicChange();
	}
</script>

{#if open}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="dialog-title"
		tabindex="-1"
		class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 z-10000"
		onclick={(e) => {
			if (e.target === e.currentTarget) open = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') open = false;
		}}
	>
		<div
			class="configure-widget-dialog w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden {configureColorSchemeClass} {darkMode
				? 'bg-slate-800 border-slate-700'
				: themeStore.theme === 'warm'
					? 'bg-[#faf8f4] border-[#e5dcc8]'
					: 'bg-white border-slate-200'}"
			data-configure-mode={darkMode ? 'dark' : themeStore.theme === 'warm' ? 'warm' : 'light'}
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b {configureHeaderBar}">
				<div class="flex items-center justify-between">
					<div>
						<h3 id="dialog-title" class="text-xl font-bold {darkMode ? 'text-white' : 'text-slate-900'}">Configure Widget</h3>
						<p class="mt-1 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
							{widget.type} • {schemaId || 'No schema'}
						</p>
					</div>
					<button
						onclick={() => (open = false)}
						class="rounded-lg p-2 {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'} transition-colors"
						aria-label="Close"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="p-6 max-h-[70vh] overflow-y-auto">
				<div class="space-y-6">
					<!-- Widget Title -->
					<div>
						<label
							for="widget-title-{widget.id}"
							class="mb-2 block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}"
						>
							Widget Title
						</label>
						<input
							id="widget-title-{widget.id}"
							type="text"
							value={widget.title || ''}
							oninput={(e) => dashboard.updateWidget(widget.id, { title: e.currentTarget.value })}
							class="w-full rounded-lg border {darkMode ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400' : 'border-slate-300 bg-white text-slate-900'} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							placeholder="Enter widget title..."
						/>
					</div>

					<!-- Description -->
					<div>
						<label
							for="widget-description-{widget.id}"
							class="mb-2 block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}"
						>
							Description
						</label>
						<textarea
							id="widget-description-{widget.id}"
							value={widget.description || ''}
							oninput={(e) =>
								dashboard.updateWidget(widget.id, { description: e.currentTarget.value })}
							class="w-full rounded-lg border {darkMode ? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400' : 'border-slate-300 bg-white text-slate-900'} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
							rows="2"
							placeholder="Enter widget description..."
						></textarea>
					</div>

					<!-- Data Source — tab switcher -->
					<div>
						<p class="mb-2 text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">Data Source</p>

						<!-- Active stream badge -->
						{#if activeStream}
							<div class="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs {darkMode ? 'bg-indigo-900/20 border border-indigo-700/40 text-indigo-300' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}">
								<svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
								</svg>
								Connected to AI stream: <strong>{activeStream.title}</strong>
							</div>
						{/if}

						<!-- Tabs -->
						<div class="mb-3 flex gap-1 rounded-lg p-0.5 {darkMode ? 'bg-slate-700' : 'bg-slate-100'}">
							<button
								type="button"
								onclick={() => configureTab = 'defaults'}
								class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
									{configureTab === 'defaults'
										? (darkMode ? 'bg-slate-600 text-white shadow' : 'bg-white text-slate-900 shadow')
										: (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}"
							>Default topics</button>
							<button
								type="button"
								onclick={() => configureTab = 'ai-streams'}
								class="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
									{configureTab === 'ai-streams'
										? (darkMode ? 'bg-slate-600 text-white shadow' : 'bg-white text-slate-900 shadow')
										: (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}"
							>
								AI Streams
								{#if streamCatalog.streams.length > 0}
									<span class="ml-1 rounded-full px-1.5 py-0.5 text-xs
										{configureTab === 'ai-streams'
											? (darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
											: (darkMode ? 'bg-slate-500 text-slate-300' : 'bg-slate-200 text-slate-600')}"
									>{streamCatalog.streams.length}</span>
								{/if}
							</button>
						</div>

						<!-- Default topics tab -->
						{#if configureTab === 'defaults'}
							<div class="mb-3 flex items-center justify-between">
								<label
									for="widget-topic-select-{widget.id}"
									class="block text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}"
								>
									Widget-type topics
								</label>
								<span class="text-xs px-2 py-1 rounded-full {topicCountBadge}">
									{availableTopics.length} available
								</span>
							</div>
							
							<select
								id="widget-topic-select-{widget.id}"
								bind:value={selectedTopic}
								class="w-full rounded-lg border {darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-900'} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
							>
								<option value={currentTopic}>{currentTopic} (current)</option>
								{#each availableTopics as topic}
									{#if topic !== currentTopic}
										<option value={topic}>{topic}</option>
									{/if}
								{/each}
							</select>
							
							{#if selectedTopic}
								<div class="mt-2 flex items-center gap-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									{#if selectedTopic === currentTopic}
										<span class="flex items-center gap-1">
											<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
											</svg>
											Currently subscribed
										</span>
									{:else}
										<span class="flex items-center gap-1">
											<svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
											</svg>
											Will change on apply
										</span>
									{/if}
								</div>
							{/if}
						{/if}

						<!-- AI Streams tab -->
						{#if configureTab === 'ai-streams'}
							<div class="max-h-52 overflow-y-auto">
								<StreamPicker
									{darkMode}
									filterSchemaId={schemaId ?? undefined}
									selectedStreamId={activeStream?.id}
									currentTopic={currentTopic}
									onselect={handleStreamSelect}
								/>
							</div>
						{/if}
					</div>

					<!-- Data Preview -->
					{#if selectedTopic}
						<div>
							<div class="mb-2 flex items-center justify-between">
								<span class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">
									Data Preview
								</span>
								{#if previewData == null}
									<span class="text-xs px-2 py-1 rounded-full {darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}">
										No data yet
									</span>
								{/if}
							</div>
							<div class="rounded-lg border {darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'} p-4 max-h-64 overflow-auto">
								{#if previewData == null}
									<div class="text-center py-8">
										<svg class="w-12 h-12 mx-auto mb-2 {darkMode ? 'text-slate-600' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
										</svg>
										<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No data available on this topic</p>
									</div>
								{:else}
									<pre class="text-xs font-mono {darkMode ? 'text-slate-300' : 'text-slate-700'} whitespace-pre-wrap wrap-break-word">{JSON.stringify(previewData, null, 2)}</pre>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t {configureFooterBar} flex justify-end gap-3">
				<button
					onclick={() => (open = false)}
					class="px-5 py-2.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'} rounded-lg transition-colors"
				>
					Cancel
				</button>
				{#if selectedTopic !== currentTopic}
					<button
						onclick={applyTopicChange}
						class="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors {configurePrimaryBtn}"
					>
						Apply Changes
					</button>
				{:else}
					<button
						onclick={() => (open = false)}
						class="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors {configurePrimaryBtn}"
					>
						Done
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.configure-widget-dialog[data-configure-mode='light'] :global(select option) {
		background-color: #ffffff;
		color: #0f172a;
	}
	.configure-widget-dialog[data-configure-mode='warm'] :global(select option) {
		background-color: #faf8f4;
		color: #1c1917;
	}
	.configure-widget-dialog[data-configure-mode='dark'] :global(select option) {
		background-color: #1e293b;
		color: #f1f5f9;
	}
</style>
