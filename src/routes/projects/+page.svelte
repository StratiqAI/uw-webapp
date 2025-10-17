<script lang="ts">
	import { logger } from '$lib/logging/debug';

	import { v4 as uuidv4 } from 'uuid';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Props Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Import the SvelteKit Types for the Page Properties
	import type { PageProps } from './$types';

	// Get the Props for the Component
	let componentProps: PageProps = $props();

	// Get the authenticated current User from the Load Data
	let currentUser = $derived(componentProps.data?.currentUser);

	// Get idToken from server-side load function
	let idToken = componentProps.data.idToken!;

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Realtime Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// 1. Import public environment variables for GraphQL endpoint and API key
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';

	// 2. Import types for user items
	import type { Project } from '$lib/types/Project';

	// 3. Import realtime subscription setup
	import { AppSyncWsClient } from '$lib/realtime/websocket/AppSyncWsClient';

	// 4. Import list operations for Project
	import { createListOps } from '$lib/realtime/websocket/ListOperations';

	// 5. Import GraphQL subscription queries for create, update, and delete events
	// import { Q_LIST_USER_PROJECTS } from '$lib/realtime/graphql/Projects/queries';
	// import { M_CREATE_PROJECT, M_DELETE_PROJECT } from '$lib/realtime/graphql/Projects/mutations';
	import {
		S_PROJECT_CREATED,
		S_PROJECT_UPDATED,
		S_PROJECT_DELETED
	} from '$lib/realtime/graphql/subscriptions/Project';

	// 6. Create reactive state for Project list
	let projects = $state<Project[]>(componentProps.data?.items);

	// 6. Create list operations for Project
	export const projectListOps = createListOps<Project>({
		keyFor: (it) => it.id
	});

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Effects Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Set up GraphQL realtime subscriptions when component is mounted
	$effect.root(() => {
		// Only run on the client (not during SSR)
		if (typeof window === 'undefined') return;

		// Check if idToken is available before setting up WebSocket
		if (!idToken) {
			console.error('No idToken available for WebSocket authentication');
			return;
		}

		logger('Setting up WebSocket with idToken:', idToken ? 'present' : 'missing');

		const client = new AppSyncWsClient({
			graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
			auth: { mode: 'cognito', idToken },
		subscriptions: [
			{
				query: S_PROJECT_CREATED,
				path: 'onProjectCreated',
				next: (it: Project) => {
					console.log('Project created subscription received:', it);
					projectListOps.upsertMutable(projects, it);
				}
			},
			// Note: Removed S_PROJECT_UPDATED because it doesn't include the required id parameter
			// and would subscribe to ALL project updates, which is inefficient.
			// Individual project pages should use S_PROJECT_UPDATED_BY_ID to subscribe to specific projects.
			{
				query: S_PROJECT_DELETED,
				path: 'onProjectDeleted',
				next: (it: Project) => projectListOps.removeMutable(projects, it)
			}
		]
		});

		// Return disposer to clean up subscriptions on component unmount/HMR
		return () => client.disconnect();
	});

	// Reactive error message, initially null
	let errorMsg = $state<string | null>(null);

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Flowbite Svelte Components
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	import {
		Avatar,
		// Breadcrumb,
		// BreadcrumbItem,
		Button,
		Checkbox,
		Heading,
		Indicator
	} from 'flowbite-svelte';

	import { Input, Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
	import { TableHeadCell, Toolbar, ToolbarButton } from 'flowbite-svelte';
	// import { CogSolid, DotsVerticalOutline, DownloadSolid } from 'flowbite-svelte-icons';
	import {
		// EditOutline,
		// ExclamationCircleSolid,
		PlusOutline,
		TrashBinSolid
	} from 'flowbite-svelte-icons';

	// Local Components
	import DeleteModal from '$lib/components/Dialog/DeleteModal.svelte';
	import ProjectModal from './ProjectModal.svelte';
	import MetaTag from './MetaTag.svelte';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { M_CREATE_PROJECT } from '$lib/realtime/graphql/mutations/Project';
	import { goto } from '$app/navigation';
	import PdfViewer from 'svelte-pdf';

	// State
	let openProject: boolean = $state(false); // modal control
	let openDelete: boolean = $state(false); // modal control
	let current_project: any = $state({});

	// Meta Tags
	const path: string = '/projects';
	const description: string = 'My StratiqAI Projects';
	const title: string = 'My StratiqAI Projects';
	const subtitle: string = 'My StratiqAI Projects';

	async function createNewProjectHandler(e: Event) {
		e.preventDefault();

		const id =  crypto.randomUUID?.() || Math.random().toString(36).slice(2);
			// const now = new Date().toISOString();

		// Prepare input for create/update project mutations
		const input = {
			id: id,
			name: 'New Project',
			description: '',
			image: '',
			address: '',
			city: '',
			state: '',
			zip: '',
			country: '',
			assetType: '',
			status: 'Active',
			isActive: true,
			isArchived: false,
			isDeleted: false,
			isPublic: false,
			members: [],
			documents: [],
			tags: []
		};

		// console.log('input', JSON.stringify(input, null, 2));
		let mutation: string;
		let opName: string;

		// console.log('input', input);
		// console.log('idToken', idToken);
		try {
			const res = await gql<{ [key: string]: any }>(M_CREATE_PROJECT, { input }, idToken);
			await goto(`/projects/workspace/${id}/get-started`);
		} catch (err) {
			console.error('Error creating new project:', err);
			alert('Error creating new project');
		}
	}
</script>

<MetaTag {path} {description} {title} {subtitle} />

<main class="relative h-full w-full overflow-y-auto bg-white dark:bg-gray-800">
	<h1 class="hidden">Projects</h1>
	<div class="p-4">
		<!-- <Breadcrumb class="mb-5">
			<BreadcrumbItem home>Home</BreadcrumbItem>
			<BreadcrumbItem href="/projects">Projects</BreadcrumbItem>
			<BreadcrumbItem>List</BreadcrumbItem>
		</Breadcrumb> -->

		<!-- {#if currentUser?.isAuthenticated}
			<p>Hi {currentUser.givenName + ' ' + currentUser.familyName}</p>
		{:else}
			<a href="/auth/login">Sign in</a>
		{/if} -->

		<Toolbar embedded class="w-full py-4 text-gray-500  dark:text-gray-300">
			<Heading tag="h1" class="pr-8 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white"
				>Investment Pipeline</Heading
			>
			<Input placeholder="Search for projects" class="me-4 w-80 border xl:w-96" />
			<!-- <div class="border-l border-gray-100 pl-2 dark:border-gray-700">
				<ToolbarButton
					color="dark"
					class="m-0 rounded p-1 hover:bg-gray-100 focus:ring-0 dark:hover:bg-gray-700"
				>
					<CogSolid size="lg" />
				</ToolbarButton>
				<ToolbarButton
					color="dark"
					class="m-0 rounded p-1 hover:bg-gray-100 focus:ring-0 dark:hover:bg-gray-700"
				>
					<TrashBinSolid size="lg" />
				</ToolbarButton>
				<ToolbarButton
					color="dark"
					class="m-0 rounded p-1 hover:bg-gray-100 focus:ring-0 dark:hover:bg-gray-700"
				>
					<ExclamationCircleSolid size="lg" />
				</ToolbarButton>
				<ToolbarButton
					color="dark"
					class="m-0 rounded p-1 hover:bg-gray-100 focus:ring-0 dark:hover:bg-gray-700"
				>
					<DotsVerticalOutline size="lg" />
				</ToolbarButton>
			</div>

			onclick={() => {
				const id = uuidv4();
				window.location.href = `/projects/workspace/${id}/get-started?new=1`;
			}}
			onclick={() => (openProject = true)}
			-->
			{#snippet end()}
				<div class="flex items-center space-x-2">
					<Button size="sm" class="gap-2 whitespace-nowrap px-3" onclick={createNewProjectHandler}>
						<PlusOutline size="sm" />Add Project
					</Button>
					<!-- <Button size="sm" color="alternative" class="gap-2 px-3">
						<DownloadSolid size="md" class="-ml-1" />Export
					</Button> -->
				</div>
			{/snippet}
		</Toolbar>
	</div>
	<Table>
		<TableHead class=" bg-gray-100 dark:border-gray-700">
			<!-- <TableHeadCell class="w-4 p-4"><Checkbox /></TableHeadCell> -->
			{#each ['Name', 'Address', 'Asset Type', 'Status', 'Actions'] as title}
				<TableHeadCell class="p-4 font-medium">{title}</TableHeadCell>
			{/each}
		</TableHead>
		<TableBody>
			{#each projects as project}
				<TableBodyRow class="border-gray-200 text-base">
					<!-- <TableBodyCell class="w-4 p-4"><Checkbox /></TableBodyCell> -->
					<TableBodyCell class="mr-12 p-0 flex items-center space-x-2 whitespace-nowrap">
						<a
							href={`/projects/workspace/${project.id}/get-started`}
							class="group flex items-center space-x-6"
						>
							{#if project.documents?.[0]?.id}
								<div class="relative h-36 w-48 overflow-hidden rounded ">
									<div class="absolute inset-0 flex items-center justify-center">
										<PdfViewer
											url={`https://uw-dev-documents-e1tez94r.s3.us-west-2.amazonaws.com/${project.documents[0].id}/pages/1.pdf`}
											scale={0.20}
											showButtons={[]}
											showBorder={false}
										/>
									</div>
								</div>
							{:else}
								<Avatar src={project.image || ''} size="lg" cornerStyle="rounded" />
							{/if}
							<div class="text-sm font-normal text-gray-500 dark:text-gray-300 max-w-xs break-words">
								<div
									class="text-base font-semibold text-gray-900 group-hover:underline dark:text-white"
								>
									{project.name}
								</div>
								<div class="text-sm font-normal text-gray-500 dark:text-gray-300 break-words max-w-xl overflow-hidden text-ellipsis">
									{project.description}
								</div>
							</div>
						</a>
					</TableBodyCell>
					<TableBodyCell
						class="max-w-sm overflow-hidden truncate  text-base font-normal text-gray-500 xl:max-w-xs dark:text-gray-300"
					>
						<div class="text-base font-semibold text-gray-900 dark:text-white">
							{project.address || ''}
						</div>

						<div class="text-sm font-normal text-gray-500 dark:text-gray-300">
							{(project.city || '') + ' ' + (project.state || '') + ' ' + (project.zip || '')}
						</div>
					</TableBodyCell>
					<TableBodyCell class="">{project.assetType || ''}</TableBodyCell>
					<TableBodyCell class=" font-normal">
						<div class="flex items-center gap-2">
							<Indicator
								color={project.status === 'Active'
									? 'green'
									: project.status === 'Archived'
										? 'blue'
										: 'red'}
							/>
							{project.status || ''}
						</div>
					</TableBodyCell>
					<TableBodyCell class="space-x-2 p-4">
						<!-- <Button
							size="sm"
							class="gap-2 px-3"
							onclick={() => ((current_project = project), (openProject = true))}
						>
							<EditOutline size="sm" /> Edit
						</Button> -->
						<Button
							color="red"
							size="sm"
							class="gap-2 px-3"
							onclick={() => ((current_project = project), (openDelete = true))}
						>
							<TrashBinSolid size="sm" />
						</Button>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</main>
<!-- onclick={() => ((current_project = project), (openDelete = true))} -->
<!-- Modals -->
<ProjectModal bind:open={openProject} data={current_project} {idToken} />
<DeleteModal bind:open={openDelete} data={current_project} {idToken} />
