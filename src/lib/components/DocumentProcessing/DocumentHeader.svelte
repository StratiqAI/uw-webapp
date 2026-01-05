<!-- src/lib/components/DocumentProcessing/DocumentHeader.svelte -->
<script lang="ts">
	import ProcessingBadge from './ProcessingBadge.svelte';
	import type { DocumentProcessingState } from './types';

	const { state, onClose } = $props<{
		state: DocumentProcessingState;
		onClose: () => void;
	}>();

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	};
</script>

<div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
	<div class="flex items-center gap-4">
		<div>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">{state.filename}</h2>
			<p class="text-xs text-gray-500 dark:text-gray-400">Document ID: {state.documentId}</p>
		</div>
		<ProcessingBadge status={state.status} />
		{#if state.classification}
			<span
				class="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
			>
				🏷️ {state.classification.documentType}
			</span>
		{/if}
	</div>
	<div class="flex items-center gap-2">
		{#if state.status === 'complete'}
			<button
				type="button"
				class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
			>
				View Results
			</button>
		{/if}
		<button
			type="button"
			class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
			onclick={onClose}
			onkeydown={handleKeyDown}
			aria-label="Close modal"
		>
			<svg
				class="h-5 w-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				></path>
			</svg>
		</button>
	</div>
</div>
