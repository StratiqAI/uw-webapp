<script lang="ts">
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
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('app');

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
	let layoutProjectsInitialized = $state(false);

	if (browser) {
		try {
			initializeWidgetSchemas();
		} catch (error) {
			log.error('Failed to initialize widget schemas:', error);
		}

		destroySync = initTopicStoreSync(validatedTopicStore);
		streamCatalog.init();

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

		DashboardStorage.saveWidgetDataNow();
	}

	$effect.pre(() => {
		if (!browser || !data.projects || layoutProjectsInitialized) return;
		layoutProjectsInitialized = true;
		globalProjectStore.initialize(data.projects);
	});

	$effect(() => {
		if (browser && data.projects) {
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

	setContext('toggleDarkMode', darkModeStore.toggle);
	setContext('setDarkMode', darkModeStore.set);
	setContext('darkModeStore', darkModeStore);
	setContext('themeStore', themeStore);
</script>

<div class="app-background-pattern h-full bg-primary-100/40 dark:bg-linear-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
	{@render children()}
	<ToastContainer darkMode={themeStore.darkMode} />
</div>
