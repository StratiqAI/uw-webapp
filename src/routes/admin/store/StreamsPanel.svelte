<script lang="ts">
	/**
	 * StreamsPanel
	 *
	 * Full producer → consumer graph view of all registered Data Streams.
	 * Displayed in the "Streams" tab of the Knowledge Map.
	 */
	import { streamCatalog, type DataStream } from '$lib/stores/streamCatalog.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import StreamCreateModal from '$lib/components/streams/StreamCreateModal.svelte';

	interface Props {
		darkMode: boolean;
	}

	let { darkMode }: Props = $props();

	let editingStream = $state<DataStream | null>(null);
	let showCreateModal = $state(false);
	let publishTestTopic = $state<string | null>(null);
	let publishTestValue = $state('{}');
	let publishTestError = $state<string | null>(null);
	let publishTestOk = $state(false);

	let streams = $derived(streamCatalog.streams);

	function getSchemaName(schemaId: string): string {
		const reg = validatedTopicStore.getSchemaById(schemaId);
		return reg?.name ?? schemaId;
	}

	function getConsumers(stream: DataStream): Array<{ id: string; title: string; type: string }> {
		return dashboard.widgets
			.filter((w) => w.topicOverride === stream.topic)
			.map((w) => ({ id: w.id, title: w.title || w.id, type: w.type }));
	}

	function handleEdit(stream: DataStream) {
		editingStream = stream;
	}

	function handleDelete(stream: DataStream) {
		if (confirm(`Delete stream "${stream.title}"? This does not affect existing widget subscriptions.`)) {
			streamCatalog.removeStream(stream.id);
		}
	}

	function openPublishTest(stream: DataStream) {
		publishTestTopic = stream.topic;
		publishTestValue = '{}';
		publishTestError = null;
		publishTestOk = false;
	}

	function doPublishTest() {
		if (!publishTestTopic) return;
		publishTestError = null;
		publishTestOk = false;
		try {
			const value = JSON.parse(publishTestValue);
			const ok = validatedTopicStore.publish(publishTestTopic, value);
			if (ok) {
				publishTestOk = true;
			} else {
				const errs = validatedTopicStore.errors.get(publishTestTopic);
				publishTestError = errs
					? (Array.isArray(errs) ? errs.map((e: { message?: string }) => e.message).join(', ') : String(errs))
					: 'Validation failed';
			}
		} catch {
			publishTestError = 'Invalid JSON';
		}
	}

	// Colors
	const rowClass = $derived(
		darkMode
			? 'border-slate-700 bg-slate-800/30 hover:bg-slate-700/40'
			: 'border-slate-200 bg-white hover:bg-slate-50'
	);
	const badgeClass = $derived(
		darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
	);
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Toolbar -->
	<div class="flex items-center justify-between px-4 py-2.5 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<p class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			{streams.length} stream{streams.length !== 1 ? 's' : ''}
		</p>
		<button
			type="button"
			onclick={() => (showCreateModal = true)}
			class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
				{darkMode ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
		>
			<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
			</svg>
			New stream
		</button>
	</div>

	<!-- Table -->
	{#if streams.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
			<svg class="h-12 w-12 {darkMode ? 'text-slate-600' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
			</svg>
			<p class="text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">No data streams yet</p>
			<p class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
				Create a stream to bind a Prompt output topic to a schema,<br>
				then connect widgets to display the data.
			</p>
			<button
				type="button"
				onclick={() => (showCreateModal = true)}
				class="mt-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
					{darkMode ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
			>
				Create first stream
			</button>
		</div>
	{:else}
		<div class="flex-1 overflow-y-auto">
			<table class="w-full text-xs">
				<thead>
					<tr class="sticky top-0 {darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}">
						<th class="border-b px-4 py-2 text-left font-semibold uppercase tracking-wider {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							Stream
						</th>
						<th class="border-b px-4 py-2 text-left font-semibold uppercase tracking-wider {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							Schema
						</th>
						<th class="border-b px-4 py-2 text-left font-semibold uppercase tracking-wider {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							Producers → Consumers
						</th>
						<th class="border-b px-4 py-2 text-right font-semibold uppercase tracking-wider {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{#each streams as stream (stream.id)}
						{@const consumers = getConsumers(stream)}
						<tr class="border-b transition-colors {rowClass}">
							<!-- Stream title + topic -->
							<td class="px-4 py-3">
								<p class="font-semibold {darkMode ? 'text-slate-100' : 'text-slate-900'}">{stream.title}</p>
								<p class="mt-0.5 font-mono {darkMode ? 'text-slate-400' : 'text-slate-500'}">{stream.topic}</p>
								{#if stream.source !== 'manual'}
									<span class="mt-0.5 inline-block rounded px-1 py-0.5 text-xs font-medium
										{stream.source === 'prompt'
											? (darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600')
											: (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')}"
									>{stream.source}</span>
								{/if}
							</td>

							<!-- Schema -->
							<td class="px-4 py-3">
								<p class="font-medium {darkMode ? 'text-amber-400' : 'text-amber-700'}">{getSchemaName(stream.schemaId)}</p>
								<p class="mt-0.5 font-mono text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">{stream.schemaId}</p>
							</td>

							<!-- Producers → Consumers -->
							<td class="px-4 py-3">
								<div class="flex flex-wrap items-center gap-2">
									<!-- Producer: prompt or manual -->
									{#if stream.promptName || stream.promptId}
										<span class="flex items-center gap-1 rounded-full px-2 py-0.5 {darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}">
											<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
											</svg>
											{stream.promptName ?? stream.promptId?.slice(0, 8) + '…'}
										</span>
									{:else}
										<span class="rounded-full px-2 py-0.5 text-xs {badgeClass}">manual</span>
									{/if}

									{#if consumers.length > 0}
										<svg class="h-3.5 w-3.5 {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
										</svg>
										{#each consumers as widget}
											<span class="rounded-full px-2 py-0.5 text-xs {darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}">
												{widget.title} ({widget.type})
											</span>
										{/each}
									{:else}
										<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">No widgets yet</span>
									{/if}
								</div>
							</td>

							<!-- Actions -->
							<td class="px-4 py-3">
								<div class="flex items-center justify-end gap-1">
									<button
										type="button"
										onclick={() => openPublishTest(stream)}
										title="Publish test value"
										class="rounded p-1.5 text-xs transition-colors {darkMode ? 'text-slate-400 hover:text-indigo-300 hover:bg-slate-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}"
									>
										<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
										</svg>
									</button>
									<button
										type="button"
										onclick={() => handleEdit(stream)}
										title="Edit stream"
										class="rounded p-1.5 text-xs transition-colors {darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}"
									>
										<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
										</svg>
									</button>
									<button
										type="button"
										onclick={() => handleDelete(stream)}
										title="Delete stream"
										class="rounded p-1.5 text-xs transition-colors {darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}"
									>
										<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Edit modal -->
{#if editingStream}
	<StreamCreateModal
		{darkMode}
		editStream={editingStream}
		onclose={() => (editingStream = null)}
		onupdated={() => (editingStream = null)}
	/>
{/if}

<!-- Create modal -->
{#if showCreateModal}
	<StreamCreateModal
		{darkMode}
		onclose={() => (showCreateModal = false)}
		oncreated={() => (showCreateModal = false)}
	/>
{/if}

<!-- Publish test drawer -->
{#if publishTestTopic}
	<div
		class="fixed inset-0 z-[10050] flex items-end justify-center bg-black/30"
		role="dialog"
		aria-modal="true"
		aria-label="Publish test value"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) publishTestTopic = null; }}
		onkeydown={(e) => { if (e.key === 'Escape') publishTestTopic = null; }}
	>
		<div class="w-full max-w-lg rounded-t-xl border shadow-xl p-5 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
			<p class="mb-2 text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
				Publish test value to <code class="font-mono text-xs">{publishTestTopic}</code>
			</p>
			<textarea
				bind:value={publishTestValue}
				rows="5"
				class="w-full rounded-lg border font-mono text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none
					{darkMode ? 'border-slate-600 bg-slate-900 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-900'}"
				placeholder='&#123; "value": 42 &#125;'
			></textarea>
			{#if publishTestError}
				<p class="mt-1 text-xs text-red-500">{publishTestError}</p>
			{/if}
			{#if publishTestOk}
				<p class="mt-1 text-xs text-green-500">Published successfully!</p>
			{/if}
			<div class="mt-3 flex justify-end gap-2">
				<button
					type="button"
					onclick={() => publishTestTopic = null}
					class="px-3 py-1.5 text-xs font-medium rounded-lg {darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}"
				>
					Close
				</button>
				<button
					type="button"
					onclick={doPublishTest}
					class="px-3 py-1.5 text-xs font-medium rounded-lg {darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
				>
					Publish
				</button>
			</div>
		</div>
	</div>
{/if}
