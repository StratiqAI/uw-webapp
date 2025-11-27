<script lang="ts">
	import type { PageData } from './$types';
	import Dashboard from '$lib/dashboard/components/Dashboard.svelte';
	import DashboardControls from '$lib/dashboard/components/DashboardControls.svelte';
	import MapStoreDebugPanel from '$lib/dashboard/components/widgets/MapStoreDebugWidget.svelte';
	import ParagraphDisplayParent from '$lib/dashboard/examples/ParagraphDisplayParent.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { dashboardWidgets } from './config';

	import { onMount, setContext } from 'svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let isLoading = $state(true);

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	// Set page data context for child components
	setContext('pageData', { currentUser: data.currentUser });
	
	// Update context when dark mode changes
	$effect(() => {
		setContext('darkMode', darkMode);
	});

	onMount(() => {
		// Try to load saved dashboard
		const hasLoadedDashboard = dashboard.initialize();

		// If no saved dashboard, load defaults
		if (!hasLoadedDashboard) {
			console.info('No saved dashboard found, loading defaults');
			dashboardWidgets.forEach((widget) => {
				dashboard.addWidget(widget);
			});
		}

		// Handle responsive grid adjustment
		function updateGridSize() {
			const width = window.innerWidth;
			if (width < 640) {
				dashboard.updateGridConfig({ gridColumns: 4, gridRows: 12 });
			} else if (width < 1024) {
				dashboard.updateGridConfig({ gridColumns: 8, gridRows: 10 });
			} else {
				dashboard.updateGridConfig({ gridColumns: 12, gridRows: 8 });
			}
		}

		updateGridSize();
		window.addEventListener('resize', updateGridSize);

		// Save dashboard before page unload if there are unsaved changes
		window.addEventListener('beforeunload', (e) => {
			if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
				dashboard.save();
			}
		});

		isLoading = false;

		return () => {
			window.removeEventListener('resize', updateGridSize);
			// Save any pending changes
			if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
				dashboard.save();
			}
		};
	});

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Ctrl/Cmd + S to save
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			dashboard.save();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<!-- Header -->
		<div class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm">
			<div class="flex items-center gap-4">
				<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Dashboards</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					{dashboard.widgets.length} {dashboard.widgets.length === 1 ? 'widget' : 'widgets'}
				</span>
			</div>
			<div class="flex items-center gap-2">
				<button
					class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
					onclick={toggleDarkMode}
					aria-label="Toggle dark mode"
					title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if darkMode}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<DashboardControls {darkMode} />

	<!-- MapStore Debug Panel -->
	<!-- <div class="mx-auto max-w-7xl px-4 pb-4">
		<MapStoreDebugPanel />
	</div> -->

	<!-- AI Job → Paragraph Widget Example -->
	<!-- <div class="mx-auto max-w-7xl px-4 pb-4">
		<AIJobParagraphExample 
			idToken={data.idToken}
			prompt="Summarize the latest developments in AI technology in 2-3 paragraphs"
			widgetId="dashboard-ai-paragraph"
		/>
	</div> -->

	<!-- Simple Widget Example -->
	<!-- <div class="mx-auto max-w-7xl px-4 pb-4">
		<SimpleWidgetExample	 
			idToken={data.idToken}
		/>
	</div>  -->

	<!-- AI Job → Paragraph Widget Example -->
	<!-- <div class="mx-auto max-w-7xl px-4 pb-4">
		<ParagraphDisplayParent
			idToken={data.idToken}
			prompt="Write 2-3 sentences about the economy of Hillsboro, OR"
			widgetId="dashboard-ai-paragraph"
		/>
	</div> -->

	<!-- AI Job → Paragraph Widget Example -->
	<!-- <div class="mx-auto max-w-7xl px-4 pb-4">
		<SimplifiedParagraphDisplay
			idToken={data.idToken}
			widgetId="dashboard-simplified-paragraph"
		/>
	</div> -->

		<!-- Dashboard Canvas -->
		<div class="flex-1 relative {darkMode ? 'bg-slate-900' : 'bg-slate-50'} overflow-auto">
			<div class="p-6">
				{#if isLoading}
					<div class="flex h-64 items-center justify-center">
						<div class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">Loading dashboard...</div>
					</div>
				{:else}
					<div class="min-h-[800px]">
						<Dashboard {darkMode} />
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
