<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { getContext, onMount, tick, untrack } from 'svelte';
	import type { UIMessage } from 'ai';
	import type { Prompt } from '@stratiqai/types-simple';
	import type { AiStudioToolsConfig } from '$lib/types/ai-studio.js';
	import {
		collectAssistantVisibleText,
		extractTaggedThinking,
		getToolRender,
		parseAssistantTextWithSources,
		proseWithoutThinkingTags,
		toolResultEmbeddedError,
		type ParsedSource
	} from '$lib/ai/agent-chat-parts.js';
	import { renderAssistantMarkdown } from '$lib/ai/safe-marked.js';
	import PromptStudioToolsToggleList from './PromptStudioToolsToggleList.svelte';
	import ResponseFormatPanel from './ResponseFormatPanel.svelte';
	import SendToDashboardButton from '$lib/documents/discovery/SendToDashboardButton.svelte';
	import {
		PROMPTS_ADD_CHAT_TO_DASHBOARD,
		type PromptsAddChatToDashboardContext
	} from '../promptsDashboardContext';
	import { WORKSPACE_DEFAULT_SYSTEM_INSTRUCTION } from '../workspacePromptDefaults';

	function pageImageUrl(pageLabel: string, pageImageMap: Map<number, string>): string | null {
		const nums = [...pageLabel.matchAll(/\d+/g)].map((m) => Number(m[0]));
		if (nums.length === 0) return null;
		const n = nums[nums.length - 1];
		return pageImageMap.get(n) ?? null;
	}

	function assistantBodyHtml(text: string): { html: string; sources: ParsedSource[] } {
		const think = extractTaggedThinking(text);
		const visible = proseWithoutThinkingTags(think.prose);
		const parsed = parseAssistantTextWithSources(visible);
		const bodyMd = parsed.sources.length > 0 ? parsed.bodyText : visible;
		return { html: renderAssistantMarkdown(bodyMd), sources: parsed.sources };
	}

	type AnswerToolMinimal = {
		pageImageMap: Map<number, string>;
		defaultImageUrl: string | null;
	};

	function getMinimalAnswerToolMeta(parts: Array<Record<string, unknown>>): AnswerToolMinimal {
		let pageImageMap = new Map<number, string>();
		let defaultImageUrl: string | null = null;

		for (const part of parts) {
			const toolUi = getToolRender(part);
			if (!toolUi?.isSuccess || toolUi.result == null || typeof toolUi.result !== 'object')
				continue;
			const out = toolUi.result as Record<string, unknown>;
			const urls = (out.usedImageUrls as string[] | undefined) ?? [];
			if (urls.length) defaultImageUrl = urls[0] ?? null;
			const sources = (out.sources ?? []) as Array<{ pageNumber?: unknown; imageUrl?: string | null }>;
			for (const s of sources) {
				const pn =
					typeof s.pageNumber === 'number'
						? Math.trunc(s.pageNumber)
						: typeof s.pageNumber === 'string'
							? Number(s.pageNumber.trim())
							: NaN;
				if (Number.isFinite(pn) && s.imageUrl) pageImageMap.set(pn, s.imageUrl);
			}
		}

		return { pageImageMap, defaultImageUrl };
	}

	/** Tailwind typography for AI replies (matches ChatDrawer pattern). */
	const mdProseClass =
		'prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:mb-1.5 prose-headings:mt-3 first:prose-headings:mt-0 prose-pre:my-2';

	const STREAM_PANE_MIN = 72;
	/** Room for prompt label + textarea + button row + padding. */
	const COMPOSER_PANE_MIN = 140;
	const STREAM_COMPOSER_RESIZER_H = 6;

	/** Horizontal split: prompt vs tabbed tools / response panel. */
	const COMPOSER_TOOLS_RESIZER_W = 6;
	const COMPOSER_TOOLS_PANE_MIN = 200;
	const COMPOSER_PROMPT_COL_MIN = 200;
	const COMPOSER_TOOLS_PANE_DEFAULT = 320;

	let {
		darkMode,
		projectId = '',
		selectedPrompt,
		question = $bindable(''),
		systemInstruction = $bindable(WORKSPACE_DEFAULT_SYSTEM_INSTRUCTION),
		chat,
		extraVarNames,
		extraVarValues = $bindable<Record<string, string>>({}),
		toolsConfig = $bindable<AiStudioToolsConfig>({}),
		responseFormatType = $bindable<'text' | 'json_object' | 'json_schema'>('json_schema'),
		schemaProperties = $bindable<Record<string, Record<string, unknown>>>({}),
		schemaRequired = $bindable<string[]>([]),
		fieldOrder = $bindable<string[]>([]),
		onLoadSchemaFromLibrary,
		onRun,
		onCancel,
		addToDashboardButtonLabel = 'Add to Dashboard',
		embedded = false
	} = $props<{
		darkMode: boolean;
		/** Current project; enables “Add to Dashboard” for each assistant message. */
		projectId?: string;
		selectedPrompt: Prompt | null;
		/** Run / template body message (shared with Edit prompt save state). */
		question?: string;
		/** System instruction (shared with inline prompt editor). */
		systemInstruction?: string;
		chat: Chat<UIMessage>;
		extraVarNames: string[];
		extraVarValues?: Record<string, string>;
		toolsConfig?: AiStudioToolsConfig;
		responseFormatType?: 'text' | 'json_object' | 'json_schema';
		schemaProperties?: Record<string, Record<string, unknown>>;
		schemaRequired?: string[];
		fieldOrder?: string[];
		onLoadSchemaFromLibrary?: () => void;
		onRun: () => void;
		onCancel: () => void;
		addToDashboardButtonLabel?: string;
		/** Dialog layout: no drag resize; flex-based message/composer split. */
		embedded?: boolean;
	}>();

	const executing = $derived(chat.status === 'streaming' || chat.status === 'submitted');
	const streamError = $derived(
		chat.status === 'error' && chat.error ? chat.error.message : ''
	);

	const promptsAddToDashboard = getContext<PromptsAddChatToDashboardContext | undefined>(
		PROMPTS_ADD_CHAT_TO_DASHBOARD
	);

	async function sendChatToDashboard(text: string, tabId?: string) {
		const add = promptsAddToDashboard?.add;
		if (!add) return;
		await Promise.resolve(add(text, tabId));
	}

	let showSystemInstructionPanel = $state(false);
	$effect(() => {
		if (systemInstruction) showSystemInstructionPanel = true;
	});

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

	const structuredActive = $derived(toolsConfig.structuredOutputs === true);
	/** When structured outputs is off, opens the same tabbed side panel (Response format | Tools). */
	let toolsSidePanelOpen = $state(false);
	const composerTwoColumn = $derived(structuredActive || toolsSidePanelOpen);

	/** Accordion: which side-panel section is expanded (`null` = both headers only). */
	let composerAccordionSection = $state<'format' | 'tools' | null>('format');

	function toggleComposerAccordion(section: 'format' | 'tools') {
		composerAccordionSection = composerAccordionSection === section ? null : section;
	}
	/** When true, tabbed panel is collapsed to the slim strip (chevrons >>). */
	let structuredPanelCollapsed = $state(false);
	/** Expanded tabbed panel; matches Tools button pressed / highlighted state. */
	const toolsPanelExpanded = $derived(composerTwoColumn && !structuredPanelCollapsed);

	const toolsButtonPressedClass = $derived(
		toolsPanelExpanded
			? darkMode
				? 'border-indigo-400 bg-indigo-950/50 text-indigo-100 ring-1 ring-indigo-400/35'
				: 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-400/40'
			: darkMode
				? 'border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
				: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
	);

	function onToolsButtonClick() {
		if (structuredActive) {
			structuredPanelCollapsed = false;
			composerAccordionSection = 'tools';
			return;
		}
		const next = !toolsSidePanelOpen;
		toolsSidePanelOpen = next;
		if (next) {
			composerAccordionSection = 'tools';
			structuredPanelCollapsed = false;
		}
	}
	/** When false, Run omits JSON schema from the request (UI panel can stay open). */
	const applyStructuredResponse = $derived(toolsConfig.applyStructuredResponse !== false);

	function toggleApplyStructuredResponse() {
		const on = toolsConfig.applyStructuredResponse !== false;
		toolsConfig = { ...toolsConfig, applyStructuredResponse: !on };
	}

	$effect(() => {
		if (!structuredActive) {
			structuredPanelCollapsed = false;
			if (toolsConfig.applyStructuredResponse === false) {
				toolsConfig = { ...toolsConfig, applyStructuredResponse: true };
			}
		} else {
			toolsSidePanelOpen = false;
		}
	});

	function onWindowKeydownTools(e: KeyboardEvent) {
		if (e.key !== 'Escape' || !toolsSidePanelOpen || structuredActive) return;
		e.preventDefault();
		toolsSidePanelOpen = false;
	}
	const showDashboardActions = $derived(Boolean(projectId?.trim() && promptsAddToDashboard));
	const dashboardBtnColors = $derived(
		darkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-800'
	);

	let scrollRoot = $state<HTMLDivElement | undefined>();
	let streamComposerBodyEl = $state<HTMLDivElement | undefined>();
	let streamPaneHeightPx = $state(220);
	/** Row that contains prompt column + optional resizer + side panel (for split width math). */
	let composerSplitRowEl = $state<HTMLDivElement | undefined>();
	let composerToolsPaneWidthPx = $state(COMPOSER_TOOLS_PANE_DEFAULT);

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

	function clampComposerToolsPaneWidth(px: number, rowTotalWidth: number): number {
		const maxRight =
			rowTotalWidth - COMPOSER_PROMPT_COL_MIN - COMPOSER_TOOLS_RESIZER_W;
		if (maxRight < COMPOSER_TOOLS_PANE_MIN) {
			return COMPOSER_TOOLS_PANE_MIN;
		}
		return Math.min(maxRight, Math.max(COMPOSER_TOOLS_PANE_MIN, Math.round(px)));
	}

	function reclampComposerToolsPane() {
		if (!composerSplitRowEl || typeof window === 'undefined') return;
		const rowW = composerSplitRowEl.getBoundingClientRect().width;
		if (rowW <= 0) return;
		composerToolsPaneWidthPx = clampComposerToolsPaneWidth(composerToolsPaneWidthPx, rowW);
	}

	function onComposerToolsResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		if (!composerSplitRowEl) return;
		target.setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = composerToolsPaneWidthPx;

		function onMove(ev: PointerEvent) {
			const liveRow = composerSplitRowEl;
			if (!liveRow) return;
			const rowW = liveRow.getBoundingClientRect().width;
			const delta = ev.clientX - startX;
			composerToolsPaneWidthPx = clampComposerToolsPaneWidth(startW - delta, rowW);
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
		const _m = chat.messages;
		const _e = executing;
		void _m;
		void _e;
		untrack(async () => {
			await tick();
			requestAnimationFrame(() => {
				const el = scrollRoot;
				if (el) el.scrollTop = el.scrollHeight;
			});
		});
	});

	$effect(() => {
		if (embedded) return;
		if (toolsPanelExpanded) {
			queueMicrotask(() => reclampComposerToolsPane());
		}
	});

	onMount(() => {
		if (embedded) return;
		function onWinResize() {
			reclampStreamPane();
			reclampComposerToolsPane();
		}
		window.addEventListener('resize', onWinResize);
		queueMicrotask(() => {
			reclampStreamPane();
			reclampComposerToolsPane();
		});
		return () => window.removeEventListener('resize', onWinResize);
	});

</script>

<svelte:window onkeydown={onWindowKeydownTools} />

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
			style={embedded ? undefined : `height: ${streamPaneHeightPx}px`}
			class="overflow-x-hidden px-3 py-2 {embedded
				? 'min-h-0 flex-1 overflow-y-auto'
				: 'shrink-0 overflow-y-auto'}"
		>
			{#if streamError}
				<p class="mb-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-400">{streamError}</p>
			{/if}
			<div class="flex min-h-full flex-col justify-end gap-2">
				{#each chat.messages as message (message.id)}
					{@const answerMeta = getMinimalAnswerToolMeta(message.parts as Array<Record<string, unknown>>)}
					<div class="overflow-hidden rounded-lg border {bubble}">
						{#if message.role === 'assistant' && showDashboardActions && collectAssistantVisibleText(message).trim()}
							<div
								class="flex justify-end border-b px-2 py-1 {darkMode
									? 'border-slate-600/60 bg-slate-900/60'
									: 'border-slate-200 bg-slate-100/90'}"
							>
								<SendToDashboardButton
									{darkMode}
									buttonLabel={addToDashboardButtonLabel}
									colorClasses={dashboardBtnColors}
									onSend={(tabId) => {
										void sendChatToDashboard(collectAssistantVisibleText(message), tabId);
									}}
								/>
							</div>
						{/if}
						<div class="px-3 py-2 text-xs leading-relaxed">
							<span class="mb-1 block font-semibold uppercase tracking-wide opacity-70 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
								{message.role === 'user' ? 'You' : 'Agent'}
							</span>
							{#each message.parts as part, pi (pi)}
								{@const toolUi = getToolRender(part)}
								{#if part.type === 'text'}
									{#if message.role === 'assistant'}
										{@const rawText = part.text ?? ''}
										{@const think = extractTaggedThinking(rawText)}
										{#if think.blocks.length}
											<div class="mb-2 rounded-md border {darkMode ? 'border-slate-600 bg-slate-950/80' : 'border-slate-200 bg-slate-100'} px-2 py-1.5">
												<details class="text-[11px]">
													<summary class="cursor-pointer opacity-80">View agent thinking ({think.blocks.length})</summary>
													{#each think.blocks as block, bi (`${bi}-${block.slice(0, 40)}`)}
														<pre class="mt-1 whitespace-pre-wrap break-words rounded border px-2 py-1 font-mono text-[10px] opacity-90 {darkMode ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-600'}">{block}</pre>
													{/each}
												</details>
											</div>
										{/if}
										{@const body = assistantBodyHtml(rawText)}
										{#if body.sources.length > 0}
											{#if body.html.trim()}
												<div class="{mdProseClass} prose-headings:!text-[0.95rem]">{@html body.html}</div>
											{/if}
											<section class="mt-2 rounded-lg border px-2 py-2 text-[11px] {darkMode ? 'border-indigo-900/50 bg-indigo-950/30' : 'border-indigo-100 bg-indigo-50/80'}">
												<p class="mb-1 font-semibold uppercase tracking-wide opacity-90">Sources</p>
												<ul class="space-y-1">
													{#each body.sources as source (`${source.raw}-${source.displayText}`)}
														{@const imgUrl =
															source.pageLabel &&
															pageImageUrl(source.pageLabel, answerMeta.pageImageMap)}
														{@const sourceHref =
															source.url ??
															imgUrl ??
															(source.raw.toLowerCase().includes('bounding box')
																? answerMeta.defaultImageUrl
																: null)}
														<li class="flex flex-wrap items-center gap-1">
															{#if source.pageLabel}
																{#if imgUrl}
																	<a
																		class="rounded px-1.5 py-0.5 font-semibold underline-offset-2 hover:underline {darkMode ? 'bg-slate-800 text-indigo-300' : 'bg-white text-indigo-700'}"
																		href={imgUrl}
																		target="_blank"
																		rel="noopener noreferrer">{source.pageLabel}</a>
																{:else}
																	<span class="rounded px-1.5 py-0.5 font-semibold {darkMode ? 'bg-slate-800' : 'bg-white'}">{source.pageLabel}</span>
																{/if}
															{/if}
															{#if sourceHref}
																<a
																	class="break-all text-indigo-500 underline-offset-2 hover:underline dark:text-indigo-300"
																	href={sourceHref}
																	target="_blank"
																	rel="noopener noreferrer">{source.displayText.trim() ? source.displayText : sourceHref}</a>
															{:else}
																<span class="opacity-90">{source.raw}</span>
															{/if}
														</li>
													{/each}
												</ul>
											</section>
										{:else}
											<div class="{mdProseClass} prose-headings:!text-[0.95rem]">{@html body.html}</div>
										{/if}
									{:else}
										<p class="whitespace-pre-wrap text-sm {darkMode ? 'text-slate-200' : 'text-slate-800'}">{part.text}</p>
									{/if}
								{:else if part.type === 'reasoning' && message.role !== 'user'}
									<details class="mb-2 rounded-md border px-2 py-1 text-[11px] {darkMode ? 'border-slate-600 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}">
										<summary class="cursor-pointer opacity-80">Model reasoning</summary>
										<pre class="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] opacity-95">{part.text}</pre>
									</details>
								{:else if toolUi}
									{@const embeddedErr = toolResultEmbeddedError(toolUi.result)}
									<div
										class="mb-2 border-l-2 pl-2 text-[11px] {toolUi.isPending
											? 'border-blue-400'
											: toolUi.isError
												? 'border-red-400'
												: embeddedErr
													? 'border-amber-400'
													: 'border-emerald-500'}"
									>
										<div class="flex flex-wrap items-center gap-2 opacity-95">
											{#if toolUi.isPending}
												<span class="inline-block size-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-indigo-500" aria-hidden="true"></span>
												<span>Running <code class="rounded bg-black/10 px-1">{toolUi.name}</code>…</span>
												<span class="rounded bg-amber-500/15 px-1.5 py-px text-[9px] uppercase">{toolUi.state}</span>
											{:else if toolUi.isError}
												<span class="font-medium text-red-500">Tool failed: <code>{toolUi.name}</code></span>
											{:else if embeddedErr}
												<span class="font-medium text-amber-600 dark:text-amber-400">Completed with error</span>
											{:else}
												<span class="font-medium text-emerald-600 dark:text-emerald-400"><code>{toolUi.name}</code> finished</span>
											{/if}
										</div>
										<details class="mt-1">
											<summary class="cursor-pointer opacity-75">Arguments</summary>
											<pre class="mt-1 max-h-32 overflow-auto rounded border px-2 py-1 font-mono text-[10px] {darkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'}">{JSON.stringify(toolUi.args ?? {}, null, 2)}</pre>
										</details>
										{#if toolUi.isSuccess || toolUi.isError}
											<details class="mt-1" open={toolUi.isError || !!embeddedErr}>
												<summary>{toolUi.isError ? 'Error detail' : 'Result'}</summary>
												{#if toolUi.isError && toolUi.errorText}
													<pre class="mt-1 whitespace-pre-wrap text-[10px] text-red-500">{toolUi.errorText}</pre>
												{:else if embeddedErr}
													<pre class="mt-1 whitespace-pre-wrap text-[10px] text-amber-600">{embeddedErr}</pre>
													<pre class="mt-1 max-h-40 overflow-auto rounded border px-2 py-1 font-mono text-[10px]">{JSON.stringify(toolUi.result, null, 2)}</pre>
												{:else}
													<pre class="mt-1 max-h-40 overflow-auto rounded border px-2 py-1 font-mono text-[10px]">{JSON.stringify(toolUi.result, null, 2)}</pre>
												{/if}
											</details>
										{/if}
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
				{#if executing}
					<p class="animate-pulse px-1 text-[11px] opacity-70 {darkMode ? 'text-slate-400' : 'text-slate-500'}">Agent is thinking…</p>
				{/if}
				{#if chat.messages.length === 0 && !streamError}
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

		{#if !embedded}
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
		{/if}

		<!-- Composer: prompt area grows to fill space above Run/Cancel -->
		<div
			class="flex min-h-0 flex-col overflow-hidden border-t px-3 py-2.5 {embedded
				? 'max-h-[46vh] min-h-[140px] shrink-0 overflow-y-auto'
				: 'flex-1'} {darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50/90'}"
		>
				<div
					bind:this={composerSplitRowEl}
					class="flex min-h-0 flex-1 {composerTwoColumn ? 'min-h-0 flex-row gap-0' : 'flex-col gap-2'}"
				>
					<!-- Left column: prompt composer -->
					<div
						class="flex min-h-0 min-w-[180px] flex-1 flex-col gap-2 {composerTwoColumn
							? toolsPanelExpanded
								? 'min-w-0'
								: 'min-w-0 pr-1'
							: ''}"
					>
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
									placeholder={selectedPrompt
										? 'Template loaded from the selected prompt — edit here for runs…'
										: 'Choose a prompt in the library to load its text here, then run or edit…'}
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
								disabled={executing || !question.trim() || !selectedPrompt}
								class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{executing ? 'Running…' : 'Run'}
							</button>
							{#if executing}
								<button
									type="button"
									onclick={() => onCancel()}
									class="rounded-lg border px-3 py-1.5 text-xs font-medium {darkMode
										? 'border-slate-500 text-slate-200 hover:bg-slate-700'
										: 'border-slate-300 text-slate-700 hover:bg-slate-100'}"
								>
									Cancel
								</button>
							{/if}

							<button
								type="button"
								class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors {toolsButtonPressedClass}"
								aria-pressed={toolsPanelExpanded}
								title={structuredActive ? 'Show Tools tab in the side panel' : 'Open or close the side panel (Tools tab)'}
								aria-controls={toolsPanelExpanded ? 'prompt-chat-composer-side-panel' : undefined}
								onclick={onToolsButtonClick}
							>
								<svg
									class="h-3.5 w-3.5 shrink-0 opacity-80"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
									/>
								</svg>
								Tools
							</button>
						</div>
					</div>

					{#if toolsPanelExpanded && !embedded}
						<button
							type="button"
							aria-label="Resize prompt and tools panel"
							class="w-1.5 shrink-0 cursor-col-resize touch-none border-0 p-0 select-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-500 {darkMode
								? 'bg-transparent hover:bg-slate-600/80'
								: 'bg-transparent hover:bg-slate-300/90'}"
							onpointerdown={onComposerToolsResizePointerDown}
							onkeydown={(e) => {
								if (!composerSplitRowEl) return;
								const rowW = composerSplitRowEl.getBoundingClientRect().width;
								const step = e.shiftKey ? 24 : 12;
								if (e.key === 'ArrowLeft') {
									e.preventDefault();
									composerToolsPaneWidthPx = clampComposerToolsPaneWidth(
										composerToolsPaneWidthPx + step,
										rowW
									);
								} else if (e.key === 'ArrowRight') {
									e.preventDefault();
									composerToolsPaneWidthPx = clampComposerToolsPaneWidth(
										composerToolsPaneWidthPx - step,
										rowW
									);
								}
							}}
						></button>
					{/if}

					<!-- Right: Response format | Tools tabs (structured mode, or opened via Tools button) -->
					{#if structuredActive || toolsSidePanelOpen}
						{#if structuredPanelCollapsed}
							<div
								class="flex w-9 shrink-0 flex-col border-l {darkMode
									? 'border-slate-700 bg-slate-900/60'
									: 'border-slate-200 bg-slate-100/90'}"
							>
								<button
									type="button"
									class="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-0 py-2 transition-colors {darkMode
										? 'text-slate-400 hover:bg-slate-800 hover:text-indigo-300'
										: 'text-slate-500 hover:bg-white hover:text-indigo-600'}"
									title="Open Tools & response format (←)"
									aria-label="Open Tools and response format panel to the left"
									aria-expanded="false"
									onclick={() => (structuredPanelCollapsed = false)}
								>
									<!-- Double chevron left: panel opens toward the left -->
									<svg
										class="h-5 w-5 shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2.25"
											d="M11 17l-5-5 5-5M18 17l-5-5 5-5"
										/>
									</svg>
									<span
										class="max-h-36 text-[9px] font-semibold uppercase leading-tight tracking-widest {darkMode
											? 'text-slate-500'
											: 'text-slate-400'}"
										style="writing-mode: vertical-rl; text-orientation: mixed;"
									>Tools</span>
								</button>
							</div>
						{:else}
							<div
								id="prompt-chat-composer-side-panel"
								style:width={embedded ? undefined : `${composerToolsPaneWidthPx}px`}
								class="flex min-h-0 shrink-0 flex-col overflow-hidden border-l pl-2 {darkMode
									? 'border-slate-700'
									: 'border-slate-200'} {embedded ? 'w-64 min-w-[16rem] max-w-[16rem]' : 'min-w-0'}"
							>
								<div
									class="mb-2 flex shrink-0 items-center justify-end border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}"
								>
									<button
										type="button"
										title="Hide panel to the right (→)"
										aria-label="Collapse response format and tools panel to the right"
										aria-expanded="true"
										class="mb-0.5 shrink-0 rounded-md border p-1 transition-colors {darkMode
											? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-800 hover:text-slate-200'
											: 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800'}"
										onclick={() => (structuredPanelCollapsed = true)}
									>
										<!-- Double chevron right: panel tucks away to the right -->
										<svg
											class="h-3.5 w-3.5 shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2.25"
												d="M13 7l5 5-5 5M6 7l5 5-5 5"
											/>
										</svg>
									</button>
								</div>

								<div
									class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pr-0.5"
									role="region"
									aria-label="Response format and model tools"
								>
									<div
										class="flex flex-col overflow-hidden rounded-lg border transition-[flex] {darkMode
											? 'border-slate-600 bg-slate-900/35'
											: 'border-slate-200 bg-white'} {composerAccordionSection === 'format' ? 'min-h-0 flex-1' : 'shrink-0'}"
									>
										<button
											type="button"
											id="composer-accordion-format-trigger"
											class="flex w-full shrink-0 items-center justify-between gap-2 px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider transition-colors {darkMode
												? composerAccordionSection === 'format'
													? 'bg-slate-800/90 text-slate-100'
													: 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
												: composerAccordionSection === 'format'
													? 'bg-slate-100 text-slate-900'
													: 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}"
											aria-expanded={composerAccordionSection === 'format'}
											aria-controls="composer-accordion-format-panel"
											onclick={() => toggleComposerAccordion('format')}
										>
											<span>Response format</span>
											<svg
												class="h-4 w-4 shrink-0 transition-transform {composerAccordionSection === 'format'
													? 'rotate-180'
													: ''}"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 9l-7 7-7-7"
												/>
											</svg>
										</button>
										{#if composerAccordionSection === 'format'}
											<div
												id="composer-accordion-format-panel"
												role="region"
												aria-labelledby="composer-accordion-format-trigger"
												class="flex min-h-0 flex-1 flex-col overflow-hidden border-t px-1 pb-2 pt-1 {darkMode ? 'border-slate-700' : 'border-slate-200'}"
											>
												<ResponseFormatPanel
													{darkMode}
													bind:responseFormatType
													bind:schemaProperties
													bind:schemaRequired
													bind:fieldOrder
													googleSearchActive={toolsConfig.googleSearch === true || toolsConfig.googleMaps === true}
													controlledGenerationEnabled={applyStructuredResponse}
													onToggleControlledGeneration={toggleApplyStructuredResponse}
													{onLoadSchemaFromLibrary}
												/>
											</div>
										{/if}
									</div>

									<div
										class="flex flex-col overflow-hidden rounded-lg border transition-[flex] {darkMode
											? 'border-slate-600 bg-slate-900/35'
											: 'border-slate-200 bg-white'} {composerAccordionSection === 'tools' ? 'min-h-0 flex-1' : 'shrink-0'}"
									>
										<button
											type="button"
											id="composer-accordion-tools-trigger"
											class="flex w-full shrink-0 items-center justify-between gap-2 px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider transition-colors {darkMode
												? composerAccordionSection === 'tools'
													? 'bg-slate-800/90 text-slate-100'
													: 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
												: composerAccordionSection === 'tools'
													? 'bg-slate-100 text-slate-900'
													: 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}"
											aria-expanded={composerAccordionSection === 'tools'}
											aria-controls="composer-accordion-tools-panel"
											onclick={() => toggleComposerAccordion('tools')}
										>
											<span>Tools</span>
											<svg
												class="h-4 w-4 shrink-0 transition-transform {composerAccordionSection === 'tools'
													? 'rotate-180'
													: ''}"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 9l-7 7-7-7"
												/>
											</svg>
										</button>
										{#if composerAccordionSection === 'tools'}
											<div
												id="composer-accordion-tools-panel"
												role="region"
												aria-labelledby="composer-accordion-tools-trigger"
												class="min-h-0 flex-1 overflow-y-auto border-t px-1 pb-2 pt-1 {darkMode ? 'border-slate-700' : 'border-slate-200'}"
											>
												<PromptStudioToolsToggleList bind:toolsConfig {darkMode} />
												<div
													class="mt-3 border-t pt-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}"
												>
													<button
														type="button"
														onclick={() => (showSystemInstructionPanel = !showSystemInstructionPanel)}
														class="flex w-full items-center gap-2 text-left text-[11px] font-medium uppercase tracking-wider transition-colors {darkMode
															? 'text-slate-500 hover:text-slate-300'
															: 'text-slate-400 hover:text-slate-600'}"
													>
														<svg
															class="h-3 w-3 shrink-0 transition-transform {showSystemInstructionPanel
																? 'rotate-90'
																: ''}"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															aria-hidden="true"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M9 5l7 7-7 7"
															/>
														</svg>
														System instruction
													</button>
													{#if showSystemInstructionPanel}
														<div class="mt-2">
															<textarea
																id="composer-system-instruction"
																bind:value={systemInstruction}
																placeholder="System instruction for the AI model..."
																rows="4"
																class="w-full resize-none rounded-lg border px-2.5 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 {darkMode
																	? 'border-slate-600/80 bg-slate-800/80 text-white placeholder-slate-500'
																	: 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'}"
															></textarea>
														</div>
													{/if}
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					{/if}
				</div>
		</div>
	</div>
</div>
