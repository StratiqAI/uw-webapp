<script lang="ts">
	import type { Prompt } from '@stratiqai/types-simple';
	import ResultRenderer from './ResultRenderer.svelte';

	interface VisionQueryResult {
		answer: string;
		structuredOutput?: unknown;
		matchCount: number;
	}

	interface PromptExecution {
		loading: boolean;
		error: string | null;
		result: VisionQueryResult | null;
		statusMessage: string | null;
		_unsub: (() => void) | null;
		_timeoutId: ReturnType<typeof setTimeout> | null;
		_pollingId: ReturnType<typeof setInterval> | null;
	}

	interface Props {
		prompt: Prompt;
		darkMode?: boolean;
		execution?: PromptExecution | null;
		canRunPrompt?: boolean;
		selectedDocFilename?: string | null;
		onBack?: () => void;
		onRun?: (prompt: Prompt) => void;
		onEdit?: (prompt: Prompt) => void;
		onDelete?: (prompt: Prompt) => void;
		onClear?: (promptId: string) => void;
		onSendToDashboard?: (prompt: Prompt) => void;
	}

	let {
		prompt,
		darkMode = true,
		execution = null,
		canRunPrompt = true,
		selectedDocFilename = null,
		onBack,
		onRun,
		onEdit,
		onDelete,
		onClear,
		onSendToDashboard
	}: Props = $props();

	const MODEL_LABELS: Record<string, string> = {
		GEMINI_2_5_FLASH: 'Gemini 2.5 Flash',
		GEMINI_2_0_FLASH: 'Gemini 2.0 Flash',
		GEMINI_2_5_PRO: 'Gemini 2.5 Pro',
		GEMINI_1_5_PRO: 'Gemini 1.5 Pro',
		GEMINI_1_5_FLASH: 'Gemini 1.5 Flash',
		GPT_4O: 'GPT-4o',
		GPT_4O_MINI: 'GPT-4o Mini',
		CLAUDE_SONNET: 'Claude Sonnet',
	};
	function modelLabel(model: string): string {
		return MODEL_LABELS[model] ?? model.replace(/_/g, ' ');
	}

	let showPromptBody = $state(false);
	let showSystemInstruction = $state(false);
	let confirmingDelete = $state(false);
	let copyFeedback = $state(false);

	const hasStructured = $derived(!!(prompt as { jsonSchemaId?: string }).jsonSchemaId);

	const hasExecution = $derived(
		execution != null && (execution.loading || execution.error != null || execution.result != null)
	);

	type ResultDisplay =
		| { mode: 'structured'; data: unknown; copyText: string }
		| { mode: 'text'; body: string };

	const resultDisplay = $derived.by((): ResultDisplay | null => {
		if (!execution?.result) return null;
		const { answer, structuredOutput } = execution.result;
		if (structuredOutput !== undefined && structuredOutput !== null && typeof structuredOutput === 'object') {
			return { mode: 'structured', data: structuredOutput, copyText: JSON.stringify(structuredOutput, null, 2) };
		}
		const raw = (answer ?? '').trim();
		if (!raw) return { mode: 'text', body: '' };
		try {
			const parsed = JSON.parse(raw);
			return { mode: 'structured', data: parsed, copyText: JSON.stringify(parsed, null, 2) };
		} catch {
			return { mode: 'text', body: answer };
		}
	});

	$inspect("resultDisplay", resultDisplay);
	async function copyResult() {
		if (!resultDisplay) return;
		const text = resultDisplay.mode === 'structured' ? resultDisplay.copyText : resultDisplay.body;
		try {
			await navigator.clipboard.writeText(text);
			copyFeedback = true;
			setTimeout(() => copyFeedback = false, 1500);
		} catch {}
	}
</script>

<div class="flex flex-1 flex-col overflow-hidden">
	<!-- Header with back button -->
	<div class="flex items-center gap-2 border-b px-3 py-2.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<button
			type="button"
			onclick={onBack}
			class="flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium transition-colors {darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}"
		>
			<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back
		</button>
		<div class="flex-1"></div>
		<!-- Action buttons -->
		<button
			type="button"
			onclick={() => onEdit?.(prompt)}
			title="Edit prompt"
			class="rounded p-1.5 transition-colors {darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
			</svg>
		</button>
		{#if !confirmingDelete}
			<button
				type="button"
				onclick={() => confirmingDelete = true}
				title="Delete prompt"
				class="rounded p-1.5 transition-colors {darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
		{:else}
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => { confirmingDelete = false; onDelete?.(prompt); }}
					class="rounded px-2 py-1 text-xs font-medium {darkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700'}"
				>Delete</button>
				<button
					type="button"
					onclick={() => confirmingDelete = false}
					class="rounded px-2 py-1 text-xs font-medium {darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}"
				>Cancel</button>
			</div>
		{/if}
	</div>

	<!-- Scrollable content -->
	<div class="flex-1 overflow-y-auto">
		<!-- Prompt info -->
		<div class="px-4 py-4">
			<h3 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">{prompt.name}</h3>
			{#if prompt.description}
				<p class="mt-1 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">{prompt.description}</p>
			{/if}

			<!-- Badges -->
			<div class="mt-3 flex flex-wrap items-center gap-1.5">
				<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}">
					{modelLabel(prompt.model ?? 'Unknown')}
				</span>
				{#if hasStructured}
					<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium {darkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}">
						Structured Output
					</span>
				{:else}
					<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium {darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}">
						Text Output
					</span>
				{/if}
			</div>
		</div>

		<!-- Prompt body (collapsible) -->
		<div class="border-t px-4 py-3 {darkMode ? 'border-slate-700/50' : 'border-slate-200'}">
			<button
				type="button"
				onclick={() => showPromptBody = !showPromptBody}
				class="flex w-full items-center justify-between text-left"
			>
				<span class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-500' : 'text-slate-400'}">Prompt Body</span>
				<svg class="h-3.5 w-3.5 transition-transform {showPromptBody ? 'rotate-180' : ''} {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if showPromptBody}
				<pre class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed rounded border p-2.5 {darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200'}">{prompt.prompt ?? ''}</pre>
			{/if}
		</div>

		<!-- System instruction (collapsible, if present) -->
		{#if prompt.systemInstruction}
			<div class="border-t px-4 py-3 {darkMode ? 'border-slate-700/50' : 'border-slate-200'}">
				<button
					type="button"
					onclick={() => showSystemInstruction = !showSystemInstruction}
					class="flex w-full items-center justify-between text-left"
				>
					<span class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-500' : 'text-slate-400'}">System Instruction</span>
					<svg class="h-3.5 w-3.5 transition-transform {showSystemInstruction ? 'rotate-180' : ''} {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				{#if showSystemInstruction}
					<pre class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed rounded border p-2.5 {darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200'}">{prompt.systemInstruction}</pre>
				{/if}
			</div>
		{/if}

		<!-- Test Panel -->
		<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'}">
			<div class="px-4 py-3">
				<h4 class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-500' : 'text-slate-400'}">Test</h4>

				<!-- Document indicator -->
				<div class="mt-2 flex items-center gap-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					<svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					{#if selectedDocFilename}
						<span class="truncate">{selectedDocFilename}</span>
					{:else}
						<span class="italic">No document selected</span>
					{/if}
				</div>

				<!-- Run button -->
				<button
					type="button"
					disabled={!canRunPrompt || execution?.loading}
					onclick={() => onRun?.(prompt)}
					title={!canRunPrompt ? 'Select a document in the viewer to run' : 'Run prompt on selected document'}
					class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}"
				>
					{#if execution?.loading}
						<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						{execution.statusMessage ?? 'Running...'}
					{:else}
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
						Run on Document
					{/if}
				</button>
			</div>

			<!-- Results area -->
			{#if hasExecution}
				<div class="border-t px-4 py-3 {darkMode ? 'border-slate-700/50' : 'border-slate-200'}">
					{#if execution?.loading}
						<div class="flex items-center gap-2 py-2">
							<svg class="animate-spin h-4 w-4 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">{execution.statusMessage ?? 'Processing...'}</span>
						</div>
					{:else if execution?.error}
						<div class="rounded-lg border p-3 {darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}">
							<div class="flex items-center gap-2 {darkMode ? 'text-red-400' : 'text-red-600'}">
								<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span class="text-xs font-medium">Query failed</span>
							</div>
							<p class="mt-1 text-xs {darkMode ? 'text-red-300' : 'text-red-600'}">{execution.error}</p>
							<button
								type="button"
								onclick={() => onClear?.(prompt.id)}
								class="mt-2 text-xs font-medium {darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}"
							>Dismiss</button>
						</div>
					{:else if execution?.result && resultDisplay}
						<div>
							<div class="flex items-center justify-between mb-2">
								<p class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-500' : 'text-slate-400'}">Result</p>
								<p class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">
									{execution.result.matchCount} image{execution.result.matchCount !== 1 ? 's' : ''}
								</p>
							</div>
						{#if resultDisplay.mode === 'structured'}
							<div class="max-h-80 overflow-auto">
								<ResultRenderer value={resultDisplay.data} {darkMode} />
							</div>
						{:else}
							<p class="whitespace-pre-wrap text-sm {darkMode ? 'text-slate-200' : 'text-slate-800'}">{resultDisplay.body}</p>
						{/if}
							<!-- Result actions -->
							<div class="mt-3 flex flex-wrap items-center gap-2">
								<button
									type="button"
									onclick={copyResult}
									class="flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors {darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}"
								>
									{#if copyFeedback}
										<svg class="h-3.5 w-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
										Copied
									{:else}
										<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
										</svg>
										Copy
									{/if}
								</button>
								<button
									type="button"
									onclick={() => onSendToDashboard?.(prompt)}
									class="flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors {darkMode ? 'border-indigo-600 bg-indigo-900/20 text-indigo-300 hover:bg-indigo-900/40' : 'border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}"
								>
									<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									Send to Dashboard
								</button>
								<button
									type="button"
									onclick={() => onClear?.(prompt.id)}
									class="text-xs font-medium {darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}"
								>Clear</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
