<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import PDFViewer from '$lib/documents/viewer/PDFViewer.svelte';
	import PromptWorkspaceToolsSidebar from './PromptWorkspaceToolsSidebar.svelte';

	type DocItem = { id: string; filename: string };

	const BOTTOM_PANEL_MIN = 200;
	const PDF_AREA_MIN = 120;
	const PDF_BOTTOM_RESIZER_H = 6;
	/** Initial split: bottom (edit/tools) panel height as a fraction of the center column (reference layout ~50/50). */
	const INITIAL_BOTTOM_PANEL_FRACTION = 0.5;

	let {
		darkMode,
		documents,
		selectedDocumentId = $bindable(''),
		topK = $bindable(5),
		topKPerNs = $bindable(5),
		priority = $bindable<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM'),
		googleSearchEnabled = $bindable(true),
		documentScopeSelectedOnly = $bindable(false),
		workspaceEdit
	} = $props<{
		darkMode: boolean;
		documents: DocItem[];
		selectedDocumentId?: string;
		topK: number;
		topKPerNs: number;
		priority: 'HIGH' | 'MEDIUM' | 'LOW';
		googleSearchEnabled: boolean;
		documentScopeSelectedOnly: boolean;
		workspaceEdit: Snippet;
	}>();

	let currentPage = $state(1);
	let centerColumnEl = $state<HTMLDivElement | undefined>();
	let bottomPanelHeightPx = $state(300);
	let workspaceTab = $state<'edit' | 'tools'>('edit');
	let didApplyInitialVerticalSplit = $state(false);

	const centerBg = $derived(darkMode ? 'bg-slate-900' : 'bg-slate-50');
	const card = $derived(darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white');
	const hasDocuments = $derived(documents.length > 0);

	const tabInactive = $derived(
		darkMode
			? 'text-slate-500 hover:bg-slate-800/80 hover:text-slate-300'
			: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
	);
	const tabActive = $derived(
		darkMode
			? 'border-indigo-400 text-slate-100'
			: 'border-indigo-600 text-slate-900'
	);

	function clampBottomPanelHeight(px: number, columnHeight: number): number {
		const maxBottom = columnHeight - PDF_BOTTOM_RESIZER_H - PDF_AREA_MIN;
		const cap = Math.max(BOTTOM_PANEL_MIN, maxBottom);
		return Math.min(cap, Math.max(BOTTOM_PANEL_MIN, px));
	}

	function reclampBottomPanel() {
		if (!centerColumnEl || typeof window === 'undefined') return;
		const h = centerColumnEl.getBoundingClientRect().height;
		if (h <= PDF_BOTTOM_RESIZER_H + PDF_AREA_MIN + BOTTOM_PANEL_MIN) return;
		bottomPanelHeightPx = clampBottomPanelHeight(bottomPanelHeightPx, h);
	}

	function onPdfBottomResizePointerDown(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		const col = centerColumnEl;
		if (!col) return;
		target.setPointerCapture(e.pointerId);
		const colH = col.getBoundingClientRect().height;
		if (colH <= PDF_BOTTOM_RESIZER_H + PDF_AREA_MIN + BOTTOM_PANEL_MIN) return;

		const startY = e.clientY;
		const startBottomH = bottomPanelHeightPx;

		function onMove(ev: PointerEvent) {
			// Bottom panel sits under the PDF; growing it eats flex space above. Dragging the handle down moves
			// the split down → less room for this panel → height decreases with positive clientY delta.
			bottomPanelHeightPx = clampBottomPanelHeight(startBottomH - (ev.clientY - startY), colH);
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

	function tryApplyInitialVerticalSplit(): void {
		if (didApplyInitialVerticalSplit || !centerColumnEl) return;
		const h = centerColumnEl.getBoundingClientRect().height;
		if (h <= PDF_BOTTOM_RESIZER_H + PDF_AREA_MIN + BOTTOM_PANEL_MIN) return;
		const target = (h - PDF_BOTTOM_RESIZER_H) * INITIAL_BOTTOM_PANEL_FRACTION;
		bottomPanelHeightPx = clampBottomPanelHeight(target, h);
		didApplyInitialVerticalSplit = true;
	}

	onMount(() => {
		function onWinResize() {
			reclampBottomPanel();
		}
		window.addEventListener('resize', onWinResize);
		queueMicrotask(() => {
			tryApplyInitialVerticalSplit();
			reclampBottomPanel();
			requestAnimationFrame(() => {
				tryApplyInitialVerticalSplit();
				reclampBottomPanel();
			});
		});
		return () => window.removeEventListener('resize', onWinResize);
	});
</script>

<div
	bind:this={centerColumnEl}
	class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden {centerBg}"
>
	<!-- PDF (fills space above the tabbed panel) -->
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
		{#if documents.length === 0}
			<div
				class="flex flex-1 items-center justify-center p-4 text-center text-xs {darkMode ? 'text-slate-500' : 'text-slate-500'}"
			>
				No documents in this project. Upload files on the Documents page to preview and run vision RAG.
			</div>
		{:else}
			<PDFViewer
				{documents}
				bind:currentDocHash={selectedDocumentId}
				bind:currentPage={currentPage}
				embed
				hideDocumentFilename
				fitWidthOnLoad={false}
				showButtons={['navigation', 'zoom', 'rotate', 'download', 'refresh']}
			/>
		{/if}
	</div>

	<!-- Resize PDF vs. tabbed panel (top of the edit / tools panel) -->
	<button
		type="button"
		aria-label="Resize document preview and prompt workspace panel"
		class="h-1.5 w-full shrink-0 cursor-row-resize touch-none border-0 p-0 select-none focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500 {darkMode
			? 'bg-slate-600 hover:bg-slate-500'
			: 'bg-slate-300 hover:bg-slate-400'}"
		onpointerdown={onPdfBottomResizePointerDown}
		onkeydown={(e) => {
			if (!centerColumnEl) return;
			const h = centerColumnEl.getBoundingClientRect().height;
			if (h <= PDF_BOTTOM_RESIZER_H + PDF_AREA_MIN + BOTTOM_PANEL_MIN) return;
			const step = e.shiftKey ? 32 : 12;
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				bottomPanelHeightPx = clampBottomPanelHeight(bottomPanelHeightPx - step, h);
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				bottomPanelHeightPx = clampBottomPanelHeight(bottomPanelHeightPx + step, h);
			}
		}}
	></button>

	<!-- Single panel: tabs for Edit prompt | AI tools -->
	<div
		class="flex shrink-0 flex-col overflow-hidden rounded-lg border {card}"
		style="height: {bottomPanelHeightPx}px"
	>
		<div
			role="tablist"
			aria-label="Prompt workspace"
			class="flex shrink-0 gap-0 border-b px-1 {darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50/80'}"
		>
			<button
				type="button"
				role="tab"
				id="workspace-tab-edit"
				aria-selected={workspaceTab === 'edit'}
				tabindex={workspaceTab === 'edit' ? 0 : -1}
				class="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors {workspaceTab === 'edit'
					? tabActive
					: tabInactive}"
				onclick={() => (workspaceTab = 'edit')}
			>
				Edit prompt
			</button>
			<button
				type="button"
				role="tab"
				id="workspace-tab-tools"
				aria-selected={workspaceTab === 'tools'}
				tabindex={workspaceTab === 'tools' ? 0 : -1}
				class="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors {workspaceTab === 'tools'
					? tabActive
					: tabInactive}"
				onclick={() => (workspaceTab = 'tools')}
			>
				AI tools
			</button>
		</div>

		{#if workspaceTab === 'edit'}
			<div
				role="tabpanel"
				aria-labelledby="workspace-tab-edit"
				class="flex min-h-0 flex-1 flex-col overflow-hidden"
			>
				<div class="min-h-0 flex-1 overflow-y-auto">
					{@render workspaceEdit()}
				</div>
			</div>
		{:else}
			<div
				role="tabpanel"
				aria-labelledby="workspace-tab-tools"
				class="flex min-h-0 flex-1 flex-col overflow-hidden"
			>
				<PromptWorkspaceToolsSidebar
					embedded
					hideIntroHeader
					{darkMode}
					bind:topK
					bind:topKPerNs
					bind:priority
					bind:googleSearchEnabled
					bind:documentScopeSelectedOnly
					{hasDocuments}
				/>
			</div>
		{/if}
	</div>
</div>
