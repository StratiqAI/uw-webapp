<script lang="ts">
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Environment Variables
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import { PUBLIC_DOCUMENTS_BUCKET, PUBLIC_REGION } from '$env/static/public';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Component Types
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import type {
		PDFViewerProps,
		PDFAnnotation,
		PDFPage,
		PDFDocument,
		Viewport,
		RenderContext,
		DownloadOptions
	} from './types';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Component Props
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	let {
		data,
		documents,
		scale = 1.0,
		pageNum = 1,
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

	import { ButtonGroup, Button, Dropdown, DropdownItem } from 'flowbite-svelte';
	import {
		ArrowLeftOutline,
		ArrowRightOutline,
		ZoomOutOutline,
		ZoomInOutline,
		ChevronDownOutline
	} from 'flowbite-svelte-icons';

	import * as pdfjs from 'pdfjs-dist';
	import { onDestroy, tick } from 'svelte';
	import { calcRT, getPageText, onPrint, savePDF } from './utils/Helper.svelte';
	import Tooltip from './utils/Tooltip.svelte';

	import RotateRight from './RotateRight.svelte';
	import RotateLeft from './RotateLeft.svelte';

	// Svelte 5 rune for reactive state
	let openDropdown = $state(false);

	let docs = $derived(documents ?? []);

	let url = $derived(
		`https://${PUBLIC_DOCUMENTS_BUCKET}.s3.${PUBLIC_REGION}.amazonaws.com/${currentDocHash}/document.pdf`
	);
	$inspect('URL ====================================================: ', url);
	let currentDocFilename = $derived(docs.find((doc) => doc.id === currentDocHash)?.filename ?? '');

	let hasDocuments: boolean = $derived((documents?.length ?? 0) > 0);

	$inspect('documents ====================================================: ', docs);
	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		'pdfjs-dist/build/pdf.worker.mjs',
		import.meta.url
	).toString();

	// Internal state variables with proper typing
	let canvas: HTMLCanvasElement | undefined = $state();

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
	// svelte-ignore state_referenced_locally (countdown resets use current `flipTime` in handlers)
	let seconds: number = flipTime;
	let pages: HTMLCanvasElement[] = [];
	let password = $state('');
	let passwordError = $state(false);
	let passwordMessage = $state('');
	let isInitialized: boolean = false;
	const minScale: number = 1.0;
	const maxScale: number = 2.3;

	const renderPage = async (num: number): Promise<void> => {
		console.log('renderPage ====================================================: ', num);
		if (num < 1 || num > pageCount || !pdfDoc || !canvas) return;
		pageRendering = true;
		try {
			const page = await pdfDoc.getPage(num);
			const viewport = page.getViewport({ scale, rotation });
			const canvasContext = canvas.getContext('2d');
			if (!canvasContext) return;

			canvas.height = viewport.height;
			canvas.width = viewport.width;

			const renderContext: RenderContext = {
				canvasContext,
				viewport
			};
			await page.render(renderContext).promise;

			// Handle PDF links
			await handlePageLinks(page, viewport);

			pageRendering = false;
			currentPage = num;
			if (pageNumPending !== null) {
				if (pageNum < pdfDoc.numPages) {
					pages[pageNum - 1] = canvas.cloneNode(true) as HTMLCanvasElement;
					pageNum++;
					await renderPage(pageNum);
				} else {
					for (let i = 0; i < pages.length; i++) {
						canvas.parentNode?.insertBefore(pages[i], canvas);
					}
					canvas.remove();
				}
				pageNumPending = null;
			}
			// Update page counters
			showButtons.length ? (pageNum = num) : null;
		} catch (error) {
			console.error('Error rendering page:', error);
			pageRendering = false;
		}
	};

	const handlePageLinks = async (page: PDFPage, viewport: Viewport): Promise<void> => {
		try {
			const annotations = await page.getAnnotations();

			// Remove existing link overlays for this page
			const existingLinks = canvas?.parentNode?.querySelectorAll('.pdf-link-overlay');
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
		if (!canvas?.parentNode || !annotation.url) return;

		const linkElement = document.createElement('a');
		linkElement.className = 'pdf-link-overlay';
		linkElement.href = annotation.url;
		linkElement.target = externalLinksTarget || '_blank';
		linkElement.rel = 'noopener noreferrer';

		// Convert PDF coordinates to canvas coordinates
		const rect = annotation.rect;
		const [x1, y1, x2, y2] = rect;

		// Transform coordinates using viewport
		const canvasRect = viewport.convertToViewportRectangle([x1, y1, x2, y2]);

		// Position the overlay
		linkElement.style.position = 'absolute';
		linkElement.style.left = `${Math.min(canvasRect[0], canvasRect[2])}px`;
		linkElement.style.top = `${Math.min(canvasRect[1], canvasRect[3])}px`;
		linkElement.style.width = `${Math.abs(canvasRect[2] - canvasRect[0])}px`;
		linkElement.style.height = `${Math.abs(canvasRect[3] - canvasRect[1])}px`;
		linkElement.style.zIndex = '10';
		linkElement.style.background = 'transparent';
		linkElement.style.border = 'none';

		// Make the canvas container relative if it isn't already
		if (!(canvas.parentNode as HTMLElement).style.position) {
			(canvas.parentNode as HTMLElement).style.position = 'relative';
		}

		canvas.parentNode.appendChild(linkElement);
	};

	const queueRenderPage = (num: number): void => {
		if (pageRendering) {
			pdfDoc?.getPage(num).then((page) => {
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
		if (scale <= maxScale) {
			scale += 0.1;
			queueRenderPage(pageNum);
		}
	};

	const onZoomOut = (): void => {
		if (scale >= minScale) {
			scale -= 0.1;
			queueRenderPage(pageNum);
		}
	};

	const printPdf = (url: string | undefined): void => {
		if (url) {
			onPrint(url);
		}
	};

	const clockwiseRotate = (): void => {
		rotation += 90;
		queueRenderPage(pageNum);
	};

	const antiClockwiseRotate = (): void => {
		rotation -= 90;
		queueRenderPage(pageNum);
	};

	const onPasswordSubmit = (): void => {
		initialLoad();
	};

	const initialLoad = async (): Promise<void> => {
		try {
			const loadingTask = pdfjs.getDocument({
				...(url && { url }),
				...(data && { data }),
				...(password && { password })
			});
			if (onProgress) {
				loadingTask.onProgress = onProgress;
			}

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
			renderPage(currentPage);
		} catch (error) {
			passwordError = true;
			passwordMessage = (error as Error).message;
		}
	};

	initialLoad();

	// Watch for changes to currentPage prop and render the page
	$effect(() => {
		if (isInitialized && currentPage !== pageNum) {
			queueRenderPage(currentPage);
		}
	});

	const onPageTurn = (): void => {
		autoFlip = !autoFlip;
		clearInterval(interval);
		clearInterval(secondInterval);

		if (autoFlip && pageNum <= totalPage) {
			seconds = flipTime; // Reset seconds immediately
			secondInterval = setInterval(() => {
				seconds--;
			}, 1000);

			interval = setInterval(() => {
				clearInterval(secondInterval); // Clear the seconds counter interval
				seconds = flipTime; // Reset seconds *before* going to the next page
				onNextPage();
				if (currentPage > totalPage) {
					onPageTurn();
				} else {
					secondInterval = setInterval(() => {
						seconds--;
					}, 1000);
				}
			}, flipTime * 1000);
		}
	};

	const downloadPdf = ({ url: fileUrl, data }: DownloadOptions): void => {
		const fileName =
			downloadFileName ||
			(fileUrl && fileUrl.substring(fileUrl.lastIndexOf('/') + 1)) ||
			'download.pdf'; // Provide a default file name
		(savePDF as any)({ fileUrl, data, name: fileName });
	};

	onDestroy(() => {
		clearInterval(interval);
		clearInterval(secondInterval);
	});

	const onDocumentChange = (documentId: string): void => {
		currentDocHash = documentId;
		currentPage = 1
		openDropdown = false;
		initialLoad();
	};

	// Window dimensions
	let pageWidth = $state(0);
	let pageHeight = $state(0);

	// Event handler types
	const handleKeyDown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			(event.target as HTMLElement).click();
		}
	};

	// Export functions for parent component to call
	export { onPrevPage, onNextPage };
</script>

<svelte:window bind:innerWidth={pageWidth} bind:innerHeight={pageHeight} />
<div class="mb-2 flex items-center">
	<ButtonGroup>
		<Button outline color="dark">
			{currentDocFilename}
			<ChevronDownOutline class="text-primary ms-2 h-6 w-6 text-gray-700 dark:text-gray-300" />
		</Button>
		<Dropdown class="list-none">
			{#each docs as document}
				<DropdownItem class="text-gray-700 dark:text-gray-300" onclick={() => onDocumentChange(document.id)}>
					{document.filename}
				</DropdownItem>
			{/each}
		</Dropdown>
		<Button outline color="dark" onclick={() => onPrevPage()}>
			<ArrowLeftOutline class="h-6 w-6 shrink-0" />
		</Button>
		<Button outline color="dark" onclick={() => onNextPage()}>
			<ArrowRightOutline class="h-6 w-6 shrink-0" />
		</Button>
		<Button outline color="dark" onclick={() => onZoomIn()}>
			<ZoomInOutline class="h-6 w-6 shrink-0" />
		</Button>
		<Button outline color="dark" onclick={() => onZoomOut()}>
			<ZoomOutOutline class="h-6 w-6 shrink-0" />
		</Button>
		<Button outline color="dark" onclick={() => clockwiseRotate()}>
			<RotateRight />
		</Button>
		<Button outline color="dark" onclick={() => antiClockwiseRotate()}>
			<RotateLeft />
		</Button>
		<Button outline color="dark">
			Page {currentPage} of {totalPage}<ChevronDownOutline
				class="text-primary ms-2 h-6 w-6 dark:text-gray-200"
			/>
			<Dropdown class="list-none">
				{#each Array(totalPage)
					.fill(0)
					.map((_, i) => i + 1) as num}
					<DropdownItem class="text-gray-700 dark:text-gray-300" onclick={() => queueRenderPage(num)}>
						Page {num}
					</DropdownItem>
				{/each}
			</Dropdown>
		</Button>
	</ButtonGroup>
</div>

<div>
	{#if passwordError === true}
		<div>
			<p>This document requires a password to open:</p>
			<p>{passwordMessage}</p>
			<div>
				<input type="password" bind:value={password} />
				<button onclick={onPasswordSubmit}> Submit </button>
			</div>
		</div>
	{:else}
		<canvas bind:this={canvas}></canvas>
	{/if}
</div>
