<script lang="ts">
	/**
	 * StreamPicker
	 *
	 * A compact list of Data Streams from the StreamCatalog.
	 * Optionally filters by schema compatibility with a given widget schemaId.
	 * Used inside the WidgetWrapper configure dialog, SendToDashboard modal, and
	 * the Store Inspector streams panel.
	 */
	import { streamCatalog, type DataStream } from '$lib/stores/streamCatalog.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { checkSchemaCompatibility } from '$lib/utils/schemaCompatibility';
	import StreamCreateModal from './StreamCreateModal.svelte';

	interface Props {
		darkMode?: boolean;
		/**
		 * If provided, each stream is annotated with a compatibility badge
		 * against this schema ID (the widget's expected schema).
		 */
		filterSchemaId?: string;
		/** Currently selected stream id */
		selectedStreamId?: string;
		/** Optionally highlight topics already selected */
		currentTopic?: string;
		onselect: (stream: DataStream) => void;
		/** Prefill values for the create modal (e.g. from a prompt run) */
		createPrefill?: {
			topic?: string;
			schemaId?: string;
			title?: string;
			promptId?: string;
			promptName?: string;
		};
	}

	let {
		darkMode = false,
		filterSchemaId,
		selectedStreamId,
		currentTopic,
		onselect,
		createPrefill
	}: Props = $props();

	let showCreateModal = $state(false);
	let filter = $state('');

	let streams = $derived(streamCatalog.streams);

	let filteredStreams = $derived.by(() => {
		const q = filter.toLowerCase();
		return q
			? streams.filter(
					(s) =>
						s.title.toLowerCase().includes(q) ||
						s.topic.toLowerCase().includes(q) ||
						s.schemaId.toLowerCase().includes(q)
				)
			: streams;
	});

	function getSchemaName(schemaId: string): string {
		const reg = validatedTopicStore.getSchemaById(schemaId);
		return reg?.name ?? schemaId;
	}

	type Compat = ReturnType<typeof checkSchemaCompatibility>;

	function getCompatibility(stream: DataStream): Compat | null {
		if (!filterSchemaId) return null;
		if (stream.schemaId === filterSchemaId) return { compatible: true };
		return checkSchemaCompatibility(filterSchemaId, stream.schemaId);
	}

	function handleCreated(stream: DataStream) {
		onselect(stream);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Search + New button -->
	<div class="flex items-center gap-2 pb-2">
		<input
			type="text"
			placeholder="Search streams…"
			bind:value={filter}
			class="flex-1 rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500
				{darkMode ? 'border-slate-600 bg-slate-700 text-slate-200 placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}"
		/>
		<button
			type="button"
			onclick={() => (showCreateModal = true)}
			class="flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors
				{darkMode
					? 'border-indigo-700 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/40'
					: 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}"
		>
			<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
			</svg>
			New stream
		</button>
	</div>

	<!-- List -->
	{#if filteredStreams.length === 0}
		<div class="flex flex-1 items-center justify-center py-6 text-center">
			<div>
				<svg class="mx-auto mb-2 h-8 w-8 {darkMode ? 'text-slate-600' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
				</svg>
				<p class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					{streams.length === 0 ? 'No streams yet. Create one to get started.' : 'No streams match your search.'}
				</p>
			</div>
		</div>
	{:else}
		<ul class="flex-1 space-y-1 overflow-y-auto">
			{#each filteredStreams as stream (stream.id)}
				{@const compat = getCompatibility(stream)}
				{@const isSelected = stream.id === selectedStreamId || stream.topic === currentTopic}
				{@const incompatible = compat !== null && !compat.compatible}
				<li>
					<button
						type="button"
						onclick={() => !incompatible && onselect(stream)}
						disabled={incompatible}
						class="w-full rounded-lg border px-3 py-2.5 text-left transition-colors
							{isSelected
								? (darkMode ? 'border-indigo-500 bg-indigo-900/20' : 'border-indigo-400 bg-indigo-50')
								: incompatible
									? (darkMode ? 'border-slate-700 bg-slate-800/20 opacity-50 cursor-not-allowed' : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed')
									: (darkMode ? 'border-slate-700 bg-slate-800/40 hover:border-indigo-500/60 hover:bg-indigo-900/10' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30')}"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium {darkMode ? 'text-slate-100' : 'text-slate-900'}">{stream.title}</p>
								<p class="mt-0.5 truncate font-mono text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">{stream.topic}</p>
								<p class="mt-0.5 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">{getSchemaName(stream.schemaId)}</p>
								{#if stream.promptName}
									<p class="mt-0.5 text-xs {darkMode ? 'text-indigo-400' : 'text-indigo-600'}">
										<svg class="inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
										</svg>
										{stream.promptName}
									</p>
								{/if}
							</div>
							<!-- Compatibility badge -->
							{#if compat !== null}
								{#if compat.compatible}
									<span class="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium {darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-700'}">
										Compatible
									</span>
								{:else}
									<div class="shrink-0 text-right" title={compat.reason}>
										<span class="rounded-full px-1.5 py-0.5 text-xs font-medium {darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600'}">
											Incompatible
										</span>
										{#if compat.missingKeys.length > 0}
											<p class="mt-0.5 text-xs {darkMode ? 'text-red-400/70' : 'text-red-500'}">
												Missing: {compat.missingKeys.join(', ')}
											</p>
										{/if}
									</div>
								{/if}
							{/if}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if showCreateModal}
	<StreamCreateModal
		{darkMode}
		prefill={createPrefill}
		onclose={() => (showCreateModal = false)}
		oncreated={handleCreated}
	/>
{/if}
