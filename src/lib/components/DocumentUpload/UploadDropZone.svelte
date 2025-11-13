<!-- src/lib/components/DocumentUpload/UploadDropZone.svelte -->
<script lang="ts">
	import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from './constants';

	// Props to make the component configurable
	const { acceptedFileTypes, maxFileSize, children, onFilesAdded, onError } = $props<{
		acceptedFileTypes: string;
		maxFileSize: number;
		children?: import('svelte').Snippet;
		onFilesAdded?: (event: { validFiles: File[] }) => void;
		onError?: (event: { errors: string[] }) => void;
	}>();

	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	function handleAddFiles(incomingFiles: FileList | null): void {
		if (!incomingFiles) return;

		const filesToValidate = Array.from(incomingFiles);
		const validFiles: File[] = [];
		const errors: string[] = [];

		for (const file of filesToValidate) {
			if (file.size > maxFileSize) {
				errors.push(`"${file.name}" is too large (max ${maxFileSize / (1024 * 1024)}MB).`);
			} else if (!file.name.toLowerCase().endsWith(acceptedFileTypes)) {
				errors.push(`"${file.name}" is not a supported file type (${acceptedFileTypes}).`);
			} else {
				validFiles.push(file);
			}
		}

		if (errors.length > 0) {
			onError?.({ errors });
		}

		if (validFiles.length > 0) {
			onFilesAdded?.({ validFiles });
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		handleAddFiles(event.dataTransfer?.files ?? null);
	}

	function handleFileSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		handleAddFiles(input.files);
		input.value = ''; // Reset to allow re-selection of the same file
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			fileInput?.click();
		}
	}
</script>

<div
	class="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-2 pb-4 transition-colors
		{isDragging
		? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
		: 'border-gray-300 hover:border-gray-400 dark:border-gray-500 dark:hover:border-gray-400'}"
	role="button"
	tabindex="0"
	aria-label="Upload documents"
	onkeydown={handleKeydown}
	ondragenter={() => (isDragging = true)}
	ondragleave={() => (isDragging = false)}
	ondragover={(e) => e.preventDefault()}
	ondrop={handleDrop}
	onclick={() => fileInput?.click()}
>
	<input
		type="file"
		accept="application/pdf,.pdf"
		multiple
		class="hidden"
		bind:this={fileInput}
		onchange={handleFileSelect}
		aria-hidden="true"
	/>

	<svg class="mb-4 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-4l-4-4m0 0l-4 4m4-4v12"
		/>
	</svg>

	<p class="text-lg font-medium">Upload sources</p>
	<p class="text-center text-sm">
		Drag & drop or
		<span class="font-semibold text-blue-600">browse files</span>
	</p>
	<p class="mt-2 text-xs text-gray-500">
		Supported: {acceptedFileTypes.toUpperCase()} (max {maxFileSize / (1024 * 1024)}MB)
	</p>

	<!-- Snippet for additional content like progress text -->
	{#if children}
		{@render children()}
	{/if}
</div>