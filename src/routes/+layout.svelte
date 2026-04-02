<script lang="ts">
	import Sidebar from '$lib/components/Sidebar/Sidebar.svelte';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { themeStore, darkModeStore } from '$lib/stores/themeStore.svelte';
	import { setContext, onMount, onDestroy } from 'svelte';
	import { initializeWidgetSchemas } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { registerWidget } from '$lib/dashboard/setup/widgetRegistry';
	import { metricWidget } from '@stratiqai/widget-metric';
	import { jsonViewerWidget } from '@stratiqai/widget-json-viewer';
	import { brokerCardWidget } from '@stratiqai/widget-broker-card';
	import { lqAnalysisWidget } from '@stratiqai/widget-lq-analysis';
	import { proFormaRevenueWidget } from '@stratiqai/widget-pro-forma-revenue';
	import { proFormaOpExWidget } from '@stratiqai/widget-pro-forma-opex';
	import { proFormaNoiWidget } from '@stratiqai/widget-pro-forma-noi';
	import { proFormaUnleveredCfWidget } from '@stratiqai/widget-pro-forma-unlevered-cf';
	import { proFormaLeveredCfWidget } from '@stratiqai/widget-pro-forma-levered-cf';
	import { proFormaUnleveredReturnsWidget } from '@stratiqai/widget-pro-forma-unlevered-returns';
	import { proFormaLeveredReturnsWidget } from '@stratiqai/widget-pro-forma-levered-returns';
	import { tableWidget } from '@stratiqai/widget-table';
	import { econBaseMultiplierWidget } from '@stratiqai/widget-econ-base-multiplier';
	import { industryTrendScorecardWidget } from '@stratiqai/widget-industry-trend-scorecard';
	import { lfprDashboardWidget } from '@stratiqai/widget-lfpr-dashboard';
	import { mapbox3dWidget } from '@stratiqai/widget-mapbox-3d';
	import { browser } from '$app/environment';
	import { initTopicStoreSync } from '$lib/stores/topicStoreSync';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { DashboardStorage } from '$lib/dashboard/utils/storage';
	import { streamCatalog } from '$lib/stores/streamCatalog.svelte';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
	import ToastContainer from '$lib/components/Toast/ToastContainer.svelte';

	// Register package-based widgets before schema initialization
	registerWidget(metricWidget);
	registerWidget(jsonViewerWidget);
	registerWidget(brokerCardWidget);
	registerWidget(lqAnalysisWidget);
	registerWidget(proFormaRevenueWidget);
	registerWidget(proFormaOpExWidget);
	registerWidget(proFormaNoiWidget);
	registerWidget(proFormaUnleveredCfWidget);
	registerWidget(proFormaLeveredCfWidget);
	registerWidget(proFormaUnleveredReturnsWidget);
	registerWidget(proFormaLeveredReturnsWidget);
	registerWidget(tableWidget);
	registerWidget(econBaseMultiplierWidget);
	registerWidget(industryTrendScorecardWidget);
	registerWidget(lfprDashboardWidget);
	registerWidget(mapbox3dWidget);

	let { children, data } = $props<{ children: any; data: LayoutData }>();

	let destroySync: (() => void) | null = null;
	let unsubDashboardSync: (() => void) | null = null;

	let isSidebarOpen = $state(false);
	let sidebarWidthCollapsed = `w-14`;
	let sidebarWidthExpanded = `w-72`;
	let mainMarginLeftExpanded = `ml-72`;
	let mainMarginLeftCollapsed = `ml-14`;

	// Initialise schemas and cross-tab sync synchronously during component init.
	// This runs BEFORE child onMount callbacks (e.g. dashboard page), so the
	// sync layer's restored data is already in the store when the dashboard loads.
	if (browser) {
		// #region agent log
		const _dbgEndpoint = 'http://127.0.0.1:7574/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f';
		const _dbgHeaders = {'Content-Type':'application/json','X-Debug-Session-Id':'f4c93f'};
		const _dbgLog = (loc: string, msg: string, d: any, hyp: string) => fetch(_dbgEndpoint,{method:'POST',headers:_dbgHeaders,body:JSON.stringify({sessionId:'f4c93f',location:loc,message:msg,data:d,timestamp:Date.now(),hypothesisId:hyp})}).catch(()=>{});
		let _errCount = 0;
		window.addEventListener('error', (ev) => { _errCount++; if (_errCount <= 3 || _errCount % 500 === 0) _dbgLog('window:error',ev.message,{filename:ev.filename,lineno:ev.lineno,colno:ev.colno,error:String(ev.error),errCount:_errCount},'L'); });
		window.addEventListener('unhandledrejection', (ev) => { _dbgLog('window:unhandledrejection','Unhandled rejection',{reason:String(ev.reason)},'L'); });
		_dbgLog('+layout.svelte:browser:init','Layout browser init START',{url:window.location.href},'K');
		// #endregion

		try {
			initializeWidgetSchemas();
		} catch (error) {
			console.error('Failed to initialize widget schemas:', error);
		}

		destroySync = initTopicStoreSync(validatedTopicStore);

		// Initialise stream catalog after schemas are ready (so registerStreamSchema can resolve ids)
		streamCatalog.init();

		// Keep DashboardStorage in sync with ALL widget topic changes (admin edits,
		// cross-tab sync, etc.) so it never holds stale data on next page load.
		unsubDashboardSync = validatedTopicStore.onChange((event) => {
			if (
				(event.type === 'publish' || event.type === 'delete') &&
				event.topic.startsWith('widgets/')
			) {
				DashboardStorage.autoSaveWidgetData();
			} else if (event.type === 'clear') {
				DashboardStorage.autoSaveWidgetData();
			}
		});

		// Immediately persist sync-restored data to DashboardStorage so the
		// two persistence layers start in sync.
		DashboardStorage.saveWidgetDataNow();

		// Initialize globalProjectStore synchronously so selectedProjectId is
		// available before any child onMount (e.g. dashboard page) fires.
		// #region agent log
		fetch('http://127.0.0.1:7574/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f4c93f'},body:JSON.stringify({sessionId:'f4c93f',location:'+layout.svelte:88',message:'Layout init - data.projects',data:{hasProjects:!!data.projects,projectCount:data.projects?.length??0,projectIds:data.projects?.map((p: any)=>p.id)??[]},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
		// #endregion
		if (data.projects) {
			globalProjectStore.initialize(data.projects);
		}
	}

	$effect(() => {
		if (browser && data.projects) {
			// #region agent log
			fetch('http://127.0.0.1:7574/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f4c93f'},body:JSON.stringify({sessionId:'f4c93f',location:'+layout.svelte:$effect',message:'$effect setProjects fired',data:{projectCount:data.projects?.length??0},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
			// #endregion
			globalProjectStore.setProjects(data.projects);
		}
	});

	onMount(() => {
		themeStore.initialize();
	});

	onDestroy(() => {
		destroySync?.();
		unsubDashboardSync?.();
		streamCatalog.destroy();
	});
	
	// Provide theme store via context for child components
	setContext('toggleDarkMode', darkModeStore.toggle);
	setContext('setDarkMode', darkModeStore.set);
	setContext('darkModeStore', darkModeStore);
	setContext('themeStore', themeStore);

	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem('sidebar-open') === 'true';
		if (saved != null) {
			isSidebarOpen = saved === true;
		}
	}

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
		try {
			localStorage.setItem('sidebar-open', String(isSidebarOpen));
		} catch {}
	}
	// console.log("End of file +layout.svelte");
</script>

<div class="app-background-pattern h-full bg-primary-100/40 dark:bg-linear-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
	<aside
		class={`transition-width fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-primary-200/50 bg-primary-50/60 duration-300 dark:border-primary-800/30 dark:bg-slate-900 ${isSidebarOpen ? `${sidebarWidthExpanded}` : `${sidebarWidthCollapsed}`} `}
	>
		<Sidebar bind:isSidebarOpen onclick={toggleSidebar} currentUser={data.currentUser} />
	</aside>
	<main class={`flex-1 overflow-y-auto transition-width duration-300 ${isSidebarOpen ? `${mainMarginLeftExpanded}` : `${mainMarginLeftCollapsed}`} space-y-6 bg-primary-50/30 dark:bg-slate-900/50  `}>
		{@render children()}
	</main>
	<ToastContainer darkMode={themeStore.darkMode} />
</div>
