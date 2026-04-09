<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';
	import { themeStore, darkModeStore } from '$lib/stores/themeStore.svelte';
	import { setContext, onMount, onDestroy, untrack } from 'svelte';
	import { initializeWidgetSchemas, initializeWidgetHashes } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { widgets } from 'virtual:stratiqai-widgets';
	import { registerWidget } from '$lib/dashboard/setup/widgetRegistry';
	import { browser } from '$app/environment';
	import { initTopicStoreSync } from '$lib/stores/topicStoreSync';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { streamCatalog } from '$lib/stores/streamCatalog.svelte';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('app');

	for (const manifest of widgets) {
		registerWidget(manifest);
	}

	let { children, data } = $props<{ children: any; data: LayoutData }>();

	let destroySync: (() => void) | null = null;
	let layoutProjectsInitialized = $state(false);

	if (browser) {
		try {
			initializeWidgetSchemas();
			initializeWidgetHashes().catch((err) =>
				log.error('Failed to initialize widget hashes:', err)
			);
		} catch (error) {
			log.error('Failed to initialize widget schemas:', error);
		}

		destroySync = initTopicStoreSync(validatedTopicStore);
		streamCatalog.init();
	}

	$effect.pre(() => {
		if (!browser || !data.projects || layoutProjectsInitialized) return;
		layoutProjectsInitialized = true;
		globalProjectStore.initialize(data.projects);
	});

	$effect(() => {
		if (browser && data.projects) {
			const projects = data.projects;
			untrack(() => {
				globalProjectStore.setProjects(projects);
			});
		}
	});

	onMount(() => {
		themeStore.initialize();
	});

	onDestroy(() => {
		destroySync?.();
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
