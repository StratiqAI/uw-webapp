<script lang="ts">
	import { PUBLIC_DOCUMENTS_BUCKET, PUBLIC_REGION } from '$env/static/public';
	import type {
		PDFViewerProps,
		PDFAnnotation,
		PDFPage,
		PDFDocument,
		Viewport,
		RenderContext,
		DownloadOptions
	} from './types';

	let {
		data,
		documents,
		scale = $bindable(1.0),
		pageNum: _unusedPageNumProp = 1,
		flipTime = 120,
		showButtons = ['navigation', 'zoom', 'rotate', 'download'],
		currentPage = $bindable(1),
		currentDocHash = $bindable(''),
		totalPage = 0,
		downloadFileName = '',
		showTopButton = true,
		onProgress,
		externalLinksTarget
	}: PDFViewerProps = $props();

	import * as pdfjs from 'pdfjs-dist';
	import { onDestroy, tick } from 'svelte';
	import { calcRT, getPageText, onPrint, savePDF } from './utils/Helper.svelte';

	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	const darkMode = $derived(darkModeStore.darkMode);

	let docs = $derived(documents ?? []);
	let url = $derived(
		`https://${PUBLIC_DOCUMENTS_BUCKET}.s3.${PUBLIC_REGION}.amazonaws.com/${currentDocHash}/document.pdf`
	);
	let currentDocFilename = $derived(docs.find((doc) => doc.id === currentDocHash)?.filename ?? '');
	let hasDocuments: boolean = $derived((documents?.length ?? 0) > 0);

	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		'pdfjs-dist/build/pdf.worker.mjs',
		import.meta.url
	).toString();

	let canvas: HTMLCanvasElement | undefined = $state();
	let viewerContainer: HTMLDivElement | undefined = $state();
	let canvasWrapper: HTMLDivElement | undefined = $state();

	let pageCount: number = 0;
	let pdfDoc: PDFDocument | null = null;
	let pageRendering: boolean = false;
	let pageNumPending: number | null = null;
	let rotation: number = 0;
	let pdfContent: string = '';
	let readingTime: number = 0;
	let autoFlip: boolean = false;
	let interval: NodeJS.Timeout | undefined;
	let secondInterval: NodeJS.Timeout | undefined;
	// svelte-ignore state_referenced_locally
	let seconds: number = flipTime;
	let pages: HTMLCanvasElement[] = [];
	let password = $state('');
	let passwordError = $state(false);
	let passwordMessage = $state('');
	let isInitialized: boolean = false;

	let isLoading = $state(true);
	/** Last page we successfully rendered; keeps $effect in sync without mutating the pageNum prop */
	let lastRenderedPageNum = $state(1);
	let docSelectorOpen = $state(false);
	let pageSelectorOpen = $state(false);
	let pageInputValue = $state('');

	const minScale: number = 0.5;
	const maxScale: number = 3.0;
	const zoomPercent = $derived(Math.round(scale * 100));

	const ZOOM_PRESETS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 175, 200, 250, 300];

	function fitToWidth() {
		if (!viewerContainer || !pdfDoc) return;
		pdfDoc.getPage(currentPage).then((page) => {
			const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
			const containerWidth = viewerContainer!.clientWidth - 48;
			const newScale = containerWidth / unscaledViewport.width;
			scale = Math.min(Math.max(newScale, minScale), maxScale);
			queueRenderPage(currentPage);
		});
	}

	const renderPage = async (num: number): Promise<void> => {
		if (num < 1 || num > pageCount || !pdfDoc || !canvas) return;
		pageRendering = true;
		try {
			const page = await pdfDoc.getPage(num);
			const viewport = page.getViewport({ scale, rotation });
			const canvasContext = canvas.getContext('2d');
			if (!canvasContext) return;

			canvas.height = viewport.height;
			canvas.width = viewport.width;

			const renderContext: RenderContext = { canvasContext, viewport };
			await page.render(renderContext).promise;
			await handlePageLinks(page, viewport);

			pageRendering = false;
			currentPage = num;

			if (pageNumPending !== null) {
				let batchPage = pageNumPending;
				if (batchPage < pdfDoc.numPages) {
					pages[batchPage - 1] = canvas.cloneNode(true) as HTMLCanvasElement;
					batchPage++;
					await renderPage(batchPage);
				} else {
					for (let i = 0; i < pages.length; i++) {
						canvas.parentNode?.insertBefore(pages[i], canvas);
					}
					canvas.remove();
				}
				pageNumPending = null;
			}
			lastRenderedPageNum = num;
		} catch (error) {
			console.error('Error rendering page:', error);
			pageRendering = false;
		}
	};

	const handlePageLinks = async (page: PDFPage, viewport: Viewport): Promise<void> => {
		try {
			const annotations = await page.getAnnotations();
			const existingLinks = canvasWrapper?.querySelectorAll('.pdf-link-overlay');
			existingLinks?.forEach((link) => link.remove());

			annotations.forEach((annotation) => {
				if (annotation.subtype === 'Link' && annotation.url) {
					createLinkOverlay(annotation, viewport);
				}
			});
		} catch (error) {
			console.warn('Could not process page annotations:', error);
		}
	};

	const createLinkOverlay = (annotation: PDFAnnotation, viewport: Viewport): void => {
		if (!canvasWrapper || !annotation.url) return;

		const linkElement = document.createElement('a');
		linkElement.className = 'pdf-link-overlay';
		linkElement.href = annotation.url;
		linkElement.target = externalLinksTarget || '_blank';
		linkElement.rel = 'noopener noreferrer';

		const rect = annotation.rect;
		const [x1, y1, x2, y2] = rect;
		const canvasRect = viewport.convertToViewportRectangle([x1, y1, x2, y2]);

		linkElement.style.position = 'absolute';
		linkElement.style.left = `${Math.min(canvasRect[0], canvasRect[2])}px`;
		linkElement.style.top = `${Math.min(canvasRect[1], canvasRect[3])}px`;
		linkElement.style.width = `${Math.abs(canvasRect[2] - canvasRect[0])}px`;
		linkElement.style.height = `${Math.abs(canvasRect[3] - canvasRect[1])}px`;
		linkElement.style.zIndex = '10';
		linkElement.style.background = 'transparent';
		linkElement.style.border = 'none';
		linkElement.style.cursor = 'pointer';

		canvasWrapper.appendChild(linkElement);
	};

	const queueRenderPage = (num: number): void => {
		if (pageRendering) {
			pdfDoc?.getPage(num).then(() => {
				if (!pageRendering) renderPage(num);
			});
		} else {
			renderPage(num);
		}
	};

	const onPrevPage = (): void => {
		if (currentPage <= 1) return;
		queueRenderPage(currentPage - 1);
	};

	const onNextPage = (): void => {
		if (!pdfDoc || currentPage >= pageCount) return;
		queueRenderPage(currentPage + 1);
	};

	const onZoomIn = (): void => {
		if (scale < maxScale) {
			const nextPreset = ZOOM_PRESETS.find((p) => p > zoomPercent);
			scale = Math.min((nextPreset ?? zoomPercent + 25) / 100, maxScale);
			queueRenderPage(currentPage);
		}
	};

	const onZoomOut = (): void => {
		if (scale > minScale) {
			const prevPreset = [...ZOOM_PRESETS].reverse().find((p) => p < zoomPercent);
			scale = Math.max((prevPreset ?? zoomPercent - 25) / 100, minScale);
			queueRenderPage(currentPage);
		}
	};

	const setZoom = (percent: number): void => {
		scale = Math.min(Math.max(percent / 100, minScale), maxScale);
		queueRenderPage(currentPage);
	};

	const clockwiseRotate = (): void => {
		rotation += 90;
		queueRenderPage(currentPage);
	};

	const antiClockwiseRotate = (): void => {
		rotation -= 90;
		queueRenderPage(currentPage);
	};

	const onPasswordSubmit = (): void => {
		initialLoad();
	};

	const initialLoad = async (): Promise<void> => {
		if (!currentDocHash && !data) {
			isLoading = false;
			passwordError = false;
			return;
		}

		isLoading = true;
		try {
			const loadingTask = pdfjs.getDocument({
				...(url && { url }),
				...(data && { data }),
				...(password && { password })
			});
			if (onProgress) loadingTask.onProgress = onProgress;

			pdfDoc = await loadingTask.promise;
			passwordError = false;
			await tick();

			pageCount = pdfDoc.numPages;
			totalPage = pdfDoc.numPages;

			if (showButtons.includes('pageInfo') && pdfDoc) {
				for (let number = 1; number <= totalPage; number++) {
					const textPage = await getPageText(number, pdfDoc);
					pdfContent += textPage;
					const calculatedTime = calcRT(pdfContent);
					readingTime = calculatedTime || 0;
				}
			}

			isInitialized = true;
			isLoading = false;

			await tick();
			fitToWidth();
		} catch (error) {
			isLoading = false;
			passwordError = true;
			passwordMessage = (error as Error).message;
		}
	};

	initialLoad();

	// Reload when the selected document changes (e.g. first doclink arrives via subscription)
	let prevDocHash = currentDocHash;
	$effect(() => {
		const hash = currentDocHash;
		if (hash && hash !== prevDocHash) {
			prevDocHash = hash;
			passwordError = false;
			isInitialized = false;
			pdfDoc = null;
			currentPage = 1;
			lastRenderedPageNum = 1;
			initialLoad();
		}
	});

	$effect(() => {
		if (isInitialized && currentPage !== lastRenderedPageNum) {
			queueRenderPage(currentPage);
		}
	});

	const downloadPdf = ({ url: fileUrl, data }: DownloadOptions): void => {
		const fileName =
			downloadFileName ||
			(fileUrl && fileUrl.substring(fileUrl.lastIndexOf('/') + 1)) ||
			'download.pdf';
		(savePDF as any)({ fileUrl, data, name: fileName });
	};

	const onDocumentChange = (documentId: string): void => {
		currentDocHash = documentId;
		currentPage = 1;
		docSelectorOpen = false;
		initialLoad();
	};

	const goToPage = (num: number): void => {
		const clamped = Math.max(1, Math.min(num, totalPage));
		pageSelectorOpen = false;
		queueRenderPage(clamped);
	};

	const handlePageInput = (e: KeyboardEvent): void => {
		if (e.key === 'Enter') {
			const val = parseInt(pageInputValue);
			if (!isNaN(val)) goToPage(val);
			pageInputValue = '';
		}
	};

	function handleKeyDown(event: KeyboardEvent): void {
		if ((event.target as HTMLElement).tagName === 'INPUT') return;
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				onPrevPage();
				break;
			case 'ArrowRight':
				event.preventDefault();
				onNextPage();
				break;
			case '+':
			case '=':
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					onZoomIn();
				}
				break;
			case '-':
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					onZoomOut();
				}
				break;
		}
	}

	function handleClickOutside(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (!target.closest('.doc-selector')) docSelectorOpen = false;
		if (!target.closest('.page-selector')) pageSelectorOpen = false;
	}

	onDestroy(() => {
		clearInterval(interval);
		clearInterval(secondInterval);
	});
</script>

<svelte:window onkeydown={handleKeyDown} onclick={handleClickOutside} />

<div
	class="flex flex-col rounded-lg overflow-hidden border
		{darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}"
>
	<!-- Toolbar -->
	<div
		class="flex items-center gap-1 px-3 py-2 border-b flex-wrap
			{darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}"
	>
		<!-- Document Selector -->
		{#if docs.length > 0}
			<div class="doc-selector relative">
				<button
					type="button"
					onclick={() => (docSelectorOpen = !docSelectorOpen)}
					class="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors max-w-[400px]
						{darkMode
							? 'text-slate-200 hover:bg-slate-700'
							: 'text-slate-700 hover:bg-slate-200'}"
				>
					<svg class="h-4 w-4 shrink-0 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span class="truncate">{currentDocFilename || 'Select document'}</span>
					{#if docs.length > 1}
						<svg class="h-3.5 w-3.5 shrink-0 transition-transform {docSelectorOpen ? 'rotate-180' : ''} {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					{/if}
				</button>
				{#if docSelectorOpen && docs.length > 1}
					<div
						class="absolute left-0 top-full z-30 mt-1 min-w-[240px] max-w-[360px] rounded-lg border shadow-lg py-1
							{darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}"
					>
						{#each docs as document}
							<button
								type="button"
								onclick={() => onDocumentChange(document.id)}
								class="flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors
									{document.id === currentDocHash
										? (darkMode ? 'bg-indigo-600/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700')
										: (darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50')}"
							>
								{#if document.id === currentDocHash}
									<svg class="h-3.5 w-3.5 shrink-0 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								{:else}
									<span class="w-3.5"></span>
								{/if}
								<span class="truncate">{document.filename}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Divider -->
		<div class="h-5 w-px mx-1 {darkMode ? 'bg-slate-600' : 'bg-slate-300'}"></div>

		<!-- Page Navigation -->
		<div class="flex items-center gap-0.5">
			<button
				type="button"
				onclick={onPrevPage}
				disabled={currentPage <= 1}
				class="rounded-md p-1.5 transition-colors
					{currentPage <= 1
						? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed')
						: (darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900')}"
				title="Previous page (←)"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>

			<div class="page-selector relative flex items-center">
				<button
					type="button"
					onclick={() => (pageSelectorOpen = !pageSelectorOpen)}
					class="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium tabular-nums transition-colors
						{darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'}"
				>
					<span>{currentPage}</span>
					<span class="{darkMode ? 'text-slate-500' : 'text-slate-400'}">/</span>
					<span class="{darkMode ? 'text-slate-500' : 'text-slate-400'}">{totalPage}</span>
				</button>
				{#if pageSelectorOpen}
					<div
						class="absolute left-1/2 -translate-x-1/2 top-full z-30 mt-1 rounded-lg border shadow-lg p-2
							{darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}"
					>
						<div class="flex items-center gap-2">
							<label for="pdf-page-input" class="text-xs whitespace-nowrap {darkMode ? 'text-slate-400' : 'text-slate-500'}">Go to</label>
							<input
								id="pdf-page-input"
								type="number"
								min="1"
								max={totalPage}
								bind:value={pageInputValue}
								onkeydown={handlePageInput}
								placeholder={String(currentPage)}
								class="w-16 rounded border px-2 py-1 text-sm text-center
									{darkMode
										? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500'
										: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}"
							/>
							<button
								type="button"
								onclick={() => {
									const val = parseInt(pageInputValue);
									if (!isNaN(val)) goToPage(val);
									pageInputValue = '';
								}}
								class="rounded-md px-2 py-1 text-xs font-medium transition-colors
									{darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}"
							>
								Go
							</button>
						</div>
					</div>
				{/if}
			</div>

			<button
				type="button"
				onclick={onNextPage}
				disabled={currentPage >= totalPage}
				class="rounded-md p-1.5 transition-colors
					{currentPage >= totalPage
						? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed')
						: (darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900')}"
				title="Next page (→)"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>

		<!-- Divider -->
		<div class="h-5 w-px mx-1 {darkMode ? 'bg-slate-600' : 'bg-slate-300'}"></div>

		<!-- Zoom Controls -->
		<div class="flex items-center gap-0.5">
			<button
				type="button"
				onclick={onZoomOut}
				disabled={scale <= minScale}
				class="rounded-md p-1.5 transition-colors
					{scale <= minScale
						? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed')
						: (darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900')}"
				title="Zoom out"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
				</svg>
			</button>

			<button
				type="button"
				onclick={fitToWidth}
				class="rounded-md px-2 py-1 text-xs font-medium tabular-nums transition-colors min-w-[48px] text-center
					{darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'}"
				title="Fit to width (click to reset)"
			>
				{zoomPercent}%
			</button>

			<button
				type="button"
				onclick={onZoomIn}
				disabled={scale >= maxScale}
				class="rounded-md p-1.5 transition-colors
					{scale >= maxScale
						? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed')
						: (darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900')}"
				title="Zoom in"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
				</svg>
			</button>
		</div>

		<!-- Divider -->
		<div class="h-5 w-px mx-1 {darkMode ? 'bg-slate-600' : 'bg-slate-300'}"></div>

		<!-- Rotate Controls -->
		<div class="flex items-center gap-0.5">
			<button
				type="button"
				onclick={antiClockwiseRotate}
				class="rounded-md p-1.5 transition-colors
					{darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}"
				title="Rotate counterclockwise"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19.95 11a8 8 0 1 0 -.5 4m.5 5v-5h-5" />
				</svg>
			</button>
			<button
				type="button"
				onclick={clockwiseRotate}
				class="rounded-md p-1.5 transition-colors
					{darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}"
				title="Rotate clockwise"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5" />
				</svg>
			</button>
		</div>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Download -->
		{#if showButtons.includes('download')}
			<button
				type="button"
				onclick={() => downloadPdf({ url, data })}
				class="rounded-md p-1.5 transition-colors
					{darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}"
				title="Download PDF"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
			</button>
		{/if}
	</div>

	<!-- PDF Canvas Area -->
	<div
		bind:this={viewerContainer}
		class="relative flex-1 overflow-auto"
		style="min-height: 500px; max-height: calc(100vh - 280px);"
	>
		{#if isLoading}
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20
				{darkMode ? 'bg-slate-900/90' : 'bg-white/90'}">
				<div class="relative">
					<svg class="h-10 w-10 animate-spin {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				</div>
				<p class="text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading document...</p>
			</div>
		{/if}

	{#if !hasDocuments && !data && !passwordError}
		<div class="flex flex-col items-center justify-center gap-3 py-16 px-8">
			<svg class="h-12 w-12 {darkMode ? 'text-slate-600' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<div class="text-center">
				<p class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
					No Document Uploaded Yet
				</p>
				<p class="mt-1 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					Upload a PDF to view it here
				</p>
			</div>
		</div>
	{:else if passwordError}
		<div class="flex flex-col items-center justify-center gap-4 py-16 px-8">
			<svg class="h-12 w-12 {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
			</svg>
			<div class="text-center">
				<p class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'}">
					Password Protected
				</p>
				<p class="mt-1 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					This document requires a password to open
				</p>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="password"
					bind:value={password}
					placeholder="Enter password"
					onkeydown={(e) => { if (e.key === 'Enter') onPasswordSubmit(); }}
					class="rounded-lg border px-3 py-2 text-sm
						{darkMode
							? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}"
				/>
				<button
					type="button"
					onclick={onPasswordSubmit}
					class="rounded-lg px-4 py-2 text-sm font-medium transition-colors
						{darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}"
				>
					Unlock
				</button>
			</div>
		</div>
	{:else}
			<div
				class="flex justify-center p-6
					{darkMode ? 'bg-slate-800/30' : 'bg-slate-100/50'}"
			>
				<div
					bind:this={canvasWrapper}
					class="relative shadow-lg rounded-sm transition-shadow
						{darkMode ? 'shadow-black/40' : 'shadow-slate-300/80'}"
				>
					<canvas bind:this={canvas} class="block rounded-sm"></canvas>
				</div>
			</div>
		{/if}
	</div>
</div>
