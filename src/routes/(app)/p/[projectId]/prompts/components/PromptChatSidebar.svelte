<script lang="ts">
	import { getContext, onMount, tick, untrack } from 'svelte';
	import { marked } from 'marked';
	import type { Prompt } from '@stratiqai/types-simple';
	import type { AiStudioToolsConfig } from '$lib/types/ai-studio.js';
	import PromptStudioToolsToggleList from './PromptStudioToolsToggleList.svelte';
	import ResponseFormatPanel from './ResponseFormatPanel.svelte';
	import SendToDashboardButton from '$lib/documents/discovery/SendToDashboardButton.svelte';
	import {
		PROMPTS_ADD_CHAT_TO_DASHBOARD,
		type PromptsAddChatToDashboardContext
	} from '../promptsDashboardContext';
	import { WORKSPACE_DEFAULT_SYSTEM_INSTRUCTION } from '../workspacePromptDefaults';

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
		chatHistory = [],
		extraVarNames,
		extraVarValues = $bindable<Record<string, string>>({}),
		toolsConfig = $bindable<AiStudioToolsConfig>({}),
		responseFormatType = $bindable<'text' | 'json_object' | 'json_schema'>('json_schema'),
		schemaProperties = $bindable<Record<string, Record<string, unknown>>>({}),
		schemaRequired = $bindable<string[]>([]),
		fieldOrder = $bindable<string[]>([]),
		onLoadSchemaFromLibrary,
		streamingText,
		executing,
		streamError,
		onRun,
		onCancel: _onCancel,
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
		/** Completed assistant turns, oldest first. */
		chatHistory?: { id: string; text: string }[];
		extraVarNames: string[];
		extraVarValues?: Record<string, string>;
		toolsConfig?: AiStudioToolsConfig;
		responseFormatType?: 'text' | 'json_object' | 'json_schema';
		schemaProperties?: Record<string, Record<string, unknown>>;
		schemaRequired?: string[];
		fieldOrder?: string[];
		onLoadSchemaFromLibrary?: () => void;
		streamingText: string;
		executing: boolean;
		streamError: string;
		onRun: () => void;
		onCancel: () => void;
		addToDashboardButtonLabel?: string;
		/** Dialog layout: no drag resize; flex-based message/composer split. */
		embedded?: boolean;
	}>();

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
									buttonLabel={addToDashboardButtonLabel}
									colorClasses={dashboardBtnColors}
									onSend={(tabId) => {
										void sendChatToDashboard(turn.text, tabId);
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
									buttonLabel={addToDashboardButtonLabel}
									colorClasses={dashboardBtnColors}
									onSend={(tabId) => {
										void sendChatToDashboard(streamingText, tabId);
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
