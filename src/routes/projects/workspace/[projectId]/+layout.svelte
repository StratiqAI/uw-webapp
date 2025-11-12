<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';

	// Import project store for synchronization
	import {
		project as projectStore,
		setProject,
		documents as documentsStore,
	} from '$lib/stores/project.svelte';
	import { mapStore } from '$lib/stores/mapStore';
	import { setContext } from 'svelte';

	// Type imports
	import type { LayoutProps } from './$types';
	import type { Project } from '$lib/types/Project';

	// Import Logging
	import { logger } from '$lib/logging/debug';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Props and State Variables
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// $props() returns whatever props are passed into the component
	let { children, data }: LayoutProps = $props();
	// $inspect('layout.svelte: data from server', data);

	// Authentication: Get the authenticated current User from the Load Data
	let currentUser = $derived(data.currentUser);

	// Authentication: Get idToken from server-side load function
	let idToken = data.idToken!;

	// The Workspace Layout uses the project store for reactive project data
	let project = $derived(data.project);
	let documents = $derived(data.documents);
	let isNewProject = $derived(data.isNewProject);

	// Make mapStore available to all child pages via context
	setContext('mapStore', mapStore);

	// Sync server data to client store (only in browser)
	if (browser) {
		$effect(() => {
			if (project && !isNewProject) {
				setProject(project);
			}
			if (documents && !isNewProject) {
				documentsStore.set(documents);
			}
		});
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// GraphQL Endpoint, Queries, Mutations, and Subscriptions
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Define the public environment variables for GraphQL endpoint and API key
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';

	// Import GraphQL Queries, Mutations, and Subscriptions
	import { S_PROJECT_UPDATED_BY_ID } from '$lib/realtime/graphql/subscriptions/Project';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Application Svelte Components Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Import Application Svelte Components
	import UploadArea from '$lib/components/Upload/UploadArea.svelte';

	import { ui } from '$lib/stores/ui.svelte';
	// import { project, setProject } from '$lib/stores/project.svelte';

	import RightChatDrawer from '$lib/components/RightChatDrawer.svelte';
	import WorkspaceHeaderBar from '$lib/components/workspace/WorkspaceHeaderBar.svelte';
	import SourceCards from '$lib/components/workspace/SourceCards.svelte';
	import TabButton from '$lib/ui/TabButton.svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Initialize the WebSocket Client
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import { AppSyncWsClient } from '$lib/realtime/websocket/AppSyncWsClient';

	// these live across recreations of the child effect
	let client: AppSyncWsClient | null = null;

	// The websocket client should only be initialized once and is responsible for cleaning up
	// it's own resources when the component is destroyed
	$effect.root(() => {
		console.log('Entered $effect.root');
		if (typeof window === 'undefined') return; // SvelteKit guard

		// Don't set up WebSocket for new projects
		if (isNewProject) {
			console.log('Skipping WebSocket setup for new project');
			return;
		}

		// Tear down any previous client before creating a new one
		if (client) {
			console.log('Tearing down previous client');
			client.disconnect();
			client = null;
		}

		// Build subscription array dynamically based on project documents
		const subscriptions = [
			{
				query: S_PROJECT_UPDATED_BY_ID,
				variables: { projectId: project?.id },
				path: 'onUpdateProject',
				next: (it: Project) => {
					project = it;
					// Update the global project store so all child pages stay in sync
					if (browser) {
						setProject(it);
						documentsStore.set(documents);
					}
					logger(`Project ${it.id} updated:`, it);
				},
				error: (err: any) => console.error('project sub error', err)
			}
		];

		// TODO: Document subscriptions need to be re-implemented
		// The new schema doesn't have a documents field on Project
		// Documents may need to be queried and subscribed to separately
		
		// Add document-specific subscriptions for each document in the project
		// if (project?.documents) {
		// 	for (const projectDoc of project.documents) {
		// 		// Subscribe to document creation (global)
		// 		subscriptions.push({
		// 			query: S_CREATE_DOCUMENT,
		// 			variables: {} as any,
		// 			path: 'onCreateDocument',
		// 			next: (newDocument: any) => {
		// 				if (browser) {
		// 					addDocument(newDocument);
		// 					mapStore.addToKey('documents', newDocument);
		// 					logger('Document created:', newDocument);
		// 				}
		// 			},
		// 			error: (err: any) => console.error('document creation sub error', err)
		// 		});

		// 		// Subscribe to page creation for this document
		// 		subscriptions.push({
		// 			query: S_CREATE_PAGE,
		// 			variables: { docHash: projectDoc.id } as any,
		// 			path: 'onCreatePage',
		// 			next: (newPage: any) => {
		// 				if (browser) {
		// 					addPageToDocument(projectDoc.id, newPage);
		// 					logger('Page created:', newPage);
		// 				}
		// 			},
		// 			error: (err: any) => console.error('page creation sub error', err)
		// 		});

		// 		// Subscribe to text creation for this document (we'll need to get page IDs)
		// 		// For now, we'll subscribe globally and filter by docHash in the handler
		// 		subscriptions.push({
		// 			query: S_CREATE_TEXT,
		// 			variables: {} as any, // Subscribe to all text creation
		// 			path: 'onCreateText',
		// 			next: (newText: any) => {
		// 				if (browser && newText.docHash === projectDoc.id) {
		// 					addTextToDocument(projectDoc.id, newText);
		// 					logger('Text created:', newText);
		// 				}
		// 			},
		// 			error: (err: any) => console.error('text creation sub error', err)
		// 		});

		// 		// Subscribe to image creation for this document
		// 		subscriptions.push({
		// 			query: S_CREATE_IMAGE,
		// 			variables: {} as any, // Subscribe to all image creation
		// 			path: 'onCreateImage',
		// 			next: (newImage: any) => {
		// 				if (browser && newImage.docHash === projectDoc.id) {
		// 					addImageToDocument(projectDoc.id, newImage);
		// 					logger('Image created:', newImage);
		// 				}
		// 			},
		// 			error: (err: any) => console.error('image creation sub error', err)
		// 		});

		// 		// Subscribe to insight creation for this document
		// 		subscriptions.push({
		// 			query: S_CREATE_INSIGHT,
		// 			variables: { docHash: projectDoc.id } as any,
		// 			path: 'onCreateInsight',
		// 			next: (newInsight: any) => {
		// 				if (browser) {
		// 					addInsightToDocument(projectDoc.id, newInsight);
		// 					logger('Insight created:', newInsight);
		// 				}
		// 			},
		// 			error: (err: any) => console.error('insight creation sub error', err)
		// 		});
		// 	}
		// }

		client = new AppSyncWsClient({
			graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
			auth: { mode: 'cognito', idToken: idToken },
			subscriptions
		});

		return () => {
			client?.disconnect();
			client = null;
		};
	});
</script>

<!-- Full viewport split: main app + right chat drawer -->
<div
	class="flex min-h-[100svh] w-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100"
	style={`padding-right:${ui.sidebarOpen ? ui.sidebarWidth : 0}px`}
>
	<!-- Main app area -->
	<div class="flex min-w-0 flex-1 flex-col">
		<WorkspaceHeaderBar projectName={$projectStore?.name ?? (isNewProject ? 'New Project' : '')} />

		<div class="grid flex-1 grid-cols-6 gap-6 p-4">
			<!-- Column 1 -->
			<!-- <div class="hidden xl:block lg:col-span-1">
				<section
					class="space-y-6 rounded-2xl bg-gradient-to-br from-zinc-50 via-red-50 to-indigo-50 p-2 shadow-md dark:bg-gray-800 dark:bg-none"
				>
					{#if $projectStore?.documents || isNewProject}
						<UploadArea {idToken} />
					{/if}
					<SourceCards columns={1} />
				</section>
			</div> -->
			<div class="col-span-6 xl:col-span-5">
				<!-- Workspace Navigation -->
				<div class="mb-4 flex flex-wrap gap-2">
					<TabButton href="get-started">Get Started</TabButton>
					<TabButton href="document-analysis">Document Analysis</TabButton>
					<!-- <TabButton href="ai-data-labeling">AI Data Labeling</TabButton> -->					
					<TabButton href="market-analysis">Market Analysis</TabButton>
					<TabButton href="property-analysis">Financial Analysis</TabButton>
					<TabButton href="investment-analysis">Location/Site</TabButton>
					<TabButton href="investment-analysis">Political/Legal</TabButton>
					<TabButton href="investment-analysis">Insight/Sensitivity</TabButton>
					<TabButton href="investment-analysis">Reports</TabButton>
				</div>
				{@render children()}
			</div>
		</div>
	</div>

	<!-- Right chat drawer which will contain the chatbot -->
	<!-- <RightChatDrawer /> -->
</div>
