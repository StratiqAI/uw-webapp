<!--
	+page.svelte - Validated Topic Store with AI
	
	Main page component for the Validated Topic Store experiment.
	
	This page demonstrates:
	- AI-powered structured data generation using OpenAI and Google Gemini
	- JSON Schema validation with the ValidatedTopicStore
	- Interactive schema building and registration
	- Real-time store inspection and path lookup
	
	The page integrates multiple components to provide a complete workflow:
	1. Schema building and registration
	2. AI data generation with schema validation
	3. Store inspection and data management
	
	Key Features:
	- Multi-provider AI support (OpenAI, Gemini)
	- Reactive schema management
	- Topic-based data storage with MQTT-style wildcards
	- Comprehensive validation and error reporting
-->

<script lang="ts">
	// ============================================================================
	// IMPORTS
	// ============================================================================
	
	// Types
	import type { Schema } from 'ajv';
	
	// Environment variables
	import { PUBLIC_OPENAI_API_KEY, PUBLIC_GEMINI_API_KEY } from '$env/static/public';
	
	// Services
	import { ValidatedTopicStore } from './ValidatedTopicStore.svelte';
	import { AIService } from './AIService';
	import { JSONSchemaBuilder } from './JSONSchemaBuilder';
	
	// UI Components
	// Schema components
	import SchemaBuilder from './ui/schema/SchemaBuilder.svelte';
	import RegisteredSchemas from './ui/schema/RegisteredSchemas.svelte';
	
	// Store components
	import StoreContents from './ui/store/StoreContents.svelte';
	import StoredUsers from './ui/store/StoredUsers.svelte';
	import StoredProducts from './ui/store/StoredProducts.svelte';
	import PathLookup from './ui/store/PathLookup.svelte';
	import SchemaDataViewer from './ui/store/SchemaDataViewer.svelte';
	
	// AI components
	import AIInputForm from './ui/ai/AIInputForm.svelte';
	
	// Dark mode
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// ============================================================================
	// CONSTANTS & CONFIGURATION
	// ============================================================================
	
	const DEFAULT_USER_PROMPT = 'Generate a user profile for a software developer';
	const DEFAULT_SCHEMA_PATTERN = 'app/users/+';
	const DEFAULT_PROVIDER: 'openai' | 'gemini' = 'openai';
	const AI_TEMPERATURE = 1.2; // Higher temperature for more variation (0-2, default 1.0)

	const AI_CONFIG = {
		openai: {
			apiKey: PUBLIC_OPENAI_API_KEY,
			model: 'gpt-4o-mini' // Cost-effective model for structured output
		},
		gemini: {
			apiKey: PUBLIC_GEMINI_API_KEY,
			model: 'gemini-2.0-flash-exp' // Experimental model with JSON schema support
		}
	} as const;

	// ============================================================================
	// SERVICE INITIALIZATION
	// ============================================================================
	
	// Initialize AI Service with configuration from environment variables
	// Both providers are configured, but only available if API keys are set
	const aiService = new AIService(AI_CONFIG);

	// Initialize the validated topic store
	const store = new ValidatedTopicStore();
	
	// Expose store to browser console for debugging
	// Usage: window.validatedTopicStore.dump()
	if (typeof window !== 'undefined') {
		(window as any).validatedTopicStore = store;
	}

	// ============================================================================
	// SCHEMA INITIALIZATION
	// ============================================================================
	
	// Schema 1: User Profile Schema
	// Creates a schema for user profiles with validation rules
	const userSchemaBuilder = new JSONSchemaBuilder({
		name: { type: 'string' },
		age: { type: 'integer', minimum: 18 }, // Enforce minimum age
		skill: { type: 'string' }
	});

	const userSchema = userSchemaBuilder.build();
	
	// Schema 2: Product Schema
	// Creates a schema for products with name, price, and category
	const productSchemaBuilder = new JSONSchemaBuilder({
		name: { type: 'string' },
		price: { type: 'number', minimum: 0 }, // Price must be non-negative
		category: { type: 'string' },
		description: { type: 'string' }
	});

	const productSchema = productSchemaBuilder.build();

	// Schema 3: Task Schema
	// Creates a schema for tasks with title, description, priority, and status
	const taskSchemaBuilder = new JSONSchemaBuilder({
		title: { type: 'string' },
		description: { type: 'string' },
		priority: { type: 'string' }, // e.g., 'low', 'medium', 'high', 'urgent'
		status: { type: 'string' }, // e.g., 'todo', 'in-progress', 'done'
		dueDate: { type: 'string' } // ISO date string
	});

	const taskSchema = taskSchemaBuilder.build();

	// Schema 4: Validated Metric Widget Schema
	// Creates a schema for validated metric widgets with label, value, and optional change/unit
	// Note: Using anyOf for value field because Gemini API doesn't support array types like ['string', 'number']
	const metricSchemaBuilder = new JSONSchemaBuilder(
		{
			label: { type: 'string' },
			value: {
				anyOf: [
					{ type: 'string' },
					{ type: 'number' }
				]
			},
			change: { type: 'number' }, // Optional: percentage change
			changeType: { type: 'string', enum: ['increase', 'decrease'] }, // Optional: direction of change
			unit: { type: 'string' } // Optional: unit of measurement (e.g., 'USD', 'kg', '%')
		},
		{
			required: ['label', 'value'] // Only label and value are required
		}
	);

	const metricSchema = metricSchemaBuilder.build();

	// Register all schemas with MQTT-style wildcard patterns
	// The '+' wildcard matches any single-level segment (e.g., app/users/user-1, app/users/user-2)
	store.registerSchema('app/users/+', userSchema);
	store.registerSchema('app/products/+', productSchema);
	store.registerSchema('app/tasks/+', taskSchema);
	store.registerSchema('app/metrics/+', metricSchema);

	// ============================================================================
	// COMPONENT STATE
	// ============================================================================
	
	// UI State
	let loading = $state(false);
	let error = $state<string | null>(null);
	let response = $state<any>(null);
	
	// Form State
	let userPrompt = $state(DEFAULT_USER_PROMPT);
	let provider = $state<'openai' | 'gemini'>(DEFAULT_PROVIDER);
	let selectedSchemaPattern = $state(DEFAULT_SCHEMA_PATTERN);
	
	// Counter for generating unique topic IDs
	let userCounter = $state(0);
	
	// Dark mode state
	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// ============================================================================
	// DERIVED STATE (Computed Values)
	// ============================================================================
	
	/**
	 * Get all registered schemas for the selector.
	 * 
	 * Tracks schemaVersion to ensure reactivity when new schemas are registered.
	 * $derived.by() creates a reactive computation that re-runs when dependencies change.
	 */
	let registeredSchemas = $derived.by(() => {
		// Access schemaVersion to create a reactive dependency
		// When store.registerSchema() is called, schemaVersion increments, triggering recomputation
		const _ = store.schemaVersion;
		if (typeof store.getRegisteredSchemas === 'function') {
			return store.getRegisteredSchemas();
		}
		return [];
	});

	/**
	 * Get all users from the store (all topics under app/users/).
	 * 
	 * $derived.by() makes this reactive - updates when store.tree changes.
	 */
	let allUsers = $derived.by(() =>
		store.getAllAt('app/users', {
			// Filter to only include objects that have a 'name' property (user-like data)
			filter: (key, value) => value && typeof value === 'object' && 'name' in value
		})
	);

	/**
	 * Get all products from the store (all topics under app/products/).
	 * 
	 * $derived.by() makes this reactive - updates when store.tree changes.
	 */
	let allProducts = $derived.by(() =>
		store.getAllAt('app/products', {
			// Filter to only include objects that have a 'name' property (product-like data)
			filter: (key, value) => value && typeof value === 'object' && 'name' in value
		})
	);

	/**
	 * Get store tree for display.
	 * Reactive to changes in the store.
	 */
	let storeTree = $derived(store.tree);

	/**
	 * Get store errors for display.
	 * Reactive to changes in store error state.
	 */
	let storeErrors = $derived(store.errors);

	// ============================================================================
	// FUNCTIONS
	// ============================================================================
	
	/**
	 * Call AI API (OpenAI or Gemini) with structured output using AIService.
	 * 
	 * Handles the complete workflow:
	 * - Validates provider availability
	 * - Finds matching schema
	 * - Enhances prompt for uniqueness
	 * - Calls AI provider
	 * - Validates and stores result
	 */
	async function callAI(): Promise<void> {
		const result = await aiService.callAI({
			provider,
			userPrompt,
			selectedSchemaPattern,
			registeredSchemas,
			store,
			onProgress: (isLoading) => {
				loading = isLoading;
			},
			onError: (err) => {
				error = err;
			},
			onResponse: (res) => {
				response = res;
			},
			temperature: AI_TEMPERATURE
		});

		// Update counter if result was successful and has a topic
		if (result.success && result.topic) {
			userCounter++;
		}
	}

	/**
	 * Clear all stored users from the store.
	 * 
	 * Resets both the user counter and the AI service counter.
	 */
	function clearAllUsers(): void {
		store.clearAllAt('app/users');
		userCounter = 0;
		aiService.resetCounter();
	}

	/**
	 * Clear all stored products from the store.
	 */
	function clearAllProducts(): void {
		store.clearAllAt('app/products');
		aiService.resetCounter();
	}

	/**
	 * Get provider display name for UI.
	 */
	function getProviderDisplayName(provider: 'openai' | 'gemini'): string {
		return provider === 'openai' ? 'OpenAI' : 'Gemini';
	}
</script>

<!-- ============================================================================
	 MAIN LAYOUT
	 ============================================================================ -->

<div class="p-6 {darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'} min-h-screen">
	<!-- Page Header -->
	<header class="mb-6">
		<h1 class="text-2xl font-bold {darkMode ? 'text-white' : 'text-slate-900'}">Validated Topic Store with AI</h1>
	</header>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Left Column: Main Content -->
		<main class="space-y-4">
			<!-- AI Input Form (Provider, Prompt, Schema, Call Button) -->
			<AIInputForm
				bind:provider
				bind:userPrompt
				{registeredSchemas}
				bind:selectedSchemaPattern
				{loading}
				onCallAI={callAI}
			/>

			<!-- Error Display -->
			{#if error}
				<div
					class="rounded-md border {darkMode ? 'border-red-500 bg-red-900/30' : 'border-red-400 bg-red-100'} p-4 {darkMode ? 'text-red-300' : 'text-red-700'}"
					role="alert"
					aria-live="polite"
				>
					<strong>Error:</strong>
					{error}
				</div>
			{/if}

			<!-- Response Display -->
			{#if response}
				<div class="rounded-md border {darkMode ? 'border-green-500 bg-green-900/30' : 'border-green-400 bg-green-100'} p-4 {darkMode ? 'text-green-300' : 'text-green-700'}">
					<strong>{getProviderDisplayName(provider)} Response:</strong>
					<pre class="mt-2 overflow-auto text-sm {darkMode ? 'text-slate-200' : 'text-slate-900'}">{JSON.stringify(response, null, 2)}</pre>
				</div>
			{/if}

			<!-- All Stored Users -->
			<StoredUsers {allUsers} {clearAllUsers} />

			<!-- All Stored Products -->
			<StoredProducts {allProducts} {clearAllProducts} />

			<!-- Path Lookup -->
			<PathLookup {store} />

			<!-- Schema Data Viewer -->
			<SchemaDataViewer {store} {registeredSchemas} />

			<!-- Schema Builder -->
			<SchemaBuilder {store} />

			<!-- Show all registered schemas -->
			<RegisteredSchemas {registeredSchemas} />
		</main>

		<!-- Right Column: Store Contents -->
		<aside>
			<StoreContents {storeTree} {storeErrors} />
		</aside>
	</div>
</div>