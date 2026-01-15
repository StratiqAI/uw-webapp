<!--
	+page.svelte - GraphQL Store Publisher Demonstration
	
	This page demonstrates using the GraphQLStorePublisher system to sync a list of Projects
	from GraphQL to ValidatedTopicStore and display them reactively.
	
	Components demonstrated:
	- GraphQLQueryClient: For fetching projects via GraphQL queries
	- TopicMapper: For mapping projects to topic paths
	- ValidatedTopicStore: For storing and reacting to project data
	- GraphQLStorePublisher: For coordinating queries, subscriptions, and store operations
-->

<script lang="ts">
	// ============================================================================
	// IMPORTS
	// ============================================================================
	
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	// GraphQL Store Publisher components
	import {
		GraphQLStorePublisher,
		GraphQLQueryClient,
		toTopicPath,
		type ProjectSyncConfig
	} from '$lib/realtime/store';
	
	// ValidatedTopicStore
	import { ValidatedTopicStore } from '../vtStore/ValidatedTopicStore.svelte';
	
	// GraphQL queries and subscriptions
	import { Q_LIST_PROJECTS, Q_GET_PROJECT } from '@stratiqai/types-simple';
	import { S_ON_CREATE_PROJECT, S_ON_UPDATE_PROJECT, S_ON_DELETE_PROJECT } from '@stratiqai/types-simple';
	import type { Project } from '@stratiqai/types-simple';
	
	// AppSync WebSocket client
	import { AppSyncWsClient } from '$lib/realtime/websocket/AppSyncWsClient';
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
	
	// Dark mode
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	
	// Auth store
	import { authStore } from '$lib/stores/auth.svelte';
	
	// ============================================================================
	// PROPS
	// ============================================================================
	
	// Get props from parent layout
	let { data } = $props();
	
	// ============================================================================
	// INITIALIZATION
	// ============================================================================
	
	// Get idToken from server-side data, fallback to authStore (same pattern as get-started page)
	const idToken = $derived(data?.idToken ?? authStore.idToken);
	$inspect('idToken', idToken);
	// Initialize store
	const store = new ValidatedTopicStore();
	
	// Initialize query client and publisher (will be set up in onMount)
	let queryClient: GraphQLQueryClient | null = $state(null);
	let subscriptionClient: AppSyncWsClient | null = $state(null);
	let publisher: GraphQLStorePublisher | null = $state(null);
	
	// Track active subscriptions for cleanup
	let activeSubscriptionSpecs: Array<import('$lib/realtime/websocket/types').SubscriptionSpec<any>> = $state([]);
	
	// UI State
	let loading = $state(false);
	let error = $state<string | null>(null);
	let syncing = $state(false);
	
	// Dark mode
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	
	// ============================================================================
	// REACTIVE DATA FROM STORE
	// ============================================================================
	
	/**
	 * Get all projects from the store
	 * Reactive: updates when store.tree changes
	 */
	let projects = $derived.by(() => {
		return store.getAllAt<Project>('projects', {
			filter: (key, value) => value && typeof value === 'object' && 'id' in value && 'name' in value
		});
	});
	
	/**
	 * Get store tree for debugging
	 */
	let storeTree = $derived(store.tree);
	
	// ============================================================================
	// FUNCTIONS
	// ============================================================================
	
	/**
	 * Initialize clients and publisher
	 */
	async function initializePublisher() {
		if (!browser || !idToken) {
			console.warn('Cannot initialize publisher: browser check failed or no idToken');
			return;
		}
		
		try {
			// Create query client
			queryClient = new GraphQLQueryClient(idToken);
			
			// Create subscription client
			subscriptionClient = new AppSyncWsClient({
				graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
				auth: { mode: 'cognito', idToken }
			});
			
			// Wait for subscription client to be ready
			await subscriptionClient.ready();
			
			// Create publisher
			publisher = new GraphQLStorePublisher({
				queryClient,
				subscriptionClient,
				store
			});
			
			console.log('Publisher initialized successfully');
		} catch (err: any) {
			console.error('Error initializing publisher:', err);
			error = err.message || 'Failed to initialize publisher';
		}
	}
	
	/**
	 * Sync projects list: fetch and publish to store
	 * 
	 * Note: GraphQLStorePublisher is designed for single project sync.
	 * For a list of projects, we manually fetch and publish each one.
	 */
	async function syncProjectsList() {
		if (!queryClient || !publisher) {
			error = 'Publisher not initialized. Please wait for initialization.';
			return;
		}
		
		loading = true;
		error = null;
		
		try {
			// Fetch projects list
			const result = await queryClient.query<{ listProjects: { items: Project[]; nextToken?: string | null } }>(
				Q_LIST_PROJECTS,
				{ limit: 50, scope: 'OWNED_BY_ME' }
			);
			
			if (!result?.listProjects?.items) {
				error = 'No projects found in response';
				return;
			}
			
			const projectItems = result.listProjects.items;
			
			// Publish each project to the store
			for (const project of projectItems) {
				if (project?.id) {
					const topic = toTopicPath('projects', project.id);
					store.publish(topic, project);
				}
			}
			
			console.log(`Synced ${projectItems.length} projects to store`);
			
			// Set up subscriptions for real-time updates
			setupProjectSubscriptions(projectItems);
			
		} catch (err: any) {
			console.error('Error syncing projects:', err);
			error = err.message || 'Failed to sync projects';
		} finally {
			loading = false;
		}
	}
	
	/**
	 * Set up subscriptions for project updates
	 */
	function setupProjectSubscriptions(projectItems: Project[]) {
		if (!subscriptionClient) return;
		
		// CRITICAL: Clean up existing subscriptions before adding new ones
		// This prevents memory leaks from accumulating subscriptions
		cleanupSubscriptions();
		
		// Set up subscriptions for each project
		// In a real app, you might want to use a more efficient subscription strategy
		for (const project of projectItems) {
			if (!project.id) continue;
			
			// Update subscription
			const updateSpec = {
				query: S_ON_UPDATE_PROJECT,
				variables: { id: project.id },
				path: 'onUpdateProject',
				next: (updatedProject: Project) => {
					console.log('Project updated:', updatedProject);
					const topic = toTopicPath('projects', updatedProject.id);
					store.publish(topic, updatedProject);
				},
				error: (err: any) => console.error('Update subscription error:', err)
			};
			subscriptionClient.addSubscription(updateSpec);
			activeSubscriptionSpecs.push(updateSpec);
			
			// Delete subscription
			const deleteSpec = {
				query: S_ON_DELETE_PROJECT,
				variables: { id: project.id },
				path: 'onDeleteProject',
				next: (deletedProject: Project) => {
					console.log('Project deleted:', deletedProject);
					const topic = toTopicPath('projects', deletedProject.id);
					store.delete(topic);
				},
				error: (err: any) => console.error('Delete subscription error:', err)
			};
			subscriptionClient.addSubscription(deleteSpec);
			activeSubscriptionSpecs.push(deleteSpec);
		}
	}
	
	/**
	 * Clean up all active subscriptions
	 */
	function cleanupSubscriptions() {
		if (!subscriptionClient) return;
		
		// Remove all tracked subscriptions
		for (const spec of activeSubscriptionSpecs) {
			subscriptionClient.removeSubscription(spec);
		}
		activeSubscriptionSpecs = [];
	}
	
	/**
	 * Clear all projects from store
	 */
	function clearProjects() {
		// Clean up subscriptions before clearing
		cleanupSubscriptions();
		store.clearAllAt('projects');
	}
	
	// ============================================================================
	// LIFECYCLE
	// ============================================================================
	
	// Initialize publisher when idToken becomes available (reactive)
  	// Using $effect.root to ensure proper cleanup
	$effect.root(() => {
		if (!browser) return;
		
		let initialized = false;
		
		// Only initialize once when we have a token
		$effect(() => {
			if (!idToken || initialized || publisher) return;
			
			initialized = true;
			error = null; // Clear any previous errors
			initializePublisher().then(() => {
				// Auto-sync projects after initialization
				if (publisher) {
					syncProjectsList();
				}
			});
		});
		
		// Cleanup function
		return () => {
			cleanupSubscriptions();
			if (publisher) {
				publisher.disconnect();
			}
			if (subscriptionClient) {
				subscriptionClient.disconnect();
			}
		};
	});
</script>

<!-- ============================================================================
	 MAIN LAYOUT
	 ============================================================================ -->

<div class="p-6 {darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} min-h-screen">
	<!-- Page Header -->
	<header class="mb-6">
		<h1 class="text-2xl font-bold {darkMode ? 'text-white' : 'text-slate-900'}">
			GraphQL Store Publisher Demo
		</h1>
		<p class="mt-2 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
			Demonstrating GraphQLStorePublisher, GraphQLQueryClient, TopicMapper, and ValidatedTopicStore
		</p>
	</header>

	<!-- Error Display -->
	{#if error}
		<div
			class="mb-4 rounded-md border {darkMode ? 'border-red-500 bg-red-900/30' : 'border-red-400 bg-red-100'} p-4 {darkMode ? 'text-red-300' : 'text-red-700'}"
			role="alert"
		>
			<strong>Error:</strong> {error}
		</div>
	{/if}

	<!-- Controls -->
	<div class="mb-6 flex gap-4">
		<button
			onclick={syncProjectsList}
			disabled={loading || !publisher}
			class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 {darkMode ? 'bg-blue-600 hover:bg-blue-700' : ''}"
		>
			{loading ? 'Syncing...' : 'Sync Projects'}
		</button>
		
		<button
			onclick={clearProjects}
			disabled={projects.length === 0}
			class="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 {darkMode ? 'bg-red-600 hover:bg-red-700' : ''}"
		>
			Clear All
		</button>
	</div>

	<!-- Projects List -->
	<div class="rounded-md border {darkMode ? 'border-blue-600 bg-blue-900/30' : 'border-blue-300 bg-blue-50'} p-4">
		<div class="mb-4 flex items-center justify-between">
			<strong class="{darkMode ? 'text-blue-200' : 'text-blue-900'}">
				Projects in Store ({projects.length}):
			</strong>
		</div>

		{#if projects.length > 0}
			<!-- Render each project as a card -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each projects as { id, data: project }}
					<div
						class="group relative overflow-hidden rounded-lg border {darkMode ? 'border-blue-700 bg-slate-800' : 'border-blue-200 bg-white'} shadow-sm transition-all hover:border-blue-300 {darkMode ? 'hover:border-blue-600' : ''} hover:shadow-md"
					>
						<div class="p-5">
							<!-- ID badge -->
							<div class="mb-3 text-xs {darkMode ? 'text-gray-400' : 'text-gray-500'}">
								#{id.split('/').pop()}
							</div>

							<!-- Project name -->
							<h3 class="mb-3 text-lg font-semibold {darkMode ? 'text-slate-100' : 'text-gray-900'}">
								{project.name || 'Unnamed Project'}
							</h3>

							<!-- Project details -->
							<div class="space-y-2">
								{#if project.description}
									<div class="text-sm {darkMode ? 'text-slate-300' : 'text-gray-700'}">
										{project.description}
									</div>
								{/if}
								
								<div class="text-xs {darkMode ? 'text-gray-400' : 'text-gray-500'}">
									Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Empty state -->
			<p class="text-sm {darkMode ? 'text-gray-300' : 'text-gray-600'}">
				{loading ? 'Loading projects...' : 'No projects in store. Click "Sync Projects" to load them.'}
			</p>
		{/if}
	</div>

	<!-- Store Tree (Debug View) -->
	{#if storeTree && Object.keys(storeTree).length > 0}
		<div class="mt-6 rounded-md border {darkMode ? 'border-gray-700 bg-slate-800' : 'border-gray-300 bg-gray-50'} p-4">
			<h2 class="mb-2 text-lg font-semibold {darkMode ? 'text-slate-200' : 'text-gray-900'}">
				Store Tree (Debug)
			</h2>
			<pre class="overflow-auto text-xs {darkMode ? 'text-slate-300' : 'text-gray-700'}">{JSON.stringify(storeTree, null, 2)}</pre>
		</div>
	{/if}
</div>
