<script lang="ts">
	import type { Project, Doclink } from '$lib/types/cloud/app';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import { untrack, onDestroy } from 'svelte';
	import { store } from '$lib/realtime/websocket/projectSync';
	import { DocumentEntitiesSyncManager } from '$lib/realtime/websocket/syncManagers/DocumentEntitiesSyncManager';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { DocumentUpload } from '$lib/components/documents/upload';
	import type { ExistingDocument, DocumentListItem } from '$lib/components/documents/upload';
	import DocumentProcessingModal from '$lib/components/documents/processing/DocumentProcessingModal.svelte';
	import ProjectEntitiesDisplay from '$lib/components/documents/ProjectEntitiesDisplay.svelte';
	import PDFViewer from '$lib/components/documents/viewer/PDFViewer.svelte';
	import AgentActivityFeed from '$lib/components/ai/AgentActivityFeed.svelte';
	import { page } from '$app/stores';
	import { M_DELETE_DOCLINK, S_ON_CREATE_DOCLINK } from '@stratiqai/types-simple';
	import { addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';
	import { print } from 'graphql';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { Q_GET_PROJECT } from '$lib/realtime/graphql/queries/Project';
	import type { SubscriptionSpec } from '$lib/realtime/websocket/types';

	interface ProjectDocument {
		id: string;
		filename: string;
	}

	let { data } = $props();
	const idToken = $derived(data?.idToken);
	const currentUser = $derived(data?.currentUser ?? authStore.currentUser);
	const projectId = $derived($page.params.projectId ?? null);
	const darkMode = $derived(darkModeStore.darkMode);

	// ---- Right sidebar (upload panel) state ----
	const LS_WIDTH = 'upload.sidebarWidth';
	const LS_OPEN = 'upload.sidebarOpen';
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

	// Effect: Sync sidebar state to localStorage reactively
	$effect(() => {
		if (browser) {
			try {
				localStorage.setItem(LS_WIDTH, String(sidebarWidth));
				localStorage.setItem(LS_OPEN, String(isOpen));
			} catch {}
		}
	});

	// Drag-resize logic
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
		sidebarWidth = clampWidth(startWidth + (startX - e.clientX));
	}
	function endResize(e: PointerEvent) {
		if (!resizing) return;
		resizing = false;
		try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
		document.documentElement.classList.remove('select-none');
	}

	// ---- Derived store data ----
	let project = $state<Project | null>(null);

	const fileMetadata = $derived.by(() => {
		const hasOwnerId = !!currentUser?.sub;
		const hasProjectId = !!projectId;
		if (!hasOwnerId || !hasProjectId) return null;
		return {
			tenantId: project?.tenantId || currentUser.tenant || authStore.currentUser?.tenant || 'default',
			ownerId: currentUser.sub,
			parentId: projectId
		};
	});

	const doclinks = $derived.by(() => {
		const links = project?.doclinks;
		if (!links) return [] as Doclink[];
		return Array.isArray(links) ? links : ((links as any).items || []);
	});

	// One row per documentId (prefer primary Doclink with linkType NONE)
	type DoclinkWithLinkType = Doclink & { linkType?: string };
	const doclinksByDocument = $derived.by(() => {
		const byDoc = new Map<string, Doclink>();
		for (const link of doclinks as DoclinkWithLinkType[]) {
			if (!link.documentId) continue;
			const existing = byDoc.get(link.documentId);
			if (!existing || link.linkType === 'NONE') byDoc.set(link.documentId, link);
		}
		return Array.from(byDoc.values());
	});

	const existingDocuments: ExistingDocument[] = $derived(
		doclinksByDocument.map((link) => ({
			id: link.id,
			filename: link.filename,
			parentId: link.parentId,
			documentId: link.documentId
		} as ExistingDocument))
	);

	const documents = $derived.by(() => {
		return doclinks
			.filter((link: Doclink) => link.documentId && link.filename)
			.map((link: Doclink) => ({
				id: link.documentId!,
				filename: link.filename
			})) as ProjectDocument[];
	});

	// ---- DocumentUpload callbacks ----
	async function handleDeleteDocument(doc: ExistingDocument): Promise<void> {
		if (!idToken) throw new Error('Not authenticated');
		await gql(
			print(M_DELETE_DOCLINK),
			{ key: { id: doc.id, parentId: doc.parentId } },
			idToken
		);
	}

	let selectedDocument = $state<{
		documentId: string;
		projectId: string;
		filename: string;
	} | null>(null);
	let isModalOpen = $derived(selectedDocument !== null);

	function handleDocumentClick(item: DocumentListItem) {
		let documentId: string | null = null;
		const pid = projectId;

		if (item.status === 'existing' && item.documentLink) {
			documentId = item.documentLink.id;
		} else if (item.status === 'upload' && item.uploadFile?.result?.success) {
			documentId = `doc-${item.id}`;
		}

		if (documentId && pid) {
			selectedDocument = { documentId, projectId: pid, filename: item.filename };
		}
	}

	function handleModalClose() {
		selectedDocument = null;
	}

	let selectedDocId = $state<string>('');
	let currentPage = $state(1);

	// Effect: Auto-select first document
	$effect(() => {
		const docs = documents; // Read reactive dependency
		
		untrack(() => { // Mutate state without re-triggering this effect
			if (docs.length > 0) {
				const firstDocId = docs[0].id;
				if (!selectedDocId || !docs.some((doc) => doc.id === selectedDocId)) {
					selectedDocId = firstDocId;
					currentPage = 1;
				}
			} else if (selectedDocId) {
				selectedDocId = '';
			}
		});
	});

	// ---- Document entities ----
	let documentEntitiesManager = $state<DocumentEntitiesSyncManager | null>(null);
	let isLoadingEntities = $state(false);
	let entitiesError = $state<string | null>(null);
	let lastFetchedDocIds = $state<string>('');

	const documentIdsKey = $derived(documents.map(doc => doc.id).sort().join(','));

	async function fetchDocumentEntities(documentIds: string[], token: string, pid: string): Promise<void> {
		if (!browser) return;
		isLoadingEntities = true;
		entitiesError = null;

		try {
			documentEntitiesManager?.cleanup();
			documentEntitiesManager = await DocumentEntitiesSyncManager.create({
				idToken: token,
				projectId: pid,
				documentIds
			});
		} catch (err) {
			console.error('Failed to fetch document entities:', err);
			entitiesError = err instanceof Error ? err.message : 'Failed to load document entities';
		} finally {
			isLoadingEntities = false;
		}
	}

	function retryEntities() {
		lastFetchedDocIds = '';
		const docIds = documents.map(doc => doc.id);
		if (idToken && projectId && docIds.length > 0) {
			fetchDocumentEntities(docIds, idToken, projectId);
		}
	}

	// Effect: Fetch entities when dependencies change.
	// Reads lastFetchedDocIds via untrack to avoid writing to a tracked dependency.
	$effect(() => {
		const docIdsKey = documentIdsKey;
		const token = idToken;
		const pid = projectId;
		const lastIds = untrack(() => lastFetchedDocIds);

		if (browser && token && pid && docIdsKey && docIdsKey !== lastIds) {
			lastFetchedDocIds = docIdsKey;
			const documentIds = docIdsKey.split(',').filter(Boolean);
			if (documentIds.length > 0) {
				fetchDocumentEntities(documentIds, token, pid);
			}
		}
	});

	onDestroy(() => {
		documentEntitiesManager?.cleanup();
	});

	// ---- Project Sync & Subscription Lifecycle ----

	function mergeDoclink(pid: string, newDoclink: Doclink) {
		const current = untrack(() => store.at<Project>(`projects/${pid}`));
		if (!current) return;
		const existing = (current as any).doclinks;
		const items = Array.isArray(existing) ? existing : (existing?.items || []);
		
		if (items.some((d: Doclink) => d.id === newDoclink.id)) return;
		
		const updated = { ...current, doclinks: { items: [...items, newDoclink], nextToken: null } } as Project;
		untrack(() => store.publish(`projects/${pid}`, updated));
		project = updated;
	}

	// Seed project from store + fetch from GraphQL if needed.
	// Uses untrack() for store access so store mutations don't re-trigger this effect.
	$effect(() => {
		const pid = projectId;
		const token = idToken;

		if (!browser || !pid || !token) {
			project = null;
			return;
		}

		let cancelled = false;

		const storeProject = untrack(() => store.at<Project>(`projects/${pid}`));
		project = storeProject ?? null;

		if (!storeProject || !(storeProject as any).doclinks) {
			gql<{ getProject: Project }>(Q_GET_PROJECT, { id: pid }, token)
				.then((res) => {
					if (!cancelled && res?.getProject) {
						untrack(() => store.publish(`projects/${pid}`, res.getProject));
						project = res.getProject;
					}
				})
				.catch((err) => console.error('Failed to fetch project doclinks:', err));
		}

		return () => { cancelled = true; };
	});

	// Doclink subscription — isolated so store mutations don't tear it down and recreate it.
	$effect(() => {
		const pid = projectId;
		const token = idToken;

		if (!browser || !pid || !token) return;

		const spec: SubscriptionSpec<Doclink> = {
			query: print(S_ON_CREATE_DOCLINK),
			variables: { parentId: pid },
			path: 'onCreateDoclink',
			next: (doclink: Doclink) => mergeDoclink(pid, doclink),
			error: (err: any) => console.error('Doclink subscription error:', err)
		};

		addSubscription(token, spec).catch(err => console.error('Failed to add doclink subscription:', err));

		return () => { removeSubscription(spec); };
	});
</script>

<div class="flex h-full w-full overflow-hidden">
	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-7xl px-6 py-8">
			<!-- PDF Viewer -->
			<div class="mb-8" in:fade={{ duration: 300, delay: 200 }}>
				<PDFViewer
					documents={documents}
					bind:currentDocHash={selectedDocId}
					bind:currentPage={currentPage}
					showButtons={['navigation', 'zoom', 'rotate', 'download']}
				/>
			</div>

			<!-- Document Entities Display -->
			{#if projectId}
				<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm" in:fade={{ duration: 300, delay: 300 }}>
					<div class="p-6">
						{#if isLoadingEntities}
							<div class="flex items-center justify-center py-8">
								<div class="flex items-center gap-3">
									<svg class="animate-spin h-5 w-5 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									<span class="{darkMode ? 'text-slate-300' : 'text-slate-600'}">Loading document entities...</span>
								</div>
							</div>
						{:else if entitiesError}
							<div class="p-4 {darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'} rounded-lg border">
								<div class="flex items-center gap-2 text-red-600 dark:text-red-400">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
									</svg>
									<span class="font-medium">Error loading entities</span>
								</div>
								<p class="mt-1 text-sm {darkMode ? 'text-red-300' : 'text-red-600'}">{entitiesError}</p>
								<button
									onclick={retryEntities}
									class="mt-3 px-3 py-1.5 text-sm font-medium {darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-700'} rounded-md transition-colors"
								>
									Retry
								</button>
							</div>
						{:else}
							<ProjectEntitiesDisplay {projectId} {documents} />
						{/if}
					</div>
				</div>
			{/if}

			<!-- Help Link -->
			<div class="mt-6 text-center">
				<a
					href="/blog/uploading-your-first-property"
					class="text-sm {darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} font-medium hover:underline transition-colors inline-flex items-center gap-2 group"
				>
					<span>Learn more about uploading documents</span>
					<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
					</svg>
				</a>
			</div>
		</div>
	</div>

	<!-- Right sidebar: Upload documents -->
	<div
		class="relative flex shrink-0 flex-col border-l {darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}"
		style="width: {isOpen ? sidebarWidth + 'px' : COLLAPSED_WIDTH + 'px'};"
	>
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

		<button
			type="button"
			onclick={() => isOpen = !isOpen}
			class="flex h-10 w-full items-center {isOpen ? 'justify-end px-2' : 'justify-center'} {darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'} transition-colors shrink-0"
			aria-label={isOpen ? 'Collapse upload panel' : 'Expand upload panel'}
			title="Upload documents"
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
				<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<div class="flex items-center gap-2">
						<svg class="w-5 h-5 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
						</svg>
						<div>
							<h2 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Upload Documents</h2>
							{#if documents.length > 0}
								<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									{documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
								</p>
							{:else}
								<p class="text-xs {darkMode ? 'text-indigo-400' : 'text-indigo-600'} font-medium">
									Drop PDF files here or click below to browse
								</p>
							{/if}
						</div>
					</div>
				</div>

			<div class="shrink-0 overflow-y-auto max-h-[40%] p-4">
				<DocumentUpload
					{idToken}
					{projectId}
					metadata={fileMetadata}
					{existingDocuments}
					onDeleteDocument={handleDeleteDocument}
					onDocumentClick={handleDocumentClick}
				/>
			</div>

				{#if projectId}
					<div class="flex-1 overflow-hidden flex flex-col min-h-0">
						<AgentActivityFeed {projectId} {darkMode} />
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#if selectedDocument}
	<DocumentProcessingModal
		documentId={selectedDocument.documentId}
		projectId={selectedDocument.projectId}
		filename={selectedDocument.filename}
		isOpen={isModalOpen}
		onClose={handleModalClose}
	/>
{/if}