<script lang="ts">
	import { logger } from '$lib/logging/debug';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// Props Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

	// Import the SvelteKit Types for the Page Properties
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';

	// Get the Props for the Component
	let componentProps: PageProps = $props();

	// Get the authenticated current User from the Load Data
	let currentUser = $derived(componentProps.data?.currentUser);

	// Get idToken from server-side load function
	let idToken = componentProps.data.idToken!;

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// GraphQL Operations Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

	// Import types for AI query definitions
	import { GraphQLOperationGenerator } from '@stratiqai/types';
	// @ts-ignore - types may not be fully exported yet
	import type { AIQueryDefinition } from '@stratiqai/types';
	// @ts-ignore - types may not be fully exported yet
	import { AIQueryDefinitionSchemas } from '@stratiqai/types';
	const aiQueryDefinitionGenerator = new GraphQLOperationGenerator('AIQueryDefinition', AIQueryDefinitionSchemas);
	const M_CREATE_AI_QUERY_DEFINITION = aiQueryDefinitionGenerator.generateCreateMutation();
	const M_DELETE_AI_QUERY_DEFINITION = aiQueryDefinitionGenerator.generateDeleteMutation();

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// State Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

	// Create reactive state for AI query definition list
	let aiQueryDefinitions = $state<AIQueryDefinition[]>(componentProps.data?.items || []);

	// State for modals
	let openModal: boolean = $state(false);
	let openDelete: boolean = $state(false);
	let currentItem: Partial<AIQueryDefinition> = $state({});

	// Reactive error message
	let errorMsg = $state<string | null>(null);

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// Flowbite Svelte Components
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

	import { Avatar, Breadcrumb, BreadcrumbItem, Button, Heading, P } from 'flowbite-svelte';
	import { Input, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Toolbar } from 'flowbite-svelte';
	import { PlusOutline, TrashBinSolid, EditOutline } from 'flowbite-svelte-icons';

	// Local Components
	import DeleteModal from '$lib/components/Dialog/DeleteModal.svelte';
	import AIQueryDefinitionModal from './AIQueryDefinitionModal.svelte';
	import { gql } from '$lib/realtime/graphql/requestHandler';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// Handlers Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

	async function refreshList() {
		try {
			const Q_LIST_AI_QUERY_DEFINITIONS = aiQueryDefinitionGenerator.generateListQuery();
			const response = await gql<{ listAIQueryDefinitions: { items: AIQueryDefinition[] } }>(
				Q_LIST_AI_QUERY_DEFINITIONS,
				{ limit: 50 },
				idToken
			);
			aiQueryDefinitions = response.listAIQueryDefinitions.items || [];
		} catch (err) {
			console.error('Error refreshing list:', err);
			errorMsg = 'Failed to refresh list';
		}
	}

	async function handleDeleteSuccess() {
		await refreshList();
	}

	function handleEdit(item: AIQueryDefinition) {
		currentItem = { ...item };
		openModal = true;
	}

	function handleCreate() {
		currentItem = {};
		openModal = true;
	}

	function handleDelete(item: AIQueryDefinition) {
		currentItem = { ...item };
		openDelete = true;
	}
</script>

<main class="relative h-full w-full overflow-y-auto bg-white dark:bg-gray-800">
	<h1 class="hidden">AI Query Definitions</h1>
	<div class="p-4">
		<Breadcrumb class="mb-5">
			<BreadcrumbItem home>Home</BreadcrumbItem>
			<BreadcrumbItem href="/ai-request-definition/list">AI Query Definitions</BreadcrumbItem>
		</Breadcrumb>

		<Toolbar embedded class="w-full py-4 text-gray-500 dark:text-gray-300">
			<Heading tag="h1" class="pr-8 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
				AI Query Definitions
			</Heading>
			<Input placeholder="Search..." class="me-4 w-80 border xl:w-96" />
			{#snippet end()}
				<div class="flex items-center space-x-2">
					<Button size="sm" class="gap-2 whitespace-nowrap px-3" onclick={handleCreate}>
						<PlusOutline size="sm" />Create
					</Button>
				</div>
			{/snippet}
		</Toolbar>
	</div>

	{#if errorMsg}
		<div class="mx-4 mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
			{errorMsg}
		</div>
	{/if}

	<Table>
		<TableHead class="bg-gray-100 dark:border-gray-700">
			<TableHeadCell class="p-4 font-medium">Name</TableHeadCell>
			<TableHeadCell class="p-4 font-medium">Description</TableHeadCell>
			<TableHeadCell class="p-4 font-medium">Actions</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each aiQueryDefinitions as item}
				<TableBodyRow class="border-gray-200 text-base">
					<TableBodyCell class="mr-12 flex items-center space-x-2 whitespace-nowrap p-4">
						<div class="text-base font-semibold text-gray-900 dark:text-white">
							{item.name}
						</div>
					</TableBodyCell>
					<TableBodyCell class="max-w-xl overflow-hidden text-ellipsis break-words p-4 text-sm font-normal text-gray-500 dark:text-gray-300">
						{item.description || '-'}
					</TableBodyCell>
					<TableBodyCell class="space-x-2 p-4">
						<Button
							size="sm"
							class="gap-2 px-3"
							onclick={() => handleEdit(item)}
						>
							<EditOutline size="sm" /> Edit
						</Button>
						<Button
							color="red"
							size="sm"
							class="gap-2 px-3"
							onclick={() => handleDelete(item)}
						>
							<TrashBinSolid size="sm" />
						</Button>
					</TableBodyCell>
				</TableBodyRow>
			{:else}
				<TableBodyRow>
					<TableBodyCell colspan={3} class="p-8 text-center text-gray-500 dark:text-gray-400">
						No AI query definitions found. Click "Create" to add one.
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</main>

<!-- Modals -->
<AIQueryDefinitionModal 
	bind:open={openModal} 
	data={currentItem} 
	{idToken}
	onSuccess={refreshList}
/>
<DeleteModal 
	bind:open={openDelete} 
	data={currentItem} 
	{idToken} 
	mutation={M_DELETE_AI_QUERY_DEFINITION}
	onConfirm={handleDeleteSuccess}
/>