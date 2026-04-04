<script lang="ts">
	import type { PageData } from './$types';
	import Dashboard from '$lib/dashboard/components/Dashboard.svelte';
	import DashboardControls from '$lib/dashboard/components/DashboardControls.svelte';
	import ValidatedTopicStoreSidebar from '$lib/dashboard/components/ValidatedTopicStoreSidebar.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { DashboardStorage } from '$lib/dashboard/utils/storage';
	import { dashboardWidgets } from './config';
	import { publishWidgetData } from '$lib/dashboard/setup/widgetDataPublishers';

	import { onMount, setContext } from 'svelte';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase/browser';
	import { logSupabaseRpcSmokeTest } from '$lib/supabase/supabaseRpcSmokeTest';
	import { DashboardSyncManager } from '$lib/realtime/websocket/syncManagers/DashboardSyncManager';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const SYNC_INIT_TIMEOUT_MS = 8_000;

	function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
			promise.then(
				(v) => { clearTimeout(timer); resolve(v); },
				(e) => { clearTimeout(timer); reject(e); }
			);
		});
	}

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let isLoading = $state(true);

	let darkMode = $derived.by(() => themeStore.darkMode);
	let currentTheme = $derived.by(() => themeStore.theme);

	const projects = $derived(globalProjectStore.projects);
	const selectedProjectId = $derived($page.params.projectId ?? null);

	// Set page data context for child components (getter keeps context in sync with `data`)
	setContext('pageData', {
		get currentUser() {
			return data.currentUser;
		}
	});
	
	// Update context when theme changes
	$effect(() => {
		setContext('darkMode', darkMode);
		setContext('currentTheme', currentTheme);
	});

	function handleProjectChange(projectId: string | null) {
		if (!projectId) return;
		if (dashboard.hasUnsavedChanges) {
			dashboard.save();
		}
		goto(`/p/${projectId}/dashboard`);
	}

	onMount(() => {
		console.log('🚀 Dashboard onMount started');
		let unsubReset: (() => void) | undefined;

		const supabase = createSupabaseBrowserClient();
		if (supabase) {
			void logSupabaseRpcSmokeTest(supabase);
		} else {
			console.warn(
				'[Supabase RPC smoke test] skipped — set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY'
			);
		}

		function updateGridSize() {
			try {
				const width = window.innerWidth;
				let gridColumns: number;
				let minRows = 19;
				
				if (width < 640) {
					gridColumns = 4;
				} else if (width < 1024) {
					gridColumns = 8;
				} else {
					gridColumns = 12;
				}
				
				dashboard.ensureGridCapacity();
				const requiredRows = Math.max(minRows, dashboard.config.gridRows);
				dashboard.updateGridConfig({ gridColumns, gridRows: requiredRows });
			} catch (error) {
				console.error('Error updating grid size:', error);
			}
		}

	async function initDashboard() {
		try {
			updateGridSize();

			const projectId = selectedProjectId;

			if (projectId && data.idToken) {
				try {
					const syncManager = DashboardSyncManager.createInactive();
					await withTimeout(
						syncManager.initialize({ idToken: data.idToken, projectId }),
						SYNC_INIT_TIMEOUT_MS,
						'SyncManager init'
					);
					dashboard.setSyncManager(syncManager);
				} catch (e) {
					console.warn('Cloud sync unavailable for dashboard:', e);
					dashboard.setSyncManager(null);
				}
			}

			const hasLoadedDashboard = await dashboard.initialize(projectId);

				if (!hasLoadedDashboard) {
					console.info('No saved dashboard found, loading defaults');
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
					dashboard.mergeMissingWidgetsFromConfig('market', dashboardWidgets);
					try {
						publishWidgetData(dashboard.widgets, { onlyIfMissing: true });
					} catch (error) {
						console.error('Error publishing widget data:', error);
					}
				}

				dashboard.ensureGridCapacity();
				updateGridSize();
				console.log('✅ Dashboard initialization complete');
			} catch (error) {
				console.error('Error initializing dashboard:', error);
			} finally {
				isLoading = false;
			}
		}

		initDashboard();

		window.addEventListener('resize', updateGridSize);

		unsubReset = dashboard.on('dashboard:reset', () => {
			try {
				publishWidgetData(dashboard.widgets);
			} catch (e) {
				console.error('Error publishing widget data after reset:', e);
			}
		});

		window.addEventListener('beforeunload', () => {
			try {
				if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
					dashboard.save();
				}
			} catch (error) {
				console.error('Error saving dashboard on beforeunload:', error);
			}
		});

		return () => {
			unsubReset?.();
			window.removeEventListener('resize', updateGridSize);
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

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-linear-to-br from-slate-900 via-primary-950/20 to-slate-900' : 'bg-primary-100/30'}">
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900/80' : 'bg-primary-50/40'}">
		<DashboardControls
			{darkMode}
			{currentTheme}
			defaultWidgets={dashboardWidgets}
			onProjectChange={handleProjectChange}
		/>


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
		<div class="flex-1 relative {darkMode ? 'bg-linear-to-b from-slate-900/90 via-slate-900/80 to-primary-950/20' : 'bg-primary-50/30'} overflow-auto">
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
