<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';
	import ProjectSwitcher from '$lib/dashboard/components/ProjectSwitcher.svelte';
	import WorkflowSwitcher from '$lib/dashboard/components/WorkflowSwitcher.svelte';
	
	// Workflow type - defined locally since it may not be exported from types-simple
	type Workflow = {
		id: string;
		name: string;
		definition: any;
		[key: string]: any;
	};

	const {
		zoomLevel = 1,
		darkMode = false,
		gridElementsCount = 0,
		projects = [],
		selectedProjectId = null,
		workflows = [],
		selectedWorkflowId = null,
		onSave,
		onExport,
		onZoomIn,
		onZoomOut,
		onResetZoom,
		onClear,
		onToggleDarkMode,
		onProjectChange,
		onWorkflowChange,
		onRenameWorkflow,
		onDeleteWorkflow,
		onShowOutputSchema
	}: {
		zoomLevel?: number;
		darkMode?: boolean;
		gridElementsCount?: number;
		projects?: Project[];
		selectedProjectId?: string | null;
		workflows?: Workflow[];
		selectedWorkflowId?: string | null;
		onSave?: () => void;
		onExport?: () => void;
		onZoomIn?: () => void;
		onZoomOut?: () => void;
		onResetZoom?: () => void;
		onClear?: () => void;
		onToggleDarkMode?: () => void;
		onProjectChange?: (projectId: string | null) => void;
		onWorkflowChange?: (workflowId: string | null) => void;
		onRenameWorkflow?: (workflowId: string, newName: string) => Promise<void>;
		onDeleteWorkflow?: (workflowId: string) => Promise<void>;
		onShowOutputSchema?: () => void;
	} = $props();
</script>

<div class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm">
	<div class="flex items-center gap-4">
		{#if projects.length > 0 && onProjectChange}
			<ProjectSwitcher
				{projects}
				{selectedProjectId}
				{darkMode}
				onProjectChange={onProjectChange}
			/>
			<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
		{/if}
		{#if selectedProjectId && workflows.length >= 0 && onWorkflowChange}
			<WorkflowSwitcher
				{workflows}
				{selectedWorkflowId}
				{darkMode}
				onWorkflowChange={onWorkflowChange}
				onRename={onRenameWorkflow}
				onDelete={onDeleteWorkflow}
			/>
			<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
		{/if}
		<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
			{gridElementsCount} {gridElementsCount === 1 ? 'node' : 'nodes'}
		</span>
	</div>
	<div class="flex items-center gap-2">
		{#if onSave || onExport}
			<div class="flex items-center gap-2">
				{#if onSave}
					<button
						class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
						onclick={onSave}
						title="Save workflow (coming soon)"
					>
						Save
					</button>
				{/if}
				{#if onExport}
					<button
						class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
						onclick={onExport}
					>
						Export
					</button>
				{/if}
				{#if onShowOutputSchema}
					<button
						class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-amber-300 hover:text-amber-200 hover:bg-amber-900/20' : 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'} rounded-md transition-colors flex items-center gap-1.5"
						onclick={onShowOutputSchema}
						title="Define workflow output schema"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						Output Schema
					</button>
				{/if}
			</div>
		{/if}
		<!-- Zoom Controls -->
		<div class="flex items-center gap-1 {darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-md p-1">
			{#if onZoomOut}
				<button
					class="p-1.5 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-600' : 'text-slate-600 hover:text-slate-900 hover:bg-white'} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={onZoomOut}
					disabled={zoomLevel <= 0.5}
					aria-label="Zoom out"
					title="Zoom out (Scroll)"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
					</svg>
				</button>
			{/if}
			<span class="text-xs font-medium px-2 {darkMode ? 'text-slate-300' : 'text-slate-700'} min-w-[3rem] text-center">
				{Math.round(zoomLevel * 100)}%
			</span>
			{#if onZoomIn}
				<button
					class="p-1.5 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-600' : 'text-slate-600 hover:text-slate-900 hover:bg-white'} rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={onZoomIn}
					disabled={zoomLevel >= 2}
					aria-label="Zoom in"
					title="Zoom in (Scroll)"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
					</svg>
				</button>
			{/if}
			{#if onResetZoom}
				<button
					class="p-1.5 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-600' : 'text-slate-600 hover:text-slate-900 hover:bg-white'} rounded transition-colors"
					onclick={onResetZoom}
					aria-label="Reset zoom"
					title="Reset zoom to 100%"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
					</svg>
				</button>
			{/if}
		</div>
		<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
		{#if onClear}
			<button
				class="px-3 py-1.5 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
				onclick={onClear}
			>
				Clear
			</button>
		{/if}
		{#if onToggleDarkMode}
			<button
				class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
				onclick={onToggleDarkMode}
				aria-label="Toggle dark mode"
				title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if darkMode}
					<!-- Sun icon for light mode -->
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
					</svg>
				{:else}
					<!-- Moon icon for dark mode -->
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
					</svg>
				{/if}
			</button>
		{/if}
	</div>
</div>
