<script lang="ts">
    import { onMount } from 'svelte';
    // Core API
    import * as pdfjs from 'pdfjs-dist';
    import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
    // Tell PDF.js where to load its worker from (Vite will bundle and serve this)
    // The `?url` gives a URL string to the worker file at build time.
    // Works with SvelteKit (Vite) without extra config.
    // @ts-ignore - virtual query param
    import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    interface Props {
      src: string;
      scale?: number;
      query?: string;
    }
    let { src, scale = 1.25, query = '' }: Props = $props();
    let search = $derived(query);
    $inspect('search: ', search);

    let containerEl: HTMLDivElement;
    let doc: PDFDocumentProxy | null = null;
  
    type PageStuff = {
      page: PDFPageProxy;
      canvas: HTMLCanvasElement;
      overlay: HTMLDivElement; // highlight layer
      viewport: ReturnType<PDFPageProxy['getViewport']>;
      textItems: Array<{
        str: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    };
  
    let pages: PageStuff[] = [];
  
    // Search function to be called by parent component
    export function performSearch() {
      if (!doc) return;
      drawHighlights(search.trim());
    }
  
    onMount(async () => {
      await load();
    });
  
    async function load() {
      // Reset
      pages = [];
      containerEl.innerHTML = '';
  
      doc = await pdfjs.getDocument(src).promise;
  
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });
  
        // Per-page wrapper
        const pageWrap = document.createElement('div');
        pageWrap.className = 'relative mb-6 bg-white shadow rounded overflow-hidden border';
        pageWrap.style.width = `${viewport.width}px`;
        pageWrap.style.height = `${viewport.height}px`;
        pageWrap.style.marginInline = 'auto';
  
        // Canvas for rasterized page
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
  
        // Transparent overlay for highlights
        const overlay = document.createElement('div');
        overlay.className = 'absolute inset-0 pointer-events-none';
        overlay.style.mixBlendMode = 'multiply';
  
        // Render page
        await page.render({ canvasContext: ctx, viewport }).promise;
  
        // Extract text positions (enough to draw highlight boxes)
        const textContent = await page.getTextContent();
  
        // Convert text items to positioned rects.
        // PDF coordinates to canvas coordinates approximation:
        // item.transform = [a, b, c, d, e, f]
        // x = e, y = f are baseline; height ≈ sqrt(b^2 + d^2)
        // Page's origin is top-left after viewport; we flip y and subtract height.
        const textItems = textContent.items.map((it: any) => {
          const [a, b, c, d, e, f] = it.transform as [number, number, number, number, number, number];
          const fontHeight = Math.hypot(b, d);
          // width returned by textContent is in text space; multiply by viewport.scale
          const width = (it.width || 0) * viewport.scale;
          // Convert PDF baseline coordinates (e,f) to top-left canvas coordinates:
          const x = e;
          const yTop = viewport.height - f - fontHeight; // flip Y and move up by height
  
          return {
            str: String(it.str ?? ''),
            x,
            y: yTop,
            width,
            height: fontHeight
          };
        });
  
        pageWrap.appendChild(canvas);
        pageWrap.appendChild(overlay);
        containerEl.appendChild(pageWrap);
  
        pages.push({ page, canvas, overlay, viewport, textItems });
      }
  
      // Initial highlight (if there's a pre-filled query)
      drawHighlights(search.trim());
    }
  
    function clearHighlights() {
      for (const p of pages) {
        p.overlay.innerHTML = '';
      }
    }
  
    function drawHighlights(q: string) {
      clearHighlights();
      if (!q) return;
      const needle = q.toLowerCase();
      console.log('Searching for:', needle);

      for (const p of pages) {
        // Find matching items
        const matches = p.textItems.filter((t) => t.str.toLowerCase().includes(needle));
        console.log('Found matches:', matches.length, 'on page', p.page.pageNumber);

        // For each match, we'll draw one or more highlight boxes.
        // To keep it simple, we highlight the entire text item that contains the match.
        // (This is fast and robust; you can refine to per-substring rectangles later.)
        for (const m of matches) {
          const mark = document.createElement('div');
          mark.className = 'absolute rounded-sm';
          mark.style.left = `${m.x}px`;
          mark.style.top = `${m.y}px`;
          mark.style.width = `${Math.max(m.width, 2)}px`;
          mark.style.height = `${Math.max(m.height, 2)}px`;
          // highlight style
          mark.style.background = 'rgba(255, 235, 59, 0.45)';   // soft yellow
          mark.style.outline = '1px solid rgba(255, 193, 7, 0.9)';

          p.overlay.appendChild(mark);
        }
      }
    }
  </script>
  
  <style>
    /* Optional, keeps the viewer a bit centered & tidy */
    :global(.pdf-container) {
      display: grid;
      gap: 1.25rem;
      justify-content: center;
    }
  </style>
  
  <div bind:this={containerEl} class="pdf-container"></div>
  