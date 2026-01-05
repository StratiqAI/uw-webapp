<!-- src/lib/components/DocumentProcessing/DocumentProcessingModal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createProcessingStore } from './processing.store.svelte';
	import { generateMockProcessingState } from './mockData';
	import DocumentHeader from './DocumentHeader.svelte';
	import DocumentPreviewPanel from './DocumentPreviewPanel.svelte';
	import DiscoveryFeedPanel from './DiscoveryFeedPanel.svelte';
	import type { DocumentProcessingState } from './types';

	const { documentId, projectId, filename, isOpen, onClose } = $props<{
		documentId: string;
		projectId: string;
		filename: string;
		isOpen: boolean;
		onClose: () => void;
	}>();

	// Create store instance
	const store = createProcessingStore(documentId, projectId, filename);

	// Initialize with mock data for now
	onMount(() => {
		const mockState = generateMockProcessingState(documentId, projectId, filename);
		store.initializeWithMockData(mockState);
	});

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// Handle ESC key
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<!-- Modal Container -->
		<div
			class="relative mx-4 flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<DocumentHeader state={store.state} {onClose} />

			<!-- Content: Two-Panel Layout -->
			<div class="flex flex-1 overflow-hidden">
				<!-- Left Panel: Preview -->
				<div class="w-1/2 border-r border-gray-200 dark:border-gray-700">
					<DocumentPreviewPanel store={store} />
				</div>

				<!-- Right Panel: Discovery Feed -->
				<div class="w-1/2 overflow-y-auto">
					<DiscoveryFeedPanel store={store} />
				</div>
			</div>
		</div>
	</div>
{/if}
