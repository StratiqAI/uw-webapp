import type { ProjectDocument } from "$lib/types/cloud/app";

// Type definitions
export interface PDFViewerProps {
	data?: Uint8Array | null;
	documents?: ProjectDocument[];
	scale?: number;
	pageNum?: number;
	flipTime?: number;
	showButtons?: string[];
	showBorder?: boolean;
	totalPage?: number;
	currentPage?: number;
	currentDocHash?: string;
	downloadFileName?: string;
	showTopButton?: boolean;
	/** Omit outer border/radius; parent controls chrome and height. */
	embed?: boolean;
	/** Hide filename in toolbar; single-doc hides picker. Multi-doc keeps icon-only switcher. */
	hideDocumentFilename?: boolean;
	/**
	 * After the PDF loads, zoom to fit the viewer width (default true). When false, does not
	 * change `scale` — use bindable `scale` (e.g. 0.6 for 60%) and it persists after load.
	 */
	fitWidthOnLoad?: boolean;
	onProgress?: (progress: { loaded: number; total: number }) => void;
	externalLinksTarget?: string;
}

export interface PDFAnnotation {
	subtype: string;
	url?: string;
	rect: number[];
}

export interface PDFPage {
	getViewport: (options: { scale: number; rotation: number }) => any;
	render: (context: any) => { promise: Promise<void> };
	getAnnotations: () => Promise<PDFAnnotation[]>;
}

export interface PDFDocument {
	numPages: number;
	getPage: (pageNumber: number) => Promise<PDFPage>;
	destroy?: () => void;
}

export interface Viewport {
	height: number;
	width: number;
	convertToViewportRectangle: (rect: number[]) => number[];
}

export interface RenderContext {
	canvasContext: CanvasRenderingContext2D;
	viewport: Viewport;
}

export interface DownloadOptions {
	url?: string;
	data?: Uint8Array | null;
}
