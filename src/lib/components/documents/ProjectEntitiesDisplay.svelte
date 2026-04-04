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
	import { getProjectTextsStore, getProjectTablesStore, getProjectImagesStore } from '$lib/stores/projectEntitiesStore';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import type { Text, Table, Image } from '@stratiqai/types-simple';

	// Document type matching what's passed from parent
	interface ProjectDocument {
		id: string;
		filename: string;
	}

	// Extracted table from text block
	interface ExtractedTable {
		id: string;
		sourceTextId: string;
		pageNum: number | null;
		markdown: string;
		headers: string[];
		rows: string[][];
	}

	type ViewCategory = 'documents' | 'texts' | 'tables' | 'images' | null;

	const { projectId, documents = [] } = $props<{
		projectId: string;
		documents?: ProjectDocument[];
	}>();

	// Dark mode support
	const darkMode = $derived(darkModeStore.darkMode);

	// Currently selected view category
	let selectedCategory = $state<ViewCategory>(null);
	
	// Fullscreen mode
	let isFullscreen = $state(false);

	// Track excluded items by their IDs
	let excludedTexts = $state<Set<string>>(new Set());
	let excludedTables = $state<Set<string>>(new Set());
	let excludedImages = $state<Set<string>>(new Set());

	// Reactive stores that automatically update when entities are added
	const texts = $derived.by(() => getProjectTextsStore(projectId));
	const tables = $derived.by(() => getProjectTablesStore(projectId));
	const images = $derived.by(() => getProjectImagesStore(projectId));

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Markdown Table Detection and Parsing
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	/**
	 * Detects if a string contains a markdown table
	 * Markdown tables have:
	 * - Header row with | separators
	 * - Separator row with |---|---| pattern
	 * - Data rows with | separators
	 */
	function containsMarkdownTable(text: string): boolean {
		if (!text) return false;
		// Look for the separator row pattern which is required for markdown tables
		const separatorPattern = /^\s*\|?\s*[-:]+\s*\|[-:\s|]+\s*$/m;
		return separatorPattern.test(text);
	}

	/**
	 * Extracts all markdown tables from a text string
	 * Returns an array of table markdown strings
	 */
	function extractMarkdownTables(text: string): string[] {
		if (!text) return [];
		
		const lines = text.split('\n');
		const tables: string[] = [];
		let currentTable: string[] = [];
		let inTable = false;
		let foundSeparator = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			
			// Check if this line looks like a table row (contains |)
			const isTableRow = line.includes('|') && (line.startsWith('|') || line.endsWith('|') || line.split('|').length >= 2);
			
			// Check if this is a separator row
			const isSeparator = /^\|?\s*[-:]+\s*\|[-:\s|]+$/.test(line);

			if (isTableRow) {
				if (!inTable) {
					// Starting a potential table
					inTable = true;
					currentTable = [line];
					foundSeparator = false;
				} else {
					currentTable.push(line);
				}
				
				if (isSeparator) {
					foundSeparator = true;
				}
			} else {
				// Not a table row
				if (inTable && foundSeparator && currentTable.length >= 3) {
					// We have a valid table (header + separator + at least one data row)
					tables.push(currentTable.join('\n'));
				}
				inTable = false;
				currentTable = [];
				foundSeparator = false;
			}
		}

		// Check if we ended while still in a table
		if (inTable && foundSeparator && currentTable.length >= 3) {
			tables.push(currentTable.join('\n'));
		}

		return tables;
	}

	/**
	 * Parses a markdown table string into headers and rows
	 */
	function parseMarkdownTable(markdown: string): { headers: string[]; rows: string[][] } {
		const lines = markdown.split('\n').filter(line => line.trim());
		
		if (lines.length < 2) {
			return { headers: [], rows: [] };
		}

		// Parse header row
		const headerLine = lines[0];
		const headers = headerLine
			.split('|')
			.map(cell => cell.trim())
			.filter(cell => cell !== '');

		// Skip separator row (index 1) and parse data rows
		const rows: string[][] = [];
		for (let i = 2; i < lines.length; i++) {
			const cells = lines[i]
				.split('|')
				.map(cell => cell.trim())
				.filter(cell => cell !== '');
			
			if (cells.length > 0) {
				rows.push(cells);
			}
		}

		return { headers, rows };
	}

	// Extract tables from all text blocks
	const extractedTables = $derived.by(() => {
		const result: ExtractedTable[] = [];
		
		for (const text of $texts) {
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

	// Derived counts for display
	const documentCount = $derived(documents.length);
	const textCount = $derived($texts.length);
	// Total table count includes both API tables and extracted markdown tables
	const tableCount = $derived($tables.length + extractedTables.length);
	const imageCount = $derived($images.length);

	// --- Animated count change tracking ---
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

	function triggerPulse(
		category: 'doc' | 'text' | 'table' | 'image',
		delta: number
	) {
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

	$effect(() => {
		const cur = documentCount;
		if (cur > prevDocCount && prevDocCount > 0) triggerPulse('doc', cur - prevDocCount);
		prevDocCount = cur;
	});
	$effect(() => {
		const cur = textCount;
		if (cur > prevTextCount && prevTextCount > 0) triggerPulse('text', cur - prevTextCount);
		prevTextCount = cur;
	});
	$effect(() => {
		const cur = tableCount;
		if (cur > prevTableCount && prevTableCount > 0) triggerPulse('table', cur - prevTableCount);
		prevTableCount = cur;
	});
	$effect(() => {
		const cur = imageCount;
		if (cur > prevImageCount && prevImageCount > 0) triggerPulse('image', cur - prevImageCount);
		prevImageCount = cur;
	});

	// Derived counts of included (non-excluded) items
	const includedTextCount = $derived($texts.length - excludedTexts.size);
	const includedTableCount = $derived(tableCount - excludedTables.size);
	const includedImageCount = $derived($images.length - excludedImages.size);

	// Toggle exclusion for an item
	function toggleTextExclusion(id: string) {
		if (excludedTexts.has(id)) {
			excludedTexts.delete(id);
			excludedTexts = new Set(excludedTexts);
		} else {
			excludedTexts.add(id);
			excludedTexts = new Set(excludedTexts);
		}
	}

	function toggleTableExclusion(id: string) {
		if (excludedTables.has(id)) {
			excludedTables.delete(id);
			excludedTables = new Set(excludedTables);
		} else {
			excludedTables.add(id);
			excludedTables = new Set(excludedTables);
		}
	}

	function toggleImageExclusion(id: string) {
		if (excludedImages.has(id)) {
			excludedImages.delete(id);
			excludedImages = new Set(excludedImages);
		} else {
			excludedImages.add(id);
			excludedImages = new Set(excludedImages);
		}
	}

	// Handle category selection
	function selectCategory(category: ViewCategory) {
		selectedCategory = selectedCategory === category ? null : category;
		// Reset fullscreen when closing
		if (selectedCategory === null) {
			isFullscreen = false;
		}
	}

	// Toggle fullscreen mode
	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	// Close panel (and fullscreen)
	function closePanel() {
		selectedCategory = null;
		isFullscreen = false;
	}

	// Handle escape key to exit fullscreen
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (isFullscreen) {
				isFullscreen = false;
			} else if (selectedCategory) {
				selectedCategory = null;
			}
		}
	}

	// Get category title
	function getCategoryTitle(category: ViewCategory): string {
		switch (category) {
			case 'documents': return 'Documents';
			case 'texts': return 'Text Blocks';
			case 'tables': return 'Tables';
			case 'images': return 'Images';
			default: return '';
		}
	}

	// Get category icon
	function getCategoryIcon(category: ViewCategory): string {
		switch (category) {
			case 'documents': return '📁';
			case 'texts': return '📄';
			case 'tables': return '📊';
			case 'images': return '🖼️';
			default: return '';
		}
	}

	// Get current count for selected category
	function getSelectedCount(): number {
		switch (selectedCategory) {
			case 'documents': return documentCount;
			case 'texts': return textCount;
			case 'tables': return tableCount;
			case 'images': return imageCount;
			default: return 0;
		}
	}

	// Get excluded count for selected category
	function getExcludedCount(): number {
		switch (selectedCategory) {
			case 'texts': return excludedTexts.size;
			case 'tables': return excludedTables.size;
			case 'images': return excludedImages.size;
			default: return 0;
		}
	}

	// Check if current category supports exclusion
	function categorySupportsExclusion(): boolean {
		return selectedCategory === 'texts' || selectedCategory === 'tables' || selectedCategory === 'images';
	}
</script>

<svelte:window on:keydown={handleKeydown} />

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
	
	<!-- Clickable Count Boxes -->
	<div class="grid grid-cols-4 gap-4 mb-6">
		<!-- Documents Box -->
		<button
			onclick={() => selectCategory('documents')}
			class="relative p-4 rounded-lg border cursor-pointer text-left transition-all duration-300
				{docPulse ? 'scale-105 ring-2 ring-slate-400 shadow-lg' : 'hover:scale-105'}
				{selectedCategory === 'documents' 
					? (darkMode ? 'bg-slate-600 border-slate-400 ring-2 ring-slate-400' : 'bg-slate-100 border-slate-400 ring-2 ring-slate-400')
					: (darkMode ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
				}"
		>
			{#if docDelta > 0}
				<span class="absolute -top-2 -right-2 flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-slate-500 text-white text-xs font-bold shadow-md animate-bounce">
					+{docDelta}
				</span>
			{/if}
			<div class="text-3xl font-bold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-1">{documentCount}</div>
			<div class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-600'}">Documents</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">📁 Uploaded</div>
		</button>

		<!-- Text Blocks Box -->
		<button
			onclick={() => selectCategory('texts')}
			class="relative p-4 rounded-lg border cursor-pointer text-left transition-all duration-300
				{textPulse ? 'scale-105 ring-2 ring-blue-400 shadow-lg shadow-blue-500/20' : 'hover:scale-105'}
				{selectedCategory === 'texts'
					? (darkMode ? 'bg-blue-800/40 border-blue-400 ring-2 ring-blue-400' : 'bg-blue-100 border-blue-400 ring-2 ring-blue-400')
					: (darkMode ? 'bg-blue-900/20 border-blue-500/30 hover:border-blue-400/50' : 'bg-blue-50 border-blue-200 hover:border-blue-300')
				}"
		>
			{#if textDelta > 0}
				<span class="absolute -top-2 -right-2 flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-blue-500 text-white text-xs font-bold shadow-md animate-bounce">
					+{textDelta}
				</span>
			{/if}
			<div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{textCount}</div>
			<div class="text-sm font-medium {darkMode ? 'text-blue-300' : 'text-blue-700'}">Text Blocks</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
				📄 {excludedTexts.size > 0 ? `${includedTextCount} included` : 'Discovered'}
			</div>
		</button>

		<!-- Tables Box -->
		<button
			onclick={() => selectCategory('tables')}
			class="relative p-4 rounded-lg border cursor-pointer text-left transition-all duration-300
				{tablePulse ? 'scale-105 ring-2 ring-green-400 shadow-lg shadow-green-500/20' : 'hover:scale-105'}
				{selectedCategory === 'tables'
					? (darkMode ? 'bg-green-800/40 border-green-400 ring-2 ring-green-400' : 'bg-green-100 border-green-400 ring-2 ring-green-400')
					: (darkMode ? 'bg-green-900/20 border-green-500/30 hover:border-green-400/50' : 'bg-green-50 border-green-200 hover:border-green-300')
				}"
		>
			{#if tableDelta > 0}
				<span class="absolute -top-2 -right-2 flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-green-500 text-white text-xs font-bold shadow-md animate-bounce">
					+{tableDelta}
				</span>
			{/if}
			<div class="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{tableCount}</div>
			<div class="text-sm font-medium {darkMode ? 'text-green-300' : 'text-green-700'}">Tables</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
				📊 {extractedTables.length > 0 ? `${$tables.length} + ${extractedTables.length} from text` : (excludedTables.size > 0 ? `${includedTableCount} included` : 'Discovered')}
			</div>
		</button>

		<!-- Images Box -->
		<button
			onclick={() => selectCategory('images')}
			class="relative p-4 rounded-lg border cursor-pointer text-left transition-all duration-300
				{imagePulse ? 'scale-105 ring-2 ring-purple-400 shadow-lg shadow-purple-500/20' : 'hover:scale-105'}
				{selectedCategory === 'images'
					? (darkMode ? 'bg-purple-800/40 border-purple-400 ring-2 ring-purple-400' : 'bg-purple-100 border-purple-400 ring-2 ring-purple-400')
					: (darkMode ? 'bg-purple-900/20 border-purple-500/30 hover:border-purple-400/50' : 'bg-purple-50 border-purple-200 hover:border-purple-300')
				}"
		>
			{#if imageDelta > 0}
				<span class="absolute -top-2 -right-2 flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-purple-500 text-white text-xs font-bold shadow-md animate-bounce">
					+{imageDelta}
				</span>
			{/if}
			<div class="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{imageCount}</div>
			<div class="text-sm font-medium {darkMode ? 'text-purple-300' : 'text-purple-700'}">Images</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
				🖼️ {excludedImages.size > 0 ? `${includedImageCount} included` : 'Discovered'}
			</div>
		</button>
	</div>

	<!-- Inline Detail View Panel (non-fullscreen) -->
	{#if selectedCategory && !isFullscreen}
		<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4 mt-4">
			<div class="flex items-center justify-between mb-4">
				<h4 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
					<span>{getCategoryIcon(selectedCategory)}</span>
					<span>{getCategoryTitle(selectedCategory)}</span>
					<span class="text-sm font-normal {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						({getSelectedCount()}{getExcludedCount() > 0 ? `, ${getExcludedCount()} excluded` : ''})
					</span>
				</h4>
				<div class="flex items-center gap-1">
					<!-- Fullscreen button -->
					<button
						onclick={toggleFullscreen}
						class="p-1.5 rounded-md {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'} transition-colors"
						aria-label="Enter fullscreen"
						title="Expand to fullscreen"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
						</svg>
					</button>
					<!-- Close button -->
					<button
						onclick={closePanel}
						class="p-1.5 rounded-md {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'} transition-colors"
						aria-label="Close panel"
						title="Close"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
			</div>

			<!-- Exclusion info banner -->
			{@render exclusionBanner()}

			<!-- Content area -->
			{@render detailContent(false)}
		</div>
	{:else if !selectedCategory}
		<!-- Empty state when no category is selected -->
		<div class="text-center py-6 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			<p class="text-sm">Select a category above to view its contents.</p>
		</div>
	{/if}
</div>

<!-- Fullscreen Modal Overlay -->
{#if selectedCategory && isFullscreen}
	<div 
		class="fixed inset-0 z-50 flex flex-col {darkMode ? 'bg-slate-900' : 'bg-white'}"
		role="dialog"
		aria-modal="true"
		aria-label="{getCategoryTitle(selectedCategory)} fullscreen view"
	>
		<!-- Fullscreen Header -->
		<div class="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
			<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-3">
				<span class="text-2xl">{getCategoryIcon(selectedCategory)}</span>
				<span>{getCategoryTitle(selectedCategory)}</span>
				<span class="text-base font-normal {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					({getSelectedCount()} items{getExcludedCount() > 0 ? `, ${getExcludedCount()} excluded` : ''})
				</span>
			</h2>
			<div class="flex items-center gap-2">
				<!-- Exit fullscreen button -->
				<button
					onclick={toggleFullscreen}
					class="flex items-center gap-2 px-3 py-1.5 rounded-md {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} transition-colors text-sm font-medium"
					aria-label="Exit fullscreen"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"></path>
					</svg>
					<span>Exit Fullscreen</span>
				</button>
				<!-- Close button -->
				<button
					onclick={closePanel}
					class="p-2 rounded-md {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'} transition-colors"
					aria-label="Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
		</div>

		<!-- Exclusion info banner in fullscreen -->
		<div class="flex-shrink-0 px-6 pt-4">
			{@render exclusionBanner()}
		</div>

		<!-- Fullscreen Content -->
		<div class="flex-1 overflow-hidden p-6 pt-2">
			{@render detailContent(true)}
		</div>

		<!-- Keyboard hint -->
		<div class="flex-shrink-0 px-6 py-2 text-center text-xs {darkMode ? 'text-slate-500 bg-slate-800 border-t border-slate-700' : 'text-slate-400 bg-slate-50 border-t border-slate-200'}">
			Press <kbd class="px-1.5 py-0.5 rounded {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'} font-mono text-xs">Esc</kbd> to exit fullscreen
		</div>
	</div>
{/if}

<!-- Exclusion info banner snippet -->
{#snippet exclusionBanner()}
	{#if categorySupportsExclusion()}
		<div class="mb-4 p-3 rounded-lg {darkMode ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'} border">
			<div class="flex items-start gap-2">
				<svg class="w-5 h-5 flex-shrink-0 mt-0.5 {darkMode ? 'text-amber-400' : 'text-amber-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				<div class="text-sm {darkMode ? 'text-amber-200' : 'text-amber-800'}">
					<span class="font-medium">Exclude from analysis:</span> Uncheck the checkbox next to any text block, table, or image to exclude it from the AI analysis. Excluded items will not be used when generating insights.
				</div>
			</div>
		</div>
	{/if}
{/snippet}

<!-- Rendered HTML table snippet -->
{#snippet renderedTable(headers: string[], rows: string[][], fullscreen: boolean)}
	<div class="overflow-x-auto {fullscreen ? 'max-h-64' : 'max-h-48'} overflow-y-auto">
		<table class="min-w-full text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
			<thead class="sticky top-0 {darkMode ? 'bg-green-900/50' : 'bg-green-100'}">
				<tr>
					{#each headers as header}
						<th class="px-3 py-2 text-left font-semibold {darkMode ? 'text-green-300 border-green-700' : 'text-green-800 border-green-200'} border-b whitespace-nowrap">
							{header}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, rowIndex}
					<tr class="{rowIndex % 2 === 0 ? (darkMode ? 'bg-slate-800/30' : 'bg-white') : (darkMode ? 'bg-slate-800/50' : 'bg-green-50/50')}">
						{#each row as cell, cellIndex}
							<td class="px-3 py-2 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b {cellIndex === 0 ? 'font-medium' : ''}">
								{cell}
							</td>
						{/each}
						<!-- Fill empty cells if row has fewer cells than headers -->
						{#each Array(Math.max(0, headers.length - row.length)) as _}
							<td class="px-3 py-2 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">-</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

<!-- Reusable content snippet -->
{#snippet detailContent(fullscreen: boolean)}
	<div class="space-y-3 {fullscreen ? 'h-full overflow-y-auto' : 'max-h-96 overflow-y-auto'} pr-2">
		<!-- Documents View -->
		{#if selectedCategory === 'documents'}
			{#if documents.length === 0}
				<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					<p class="text-sm">No documents uploaded yet.</p>
				</div>
			{:else}
				<div class="{fullscreen ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}">
					{#each documents as doc (doc.id)}
						<div class="p-4 {darkMode ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} rounded-lg border transition-colors">
							<div class="flex items-center gap-3">
								<div class="flex-shrink-0 w-12 h-12 flex items-center justify-center {darkMode ? 'bg-slate-600' : 'bg-slate-200'} rounded-lg">
									<svg class="w-6 h-6 {darkMode ? 'text-slate-300' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
									</svg>
								</div>
								<div class="flex-1 min-w-0">
									<div class="font-medium {darkMode ? 'text-white' : 'text-slate-900'} truncate {fullscreen ? 'text-base' : ''}">
										{doc.filename}
									</div>
									<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5 font-mono truncate">
										ID: {doc.id.substring(0, fullscreen ? 24 : 16)}...
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- Text Blocks View -->
		{#if selectedCategory === 'texts'}
			{#if $texts.length === 0}
				<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					<p class="text-sm">No text blocks discovered yet.</p>
				</div>
			{:else}
				<div class="{fullscreen ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-3'}">
					{#each $texts as text (text.id)}
						{@const isExcluded = excludedTexts.has(text.id)}
						{@const hasTable = containsMarkdownTable(text.text || '')}
						<div class="p-4 {darkMode ? 'bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/30' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'} rounded-lg border transition-colors {isExcluded ? 'opacity-50' : ''}">
							<div class="flex items-start gap-3">
								<!-- Checkbox -->
								<label class="flex-shrink-0 flex items-center justify-center cursor-pointer mt-1">
									<input
										type="checkbox"
										checked={!isExcluded}
										onchange={() => toggleTextExclusion(text.id)}
										class="w-5 h-5 rounded border-2 {darkMode ? 'bg-slate-700 border-slate-500 checked:bg-blue-500 checked:border-blue-500' : 'bg-white border-slate-300 checked:bg-blue-600 checked:border-blue-600'} cursor-pointer"
									/>
								</label>
								<div class="flex-shrink-0 w-10 h-10 flex items-center justify-center {darkMode ? 'bg-blue-800/50' : 'bg-blue-100'} rounded-lg">
									<span class="text-lg">📄</span>
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1 flex-wrap">
										<span class="font-medium {darkMode ? 'text-blue-300' : 'text-blue-700'}">
											Page {text.pageNum || 'N/A'}
										</span>
										<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">•</span>
										<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} font-mono">
											{text.id.substring(0, 12)}...
										</span>
										{#if hasTable}
											<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}">Contains table</span>
										{/if}
										{#if isExcluded}
											<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}">Excluded</span>
										{/if}
									</div>
									<div class="{darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm leading-relaxed {fullscreen ? 'max-h-48 overflow-y-auto' : ''} whitespace-pre-wrap">
										{text.text || 'No text content'}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- Tables View -->
		{#if selectedCategory === 'tables'}
			{#if $tables.length === 0 && extractedTables.length === 0}
				<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					<p class="text-sm">No tables discovered yet.</p>
				</div>
			{:else}
				<div class="{fullscreen ? 'grid grid-cols-1 gap-4' : 'space-y-3'}">
					<!-- API Tables (from backend) -->
					{#each $tables as table (table.id)}
						{@const isExcluded = excludedTables.has(table.id)}
						<div class="p-4 {darkMode ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' : 'bg-green-50 border-green-200 hover:bg-green-100'} rounded-lg border transition-colors {isExcluded ? 'opacity-50' : ''}">
							<div class="flex items-start gap-3">
								<!-- Checkbox -->
								<label class="flex-shrink-0 flex items-center justify-center cursor-pointer mt-1">
									<input
										type="checkbox"
										checked={!isExcluded}
										onchange={() => toggleTableExclusion(table.id)}
										class="w-5 h-5 rounded border-2 {darkMode ? 'bg-slate-700 border-slate-500 checked:bg-green-500 checked:border-green-500' : 'bg-white border-slate-300 checked:bg-green-600 checked:border-green-600'} cursor-pointer"
									/>
								</label>
								<div class="flex-shrink-0 w-10 h-10 flex items-center justify-center {darkMode ? 'bg-green-800/50' : 'bg-green-100'} rounded-lg">
									<span class="text-lg">📊</span>
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<span class="font-medium {darkMode ? 'text-green-300' : 'text-green-700'}">
											Page {table.pageNum || 'N/A'}
										</span>
										<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">•</span>
										<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} font-mono">
											{table.id.substring(0, 12)}...
										</span>
										{#if isExcluded}
											<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}">Excluded</span>
										{/if}
									</div>
									<div class="{darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm {fullscreen ? 'max-h-48 overflow-y-auto' : ''}">
										{table.description || 'No description available'}
									</div>
								</div>
							</div>
						</div>
					{/each}

					<!-- Extracted Markdown Tables -->
					{#each extractedTables as extractedTable (extractedTable.id)}
						{@const isExcluded = excludedTables.has(extractedTable.id)}
						<div class="p-4 {darkMode ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' : 'bg-green-50 border-green-200 hover:bg-green-100'} rounded-lg border transition-colors {isExcluded ? 'opacity-50' : ''}">
							<div class="flex items-start gap-3">
								<!-- Checkbox -->
								<label class="flex-shrink-0 flex items-center justify-center cursor-pointer mt-1">
									<input
										type="checkbox"
										checked={!isExcluded}
										onchange={() => toggleTableExclusion(extractedTable.id)}
										class="w-5 h-5 rounded border-2 {darkMode ? 'bg-slate-700 border-slate-500 checked:bg-green-500 checked:border-green-500' : 'bg-white border-slate-300 checked:bg-green-600 checked:border-green-600'} cursor-pointer"
									/>
								</label>
								<div class="flex-shrink-0 w-10 h-10 flex items-center justify-center {darkMode ? 'bg-green-800/50' : 'bg-green-100'} rounded-lg">
									<span class="text-lg">📊</span>
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-2 flex-wrap">
										<span class="font-medium {darkMode ? 'text-green-300' : 'text-green-700'}">
											Page {extractedTable.pageNum || 'N/A'}
										</span>
										<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">•</span>
										<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}">Extracted from text</span>
										<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
											{extractedTable.headers.length} columns, {extractedTable.rows.length} rows
										</span>
										{#if isExcluded}
											<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}">Excluded</span>
										{/if}
									</div>
									<!-- Rendered table -->
									{@render renderedTable(extractedTable.headers, extractedTable.rows, fullscreen)}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- Images View -->
		{#if selectedCategory === 'images'}
			{#if $images.length === 0}
				<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					<p class="text-sm">No images discovered yet.</p>
				</div>
			{:else}
				<div class="grid {fullscreen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-2'} gap-4">
					{#each $images as image (image.id)}
						{@const imageUrl = image.s3Bucket && image.s3Key ? `https://${image.s3Bucket}.s3.us-west-2.amazonaws.com/${image.s3Key}` : null}
						{@const isExcluded = excludedImages.has(image.id)}
						<div class="p-3 {darkMode ? 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30' : 'bg-purple-50 border-purple-200 hover:bg-purple-100'} rounded-lg border transition-colors {isExcluded ? 'opacity-50' : ''}">
							<!-- Checkbox row -->
							<div class="flex items-center justify-between mb-2">
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={!isExcluded}
										onchange={() => toggleImageExclusion(image.id)}
										class="w-5 h-5 rounded border-2 {darkMode ? 'bg-slate-700 border-slate-500 checked:bg-purple-500 checked:border-purple-500' : 'bg-white border-slate-300 checked:bg-purple-600 checked:border-purple-600'} cursor-pointer"
									/>
									<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">Include</span>
								</label>
								{#if isExcluded}
									<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}">Excluded</span>
								{/if}
							</div>
							<div class="{fullscreen ? 'aspect-square' : 'aspect-video'} mb-3 {darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg overflow-hidden flex items-center justify-center">
								{#if imageUrl}
									<img 
										src={imageUrl} 
										alt="Discovered image from page {image.pageNum || 'N/A'}" 
										class="w-full h-full object-contain"
										loading="lazy"
									/>
								{:else}
									<div class="text-center {darkMode ? 'text-slate-500' : 'text-slate-400'}">
										<span class="{fullscreen ? 'text-5xl' : 'text-3xl'}">🖼️</span>
										<p class="text-xs mt-1">No preview</p>
									</div>
								{/if}
							</div>
							<div class="flex items-center justify-between">
								<span class="font-medium text-sm {darkMode ? 'text-purple-300' : 'text-purple-700'}">
									Page {image.pageNum || 'N/A'}
								</span>
								<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									{image.mimeType || 'Unknown'} • {Math.round((image.sizeBytes || 0) / 1024)} KB
								</span>
							</div>
							{#if image.imageAnnotation}
								<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-2 {fullscreen ? 'line-clamp-3' : 'line-clamp-2'}">
									{image.imageAnnotation}
								</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
{/snippet}
