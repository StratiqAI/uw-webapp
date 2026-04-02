<script lang="ts">
	import type { PageData } from './$types';
	import Dashboard from '$lib/dashboard/components/Dashboard.svelte';
	import DashboardControls from '$lib/dashboard/components/DashboardControls.svelte';
	import ValidatedTopicStoreSidebar from '$lib/dashboard/components/ValidatedTopicStoreSidebar.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { DashboardStorage } from '$lib/dashboard/utils/storage';
	import { dashboardWidgets } from './config';
	import { publishWidgetData } from '$lib/dashboard/setup/widgetDataPublishers';

	import { dev } from '$app/environment';
	import { onMount, setContext } from 'svelte';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import type { Project } from '@stratiqai/types-simple';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase/browser';
	import { logSupabaseRpcSmokeTest } from '$lib/supabase/supabaseRpcSmokeTest';
	import { DashboardSyncManager } from '$lib/realtime/websocket/syncManagers/DashboardSyncManager';

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
	// #region agent log
	const _pageScriptT0 = Date.now();
	const _runId = 'run_' + Math.random().toString(36).slice(2,8);
	const _ep = 'http://127.0.0.1:7574/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f';
	const _hd = {'Content-Type':'application/json','X-Debug-Session-Id':'f4c93f'};
	const _dl = (loc: string, msg: string, d: any, hyp: string) => fetch(_ep,{method:'POST',headers:_hd,body:JSON.stringify({sessionId:'f4c93f',runId:_runId,location:loc,message:msg,data:d,timestamp:Date.now(),hypothesisId:hyp})}).catch(()=>{});
	_dl('+page.svelte:script:top','Page script TOP-LEVEL start',{hasData:!!data,hasIdToken:!!data?.idToken,projectCount:data?.projects?.length??0,url:typeof window!=='undefined'?window.location.href:'SSR'},'K');
	// #endregion

	// #region agent log
	$effect(() => {
		_dl('+page.svelte:isLoading:$effect','isLoading changed',{isLoading},'J,K');
	});
	// #endregion

	// Use unified theme store
	let darkMode = $derived.by(() => themeStore.darkMode);
	let currentTheme = $derived.by(() => themeStore.theme);

	const projects = $derived(globalProjectStore.projects);
	let selectedProjectId = $derived(globalProjectStore.selectedProjectId);

	// Set page data context for child components (getter keeps context in sync with `data`)
	setContext('pageData', {
		get currentUser() {
			return data.currentUser;
		}
	});
	
	// Update context when theme changes
	// #region agent log
	let _h3Count = 0;
	// #endregion
	$effect(() => {
		// #region agent log
		_h3Count++;
		if (_h3Count <= 5 || _h3Count % 100 === 0) {
			fetch('http://127.0.0.1:7574/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f4c93f'},body:JSON.stringify({sessionId:'f4c93f',location:'+page.svelte:setContext:68',message:'setContext effect run',data:{count:_h3Count,darkMode,currentTheme},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
		}
		// #endregion
		setContext('darkMode', darkMode);
		setContext('currentTheme', currentTheme);
	});

	async function handleProjectChange(projectId: string | null) {
		// #region agent log
		_dl('+page.svelte:handleProjectChange','handleProjectChange called',{projectId,currentSelectedProjectId:selectedProjectId},'K');
		// #endregion
		isLoading = true;
		try {
			// Save current dashboard before switching
			if (dashboard.hasUnsavedChanges) {
				dashboard.save();
			}

			// Set up sync manager for the new project
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
			} else {
				dashboard.setSyncManager(null);
			}

			// Initialize dashboard for the new project (blocks until cloud layout id is set)
			const hasLoadedDashboard = await dashboard.initialize(projectId);
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
				dashboard.mergeMissingWidgetsFromConfig('market', dashboardWidgets);
				try {
					publishWidgetData(dashboard.widgets, { onlyIfMissing: true });
				} catch (e) {
					console.error('Error publishing widget data on project change:', e);
				}
			}
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		// #region agent log
		_dl('+page.svelte:onMount:start','onMount START',{scriptToMountGap:Date.now()-_pageScriptT0,isLoading},'K');
		// #endregion
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
		// #region agent log
		const _t0 = Date.now();
		_dl('+page.svelte:initDashboard:start','initDashboard START',{hasIdToken:!!data.idToken,projectsCount:data.projects?.length??0,selectedProjectId},'K,M');
		// #endregion
		try {
			updateGridSize();

			let projectId = selectedProjectId;
			if (!projectId) {
				projectId = DashboardStorage.getSelectedProjectId();
			}
			if (!projectId && data.projects?.length) {
				projectId = data.projects[0].id;
			}
			if (projectId && !selectedProjectId) {
				globalProjectStore.setSelectedProjectId(projectId);
			}

			// Set up cloud sync manager if we have a project and auth token
			if (projectId && data.idToken) {
				try {
					// #region agent log
					const _tSync0 = Date.now();
					_dl('+page.svelte:syncManager:start','SyncManager init START',{projectId},'M');
					// #endregion
					const syncManager = DashboardSyncManager.createInactive();
					await withTimeout(
						syncManager.initialize({ idToken: data.idToken, projectId }),
						SYNC_INIT_TIMEOUT_MS,
						'SyncManager init'
					);
					// #region agent log
					_dl('+page.svelte:syncManager:done','SyncManager init DONE',{projectId,elapsed:Date.now()-_tSync0},'M');
					// #endregion
					dashboard.setSyncManager(syncManager);
				} catch (e) {
					// #region agent log
					_dl('+page.svelte:syncManager:error','SyncManager init FAILED',{error:String(e)},'M');
					// #endregion
					console.warn('Cloud sync unavailable for dashboard:', e);
					dashboard.setSyncManager(null);
				}
			}

			// #region agent log
			const _tDashInit0 = Date.now();
			_dl('+page.svelte:dashboard.init:start','dashboard.initialize START',{projectId,dashInitialized:dashboard.isInitialized},'M');
			// #endregion
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
				// #region agent log
				_dl('+page.svelte:initDashboard:complete','initDashboard COMPLETE',{totalElapsed:Date.now()-_t0,dashInitElapsed:Date.now()-_tDashInit0,widgetCount:dashboard.widgets?.length??0},'K,M');
				// #endregion
				console.log('✅ Dashboard initialization complete');
			} catch (error) {
				// #region agent log
				_dl('+page.svelte:initDashboard:error','initDashboard ERROR',{error:String(error),totalElapsed:Date.now()-_t0},'K,M');
				// #endregion
				console.error('Error initializing dashboard:', error);
			} finally {
				// #region agent log
				_dl('+page.svelte:initDashboard:finally','finally block - setting isLoading=false',{wasLoading:isLoading},'K');
				// #endregion
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

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-gradient-to-br from-slate-900 via-primary-950/20 to-slate-900' : 'bg-primary-100/30'}">
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
