<script lang="ts">
	import type { Prompt } from '@stratiqai/types-simple';
	import PDFViewer from '$lib/documents/viewer/PDFViewer.svelte';

	type DocItem = { id: string; filename: string };

	let {
		darkMode,
		documents,
		selectedPrompt,
		selectedDocumentId = $bindable(''),
		question = $bindable(''),
		extraVarNames,
		extraVarValues = $bindable<Record<string, string>>({}),
		streamingText,
		executing,
		streamError,
		onRun,
		onCancel
	} = $props<{
		darkMode: boolean;
		documents: DocItem[];
		selectedPrompt: Prompt | null;
		selectedDocumentId?: string;
		question?: string;
		extraVarNames: string[];
		extraVarValues?: Record<string, string>;
		streamingText: string;
		executing: boolean;
		streamError: string;
		onRun: () => void;
		onCancel: () => void;
	}>();

	let currentPage = $state(1);

	function setExtra(name: string, value: string) {
		extraVarValues = { ...extraVarValues, [name]: value };
	}

	const centerBg = $derived(darkMode ? 'bg-slate-900' : 'bg-slate-50');
	const card = $derived(darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white');
</script>

<div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden {centerBg}">
	{#if !selectedPrompt}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
			<svg
				class="h-12 w-12 {darkMode ? 'text-slate-600' : 'text-slate-300'}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
				/>
			</svg>
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Select a prompt from the library on the right to test against your documents.
			</p>
		</div>
	{:else}
		<div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
			<!-- Document viewer -->
			<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border {card}">
				{#if documents.length === 0}
					<div class="flex flex-1 items-center justify-center p-4 text-center text-xs {darkMode ? 'text-slate-500' : 'text-slate-500'}">
						No documents in this project. Upload files on the Documents page to preview and run vision RAG.
					</div>
				{:else}
					<div class="min-h-0 flex-1 overflow-auto p-2">
						<div class="mb-2 flex flex-wrap items-center gap-2">
							<label for="pw-doc-select" class="text-[11px] font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'}"
								>Document</label
							>
							<select
								id="pw-doc-select"
								bind:value={selectedDocumentId}
								class="max-w-full rounded border px-2 py-1 text-xs {darkMode
									? 'border-slate-600 bg-slate-900 text-slate-100'
									: 'border-slate-200 bg-white'}"
							>
								{#each documents as d (d.id)}
									<option value={d.id}>{d.filename}</option>
								{/each}
							</select>
						</div>
						<PDFViewer
							{documents}
							bind:currentDocHash={selectedDocumentId}
							bind:currentPage={currentPage}
							showButtons={['navigation', 'zoom', 'rotate', 'download', 'refresh']}
						/>
					</div>
				{/if}
			</div>

			<!-- Chat / run -->
			<div class="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-lg border {card}">
				<div class="border-b px-3 py-2 text-xs font-medium {darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-700'}">
					Run: {selectedPrompt.name}
				</div>
				<div class="min-h-0 flex flex-1 flex-col gap-2 p-3">
					<label class="block">
						<span class="mb-1 block text-[11px] {darkMode ? 'text-slate-400' : 'text-slate-600'}">Message / question</span>
						<textarea
							bind:value={question}
							rows="3"
							placeholder="Ask a question (used for vision RAG and as input)…"
							disabled={executing}
							class="w-full resize-none rounded-md border px-2 py-1.5 text-sm {darkMode
								? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500'
								: 'border-slate-200 bg-white placeholder:text-slate-400'}"
						></textarea>
					</label>

					{#if extraVarNames.length > 0}
						<div class="space-y-2">
							<p class="text-[11px] font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'}">Template variables</p>
							{#each extraVarNames as name (name)}
								<label class="block">
									<span class="mb-0.5 block text-[10px] uppercase tracking-wide {darkMode ? 'text-slate-500' : 'text-slate-500'}"
										>{name}</span
									>
									<input
										type="text"
										value={extraVarValues[name] ?? ''}
										oninput={(e) => setExtra(name, e.currentTarget.value)}
										disabled={executing}
										class="w-full rounded border px-2 py-1 text-xs {darkMode
											? 'border-slate-600 bg-slate-900 text-slate-100'
											: 'border-slate-200 bg-white'}"
									/>
								</label>
							{/each}
						</div>
					{/if}

					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							onclick={onRun}
							disabled={executing || !question.trim()}
							class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{executing ? 'Running…' : 'Run'}
						</button>
						<button
							type="button"
							onclick={onCancel}
							disabled={!executing}
							class="rounded-lg border px-3 py-1.5 text-xs font-medium {darkMode
								? 'border-slate-600 text-slate-300 hover:bg-slate-700'
								: 'border-slate-300 text-slate-700 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-50"
						>
							Cancel
						</button>
					</div>

					{#if streamError}
						<p class="text-xs text-red-500">{streamError}</p>
					{/if}

					<div
						class="min-h-[80px] flex-1 overflow-y-auto rounded-md border p-2 font-mono text-xs whitespace-pre-wrap {darkMode
							? 'border-slate-600 bg-slate-950 text-slate-200'
							: 'border-slate-200 bg-slate-50 text-slate-800'}"
					>
						{streamingText || (executing ? '…' : 'Response will stream here.')}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
