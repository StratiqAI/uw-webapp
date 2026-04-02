<script lang="ts">
	import type { Prompt } from '@stratiqai/types-simple';
	import { Q_LIST_PROMPTS } from '$lib/graphql/promptOperations';
	import { GraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';
	import { browser } from '$app/environment';
	import PromptDetailPanel from './PromptDetailPanel.svelte';

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
		idToken: string | undefined;
		darkMode?: boolean;
		executions?: Map<string, PromptExecution>;
		canRunPrompt?: boolean;
		selectedDocFilename?: string | null;
		onRunPrompt?: (prompt: Prompt) => void;
		onEditPrompt?: (prompt: Prompt) => void;
		onCreatePrompt?: () => void;
		onDeletePrompt?: (prompt: Prompt) => Promise<void>;
		onClearResult?: (promptId: string) => void;
		onSendToDashboard?: (prompt: Prompt) => void;
		refreshTrigger?: number;
	}

	let {
		idToken,
		darkMode = true,
		executions = new Map(),
		canRunPrompt = true,
		selectedDocFilename = null,
		onRunPrompt,
		onEditPrompt,
		onCreatePrompt,
		onDeletePrompt,
		onClearResult,
		onSendToDashboard,
		refreshTrigger = 0
	}: Props = $props();

	// ---- Sidebar width / open state (localStorage-persisted) ----
	const LS_WIDTH = 'prompts.sidebarWidth';
	const LS_OPEN = 'prompts.sidebarOpen';
	const DEFAULT_WIDTH = 380;
	const MIN_WIDTH = 300;
	const COLLAPSED_WIDTH = 44;

	function loadWidth(): number {
		if (!browser) return DEFAULT_WIDTH;
		const v = Number(localStorage.getItem(LS_WIDTH));
		return Number.isFinite(v) && v >= MIN_WIDTH ? v : DEFAULT_WIDTH;
	}
	function loadOpen(): boolean {
		if (!browser) return true;
		const v = localStorage.getItem(LS_OPEN);
		return v === null ? true : v === 'true';
	}
	function maxWidth(): number {
		return Math.min(Math.round((globalThis?.innerWidth ?? 1400) * 0.6), 900);
	}
	function clampWidth(px: number): number {
		return Math.max(MIN_WIDTH, Math.min(maxWidth(), Math.round(px)));
	}

	let sidebarWidth = $state(loadWidth());
	let isOpen = $state(loadOpen());

	function persistWidth(px: number) {
		sidebarWidth = clampWidth(px);
		try { localStorage.setItem(LS_WIDTH, String(sidebarWidth)); } catch {}
	}
	function persistOpen(open: boolean) {
		isOpen = open;
		try { localStorage.setItem(LS_OPEN, String(open)); } catch {}
	}

	// ---- Drag-resize logic (same pattern as RightChatDrawer) ----
	let startX = 0;
	let startWidth = 0;
	let resizing = $state(false);

	function beginResize(e: PointerEvent) {
		if (e.button !== 0) return;
		resizing = true;
		startX = e.clientX;
		startWidth = sidebarWidth;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		document.documentElement.classList.add('select-none');
	}
	function onResizeMove(e: PointerEvent) {
		if (!resizing) return;
		const delta = startX - e.clientX;
		persistWidth(startWidth + delta);
	}
	function endResize(e: PointerEvent) {
		if (!resizing) return;
		resizing = false;
		try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
		document.documentElement.classList.remove('select-none');
	}

	// ---- Prompt data ----
	let prompts = $state<Prompt[]>([]);
	let promptsLoading = $state(false);
	let promptsError = $state<string | null>(null);

	async function loadPrompts() {
		if (!idToken) return;
		promptsLoading = true;
		promptsError = null;
		try {
			const queryClient = new GraphQLQueryClient(idToken);
			const response = await queryClient.query<{ listPrompts: { items: Prompt[] } }>(Q_LIST_PROMPTS, {
				scope: 'OWNED_BY_ME',
				limit: 200
			});
			prompts = response?.listPrompts?.items ?? [];
		} catch (err) {
			console.error('Failed to load prompts:', err);
			promptsError = err instanceof Error ? err.message : 'Failed to load prompts';
			prompts = [];
		} finally {
			promptsLoading = false;
		}
	}

	let hasFetched = $state(false);
	$effect(() => {
		if (!idToken) return;
		if (!hasFetched && !promptsLoading) {
			hasFetched = true;
			loadPrompts();
		}
	});
	$effect(() => {
		if (idToken && refreshTrigger > 0) loadPrompts();
	});

	// ---- Search + grouping ----
	let searchQuery = $state('');
	type GroupMode = 'recent' | 'az' | 'model' | 'format';
	let groupMode = $state<GroupMode>('recent');

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

	const filtered = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		const list = q
			? prompts.filter(p =>
				p.name.toLowerCase().includes(q) ||
				(p.description && p.description.toLowerCase().includes(q)) ||
				(p.prompt && p.prompt.toLowerCase().includes(q))
			)
			: prompts;
		return list;
	});

	interface PromptGroup { label: string; prompts: Prompt[] }

	const grouped = $derived.by((): PromptGroup[] => {
		const list = filtered;
		if (list.length === 0) return [];

		if (groupMode === 'recent') {
			const sorted = [...list].sort((a, b) => {
				const da = a.updatedAt ?? a.createdAt ?? '';
				const db = b.updatedAt ?? b.createdAt ?? '';
				return db.localeCompare(da);
			});
			return [{ label: '', prompts: sorted }];
		}

		if (groupMode === 'az') {
			const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
			const groups = new Map<string, Prompt[]>();
			for (const p of sorted) {
				const letter = (p.name[0] ?? '#').toUpperCase();
				const arr = groups.get(letter) ?? [];
				arr.push(p);
				groups.set(letter, arr);
			}
			return Array.from(groups.entries()).map(([label, prompts]) => ({ label, prompts }));
		}

		if (groupMode === 'model') {
			const groups = new Map<string, Prompt[]>();
			for (const p of list) {
				const key = p.model ?? 'Unknown';
				const arr = groups.get(key) ?? [];
				arr.push(p);
				groups.set(key, arr);
			}
			return Array.from(groups.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, prompts]) => ({ label: modelLabel(key), prompts }));
		}

		// format
		const structured: Prompt[] = [];
		const text: Prompt[] = [];
		for (const p of list) {
			if ((p as { jsonSchemaId?: string }).jsonSchemaId) structured.push(p);
			else text.push(p);
		}
		const groups: PromptGroup[] = [];
		if (structured.length) groups.push({ label: 'Structured Output', prompts: structured });
		if (text.length) groups.push({ label: 'Text Output', prompts: text });
		return groups;
	});

	// ---- Detail view state ----
	let selectedPrompt = $state<Prompt | null>(null);

	function selectPrompt(p: Prompt) { selectedPrompt = p; }
	function backToList() { selectedPrompt = null; }

	function handleDeleteAndReturn(prompt: Prompt) {
		onDeletePrompt?.(prompt).then(() => {
			selectedPrompt = null;
			loadPrompts();
		});
	}

	function getBodySnippet(prompt: Prompt): string {
		const body = prompt.prompt ?? '';
		return body.length > 80 ? body.slice(0, 80) + '...' : body;
	}
</script>

<div
	class="relative flex shrink-0 flex-col border-l {darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}"
	style="width: {isOpen ? sidebarWidth + 'px' : COLLAPSED_WIDTH + 'px'};"
>
	<!-- Resize drag handle (left edge) -->
	{#if isOpen}
		<div
			title="Drag to resize"
			onpointerdown={beginResize}
			onpointermove={onResizeMove}
			onpointerup={endResize}
			onpointercancel={endResize}
			class="group absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize"
		>
			<div class="absolute -left-1 top-0 h-full w-3"></div>
			<div class="h-full w-px {darkMode ? 'bg-slate-600' : 'bg-slate-300'} opacity-0 transition-opacity group-hover:opacity-100 {resizing ? 'opacity-100' : ''}"></div>
		</div>
	{/if}

	<!-- Toggle button -->
	<button
		type="button"
		onclick={() => persistOpen(!isOpen)}
		class="flex h-10 w-full items-center {isOpen ? 'justify-end px-2' : 'justify-center'} {darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'} transition-colors shrink-0"
		aria-label={isOpen ? 'Collapse prompts' : 'Expand prompts'}
		title="Prompts"
	>
		{#if isOpen}
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
			</svg>
		{:else}
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
			</svg>
		{/if}
	</button>

	{#if isOpen}
		<div class="flex flex-1 flex-col overflow-hidden">
			{#if selectedPrompt}
				<!-- Detail View -->
				<PromptDetailPanel
					prompt={selectedPrompt}
					{darkMode}
					execution={executions.get(selectedPrompt.id) ?? null}
					{canRunPrompt}
					{selectedDocFilename}
					onBack={backToList}
					onRun={(p) => onRunPrompt?.(p)}
					onEdit={(p) => onEditPrompt?.(p)}
					onDelete={handleDeleteAndReturn}
					onClear={(pid) => onClearResult?.(pid)}
					onSendToDashboard={(p) => onSendToDashboard?.(p)}
				/>
			{:else}
				<!-- List View -->
				<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<h2 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Prompts</h2>
					<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">Browse, create, and test</p>
				</div>

				{#if onCreatePrompt}
					<div class="px-3 pt-3">
						<button
							type="button"
							onclick={onCreatePrompt}
							class="flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors {darkMode ? 'border-indigo-600 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40' : 'border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							Create new prompt
						</button>
					</div>
				{/if}

				<!-- Search + Group-by -->
				<div class="flex items-center gap-2 px-3 pt-2">
					<div class="relative flex-1">
						<svg class="absolute left-2.5 top-2 h-4 w-4 {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search..."
							class="w-full rounded-lg border py-1.5 pl-8 pr-3 text-sm {darkMode ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}"
						/>
					</div>
					<select
						bind:value={groupMode}
						class="rounded-lg border py-1.5 pl-2 pr-6 text-xs {darkMode ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-slate-300 bg-white text-slate-700'}"
					>
						<option value="recent">Recent</option>
						<option value="az">A-Z</option>
						<option value="model">Model</option>
						<option value="format">Format</option>
					</select>
				</div>

				<!-- Prompt List -->
				<div class="flex-1 overflow-y-auto px-3 py-3">
					{#if promptsLoading}
						<div class="flex items-center justify-center py-8">
							<svg class="animate-spin h-6 w-6 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						</div>
					{:else if promptsError}
						<p class="text-sm {darkMode ? 'text-red-400' : 'text-red-600'}">{promptsError}</p>
					{:else if filtered.length === 0}
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							{searchQuery.trim() ? 'No prompts match your search.' : 'No prompts yet.'}
						</p>
					{:else}
						{#each grouped as group (group.label)}
							{#if group.label}
								<div class="mb-1 mt-3 first:mt-0">
									<p class="px-1 text-[10px] font-semibold uppercase tracking-wider {darkMode ? 'text-slate-500' : 'text-slate-400'}">
										{group.label}
									</p>
								</div>
							{/if}
							<div class="grid grid-cols-1 gap-1.5">
								{#each group.prompts as prompt (prompt.id)}
								{@const exec = executions.get(prompt.id)}
								{@const isRunning = exec?.loading === true}
								{@const hasResult = !exec?.loading && exec?.result != null}
								{@const hasError = !exec?.loading && exec?.error != null}
									<button
										type="button"
										onclick={() => selectPrompt(prompt)}
										class="relative flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors {isRunning ? (darkMode ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-indigo-300 bg-indigo-50/40') : hasResult ? (darkMode ? 'border-emerald-500/30 bg-emerald-900/5' : 'border-emerald-300 bg-emerald-50/30') : hasError ? (darkMode ? 'border-red-500/30 bg-red-900/5' : 'border-red-300 bg-red-50/30') : (darkMode ? 'border-slate-700 bg-slate-800/40 hover:border-indigo-500/40 hover:bg-slate-800' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30')}"
									>
										<!-- Status badge (top-right corner) -->
										{#if isRunning}
											<div class="absolute right-2 top-2">
												<svg class="animate-spin h-3.5 w-3.5 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
													<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
											</div>
										{:else if hasResult}
											<div class="absolute right-2 top-2">
												<svg class="h-3.5 w-3.5 {darkMode ? 'text-emerald-400' : 'text-emerald-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
											</div>
										{:else if hasError}
											<div class="absolute right-2 top-2">
												<svg class="h-3.5 w-3.5 {darkMode ? 'text-red-400' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
											</div>
										{/if}

										<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded {darkMode ? 'bg-slate-700' : 'bg-slate-100'}">
											<svg class="h-3.5 w-3.5 {darkMode ? 'text-slate-300' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} truncate">{prompt.name}</p>
											<p class="mt-0.5 line-clamp-1 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
												{prompt.description || getBodySnippet(prompt)}
											</p>
											<div class="mt-1 flex items-center gap-1.5">
												<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}">
													{modelLabel(prompt.model ?? 'Unknown')}
												</span>
												{#if (prompt as { jsonSchemaId?: string }).jsonSchemaId}
													<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium {darkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}">
														Structured
													</span>
												{/if}
											</div>
										</div>
									</button>
								{/each}
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
