/**
 * PDF highlight overlays + page image map for VisualDocumentResearchAgent tool results
 * (aligned with sveltekit-agent-demo +page.svelte).
 */

export type HighlightBox = {
	x: number;
	y: number;
	w: number;
	h: number;
	text: string;
	pageNumber: number | null;
};

export type HighlightPage = {
	imageUrl: string;
	boxes: HighlightBox[];
	pageWidth: number;
	pageHeight: number;
};

export type AnswerToolResult = {
	highlightPages: HighlightPage[];
	pageImageMap: Map<number, string>;
	defaultImageUrl: string | null;
};

export const PDF_PAGE_WIDTH = 792;
export const PDF_PAGE_HEIGHT = 612;

export function extractHighlightPages(result: Record<string, unknown>): HighlightPage[] {
	const boxes = result.highlightBoxes as HighlightBox[] | undefined;
	const imageUrls = result.usedImageUrls as string[] | undefined;
	if (!boxes?.length || !imageUrls?.length) return [];

	const pageWidth = (result.pageWidth as number) || PDF_PAGE_WIDTH;
	const pageHeight = (result.pageHeight as number) || PDF_PAGE_HEIGHT;

	const sources = (result.sources ?? []) as Array<{
		pageNumber: number | null;
		imageUrl: string | null;
	}>;
	const pageToImage = new Map<number, string>();
	for (const s of sources) {
		if (s.pageNumber != null && s.imageUrl) pageToImage.set(s.pageNumber, s.imageUrl);
	}

	const grouped = new Map<string, HighlightBox[]>();
	for (const box of boxes) {
		const img =
			(box.pageNumber != null ? pageToImage.get(box.pageNumber) : null) ?? imageUrls[0];
		let arr = grouped.get(img);
		if (!arr) {
			arr = [];
			grouped.set(img, arr);
		}
		arr.push(box);
	}

	return Array.from(grouped.entries()).map(([imageUrl, pageBoxes]) => ({
		imageUrl,
		boxes: pageBoxes,
		pageWidth,
		pageHeight
	}));
}

export function normalizePageNumber(value: unknown): number | null {
	if (value == null) return null;
	if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
	if (typeof value === 'string') {
		const n = Number(value.trim());
		return Number.isFinite(n) ? Math.trunc(n) : null;
	}
	return null;
}

/** PDF page index from storage paths like .../image_pages/2.png */
export function pageNumberFromImageUrl(url: string): number | null {
	const m = url.match(/image_pages\/(\d+)\.(?:png|jpe?g|webp)/i);
	if (!m) return null;
	const n = Number(m[1]);
	return Number.isFinite(n) ? n : null;
}

/** Rows for UI when the model did not emit a “Sources:” block but the tool lists pages / images. */
export type ToolPageCitation = {
	pageNumber: number;
	imageUrl: string;
};

/** Sorted page → image links from `buildPageImageMap` (same pages cited without highlight boxes). */
export function toolPageCitations(pageImageMap: Map<number, string>): ToolPageCitation[] {
	return [...pageImageMap.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([pageNumber, imageUrl]) => ({ pageNumber, imageUrl }));
}

export function buildPageImageMap(result: Record<string, unknown>): Map<number, string> {
	const pageImageMap = new Map<number, string>();
	const imageUrls = (result.usedImageUrls as string[] | undefined) ?? [];
	const sources = (result.sources ?? []) as Array<{
		pageNumber: number | null | string;
		imageUrl: string | null;
	}>;

	function registerUrl(url: string | null | undefined) {
		if (!url) return;
		const fromPath = pageNumberFromImageUrl(url);
		if (fromPath != null) pageImageMap.set(fromPath, url);
	}

	for (const url of imageUrls) registerUrl(url);
	for (const s of sources) registerUrl(s.imageUrl);

	for (const s of sources) {
		const n = normalizePageNumber(s.pageNumber);
		if (n != null && s.imageUrl && !pageImageMap.has(n)) {
			pageImageMap.set(n, s.imageUrl);
		}
	}

	if (pageImageMap.size === 0) {
		for (let i = 0; i < imageUrls.length; i++) {
			pageImageMap.set(i + 1, imageUrls[i]);
		}
	}

	return pageImageMap;
}

export function getAnswerToolData(parts: Array<Record<string, unknown>>): AnswerToolResult {
	for (const part of parts) {
		const resultRecord = (() => {
			if (
				(part.type === 'tool-VisualDocumentResearchAgent' ||
					part.type === 'tool-answerFromImages') &&
				part.state === 'output-available' &&
				part.output &&
				typeof part.output === 'object'
			) {
				const out = part.output as Record<string, unknown>;
				if (typeof out.error === 'string' && out.error) return null;
				return out;
			}
			if (
				part.type === 'tool-invocation' &&
				part.state === 'result' &&
				part.toolInvocation &&
				typeof part.toolInvocation === 'object'
			) {
				const inv = part.toolInvocation as { toolName?: string; result?: unknown };
				if (
					inv.toolName !== 'VisualDocumentResearchAgent' &&
					inv.toolName !== 'answerFromImages'
				)
					return null;
				if (!inv.result || typeof inv.result !== 'object') return null;
				const out = inv.result as Record<string, unknown>;
				if (typeof out.error === 'string' && out.error) return null;
				return out;
			}
			return null;
		})();

		if (resultRecord) {
			const highlightPages = extractHighlightPages(resultRecord);
			const pageImageMap = buildPageImageMap(resultRecord);
			const defaultImageUrl = (resultRecord.usedImageUrls as string[] | undefined)?.[0] ?? null;
			return { highlightPages, pageImageMap, defaultImageUrl };
		}
	}
	return { highlightPages: [], pageImageMap: new Map(), defaultImageUrl: null };
}
