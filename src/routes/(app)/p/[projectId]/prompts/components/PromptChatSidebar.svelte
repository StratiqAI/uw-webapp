<script lang="ts">
	import { getContext, onMount, tick, untrack } from 'svelte';
	import { marked } from 'marked';
	import type { Prompt } from '@stratiqai/types-simple';
	import PromptToolsPopover from './PromptToolsPopover.svelte';
	import SendToDashboardButton from '$lib/documents/discovery/SendToDashboardButton.svelte';
	import {
		PROMPTS_ADD_CHAT_TO_DASHBOARD,
		type PromptsAddChatToDashboardContext
	} from '../promptsDashboardContext';

	marked.setOptions({ async: false, gfm: true, breaks: true });

	function renderMarkdown(content: string): string {
		if (!content.trim()) return '';
		return marked.parse(content) as string;
	}

	/** Tailwind typography for AI replies (matches ChatDrawer pattern). */
	const mdProseClass =
		'prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:mb-1.5 prose-headings:mt-3 first:prose-headings:mt-0 prose-pre:my-2';

	const STREAM_PANE_MIN = 72;
	/** Room for prompt label + textarea + button row + padding. */
	const COMPOSER_PANE_MIN = 140;
	const STREAM_COMPOSER_RESIZER_H = 6;

	let {
		darkMode,
		projectId = '',
		selectedPrompt,
		question = $bindable(''),
		chatHistory = [],
		extraVarNames,
		extraVarValues = $bindable<Record<string, string>>({}),
		streamingText,
		executing,
		streamError,
		onRun,
		onCancel: _onCancel
	} = $props<{
		darkMode: boolean;
		/** Current project; enables “Add to Dashboard” for each assistant message. */
		projectId?: string;
		selectedPrompt: Prompt | null;
		/** Run / template body message (shared with Edit prompt save state). */
		question?: string;
		/** Completed assistant turns, oldest first. */
		chatHistory?: { id: string; text: string }[];
		extraVarNames: string[];
		extraVarValues?: Record<string, string>;
		streamingText: string;
		executing: boolean;
		streamError: string;
		onRun: () => void;
		onCancel: () => void;
	}>();

	const promptsAddToDashboard = getContext<PromptsAddChatToDashboardContext | undefined>(
		PROMPTS_ADD_CHAT_TO_DASHBOARD
	);

	function setExtra(name: string, value: string) {
		extraVarValues = { ...extraVarValues, [name]: value };
	}

	const panel = $derived(
		darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'
	);
	const label = $derived(darkMode ? 'text-slate-400' : 'text-slate-600');

	const bubble = $derived(
		darkMode
			? 'border-slate-600/80 bg-slate-950/80 text-slate-200'
			: 'border-slate-200 bg-slate-50 text-slate-800'
	);

	const showDashboardActions = $derived(Boolean(projectId?.trim() && promptsAddToDashboard));
	const dashboardBtnColors = $derived(
		darkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-800'
	);

	let scrollRoot = $state<HTMLDivElement | undefined>();
	let streamComposerBodyEl = $state<HTMLDivElement | undefined>();
	let streamPaneHeightPx = $state(220);

	function clampStreamPaneHeight(px: number, bodyHeight: number): number {
		const maxStream = bodyHeight - STREAM_COMPOSER_RESIZER_H - COMPOSER_PANE_MIN;
		const cap = Math.max(STREAM_PANE_MIN, maxStream);
		return Math.min(cap, Math.max(STREAM_PANE_MIN, px));
	}

	function reclampStreamPane() {
		if (!streamComposerBodyEl || typeof window === 'undefined') return;
		const h = streamComposerBodyEl.getBoundingClientRect().height;
		if (h <= STREAM_COMPOSER_RESIZER_H + STREAM_PANE_MIN + COMPOSER_PANE_MIN) return;
		streamPaneHeightPx = clampStreamPaneHeight(streamPaneHeightPx, h);
	}

	function onStreamComposerResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		const body = streamComposerBodyEl;
		if (!body) return;
		target.setPointerCapture(e.pointerId);
		const bodyH = body.getBoundingClientRect().height;
		if (bodyH <= STREAM_COMPOSER_RESIZER_H + STREAM_PANE_MIN + COMPOSER_PANE_MIN) return;

		const startY = e.clientY;
		const startStreamH = streamPaneHeightPx;

		function onMove(ev: PointerEvent) {
			streamPaneHeightPx = clampStreamPaneHeight(startStreamH + (ev.clientY - startY), bodyH);
		}

		function onUp(ev: PointerEvent) {
			target.releasePointerCapture(ev.pointerId);
			target.removeEventListener('pointermove', onMove);
			target.removeEventListener('pointerup', onUp);
			target.removeEventListener('pointercancel', onUp);
		}

		target.addEventListener('pointermove', onMove);
		target.addEventListener('pointerup', onUp);
		target.addEventListener('pointercancel', onUp);
	}

	$effect(() => {
		const _h = chatHistory.length;
		const _t = streamingText;
		const _e = executing;
		void _h;
		void _t;
		void _e;
		untrack(async () => {
			await tick();
			requestAnimationFrame(() => {
				const el = scrollRoot;
				if (el) el.scrollTop = el.scrollHeight;
			});
		});
	});

	onMount(() => {
		function onWinResize() {
			reclampStreamPane();
		}
		window.addEventListener('resize', onWinResize);
		queueMicrotask(() => reclampStreamPane());
		return () => window.removeEventListener('resize', onWinResize);
	});

</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden border-l {panel}">
	<div class="shrink-0 border-b px-3 py-2.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<h2 class="text-xs font-semibold uppercase tracking-wider {label}">Chat</h2>
		{#if selectedPrompt}
			<p class="mt-0.5 truncate text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-500'}">{selectedPrompt.name}</p>
		{:else}
			<p class="mt-0.5 text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-500'}">Select a prompt to run</p>
		{/if}
	</div>

	<div
		bind:this={streamComposerBodyEl}
		class="flex min-h-0 flex-1 flex-col overflow-hidden"
	>
		<!-- Messages: oldest at top, newest / streaming at bottom -->
		<div
			bind:this={scrollRoot}
			style="height: {streamPaneHeightPx}px"
			class="shrink-0 overflow-y-auto overflow-x-hidden px-3 py-2"
		>
			{#if streamError}
				<p class="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-400">{streamError}</p>
			{/if}
			<div class="flex min-h-full flex-col justify-end gap-2">
				{#each chatHistory as turn (turn.id)}
					<div class="overflow-hidden rounded-lg border {bubble}">
						{#if showDashboardActions}
							<div
								class="flex justify-end border-b px-2 py-1 {darkMode
									? 'border-slate-600/60 bg-slate-900/60'
									: 'border-slate-200 bg-slate-100/90'}"
							>
								<SendToDashboardButton
									{darkMode}
									buttonLabel="Add to Dashboard"
									colorClasses={dashboardBtnColors}
									onSend={(tabId) => {
										void promptsAddToDashboard?.add(turn.text, tabId);
									}}
								/>
							</div>
						{/if}
						<div class="px-3 py-2 text-sm leading-relaxed {mdProseClass}">
							{@html renderMarkdown(turn.text)}
						</div>
					</div>
				{/each}
				{#if executing || streamingText}
					<div class="overflow-hidden rounded-lg border {bubble}">
						{#if showDashboardActions && streamingText.trim()}
							<div
								class="flex justify-end border-b px-2 py-1 {darkMode
									? 'border-slate-600/60 bg-slate-900/60'
									: 'border-slate-200 bg-slate-100/90'}"
							>
								<SendToDashboardButton
									{darkMode}
									buttonLabel="Add to Dashboard"
									colorClasses={dashboardBtnColors}
									onSend={(tabId) => {
										void promptsAddToDashboard?.add(streamingText, tabId);
									}}
								/>
							</div>
						{/if}
						<div class="px-3 py-2 text-sm leading-relaxed {mdProseClass}">
							{#if streamingText}
								{@html renderMarkdown(streamingText)}
							{:else}
								<span class="font-mono text-slate-500">…</span>
							{/if}
						</div>
					</div>
				{:else if chatHistory.length === 0 && !streamError}
					<div
						class="rounded-lg border border-dashed px-3 py-2 text-center font-mono text-xs leading-relaxed {darkMode
							? 'border-slate-600/60 bg-slate-900/40 text-slate-500'
							: 'border-slate-200 bg-slate-50/80 text-slate-500'}"
					>
						Responses will appear here.
					</div>
				{/if}
			</div>
		</div>

		<button
			type="button"
			aria-label="Resize responses area and prompt composer"
			class="h-1.5 w-full shrink-0 cursor-row-resize touch-none border-0 p-0 select-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500 {darkMode
				? 'bg-slate-600 hover:bg-slate-500'
				: 'bg-slate-300 hover:bg-slate-400'}"
			onpointerdown={onStreamComposerResizePointerDown}
			onkeydown={(e) => {
				if (!streamComposerBodyEl) return;
				const h = streamComposerBodyEl.getBoundingClientRect().height;
				if (h <= STREAM_COMPOSER_RESIZER_H + STREAM_PANE_MIN + COMPOSER_PANE_MIN) return;
				const step = e.shiftKey ? 24 : 10;
				if (e.key === 'ArrowUp') {
					e.preventDefault();
					streamPaneHeightPx = clampStreamPaneHeight(streamPaneHeightPx - step, h);
				} else if (e.key === 'ArrowDown') {
					e.preventDefault();
					streamPaneHeightPx = clampStreamPaneHeight(streamPaneHeightPx + step, h);
				}
			}}
		></button>

		<!-- Composer: prompt area grows to fill space above Run/Cancel -->
		<div
			class="flex min-h-0 flex-1 flex-col overflow-hidden border-t px-3 py-2.5 {darkMode
				? 'border-slate-700 bg-slate-900/40'
				: 'border-slate-200 bg-slate-50/90'}"
		>
			{#if selectedPrompt}
				<div class="flex min-h-0 flex-1 flex-col gap-2">
					{#if extraVarNames.length > 0}
						<div class="max-h-24 shrink-0 space-y-1.5 overflow-y-auto">
							<p class="text-[10px] font-medium uppercase tracking-wide {label}">Template variables</p>
							{#each extraVarNames as name (name)}
								<label class="block">
									<span class="mb-0.5 block text-[9px] uppercase tracking-wide {darkMode ? 'text-slate-500' : 'text-slate-500'}"
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

					<div class="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
						<label for="prompt-chat-message" class="shrink-0 text-[10px] font-medium {label}">Prompt / message</label>
						<div
							class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border {darkMode
								? 'border-slate-600 bg-slate-900'
								: 'border-slate-200 bg-white'}"
						>
							<textarea
								id="prompt-chat-message"
								bind:value={question}
								placeholder="Template loads when you select a prompt; edit here for runs…"
								disabled={executing}
								class="box-border h-full min-h-0 w-full flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-sm leading-snug outline-none focus:ring-0 {darkMode
									? 'text-slate-100 placeholder:text-slate-500'
									: 'text-slate-900 placeholder:text-slate-400'}"
							></textarea>
						</div>
					</div>

					<div class="flex shrink-0 items-center gap-2 pt-0.5">
						<button
							type="button"
							onclick={onRun}
							disabled={executing || !question.trim()}
							class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{executing ? 'Running…' : 'Run'}
						</button>

						<PromptToolsPopover {darkMode} />
					</div>
				</div>
			{:else}
				<p class="py-4 text-center text-[11px] {darkMode ? 'text-slate-500' : 'text-slate-500'}">
					Choose a prompt in the library to run it from here.
				</p>
			{/if}
		</div>
	</div>
</div>
