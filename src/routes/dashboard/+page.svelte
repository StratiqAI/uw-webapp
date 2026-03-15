<script lang="ts">
	import type { PageData } from './$types';
	import Dashboard from '$lib/dashboard/components/Dashboard.svelte';
	import DashboardControls from '$lib/dashboard/components/DashboardControls.svelte';
	import ValidatedTopicStoreSidebar from '$lib/dashboard/components/ValidatedTopicStoreSidebar.svelte';
	import ProjectSwitcher from '$lib/dashboard/components/ProjectSwitcher.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { DashboardStorage } from '$lib/dashboard/utils/storage';
	import { dashboardWidgets } from './config';
	import { publishWidgetData } from '$lib/dashboard/setup/widgetDataPublishers';

	import { onMount, setContext } from 'svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import type { Project } from '@stratiqai/types-simple';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let isLoading = $state(true);

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	// Project state
	let projects = $state<Project[]>(data.projects || []);
	let selectedProjectId = $state<string | null>(null);

	// Set page data context for child components
	setContext('pageData', { currentUser: data.currentUser });
	
	// Update context when dark mode changes
	$effect(() => {
		setContext('darkMode', darkMode);
	});

	function handleProjectChange(projectId: string | null) {
		selectedProjectId = projectId;
		// Save current dashboard before switching
		if (dashboard.hasUnsavedChanges) {
			dashboard.save();
		}
		// Initialize dashboard for the new project
		const hasLoadedDashboard = dashboard.initialize(projectId);
		// If no saved dashboard for this project, load defaults
		if (!hasLoadedDashboard) {
			console.info('No saved dashboard found for project, loading defaults');
			try {
				publishWidgetData(dashboardWidgets);
			} catch (e) {
				console.error('Error publishing widget data on project change:', e);
			}
			dashboardWidgets.forEach((widget) => {
				dashboard.addWidget(widget);
			});
		} else {
			try {
				publishWidgetData(dashboard.widgets, { onlyIfMissing: true });
			} catch (e) {
				console.error('Error publishing widget data on project change:', e);
			}
		}
	}

	onMount(() => {
		console.log('🚀 Dashboard onMount started');
		let unsubReset: (() => void) | undefined;

		// Set loading to false immediately - widgets will render with their default/empty state
		// and then update reactively when data is published
		isLoading = false;

		// Handle responsive grid adjustment
		function updateGridSize() {
			try {
				const width = window.innerWidth;
				let gridColumns: number;
				let minRows = 19; // Minimum rows to accommodate charts + gauge/sparkline/heatmap (row 16-18)
				
				if (width < 640) {
					gridColumns = 4;
				} else if (width < 1024) {
					gridColumns = 8;
				} else {
					gridColumns = 12;
				}
				
				// Ensure grid has enough rows for all widgets
				dashboard.ensureGridCapacity();
				const requiredRows = Math.max(minRows, dashboard.config.gridRows);
				
				dashboard.updateGridConfig({ gridColumns, gridRows: requiredRows });
			} catch (error) {
				console.error('Error updating grid size:', error);
			}
		}

		try {
			// Load selected project from storage or use first project
			const savedProjectId = DashboardStorage.getSelectedProjectId();
			if (savedProjectId && projects.some((p) => p.id === savedProjectId)) {
				selectedProjectId = savedProjectId;
			} else if (projects.length > 0) {
				selectedProjectId = projects[0].id;
			}

			// Set initial grid size before loading widgets
			updateGridSize();

			// Initialize dashboard for the selected project
			const hasLoadedDashboard = dashboard.initialize(selectedProjectId);

			// If no saved dashboard, load defaults
			if (!hasLoadedDashboard) {
				console.info('No saved dashboard found, loading defaults');
				// Publish to ValidatedTopicStore first so when widgets mount they already have data
				try {
					publishWidgetData(dashboardWidgets);
				} catch (error) {
					console.error('Error publishing widget data:', error);
				}
				dashboardWidgets.forEach((widget) => {
					try {
						dashboard.addWidget(widget);
					} catch (error) {
						console.error(`Failed to add widget ${widget.id}:`, error);
					}
				});
			} else {
				// If saved dashboard exists, ensure all config widgets are present
				dashboardWidgets.forEach((configWidget) => {
					try {
						const exists = dashboard.widgets.some(w => w.id === configWidget.id);
						if (!exists) {
							console.info(`Adding missing widget from config: ${configWidget.id}`);
							dashboard.addWidget(configWidget);
						}
					} catch (error) {
						console.error(`Failed to add missing widget ${configWidget.id}:`, error);
					}
				});
				// Publish defaults only for widgets that have no data (preserves restored values; fills new/migrated widgets)
				try {
					publishWidgetData(dashboard.widgets, { onlyIfMissing: true });
				} catch (error) {
					console.error('Error publishing widget data:', error);
				}
			}

			// Ensure grid has enough capacity for all widgets (after loading)
			dashboard.ensureGridCapacity();
			
			// Update grid size again after widgets are loaded to ensure proper sizing
			updateGridSize();
			
			// Update grid size again after widgets are loaded to ensure proper sizing
			updateGridSize();
			window.addEventListener('resize', updateGridSize);

			// When user resets to default, publish widget data for the new default layout
			unsubReset = dashboard.on('dashboard:reset', () => {
				try {
					publishWidgetData(dashboard.widgets);
				} catch (e) {
					console.error('Error publishing widget data after reset:', e);
				}
			});

			// Save dashboard before page unload if there are unsaved changes
			window.addEventListener('beforeunload', (e) => {
				try {
					if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
						dashboard.save();
					}
				} catch (error) {
					console.error('Error saving dashboard on beforeunload:', error);
				}
			});
			
			console.log('✅ Dashboard initialization complete');
		} catch (error) {
			console.error('Error initializing dashboard:', error);
		}

		return () => {
			unsubReset?.();
			window.removeEventListener('resize', updateGridSize);
			// Save any pending changes
			try {
				if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
					dashboard.save();
				}
			} catch (error) {
				console.error('Error saving dashboard on cleanup:', error);
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

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-gradient-to-br from-slate-900 via-primary-950/20 to-slate-900' : 'bg-primary-100/30'}">
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900/80' : 'bg-primary-50/40'}">
		<!-- Header -->
		<div class="h-14 {darkMode ? 'bg-gradient-to-r from-slate-800 via-primary-900/30 to-slate-800 border-primary-800/40' : 'bg-gradient-to-r from-primary-50/80 via-white to-primary-50/60 border-primary-200/60'} border-b flex items-center justify-between px-6 shadow-sm">
			<div class="flex items-center gap-4">
				<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Dashboards</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				{#if projects.length > 0}
					<ProjectSwitcher
						{projects}
						{selectedProjectId}
						{darkMode}
						onProjectChange={handleProjectChange}
					/>
				{/if}
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

		<DashboardControls {darkMode} defaultWidgets={dashboardWidgets} />


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
		<div class="flex-1 relative {darkMode ? 'bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-primary-950/20' : 'bg-primary-50/30'} overflow-auto">
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
	<ValidatedTopicStoreSidebar {darkMode} />
</div>
