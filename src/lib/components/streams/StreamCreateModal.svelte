<script lang="ts">
	import { streamCatalog, type DataStream } from '$lib/stores/streamCatalog.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';

	interface Props {
		darkMode?: boolean;
		/** Pre-fill values when creating from a prompt run */
		prefill?: {
			topic?: string;
			schemaId?: string;
			title?: string;
			promptId?: string;
			promptName?: string;
		};
		/** If set, we're editing an existing stream */
		editStream?: DataStream;
		onclose: () => void;
		oncreated?: (stream: DataStream) => void;
		onupdated?: (stream: DataStream) => void;
	}

	let {
		darkMode = false,
		prefill,
		editStream,
		onclose,
		oncreated,
		onupdated
	}: Props = $props();

	const isEditing = $derived(!!editStream);

	// Form state (sync when opening for create vs edit or when prefill changes)
	let title = $state('');
	let topic = $state('');
	let schemaId = $state('');
	let description = $state('');
	let promptId = $state('');
	let promptName = $state('');

	$effect(() => {
		title = editStream?.title ?? prefill?.title ?? '';
		topic = editStream?.topic ?? prefill?.topic ?? '';
		schemaId = editStream?.schemaId ?? prefill?.schemaId ?? '';
		description = editStream?.description ?? '';
		promptId = editStream?.promptId ?? prefill?.promptId ?? '';
		promptName = editStream?.promptName ?? prefill?.promptName ?? '';
	});

	let titleError = $state('');
	let topicError = $state('');
	let schemaError = $state('');
	let saving = $state(false);

	// All schemas from catalog
	let allSchemas = $derived.by(() => {
		void validatedTopicStore.schemaVersion;
		return validatedTopicStore.getAllSchemaDefinitions();
	});

	function validateTopic(t: string): string {
		if (!t.trim()) return 'Topic is required';
		if (!/^[a-zA-Z0-9_\-/.+#]+$/.test(t.trim())) {
			return 'Topic may only contain letters, numbers, -, _, /, ., +, #';
		}
		return '';
	}

	function handleSubmit() {
		titleError = title.trim() ? '' : 'Title is required';
		topicError = validateTopic(topic);
		schemaError = schemaId ? '' : 'Schema is required';

		if (titleError || topicError || schemaError) return;

		saving = true;
		try {
			if (isEditing && editStream) {
				const updated = streamCatalog.updateStream(editStream.id, {
					title: title.trim(),
					topic: topic.trim(),
					schemaId,
					description: description.trim() || undefined,
					promptId: promptId.trim() || undefined,
					promptName: promptName.trim() || undefined
				});
				if (updated) onupdated?.(updated);
			} else {
				const stream = streamCatalog.addStream({
					title: title.trim(),
					topic: topic.trim(),
					schemaId,
					description: description.trim() || undefined,
					promptId: promptId.trim() || undefined,
					promptName: promptName.trim() || undefined,
					source: promptId ? 'prompt' : 'manual'
				});
				oncreated?.(stream);
			}
			onclose();
		} finally {
			saving = false;
		}
	}

	// Derived colors
	const inputClass = $derived(
		`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
			darkMode
				? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400'
				: 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
		}`
	);
	const labelClass = $derived(
		`block mb-1 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`
	);
	const errorClass = 'mt-1 text-xs text-red-500';
</script>

<!-- Backdrop -->
<div
	role="dialog"
	aria-modal="true"
	aria-labelledby="stream-modal-title"
	tabindex="-1"
	class="fixed inset-0 z-[10100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
	onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}
>
	<div
		class="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden
			{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-5 py-4 border-b {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
			<h2 id="stream-modal-title" class="text-base font-bold {darkMode ? 'text-white' : 'text-slate-900'}">
				{isEditing ? 'Edit Data Stream' : 'New Data Stream'}
			</h2>
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
		<div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
			<!-- Title -->
			<div>
				<label for="stream-title" class={labelClass}>Stream Title <span class="text-red-500">*</span></label>
				<input id="stream-title" type="text" bind:value={title} placeholder="e.g. Sales Summary" class={inputClass} />
				{#if titleError}<p class={errorClass}>{titleError}</p>{/if}
			</div>

			<!-- Topic -->
			<div>
				<label for="stream-topic" class={labelClass}>
					Topic <span class="text-red-500">*</span>
					<span class="ml-2 font-normal text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">MQTT-style path, e.g. ai/sales/summary</span>
				</label>
				<input
					id="stream-topic"
					type="text"
					bind:value={topic}
					placeholder="ai/project/metric-name"
					class="{inputClass} font-mono"
				/>
				{#if topicError}<p class={errorClass}>{topicError}</p>{/if}
			</div>

			<!-- Schema -->
			<div>
				<label for="stream-schema" class={labelClass}>Schema <span class="text-red-500">*</span></label>
				<select id="stream-schema" bind:value={schemaId} class={inputClass}>
					<option value="">Select a schema…</option>
					{#each allSchemas as s (s.id)}
						<option value={s.id}>{s.name} ({s.id})</option>
					{/each}
				</select>
				{#if schemaError}<p class={errorClass}>{schemaError}</p>{/if}
			</div>

			<!-- Description -->
			<div>
				<label for="stream-desc" class={labelClass}>Description <span class="font-normal text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">(optional)</span></label>
				<textarea
					id="stream-desc"
					bind:value={description}
					placeholder="What does this stream contain?"
					rows="2"
					class="{inputClass} resize-none"
				></textarea>
			</div>

			<!-- Prompt binding -->
			<div>
				<label for="stream-prompt-id" class={labelClass}>
					Prompt ID
					<span class="ml-2 font-normal text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">(optional — links to the prompt that publishes here)</span>
				</label>
				<input
					id="stream-prompt-id"
					type="text"
					bind:value={promptId}
					placeholder="Prompt ID from the library…"
					class="{inputClass} font-mono"
				/>
				{#if promptId}
					<div class="mt-2">
						<label for="stream-prompt-name" class="block mb-1 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">Prompt display name</label>
						<input
							id="stream-prompt-name"
							type="text"
							bind:value={promptName}
							placeholder="e.g. Q1 Sales Analysis"
							class="{inputClass} text-xs"
						/>
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div class="flex justify-end gap-3 px-5 py-4 border-t {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
			<button
				type="button"
				onclick={onclose}
				class="px-4 py-2 text-sm font-medium rounded-lg transition-colors
					{darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleSubmit}
				disabled={saving}
				class="px-4 py-2 text-sm font-medium rounded-lg transition-colors
					{darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
			>
				{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Stream'}
			</button>
		</div>
	</div>
</div>
