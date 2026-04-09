<script lang="ts">
	import type { Image } from './types';
	import { addImageToDashboard } from './addToDashboard';

	const {
		images,
		excludedIds,
		projectId,
		fullscreen = false,
		darkMode = false,
		onToggleExclusion
	}: {
		images: Image[];
		excludedIds: Set<string>;
		projectId: string;
		fullscreen?: boolean;
		darkMode?: boolean;
		onToggleExclusion: (id: string) => void;
	} = $props();
</script>

{#if images.length === 0}
	<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
		<p class="text-sm">No images discovered yet.</p>
	</div>
{:else}
	<div class="grid {fullscreen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-2'} gap-4">
		{#each images as image (image.id)}
			{@const imageUrl = image.s3Bucket && image.s3Key ? `https://${image.s3Bucket}.s3.us-west-2.amazonaws.com/${image.s3Key}` : null}
			<div class="p-3 {darkMode ? 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30' : 'bg-purple-50 border-purple-200 hover:bg-purple-100'} rounded-lg border transition-colors">
				<div class="{fullscreen ? 'aspect-square' : 'aspect-video'} mb-3 {darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg overflow-hidden flex items-center justify-center">
					{#if imageUrl}
						<img
							src={imageUrl}
							alt="Discovered image from page {image.pageNum || 'N/A'}"
							class="w-full h-full object-contain"
							loading="lazy"
						/>
					{:else}
						<div class="text-center {darkMode ? 'text-slate-500' : 'text-slate-400'}">
							<span class="{fullscreen ? 'text-5xl' : 'text-3xl'}">🖼️</span>
							<p class="text-xs mt-1">No preview</p>
						</div>
					{/if}
				</div>
				<div class="flex items-center justify-between mb-2">
					<span class="font-medium text-sm {darkMode ? 'text-purple-300' : 'text-purple-700'}">
						Page {image.pageNum || 'N/A'}
					</span>
					<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						{image.mimeType || 'Unknown'} • {Math.round((image.sizeBytes || 0) / 1024)} KB
					</span>
				</div>
				{#if image.imageAnnotation}
					<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2 {fullscreen ? 'line-clamp-3' : 'line-clamp-2'}">
						{image.imageAnnotation}
					</p>
				{/if}
				<button
					onclick={() => addImageToDashboard(image, projectId)}
					class="flex items-center gap-1.5 text-xs font-medium transition-colors {darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}"
				>
					<span>Send to Dashboard</span>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}
