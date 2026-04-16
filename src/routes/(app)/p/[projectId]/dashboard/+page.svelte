<script lang="ts">
	import type { PageData } from './$types';
	import Dashboard from '$lib/dashboard/components/Dashboard.svelte';
	import DashboardControls from '$lib/dashboard/components/DashboardControls.svelte';
	import AiStudioDialog from '$lib/dashboard/components/AiStudioDialog.svelte';
	import ValidatedTopicStoreSidebar from '$lib/dashboard/components/ValidatedTopicStoreSidebar.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { publishWidgetData } from '$lib/dashboard/setup/widgetDataPublishers';

	import { onMount, setContext } from 'svelte';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('dashboard');

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let showAddWidgetDialog = $state(false);
	let showBuildWidgetDialog = $state(false);
	let isLoading = $derived(!dashboard.isInitialized);

	const aiStudioWorkspaceData = $derived({
		idToken: data.idToken ?? '',
		projects: data.projects ?? [],
		currentUser: data.currentUser
	});

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
			log.error('Error updating grid size:', error);
		}
	}

	$effect(() => {
		const projectId = selectedProjectId;
		const idToken = data.idToken;
		if (!projectId) return;

		dashboard.initialize(projectId, idToken)
			.then(() => {
				try {
					publishWidgetData(dashboard.widgets, { onlyIfMissing: true });
				} catch (error) {
					log.error('Error publishing widget data:', error);
				}
				dashboard.ensureGridCapacity();
				updateGridSize();
				log.debug('Dashboard initialization complete for project:', projectId);
			})
			.catch((error) => {
				log.error('Error initializing dashboard:', error);
			});
	});

	onMount(() => {
		log.debug('Dashboard onMount started');

		updateGridSize();
		window.addEventListener('resize', updateGridSize);

		const unsubReset = dashboard.on('dashboard:reset', () => {
			try {
				publishWidgetData(dashboard.widgets);
			} catch (e) {
				log.error('Error publishing widget data after reset:', e);
			}
		});

		const handleBeforeUnload = () => {
			try {
				if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
					dashboard.save();
				}
			} catch (error) {
				log.error('Error saving dashboard on beforeunload:', error);
			}
		};
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			unsubReset?.();
			window.removeEventListener('resize', updateGridSize);
			window.removeEventListener('beforeunload', handleBeforeUnload);
			try {
				if (dashboard.hasUnsavedChanges && dashboard.autoSaveEnabled) {
					dashboard.save();
				}
			} catch (error) {
				log.error('Error saving dashboard on cleanup:', error);
			}
		};
	});

	function handleKeydown(e: KeyboardEvent) {
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
			onProjectChange={handleProjectChange}
			bind:showAddWidgetDialog
			bind:showBuildWidgetDialog
		/>

		<AiStudioDialog bind:open={showBuildWidgetDialog} data={aiStudioWorkspaceData} />


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
						<Dashboard onRequestAddWidget={() => (showAddWidgetDialog = true)} />
					</div>
				{/if}
			</div>
		</div>
	</div>
	<ValidatedTopicStoreSidebar />
</div>
