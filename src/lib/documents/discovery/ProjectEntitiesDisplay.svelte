<!--
	ProjectEntitiesDisplay.svelte
	
	Interactive component showing document entities with clickable count boxes
	that reveal detailed views of documents, texts, tables, and images.
	Supports fullscreen mode for better viewing of document assets.
	Users can exclude assets from analysis by unchecking the checkbox next to each item.
	Automatically detects markdown tables in text blocks and displays them in the tables section.
	
	Usage:
		<ProjectEntitiesDisplay projectId={projectId} documents={documents} />
-->

<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { extractMarkdownTables, parseMarkdownTable } from './markdownTableParser';
	import type { ProjectDocument, ExtractedTable, ViewCategory } from './types';
	import type { Text, Table, Image } from '@stratiqai/types-simple';

	import CategoryCountBox from './CategoryCountBox.svelte';
	import DetailPanel from './DetailPanel.svelte';
	import DocumentsPanel from './DocumentsPanel.svelte';
	import TextBlocksPanel from './TextBlocksPanel.svelte';
	import TablesPanel from './TablesPanel.svelte';
	import ImageGrid from './ImageGrid.svelte';

	const { projectId, documents = [] } = $props<{
		projectId: string;
		documents?: ProjectDocument[];
	}>();

	const darkMode = $derived(darkModeStore.darkMode);

	let selectedCategory = $state<ViewCategory>(null);
	let isFullscreen = $state(false);

	let excludedTexts = $state<Set<string>>(new Set());
	let excludedTables = $state<Set<string>>(new Set());
	let excludedImages = $state<Set<string>>(new Set());

	const store = validatedTopicStore;

	function collectEntities<T extends { id: string }>(prefix: string): T[] {
		void store.tree;
		const projectNode = store.at<Record<string, any>>(`documents/${projectId}`);
		if (!projectNode || typeof projectNode !== 'object') return [];

		const items: T[] = [];
		for (const docId of Object.keys(projectNode)) {
			const docNode = projectNode[docId];
			if (!docNode || typeof docNode !== 'object') continue;
			const entityGroup = docNode[prefix];
			if (!entityGroup || typeof entityGroup !== 'object') continue;
			for (const entityId of Object.keys(entityGroup)) {
				const entity = entityGroup[entityId];
				if (entity && typeof entity === 'object' && entity.id) {
					items.push(entity as T);
				}
			}
		}
		return items;
	}

	function dedup<T extends { id: string }>(items: T[]): T[] {
		const seen = new Set<string>();
		return items.filter((item) => {
			if (seen.has(item.id)) return false;
			seen.add(item.id);
			return true;
		});
	}

	const uniqueDocuments = $derived(dedup<ProjectDocument>(documents));
	const uniqueTexts = $derived(dedup(collectEntities<Text>('texts')));
	const uniqueTables = $derived(dedup(collectEntities<Table>('tables')));
	const uniqueImages = $derived(dedup(collectEntities<Image>('images')));

	// Extract markdown tables from text blocks
	const extractedTables = $derived.by(() => {
		const result: ExtractedTable[] = [];
		for (const text of uniqueTexts) {
			if (!text.text) continue;
			const markdownTables = extractMarkdownTables(text.text);
			markdownTables.forEach((markdown, index) => {
				const parsed = parseMarkdownTable(markdown);
				if (parsed.headers.length > 0) {
					result.push({
						id: `extracted-${text.id}-${index}`,
						sourceTextId: text.id,
						pageNum: text.pageNum ?? null,
						markdown,
						headers: parsed.headers,
						rows: parsed.rows
					});
				}
			});
		}
		return result;
	});

	// Counts
	const documentCount = $derived(uniqueDocuments.length);
	const textCount = $derived(uniqueTexts.length);
	const tableCount = $derived(uniqueTables.length + extractedTables.length);
	const imageCount = $derived(uniqueImages.length);
	const includedTextCount = $derived(uniqueTexts.length - excludedTexts.size);
	const includedTableCount = $derived(tableCount - excludedTables.size);
	const includedImageCount = $derived(uniqueImages.length - excludedImages.size);

	// ---- Pulse animation ----
	let prevDocCount = $state(0);
	let prevTextCount = $state(0);
	let prevTableCount = $state(0);
	let prevImageCount = $state(0);

	let docDelta = $state(0);
	let textDelta = $state(0);
	let tableDelta = $state(0);
	let imageDelta = $state(0);

	let docPulse = $state(false);
	let textPulse = $state(false);
	let tablePulse = $state(false);
	let imagePulse = $state(false);

	let docTimer: ReturnType<typeof setTimeout> | null = null;
	let textTimer: ReturnType<typeof setTimeout> | null = null;
	let tableTimer: ReturnType<typeof setTimeout> | null = null;
	let imageTimer: ReturnType<typeof setTimeout> | null = null;

	const PULSE_MS = 1800;

	function triggerPulse(category: 'doc' | 'text' | 'table' | 'image', delta: number) {
		if (category === 'doc') {
			docDelta = delta; docPulse = true;
			if (docTimer) clearTimeout(docTimer);
			docTimer = setTimeout(() => { docPulse = false; docDelta = 0; }, PULSE_MS);
		} else if (category === 'text') {
			textDelta = delta; textPulse = true;
			if (textTimer) clearTimeout(textTimer);
			textTimer = setTimeout(() => { textPulse = false; textDelta = 0; }, PULSE_MS);
		} else if (category === 'table') {
			tableDelta = delta; tablePulse = true;
			if (tableTimer) clearTimeout(tableTimer);
			tableTimer = setTimeout(() => { tablePulse = false; tableDelta = 0; }, PULSE_MS);
		} else {
			imageDelta = delta; imagePulse = true;
			if (imageTimer) clearTimeout(imageTimer);
			imageTimer = setTimeout(() => { imagePulse = false; imageDelta = 0; }, PULSE_MS);
		}
	}

	$effect(() => { const c = documentCount; if (c > prevDocCount && prevDocCount > 0) triggerPulse('doc', c - prevDocCount); prevDocCount = c; });
	$effect(() => { const c = textCount; if (c > prevTextCount && prevTextCount > 0) triggerPulse('text', c - prevTextCount); prevTextCount = c; });
	$effect(() => { const c = tableCount; if (c > prevTableCount && prevTableCount > 0) triggerPulse('table', c - prevTableCount); prevTableCount = c; });
	$effect(() => { const c = imageCount; if (c > prevImageCount && prevImageCount > 0) triggerPulse('image', c - prevImageCount); prevImageCount = c; });

	// ---- Exclusion toggles ----
	function toggleExclusion(set: Set<string>, id: string): Set<string> {
		const next = new Set(set);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		return next;
	}
	function toggleTextExclusion(id: string) { excludedTexts = toggleExclusion(excludedTexts, id); }
	function toggleTableExclusion(id: string) { excludedTables = toggleExclusion(excludedTables, id); }
	function toggleImageExclusion(id: string) { excludedImages = toggleExclusion(excludedImages, id); }

	// ---- Panel controls ----
	function selectCategory(category: ViewCategory) {
		selectedCategory = selectedCategory === category ? null : category;
		if (selectedCategory === null) isFullscreen = false;
	}

	function toggleFullscreen() { isFullscreen = !isFullscreen; }

	function closePanel() { selectedCategory = null; isFullscreen = false; }

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (isFullscreen) isFullscreen = false;
			else if (selectedCategory) selectedCategory = null;
		}
	}

	// Count helpers for the active category
	const activeCount = $derived(
		selectedCategory === 'documents' ? documentCount
		: selectedCategory === 'texts' ? textCount
		: selectedCategory === 'tables' ? tableCount
		: selectedCategory === 'images' ? imageCount
		: 0
	);

	const activeExcludedCount = $derived(
		selectedCategory === 'texts' ? excludedTexts.size
		: selectedCategory === 'tables' ? excludedTables.size
		: selectedCategory === 'images' ? excludedImages.size
		: 0
	);

	const activeSupportsExclusion = $derived(
		selectedCategory === 'texts' || selectedCategory === 'tables' || selectedCategory === 'images'
	);
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="project-entities-display">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<div class="w-1 h-6 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-full"></div>
			<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
				Real-time Discovery
			</h3>
		</div>
		<div class="flex items-center gap-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
			<span>Live</span>
		</div>
	</div>
	<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-4">
		Click on a category to view its contents in detail.
	</p>

	<!-- Category Count Boxes -->
	<div class="grid grid-cols-4 gap-4 mb-6">
		<CategoryCountBox
			count={documentCount}
			label="Documents"
			subtitle="📁 Uploaded"
			selected={selectedCategory === 'documents'}
			delta={docDelta}
			pulse={docPulse}
			{darkMode}
			bgNormal={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}
			bgSelected={darkMode ? 'bg-slate-600' : 'bg-slate-100'}
			borderNormal={darkMode ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'}
			borderSelected={darkMode ? 'border-slate-400' : 'border-slate-400'}
			ringColor="ring-slate-400"
			textColor={darkMode ? 'text-slate-200' : 'text-slate-700'}
			deltaBg="bg-slate-500"
			onclick={() => selectCategory('documents')}
		/>

		<CategoryCountBox
			count={textCount}
			label="Text Blocks"
			subtitle="📄 {excludedTexts.size > 0 ? `${includedTextCount} included` : 'Discovered'}"
			selected={selectedCategory === 'texts'}
			delta={textDelta}
			pulse={textPulse}
			{darkMode}
			bgNormal={darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}
			bgSelected={darkMode ? 'bg-blue-800/40' : 'bg-blue-100'}
			borderNormal={darkMode ? 'border-blue-500/30 hover:border-blue-400/50' : 'border-blue-200 hover:border-blue-300'}
			borderSelected={darkMode ? 'border-blue-400' : 'border-blue-400'}
			ringColor="ring-blue-400"
			textColor="text-blue-600 dark:text-blue-400"
			deltaBg="bg-blue-500"
			hoverShadow="shadow-blue-500/20"
			onclick={() => selectCategory('texts')}
		/>

		<CategoryCountBox
			count={tableCount}
			label="Tables"
			subtitle="📊 {extractedTables.length > 0 ? `${uniqueTables.length} + ${extractedTables.length} from text` : (excludedTables.size > 0 ? `${includedTableCount} included` : 'Discovered')}"
			selected={selectedCategory === 'tables'}
			delta={tableDelta}
			pulse={tablePulse}
			{darkMode}
			bgNormal={darkMode ? 'bg-green-900/20' : 'bg-green-50'}
			bgSelected={darkMode ? 'bg-green-800/40' : 'bg-green-100'}
			borderNormal={darkMode ? 'border-green-500/30 hover:border-green-400/50' : 'border-green-200 hover:border-green-300'}
			borderSelected={darkMode ? 'border-green-400' : 'border-green-400'}
			ringColor="ring-green-400"
			textColor="text-green-600 dark:text-green-400"
			deltaBg="bg-green-500"
			hoverShadow="shadow-green-500/20"
			onclick={() => selectCategory('tables')}
		/>

		<CategoryCountBox
			count={imageCount}
			label="Images"
			subtitle="🖼️ {excludedImages.size > 0 ? `${includedImageCount} included` : 'Discovered'}"
			selected={selectedCategory === 'images'}
			delta={imageDelta}
			pulse={imagePulse}
			{darkMode}
			bgNormal={darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}
			bgSelected={darkMode ? 'bg-purple-800/40' : 'bg-purple-100'}
			borderNormal={darkMode ? 'border-purple-500/30 hover:border-purple-400/50' : 'border-purple-200 hover:border-purple-300'}
			borderSelected={darkMode ? 'border-purple-400' : 'border-purple-400'}
			ringColor="ring-purple-400"
			textColor="text-purple-600 dark:text-purple-400"
			deltaBg="bg-purple-500"
			hoverShadow="shadow-purple-500/20"
			onclick={() => selectCategory('images')}
		/>
	</div>

	<!-- Detail Panel (inline or fullscreen) -->
	{#if selectedCategory}
		<DetailPanel
			category={selectedCategory}
			fullscreen={isFullscreen}
			{darkMode}
			count={activeCount}
			excludedCount={activeExcludedCount}
			supportsExclusion={activeSupportsExclusion}
			onToggleFullscreen={toggleFullscreen}
			onClose={closePanel}
		>
			{#snippet children({ fullscreen })}
				{#if selectedCategory === 'documents'}
					<DocumentsPanel documents={uniqueDocuments} {fullscreen} {darkMode} />
				{:else if selectedCategory === 'texts'}
					<TextBlocksPanel texts={uniqueTexts} excludedIds={excludedTexts} {fullscreen} {darkMode} onToggleExclusion={toggleTextExclusion} />
				{:else if selectedCategory === 'tables'}
					<TablesPanel tables={uniqueTables} {extractedTables} excludedIds={excludedTables} {fullscreen} {darkMode} onToggleExclusion={toggleTableExclusion} />
				{:else if selectedCategory === 'images'}
					<ImageGrid images={uniqueImages} excludedIds={excludedImages} {fullscreen} {darkMode} onToggleExclusion={toggleImageExclusion} />
				{/if}
			{/snippet}
		</DetailPanel>
	{:else}
		<div class="text-center py-6 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			<p class="text-sm">Select a category above to view its contents.</p>
		</div>
	{/if}
</div>
