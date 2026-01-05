<!--
	ProjectEntitiesDisplay.svelte
	
	Example component showing how to reactively display text, table, and image entities
	that are created via GraphQL subscriptions.
	
	Usage:
		<ProjectEntitiesDisplay projectId={projectId} />
-->

<script lang="ts">
	import { getProjectTextsStore, getProjectTablesStore, getProjectImagesStore } from '$lib/stores/projectEntitiesStore';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import type { Text, Table, Image } from '@stratiqai/types-simple';

	const { projectId } = $props<{
		projectId: string;
	}>();

	// Dark mode support
	const darkMode = $derived(darkModeStore.darkMode);

	// Reactive stores that automatically update when entities are added
	const texts = getProjectTextsStore(projectId);
	const tables = getProjectTablesStore(projectId);
	const images = getProjectImagesStore(projectId);

	// Derived counts for display
	const textCount = $derived($texts.length);
	const tableCount = $derived($tables.length);
	const imageCount = $derived($images.length);
	const totalCount = $derived(textCount + tableCount + imageCount);
</script>

<div class="project-entities-display">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<div class="w-1 h-6 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-full"></div>
			<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
				Real-time Discovery
			</h3>
		</div>
		<div class="flex items-center gap-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
			<span>Live</span>
		</div>
	</div>
	<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-4">
		Watch as text, tables, and images are discovered in your documents in real-time.
	</p>
	
	<div class="grid grid-cols-3 gap-4 mb-6">
		<div class="p-4 {darkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'} rounded-lg border transition-all hover:scale-105">
			<div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{textCount}</div>
			<div class="text-sm font-medium {darkMode ? 'text-blue-300' : 'text-blue-700'}">Text Blocks</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">📄 Discovered</div>
		</div>
		<div class="p-4 {darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'} rounded-lg border transition-all hover:scale-105">
			<div class="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{tableCount}</div>
			<div class="text-sm font-medium {darkMode ? 'text-green-300' : 'text-green-700'}">Tables</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">📊 Discovered</div>
		</div>
		<div class="p-4 {darkMode ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'} rounded-lg border transition-all hover:scale-105">
			<div class="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{imageCount}</div>
			<div class="text-sm font-medium {darkMode ? 'text-purple-300' : 'text-purple-700'}">Images</div>
			<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">🖼️ Discovered</div>
		</div>
	</div>

	<!-- Recent Activity Feed (Collapsible) -->
	{#if totalCount > 0}
		<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4 mt-4">
			<h4 class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-3">
				Recent Discoveries
			</h4>
			<div class="space-y-2 max-h-64 overflow-y-auto">
				<!-- Recent Text Blocks -->
				{#each $texts.slice(0, 3) as text (text.id)}
					<div class="p-3 {darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-blue-50/50 border-blue-100'} rounded-lg border text-sm animate-in fade-in slide-in-from-right">
						<div class="flex items-start gap-2">
							<span class="text-lg">📄</span>
							<div class="flex-1 min-w-0">
								<div class="font-medium {darkMode ? 'text-blue-300' : 'text-blue-700'}">
									Text Block • Page {text.pageNum || 'N/A'}
								</div>
								<div class="{darkMode ? 'text-slate-400' : 'text-slate-600'} truncate mt-1">
									{text.text?.substring(0, 80) || 'No text content'}...
								</div>
							</div>
						</div>
					</div>
				{/each}

				<!-- Recent Tables -->
				{#each $tables.slice(0, 3) as table (table.id)}
					<div class="p-3 {darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-green-50/50 border-green-100'} rounded-lg border text-sm animate-in fade-in slide-in-from-right">
						<div class="flex items-start gap-2">
							<span class="text-lg">📊</span>
							<div class="flex-1 min-w-0">
								<div class="font-medium {darkMode ? 'text-green-300' : 'text-green-700'}">
									Table • Page {table.pageNum || 'N/A'}
								</div>
								<div class="{darkMode ? 'text-slate-400' : 'text-slate-600'} mt-1">
									{table.description || 'No description'}
								</div>
							</div>
						</div>
					</div>
				{/each}

				<!-- Recent Images -->
				{#each $images.slice(0, 3) as image (image.id)}
					{@const imageUrl = image.s3Bucket && image.s3Key ? `https://${image.s3Bucket}.s3.us-west-2.amazonaws.com/${image.s3Key}` : null}
					{@const hasImageUrl = imageUrl !== null}
					<div class="p-3 {darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-purple-50/50 border-purple-100'} rounded-lg border text-sm animate-in fade-in slide-in-from-right">
						<div class="flex items-start gap-3">
							{#if hasImageUrl}
								<div class="flex-shrink-0 relative w-16 h-16 {darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded border {darkMode ? 'border-slate-600' : 'border-purple-200'} overflow-hidden">
									<img 
										src={imageUrl} 
										alt="Discovered image from page {image.pageNum || 'N/A'}" 
										class="w-full h-full object-cover"
										loading="lazy"
									/>
								</div>
							{:else}
								<div class="flex-shrink-0 w-16 h-16 flex items-center justify-center {darkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-100 border-purple-200'} rounded border">
									<span class="text-2xl">🖼️</span>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<div class="font-medium {darkMode ? 'text-purple-300' : 'text-purple-700'}">
									Image • Page {image.pageNum || 'N/A'}
								</div>
								<div class="{darkMode ? 'text-slate-400' : 'text-slate-600'} mt-1 text-xs">
									{image.mimeType || 'Unknown type'} • {Math.round((image.sizeBytes || 0) / 1024)} KB
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			<div class="mb-2">📋</div>
			<p class="text-sm">No entities discovered yet.</p>
			<p class="text-xs mt-1">Upload documents to see real-time discovery here.</p>
		</div>
	{/if}
</div>
