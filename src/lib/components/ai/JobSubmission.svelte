<script lang="ts">
	import { onDestroy } from 'svelte';
	import { aiService, type ExecutionHandle, type SubmitExecutionInput } from '$lib/services/ai';
	import type { AiQueryExecution, ExecutionStatus } from '@stratiqai/types-simple';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('ai');

	const TERMINAL_STATUSES = new Set<string>(['SUCCESS', 'ERROR', 'CANCELLED']);

	interface StatusStyle {
		readonly bg: string;
		readonly text: string;
		readonly icon: string;
	}

	const STATUS_STYLES: Record<string, StatusStyle> = {
		PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '...' },
		QUEUED: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '...' },
		PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '...' },
		SUCCESS: { bg: 'bg-green-100', text: 'text-green-800', icon: '...' },
		ERROR: { bg: 'bg-red-100', text: 'text-red-800', icon: '...' },
		CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '...' }
	};

	const DEFAULT_STATUS_STYLE: StatusStyle = { bg: 'bg-gray-100', text: 'text-gray-800', icon: '...' };

	interface Props {
		idToken: string;
		executionInput: SubmitExecutionInput;
		onComplete?: (rawOutput: string | null) => void;
		onError?: (error: Error) => void;
	}

	let {
		idToken,
		executionInput,
		onComplete,
		onError
	}: Props = $props();

	let loading = $state(false);
	let error = $state<Error | null>(null);
	let handle = $state<ExecutionHandle | null>(null);
	let execution = $state<AiQueryExecution | null>(null);
	let currentStatus = $state<ExecutionStatus | null>(null);
	let rawResult = $state<string | null>(null);
	let submitted = $state(false);

	$effect(() => {
		if (!handle) return;
		const unsubExec = handle.execution.subscribe((val) => { execution = val; });
		const unsubStatus = handle.status.subscribe((val) => { currentStatus = val; });
		return () => {
			unsubExec();
			unsubStatus();
		};
	});

	const isTerminal = $derived(currentStatus ? TERMINAL_STATUSES.has(currentStatus) : false);

	function getStatusStyle(status: string): StatusStyle {
		return STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
	}

	function formatDate(dateStr: string): string {
		try {
			const date = new Date(dateStr);
			if (isNaN(date.getTime())) return dateStr;
			return new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
		} catch {
			return dateStr;
		}
	}

	function parseResult(raw: string | null): Record<string, unknown> | null {
		if (!raw) return null;
		try {
			const parsed = JSON.parse(raw);
			return typeof parsed === 'object' && parsed !== null ? parsed : null;
		} catch {
			return null;
		}
	}

	async function handleSubmit(): Promise<void> {
		if (!idToken) {
			error = new Error('Authentication required');
			return;
		}

		if (handle) {
			handle.destroy();
			handle = null;
		}

		loading = true;
		error = null;
		rawResult = null;
		submitted = true;

		try {
			handle = await aiService.submitExecution(executionInput, idToken);

			log.info('AI execution submitted', { projectId: executionInput.projectId, promptId: executionInput.promptId });

			handle.result
				.then((output) => {
					rawResult = output;
					onComplete?.(output);
				})
				.catch((err) => {
					log.error('Execution failed:', err);
					error = err instanceof Error ? err : new Error(String(err));
					onError?.(error);
				});
		} catch (err) {
			error = err instanceof Error ? err : new Error(String(err));
			log.error('Failed to submit execution:', error);
			onError?.(error);
		} finally {
			loading = false;
		}
	}

	onDestroy(() => {
		if (handle) {
			handle.destroy();
			handle = null;
		}
	});
</script>

<div class="space-y-6" role="region" aria-label="AI Execution Interface">
	{#if !submitted}
		<div class="space-y-3">
			<button
				onclick={handleSubmit}
				disabled={!idToken}
				class="group relative rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md"
				aria-label="Submit AI execution"
			>
				<span class="flex items-center gap-2">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8l-8 8-8-8" />
					</svg>
					Submit Execution
				</span>
			</button>

			<div class="text-sm text-gray-600" role="status">
				<p>Prompt: <span class="font-mono text-xs">{executionInput.promptId}</span></p>
				<p>Priority: <span class="font-semibold">{executionInput.priority ?? 'MEDIUM'}</span></p>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4" role="status" aria-live="polite">
			<div class="flex items-center gap-3">
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true"></div>
				<p class="font-semibold text-blue-700">Submitting execution...</p>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4" role="alert" aria-live="assertive">
			<div class="flex gap-3">
				<span class="text-red-600" aria-hidden="true">...</span>
				<div class="text-red-700">
					<p class="font-semibold">Error</p>
					<p class="text-sm">{error.message}</p>
				</div>
			</div>
		</div>
	{/if}

	{#if execution}
		<div class="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4" role="status" aria-live="polite">
			<div class="flex items-start justify-between">
				<div class="space-y-1">
					<p class="flex items-center gap-2 font-semibold text-green-800">
						Execution submitted
					</p>
					<p class="font-mono text-xs text-gray-600">ID: {execution.id}</p>
					{#if currentStatus}
						{@const style = getStatusStyle(currentStatus)}
						<p class="text-sm text-gray-700">
							Status:
							<span class="rounded-full px-2 py-0.5 text-xs font-semibold {style.bg} {style.text}">
								{currentStatus}
							</span>
						</p>
					{/if}
					{#if execution.statusMessage}
						<p class="text-xs text-gray-500">{execution.statusMessage}</p>
					{/if}
				</div>
				<button
					onclick={handleSubmit}
					disabled={loading}
					class="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-green-800 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="Submit another execution"
				>
					Submit Another
				</button>
			</div>
		</div>

		{#if !isTerminal}
			<div class="rounded-lg border border-gray-200 bg-white p-6 text-center" role="status">
				<div class="mx-auto mb-3 h-12 w-12 animate-pulse rounded-full bg-gray-100" aria-hidden="true"></div>
				<p class="font-medium text-gray-600">Processing...</p>
				<p class="mt-1 text-sm text-gray-500">
					{execution.statusMessage ?? 'Waiting for result...'}
				</p>
			</div>
		{/if}

		{#if currentStatus === 'SUCCESS' && rawResult}
			{@const parsed = parseResult(rawResult)}
			<div class="space-y-3" role="region" aria-label="Execution result">
				{#if parsed?.output_parsed}
					<div class="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3">
						<h4 class="mb-2 text-sm font-semibold text-green-900">Extracted Data</h4>
						<dl class="grid grid-cols-2 gap-2 text-sm">
							{#each Object.entries(parsed.output_parsed as Record<string, unknown>) as [key, value]}
								<div>
									<dt class="font-medium text-gray-600">{key}:</dt>
									<dd class="text-gray-900">
										<pre class="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
									</dd>
								</div>
							{/each}
						</dl>
					</div>
				{/if}

				<details class="group/details">
					<summary class="cursor-pointer rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100">
						View Full Result
					</summary>
					<pre class="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100"><code>{JSON.stringify(parsed ?? rawResult, null, 2)}</code></pre>
				</details>
			</div>
		{/if}

		{#if currentStatus === 'ERROR'}
			<div class="rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
				<p class="text-sm font-semibold text-red-700">Execution failed</p>
				{#if execution.errorMessage}
					<p class="text-sm text-red-600">{execution.errorMessage}</p>
				{/if}
				{#if execution.errorCode}
					<p class="mt-1 font-mono text-xs text-red-500">Code: {execution.errorCode}</p>
				{/if}
			</div>
		{/if}

		{#if execution.durationMs || execution.totalTokenCount || execution.model}
			<div class="border-t pt-2 text-xs text-gray-400">
				{#if execution.model}<p>Model: {execution.model}</p>{/if}
				{#if execution.totalTokenCount}<p>Tokens: {execution.totalTokenCount}</p>{/if}
				{#if execution.durationMs}<p>Duration: {execution.durationMs}ms</p>{/if}
				{#if execution.createdAt}<p>Created: {formatDate(execution.createdAt)}</p>{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	pre code {
		font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
	}
</style>
