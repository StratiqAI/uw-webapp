<script lang="ts">
	import { getDashboardWidgetHost } from '@stratiqai/dashboard-widget-sdk';

	interface ImageEntry {
		id: string;
		s3Bucket: string;
		s3Key: string;
		pageNum?: number;
		mimeType?: string;
		sizeBytes?: number;
		imageAnnotation?: string | Record<string, unknown>;
	}

	let {
		darkMode = false,
		currentSrc = '',
		onSelect
	}: {
		darkMode?: boolean;
		currentSrc?: string;
		onSelect: (src: string, alt: string) => void;
	} = $props();

	const host = getDashboardWidgetHost();
	const store = host.validatedTopicStore;

	function buildImageUrl(image: ImageEntry): string {
		return `https://${image.s3Bucket}.s3.us-west-2.amazonaws.com/${image.s3Key}`;
	}

	function getAnnotation(image: ImageEntry): string {
		const raw = image.imageAnnotation;
		if (!raw) return '';
		if (typeof raw === 'string') {
			try {
				const parsed = JSON.parse(raw);
				return parsed.image_description ?? parsed.description ?? raw;
			} catch {
				return raw;
			}
		}
		if (typeof raw === 'object') {
			return (raw as Record<string, string>).image_description
				?? (raw as Record<string, string>).description
				?? '';
		}
		return '';
	}

	function collectAllImages(): ImageEntry[] {
		void store.tree;
		const root = store.at<Record<string, unknown>>('documents');
		if (!root || typeof root !== 'object') return [];

		const items: ImageEntry[] = [];
		const seen = new Set<string>();

		for (const projectId of Object.keys(root)) {
			const projectNode = root[projectId];
			if (!projectNode || typeof projectNode !== 'object') continue;

			for (const docId of Object.keys(projectNode as Record<string, unknown>)) {
				const docNode = (projectNode as Record<string, unknown>)[docId];
				if (!docNode || typeof docNode !== 'object') continue;

				const imagesGroup = (docNode as Record<string, unknown>).images;
				if (!imagesGroup || typeof imagesGroup !== 'object') continue;

				for (const imageId of Object.keys(imagesGroup as Record<string, unknown>)) {
					const image = (imagesGroup as Record<string, unknown>)[imageId] as ImageEntry;
					if (image && typeof image === 'object' && image.id && image.s3Bucket && image.s3Key) {
						if (!seen.has(image.id)) {
							seen.add(image.id);
							items.push(image);
						}
					}
				}
			}
		}

		items.sort((a, b) => (a.pageNum ?? 0) - (b.pageNum ?? 0));
		return items;
	}

	const images = $derived(collectAllImages());

	let selectedUrl = $state('');
	const activeUrl = $derived(selectedUrl || currentSrc);

	function handleSelect(image: ImageEntry) {
		const url = buildImageUrl(image);
		selectedUrl = url;
		const annotation = getAnnotation(image);
		const alt = annotation || `Image – Page ${image.pageNum ?? 'N/A'}`;
		onSelect(url, alt);
	}

	const cardBase = $derived(
		darkMode
			? 'border-slate-600 bg-slate-800 hover:border-slate-400'
			: 'border-slate-200 bg-white hover:border-slate-400'
	);
	const cardSelected = $derived(
		darkMode
			? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/50'
			: 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/40'
	);
	const labelText = $derived(darkMode ? 'text-slate-400' : 'text-slate-500');
	const pageText = $derived(darkMode ? 'text-slate-200' : 'text-slate-700');
</script>

{#if images.length === 0}
	<div class="py-6 text-center {labelText}">
		<p class="text-sm">No document images available.</p>
		<p class="mt-1 text-xs opacity-70">Upload and process documents to see extracted images here.</p>
	</div>
{:else}
	<p class="mb-2 text-xs {labelText}">Select an image to display ({images.length} available)</p>
	<div class="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
		{#each images as image (image.id)}
			{@const url = buildImageUrl(image)}
			{@const isSelected = activeUrl === url}
			<button
				type="button"
				class="rounded-lg border p-1.5 text-left transition-all cursor-pointer {isSelected ? cardSelected : cardBase}"
				onclick={() => handleSelect(image)}
			>
				<div class="aspect-square rounded overflow-hidden {darkMode ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center">
					<img
						src={url}
						alt="Page {image.pageNum ?? 'N/A'}"
						class="h-full w-full object-contain"
						loading="lazy"
					/>
				</div>
				<div class="mt-1 flex items-center justify-between px-0.5">
					<span class="text-[10px] font-medium {pageText}">Pg {image.pageNum ?? '?'}</span>
					{#if isSelected}
						<span class="text-[10px] font-medium {darkMode ? 'text-indigo-400' : 'text-indigo-600'}">Selected</span>
					{/if}
				</div>
			</button>
		{/each}
	</div>
{/if}
