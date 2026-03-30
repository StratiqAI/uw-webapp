<script lang="ts">
	import { onMount } from 'svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { streamCatalog } from '$lib/stores/streamCatalog.svelte';
	import { countTopics } from './utils';
	import TopicTree from './TopicTree.svelte';
	import DetailPanel from './DetailPanel.svelte';
	import SchemaExplorer from './SchemaExplorer.svelte';
	import StreamsPanel from './StreamsPanel.svelte';
	import PublishPanel from './PublishPanel.svelte';

	let activeTab = $state<'topics' | 'streams'>('topics');

	let darkMode = $derived(darkModeStore.darkMode);

	const SIDEBAR_MIN = 200;
	const SIDEBAR_MAX = 560;
	const SIDEBAR_DEFAULT = 280;

	let selectedTopic = $state<string | null>(null);
	let treeFilter = $state('');
	let publishOpen = $state(false);
	let errorsOpen = $state(false);
	let sidebarWidth = $state(SIDEBAR_DEFAULT);
	let rightSidebarWidth = $state(SIDEBAR_DEFAULT);

	function clampSidebarWidth(w: number): number {
		if (typeof window === 'undefined') return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w));
		const maxByViewport = Math.floor(window.innerWidth * 0.5);
		return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w), maxByViewport);
	}

	function onSidebarResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = sidebarWidth;

		function onMove(ev: PointerEvent) {
			sidebarWidth = clampSidebarWidth(startW + (ev.clientX - startX));
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

	function onRightSidebarResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
		const startX = e.clientX;
		const startW = rightSidebarWidth;

		function onMove(ev: PointerEvent) {
			// Dragging the handle left widens the right panel.
			rightSidebarWidth = clampSidebarWidth(startW - (ev.clientX - startX));
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

	onMount(() => {
		function onResize() {
			sidebarWidth = clampSidebarWidth(sidebarWidth);
			rightSidebarWidth = clampSidebarWidth(rightSidebarWidth);
		}
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	let stats = $derived.by(() => {
		void validatedTopicStore.tree;
		void validatedTopicStore.schemaVersion;
		const { total } = countTopics(validatedTopicStore.tree);
		return {
			topics: total,
			schemas: validatedTopicStore.getRegisteredSchemas().length,
			errors: validatedTopicStore.errors.size,
			schemaVersion: validatedTopicStore.schemaVersion,
			streams: streamCatalog.streams.length
		};
	});

	let errorEntries = $derived(Array.from(validatedTopicStore.errors.entries()));

	function handleSelect(topic: string) {
		selectedTopic = topic;
	}

	function handleDelete(topic: string) {
		validatedTopicStore.delete(topic);
		if (selectedTopic === topic) selectedTopic = null;
	}

	function handleClear(path: string) {
		validatedTopicStore.clearAllAt(path);
	}
</script>

<div class="flex h-screen w-full flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Header -->
	<header class="flex h-12 shrink-0 items-center justify-between border-b px-4 {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} shadow-sm">
		<div class="flex items-center gap-3">
			<a href="/admin/store" class="flex items-center gap-2">
				<svg class="h-5 w-5 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
				</svg>
				<h1 class="text-sm font-semibold {darkMode ? 'text-slate-100' : 'text-slate-900'}">Knowledge Map</h1>
			</a>
			<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>

			<!-- Stats pills -->
			<div class="flex items-center gap-2">
				<span class="rounded-full px-2 py-0.5 text-xs font-medium {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}">
					{stats.topics} topics
				</span>
				<span class="rounded-full px-2 py-0.5 text-xs font-medium {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}">
					{stats.schemas} schemas
				</span>
				<button
					type="button"
					class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors
						{stats.errors > 0
							? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
							: (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}"
					onclick={() => errorsOpen = !errorsOpen}
				>
					{stats.errors} error{stats.errors !== 1 ? 's' : ''}
				</button>
				<span class="rounded-full px-2 py-0.5 text-xs font-medium {darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}">
					v{stats.schemaVersion}
				</span>
				<button
					type="button"
					class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors
						{activeTab === 'streams'
							? (darkMode ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-700')
							: (darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}"
					onclick={() => activeTab = activeTab === 'streams' ? 'topics' : 'streams'}
				>
					{stats.streams} stream{stats.streams !== 1 ? 's' : ''}
				</button>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				class="rounded px-2.5 py-1 text-xs font-medium transition-colors
					{publishOpen
						? (darkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700')
						: (darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}"
				onclick={() => publishOpen = !publishOpen}
			>
				Publish
			</button>
		</div>
	</header>

	<!-- Errors overlay -->
	{#if errorsOpen && errorEntries.length > 0}
		<div class="border-b {darkMode ? 'border-red-800/50 bg-red-900/10' : 'border-red-200 bg-red-50'} max-h-48 overflow-y-auto">
			<div class="p-3 space-y-2">
				{#each errorEntries as [topic, errs]}
					<div class="flex items-start gap-2">
						<button
							type="button"
							class="font-mono text-xs font-medium {darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} underline transition-colors"
							onclick={() => { selectedTopic = topic; errorsOpen = false; }}
						>{topic}</button>
						<span class="text-xs {darkMode ? 'text-red-300/70' : 'text-red-500'}">
							{Array.isArray(errs) ? errs.map((e: { message?: string }) => e.message).join('; ') : String(errs)}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Streams panel (full-width, replaces topic/schema layout when active) -->
	{#if activeTab === 'streams'}
		<div class="flex flex-1 overflow-hidden">
			<StreamsPanel {darkMode} />
		</div>
	{/if}

	<!-- Main 3-column body (hidden when streams tab is active) -->
	<div class="flex flex-1 overflow-hidden" class:hidden={activeTab === 'streams'}>
		<!-- Left: Topic Tree -->
		<div
			class="flex shrink-0 flex-col overflow-hidden {darkMode ? 'bg-slate-800/50' : 'bg-white'}"
			style="width: {sidebarWidth}px"
		>
			<div class="flex items-center gap-2 border-b p-2 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<svg class="h-3.5 w-3.5 shrink-0 {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
				</svg>
				<input
					type="text"
					placeholder="Filter topics..."
					class="w-full border-0 bg-transparent px-0 py-1 text-xs
						{darkMode ? 'text-slate-200 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}
						focus:outline-none"
					bind:value={treeFilter}
				/>
			</div>
			<TopicTree
				{selectedTopic}
				onselect={handleSelect}
				ondelete={handleDelete}
				onclear={handleClear}
				{darkMode}
				filter={treeFilter}
			/>
		</div>

		<div
			role="slider"
			tabindex="0"
			aria-label="Topic tree panel width"
			aria-valuenow={sidebarWidth}
			aria-valuemin={SIDEBAR_MIN}
			aria-valuemax={SIDEBAR_MAX}
			aria-orientation="horizontal"
			class="w-1.5 shrink-0 cursor-col-resize touch-none select-none
				{darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}
				focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500"
			onpointerdown={onSidebarResizePointerDown}
			onkeydown={(e) => {
				const step = e.shiftKey ? 40 : 12;
				if (e.key === 'ArrowLeft') {
					e.preventDefault();
					sidebarWidth = clampSidebarWidth(sidebarWidth - step);
				} else if (e.key === 'ArrowRight') {
					e.preventDefault();
					sidebarWidth = clampSidebarWidth(sidebarWidth + step);
				}
			}}
		></div>

		<!-- Center: Detail Panel -->
		<div class="flex flex-1 flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			{#if selectedTopic}
				<DetailPanel topic={selectedTopic} {darkMode} />
			{:else}
				<div class="flex flex-1 items-center justify-center">
					<div class="text-center">
						<svg class="mx-auto h-12 w-12 {darkMode ? 'text-slate-700' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
						</svg>
						<p class="mt-3 text-sm {darkMode ? 'text-slate-500' : 'text-slate-400'}">Select a topic to inspect</p>
						<p class="mt-1 text-xs {darkMode ? 'text-slate-600' : 'text-slate-300'}">Browse the tree on the left or click a schema pattern on the right</p>
					</div>
				</div>
			{/if}
		</div>

		<div
			role="slider"
			tabindex="0"
			aria-label="Schemas panel width"
			aria-valuenow={rightSidebarWidth}
			aria-valuemin={SIDEBAR_MIN}
			aria-valuemax={SIDEBAR_MAX}
			aria-orientation="horizontal"
			class="w-1.5 shrink-0 cursor-col-resize touch-none select-none
				{darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}
				focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500"
			onpointerdown={onRightSidebarResizePointerDown}
			onkeydown={(e) => {
				const step = e.shiftKey ? 40 : 12;
				if (e.key === 'ArrowLeft') {
					e.preventDefault();
					rightSidebarWidth = clampSidebarWidth(rightSidebarWidth + step);
				} else if (e.key === 'ArrowRight') {
					e.preventDefault();
					rightSidebarWidth = clampSidebarWidth(rightSidebarWidth - step);
				}
			}}
		></div>

		<!-- Right: Schema Explorer -->
		<div
			class="flex shrink-0 flex-col overflow-hidden {darkMode ? 'bg-slate-800/50' : 'bg-white'}"
			style="width: {rightSidebarWidth}px"
		>
			<div class="border-b px-3 py-2.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<h2 class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">Schemas</h2>
			</div>
			<SchemaExplorer {darkMode} onSelectTopic={handleSelect} />
		</div>
	</div>

	<!-- Bottom: Publish Panel -->
	<PublishPanel {darkMode} isOpen={publishOpen} ontoggle={() => publishOpen = !publishOpen} />
</div>
