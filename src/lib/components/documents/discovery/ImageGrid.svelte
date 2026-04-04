<script lang="ts">
	import type { Image } from './types';

	const {
		images,
		excludedIds,
		fullscreen = false,
		darkMode = false,
		onToggleExclusion
	}: {
		images: Image[];
		excludedIds: Set<string>;
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
			{@const isExcluded = excludedIds.has(image.id)}
			<div class="p-3 {darkMode ? 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30' : 'bg-purple-50 border-purple-200 hover:bg-purple-100'} rounded-lg border transition-colors {isExcluded ? 'opacity-50' : ''}">
				<div class="flex items-center justify-between mb-2">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={!isExcluded}
							onchange={() => onToggleExclusion(image.id)}
							class="w-5 h-5 rounded border-2 {darkMode ? 'bg-slate-700 border-slate-500 checked:bg-purple-500 checked:border-purple-500' : 'bg-white border-slate-300 checked:bg-purple-600 checked:border-purple-600'} cursor-pointer"
						/>
						<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">Include</span>
					</label>
					{#if isExcluded}
						<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}">Excluded</span>
					{/if}
				</div>
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
				<div class="flex items-center justify-between">
					<span class="font-medium text-sm {darkMode ? 'text-purple-300' : 'text-purple-700'}">
						Page {image.pageNum || 'N/A'}
					</span>
					<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						{image.mimeType || 'Unknown'} • {Math.round((image.sizeBytes || 0) / 1024)} KB
					</span>
				</div>
				{#if image.imageAnnotation}
					<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-2 {fullscreen ? 'line-clamp-3' : 'line-clamp-2'}">
						{image.imageAnnotation}
					</p>
				{/if}
			</div>
		{/each}
	</div>
{/if}
