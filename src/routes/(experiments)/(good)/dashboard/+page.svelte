<script lang="ts">
	import type { PageData } from './$types';
	import Dashboard from '$lib/dashboard/components/Dashboard.svelte';
	import DashboardControls from '$lib/dashboard/components/DashboardControls.svelte';
	import MapStoreDebugPanel from '$lib/dashboard/components/widgets/MapStoreDebugWidget.svelte';
	import ParagraphDisplayParent from '$lib/dashboard/examples/ParagraphDisplayParent.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { marketingWidgets } from './config';

	import { onMount, setContext } from 'svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let isLoading = $state(true);

	// Set page data context for child components
	setContext('pageData', { currentUser: data.currentUser });

	onMount(() => {
		// Try to load saved dashboard
		const hasLoadedDashboard = dashboard.initialize();

		// If no saved dashboard, load defaults
		if (!hasLoadedDashboard) {
			console.info('No saved dashboard found, loading defaults');
			marketingWidgets.forEach((widget) => {
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

<div class="">
	<header class="border-b bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-4">
			<h1 class="text-2xl font-bold text-gray-900">Drag & Drop Dashboard</h1>
			<p class="mt-1 text-sm text-gray-600">
				Drag widgets to reposition • Hover and drag handles to resize • Auto-saves to browser
			</p>
		</div>
	</header>

	<!-- <DashboardControls /> -->

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

	<main class="mx-auto max-w-7xl p-4">
		{#if isLoading}
			<div class="flex h-64 items-center justify-center">
				<div class="text-gray-600">Loading dashboard...</div>
			</div>
		{:else}
			<!-- Removed fixed height constraint to allow grid to extend fully -->
			<div class="min-h-[800px]">
				<Dashboard />
			</div>
		{/if}
	</main>
</div>
