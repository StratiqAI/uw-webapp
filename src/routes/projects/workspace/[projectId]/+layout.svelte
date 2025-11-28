<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';

	// Import project store for synchronization
	import { 
		setProject, 
		project as projectStoreEntity,
		addProjectDocumentLink,
		updateProjectDocumentLink,
		removeProjectDocumentLink
	} from '$lib/stores/appStateStore';
	import { mapStore } from '$lib/stores/mapStore';
	import { authStore } from '$lib/stores/auth.svelte';
	import { setContext } from 'svelte';

	// Type imports
	import type { LayoutProps } from './$types';
	import { GraphQLOperationGenerator, DocLinkSchemas, ProjectSchemas, type Project, type DocLink } from '@stratiqai/types';

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
	let project = $derived($projectStoreEntity);

	// Get project data from server (fetched server-side for security)
	const projectFromServer: Project = data.project;
	// let documents = $derived(data.documents);
	// let projectId = $derived(data.projectId);
	let isNewProject = $derived(data.isNewProject);

	// Make mapStore available to all child pages via context
	setContext('mapStore', mapStore);
	console.log('------------------------------------------------');
	console.log('mapStore', mapStore);
	console.log('------------------------------------------------');

	// Sync server data to store immediately (as soon as possible)
	// This happens client-side but data was fetched securely server-side
	if (browser) {
		$effect(() => {
			// Sync project data to store
			if (projectFromServer && !isNewProject) {
				setProject(projectFromServer);
				logger('Project synced to store from server:', projectFromServer);
			}

			if (currentUser) {
				authStore.setAuth(currentUser, null);
			}
		});
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// GraphQL Endpoint, Queries, Mutations, and Subscriptions
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Define the public environment variables for GraphQL endpoint and API key
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';

    const projectGenerator = new GraphQLOperationGenerator('Project', ProjectSchemas);
    const S_ON_UPDATE_PROJECT = projectGenerator.generateSubscription({eventType: 'update', includeRelations: true, filterBy: "id", filterType: "ID!"});
    console.log("S_ON_UPDATE_PROJECT", S_ON_UPDATE_PROJECT);

	// console.log("projectFromServer", projectFromServer);

	
	// Instantiate a GraphQLOperationGenerator for the Project model
	const docLinkGenerator = new GraphQLOperationGenerator('DocLink', DocLinkSchemas);
	const S_ON_CREATE_DOC_LINK = docLinkGenerator.generateSubscription({eventType: 'create', includeRelations: true, filterBy: "parentId", filterType: "ID!"});
	const S_ON_DELETE_DOC_LINK = docLinkGenerator.generateSubscription({eventType: 'delete', includeRelations: true, filterBy: "parentId", filterType: "ID!"});
	
	// console.log("S_ON_CREATE_PROJECT_DOCUMENT_LINK", S_ON_CREATE_PROJECT_DOCUMENT_LINK);
	// console.log("S_ON_UPDATE_PROJECT_DOCUMENT_LINK", S_ON_UPDATE_PROJECT_DOCUMENT_LINK);
	// console.log("S_ON_DELETE_PROJECT_DOCUMENT_LINK", S_ON_DELETE_PROJECT_DOCUMENT_LINK);
	
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Application Svelte Components Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Import Application Svelte Components
	import UploadArea from '$lib/components/Upload/UploadArea.svelte';

	import { ui } from '$lib/stores/ui.svelte';
	// import { project, setProject } from '$lib/stores/project.svelte';

	import RightChatDrawer from '$lib/components/RightChatDrawer.svelte';
	import WorkspaceHeaderBar from '$lib/components/workspace/WorkspaceHeaderBar.svelte';

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

        // console.log("++++++++++++++++++++++++++++")
        // console.log("projectFromServer", projectFromServer)
        // console.log("++++++++++++++++++++++++++++")

		// Build subscription array dynamically based on project documents
		const subscriptions = [
			{
				query: S_ON_UPDATE_PROJECT,
				variables: { id: projectFromServer.id },
				path: 'onUpdateProject',
				next: (it: Project) => {
					// Update the global project store so all child pages stay in sync
					if (browser) {
						setProject(it);
						// Load documents if available (documents may be in GraphQL response but not in TypeScript type)
						// const projectWithDocs = it as any;
						// if (projectWithDocs.documents?.items) {
						// 	setDocuments(projectWithDocs.documents.items);
						// }
					}
					logger(`Project ${it.id} updated:`, it);
				},
				error: (err: any) => console.error('project sub error', err)
			},
			{
				query: S_ON_CREATE_DOC_LINK,
				variables: { parentId: projectFromServer.id },
				path: 'onCreateDocLink',
				next: (link: DocLink) => {
					// Add the new ProjectDocumentLink to the project's projectDocumentLinks collection
					if (browser) {
						addDocLink(link);
						logger(`DocLink ${link.id} created and added to project:`, link);
					}
				},
				error: (err: any) => console.error('docLink create sub error', err)
			},

			{
				query: S_ON_DELETE_DOC_LINK,
				variables: { parentId: projectFromServer.id },
				path: 'onDeleteDocLink',
				next: (link: DocLink | { id: string }) => {
					// Remove the ProjectDocumentLink from the project's projectDocumentLinks collection
					if (browser) {
						const linkId = link.id;
						removeDocLink(linkId);
						logger(`DocLink ${linkId} deleted and removed from project`);
					}
				},
				error: (err: any) => console.error('docLink delete sub error', err)
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

		// For WebSocket authentication, fetch token securely from API endpoint
		// This keeps the token server-side until needed for WebSocket auth
		(async () => {
			try {
				const tokenResponse = await fetch('/api/ws-token');
				if (!tokenResponse.ok) {
					console.warn('Failed to get WebSocket token. WebSocket may not connect.');
					return;
				}

				const data = await tokenResponse.json();
				const wsToken = data.token;

				if (!wsToken) {
					console.warn('WebSocket token not available. WebSocket may not connect.');
					return;
				}

				client = new AppSyncWsClient({
					graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
					auth: { mode: 'cognito', idToken: wsToken },
					subscriptions
				});
			} catch (err) {
				console.error('Error fetching WebSocket token:', err);
			}
		})();

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
	<div class="flex w-full min-w-0 flex-1 flex-col">
		<WorkspaceHeaderBar
			projectName={project?.name ?? (isNewProject ? 'New Project' : 'Loading...')}
		/>

		<div class="grid flex-1 grid-cols-6 gap-6 px-4 py-4">
			<div class="col-span-6">
				<!-- Workspace Navigation -->
				<div class="mb-4 flex flex-wrap gap-2">
					<TabButton href="get-started">Get Started</TabButton>
					<TabButton href="document-analysis">Document Analysis</TabButton>
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
	<RightChatDrawer />
</div>
