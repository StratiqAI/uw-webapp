<script lang="ts">
	/**
	 * SendToDashboardModal
	 *
	 * Three-step modal for sending a prompt result to the dashboard:
	 * 1. Choose or create a Data Stream (topic + schema binding).
	 * 2. Review/assign widgets that already subscribe to this stream or create new ones.
	 * 3. Publish the result.
	 */
	import type { Prompt } from '@stratiqai/types-simple';
	import { streamCatalog, type DataStream } from '$lib/stores/streamCatalog.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import StreamPicker from '$lib/components/streams/StreamPicker.svelte';
	import StreamCreateModal from '$lib/components/streams/StreamCreateModal.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { DEFAULT_WIDGET_DATA } from '$lib/dashboard/setup/defaultDashboardValues';
	import { checkSchemaCompatibility } from '$lib/utils/schemaCompatibility';
	import type { WidgetType } from '$lib/dashboard/types/widget';

	interface Props {
		darkMode?: boolean;
		prompt: Prompt | null;
		/** The structured output from the AI query */
		result: unknown;
		onclose: () => void;
		onpublished?: (stream: DataStream) => void;
	}

	let { darkMode = false, prompt, result, onclose, onpublished }: Props = $props();

	type Step = 1 | 2 | 3;
	let step = $state<Step>(1);

	let selectedStream = $state<DataStream | null>(null);
	let showCreateStream = $state(false);
	let publishError = $state<string | null>(null);
	let published = $state(false);

	// Auto-detect existing stream for this prompt
	$effect(() => {
		if (prompt?.id) {
			const existing = streamCatalog.getStreamByPromptId(prompt.id);
			if (existing) {
				selectedStream = existing;
			}
		}
	});

	const createPrefill = $derived.by(() => {
		if (!prompt) return {};

		const promptJsonSchemaId = (prompt as { jsonSchemaId?: string }).jsonSchemaId;
		let schemaId = '';

		if (promptJsonSchemaId) {
			const allDefs = validatedTopicStore.getAllSchemaDefinitions();
			const match = allDefs.find((d) => d.id === promptJsonSchemaId);
			schemaId = match ? match.id : promptJsonSchemaId;
		}

		return {
			topic: `ai/doc-analysis/${prompt.id.slice(0, 8)}`,
			title: prompt.name ?? 'New Stream',
			promptId: prompt.id,
			promptName: prompt.name ?? undefined,
			schemaId
		};
	});

	// Widgets currently assigned to the selected stream's topic
	const assignedWidgets = $derived.by(() => {
		if (!selectedStream) return [];
		return dashboard.widgets.filter(
			(w) =>
				w.topicOverride === selectedStream!.topic ||
				(!w.topicOverride && false) // only override-matched for AI streams
		);
	});

	// Compatible widget types for creating a new widget
	const compatibleWidgetTypes = $derived.by(() => {
		if (!selectedStream) return [] as WidgetType[];
		const types: WidgetType[] = [
			'metric', 'table', 'lineChart', 'barChart', 'donutChart',
			'areaChart', 'gauge', 'sparkline', 'heatmap', 'paragraph',
			'title', 'divergingBarChart'
		];
		return types.filter((t) => {
			const widgetSchemaId = `widget:${t}-v1`;
			const compat = checkSchemaCompatibility(widgetSchemaId, selectedStream!.schemaId);
			return compat.compatible;
		});
	});

	function selectStream(stream: DataStream) {
		selectedStream = stream;
	}

	function handleCreated(stream: DataStream) {
		selectedStream = stream;
		showCreateStream = false;
	}

	function goToStep2() {
		if (!selectedStream) return;
		step = 2;
	}

	function addWidget(widgetType: WidgetType) {
		if (!selectedStream) return;
		const defaultData = DEFAULT_WIDGET_DATA[widgetType] ?? {};
		dashboard.addWidget({
			id: `widget-${Date.now()}`,
			type: widgetType,
			topicOverride: selectedStream.topic,
			gridColumn: 1,
			gridRow: 1,
			colSpan: 3,
			rowSpan: 2,
			data: defaultData
		} as any);
	}

	function handlePublish() {
		if (!selectedStream || result === undefined || result === null) return;
		publishError = null;

		const ok = validatedTopicStore.publish(selectedStream.topic, result);
		if (!ok) {
			const errors = validatedTopicStore.errors.get(selectedStream.topic);
			const msg = errors
				? (Array.isArray(errors) ? errors.map((e: { message?: string }) => e.message).join(', ') : String(errors))
				: 'Validation failed — the result does not match the stream schema.';
			publishError = msg;
			return;
		}

		published = true;
		onpublished?.(selectedStream);
		step = 3;
	}

	// Styles
	const cardClass = $derived(darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200');
	const headingClass = $derived(darkMode ? 'text-white' : 'text-slate-900');
	const subTextClass = $derived(darkMode ? 'text-slate-400' : 'text-slate-500');
	const btnPrimary = $derived(
		darkMode
			? 'bg-indigo-600 hover:bg-indigo-500 text-white'
			: 'bg-indigo-600 hover:bg-indigo-700 text-white'
	);
	const btnSecondary = $derived(
		darkMode
			? 'text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-600'
			: 'text-slate-700 hover:bg-slate-100 border border-slate-300'
	);
</script>

<!-- Backdrop -->
<div
	role="dialog"
	aria-modal="true"
	aria-labelledby="std-modal-title"
	tabindex="-1"
	class="fixed inset-0 z-[10200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
	onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}
>
	<div
		class="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden {cardClass}"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-5 py-4 border-b {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
			<div>
				<h2 id="std-modal-title" class="text-base font-bold {headingClass}">Send to Dashboard</h2>
				{#if prompt}
					<p class="mt-0.5 text-xs {subTextClass}">Prompt: {prompt.name}</p>
				{/if}
			</div>
			<!-- Step indicators -->
			<div class="flex items-center gap-2 mr-4">
				{#each [1, 2, 3] as s}
					<div class="flex items-center gap-1">
						<div class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold
							{s === step
								? (darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white')
								: s < step
									? (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white')
									: (darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-500')}"
						>{s < step ? '✓' : s}</div>
					</div>
					{#if s < 3}
						<div class="h-px w-4 {darkMode ? 'bg-slate-600' : 'bg-slate-300'}"></div>
					{/if}
				{/each}
			</div>
			<button
				type="button"
				onclick={onclose}
				class="rounded-lg p-1.5 transition-colors {darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}"
				aria-label="Close"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>

		<!-- Body -->
		<div class="p-5 max-h-[60vh] overflow-y-auto">

			<!-- Step 1: Choose stream -->
			{#if step === 1}
				<p class="mb-3 text-sm font-semibold {headingClass}">Step 1 — Choose a Data Stream</p>
				<p class="mb-4 text-xs {subTextClass}">
					A stream is a named topic that connects this prompt's output to dashboard widgets.
					{#if selectedStream}
						<strong class="{darkMode ? 'text-indigo-300' : 'text-indigo-600'}">{selectedStream.title}</strong> is pre-selected because it's already bound to this prompt.
					{/if}
				</p>
				<div class="min-h-[180px]">
					<StreamPicker
						{darkMode}
						selectedStreamId={selectedStream?.id}
						createPrefill={createPrefill}
						onselect={selectStream}
					/>
				</div>
			{/if}

			<!-- Step 2: Widget assignment -->
			{#if step === 2 && selectedStream}
				<p class="mb-3 text-sm font-semibold {headingClass}">Step 2 — Widget assignment</p>
				<div class="mb-3 rounded-lg px-3 py-2 text-xs {darkMode ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-100 text-slate-600'}">
					Stream: <strong>{selectedStream.title}</strong> · topic <code class="font-mono">{selectedStream.topic}</code>
				</div>

				<!-- Existing widgets -->
				{#if assignedWidgets.length > 0}
					<div class="mb-4">
						<p class="mb-2 text-xs font-semibold uppercase tracking-wide {subTextClass}">Widgets already subscribed</p>
						<ul class="space-y-1">
							{#each assignedWidgets as w}
								<li class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs {darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-50 text-slate-600'}">
									<svg class="h-3.5 w-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
									</svg>
									<span>{w.title || w.id}</span>
									<span class="opacity-60">({w.type})</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Add widget -->
				<div>
					<p class="mb-2 text-xs font-semibold uppercase tracking-wide {subTextClass}">
						Add a widget to the dashboard
					</p>
					{#if compatibleWidgetTypes.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each compatibleWidgetTypes as t}
								<button
									type="button"
									onclick={() => addWidget(t)}
									class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors
										{darkMode ? 'border-slate-600 bg-slate-700 text-slate-200 hover:border-indigo-500 hover:bg-indigo-900/20 hover:text-indigo-300' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'}"
								>
									+ {t}
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-xs {subTextClass}">
							No built-in widget types match this stream's schema exactly. You can still publish and connect manually via the widget "Configure" menu.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Step 3: Published confirmation -->
			{#if step === 3}
				<div class="flex flex-col items-center py-6 text-center">
					<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full {darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}">
						<svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
						</svg>
					</div>
					<p class="text-base font-bold {headingClass}">Published!</p>
					{#if selectedStream}
						<p class="mt-1 text-sm {subTextClass}">
							Result sent to <strong>{selectedStream.title}</strong>
							(<code class="font-mono text-xs">{selectedStream.topic}</code>).
							All subscribed widgets updated.
						</p>
					{/if}
					<p class="mt-3 text-xs {subTextClass}">Switch to the Dashboard tab to see the changes.</p>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex justify-between gap-3 px-5 py-4 border-t {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
			{#if step === 1}
				<button type="button" onclick={onclose} class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {btnSecondary}">
					Cancel
				</button>
				<button
					type="button"
					onclick={goToStep2}
					disabled={!selectedStream}
					class="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed {btnPrimary}"
				>
					Next — Assign widgets
				</button>
			{:else if step === 2}
				<button type="button" onclick={() => step = 1} class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {btnSecondary}">
					Back
				</button>
				<div class="flex gap-2">
					{#if publishError}
						<p class="self-center text-xs text-red-500">{publishError}</p>
					{/if}
					<button
						type="button"
						onclick={handlePublish}
						disabled={!selectedStream}
						class="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed {btnPrimary}"
					>
						Publish to Dashboard
					</button>
				</div>
			{:else}
				<div></div>
				<button type="button" onclick={onclose} class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {btnPrimary}">
					Done
				</button>
			{/if}
		</div>
	</div>
</div>

{#if showCreateStream}
	<StreamCreateModal
		{darkMode}
		prefill={createPrefill}
		onclose={() => showCreateStream = false}
		oncreated={handleCreated}
	/>
{/if}
