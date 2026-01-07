<!--
	AIInputForm.svelte
	
	Component for the AI input form that allows users to:
	- Select AI provider (OpenAI or Gemini)
	- Enter a user prompt for data generation
	- Select a schema pattern for structured output
	- Trigger AI API calls to generate structured data
	
	This component consolidates the provider selection, prompt input, and schema
	selection into a single reusable form component.
-->

<script lang="ts">
	import SchemaSelector from '../schema/SchemaSelector.svelte';

	interface SchemaEntry {
		pattern: string;
		schema: any;
	}

	interface Props {
		provider: 'openai' | 'gemini';
		userPrompt: string;
		registeredSchemas: SchemaEntry[];
		selectedSchemaPattern: string;
		loading: boolean;
		onCallAI: () => void;
	}

	// Use $bindable() for props that need two-way binding with parent component
	// This allows the parent to react to changes made in this component
	let {
		provider = $bindable(), // Two-way binding for provider selection
		userPrompt = $bindable(), // Two-way binding for user input
		registeredSchemas, // Read-only list of available schemas
		selectedSchemaPattern = $bindable(), // Two-way binding for schema selection
		loading, // Loading state to disable inputs during API calls
		onCallAI // Callback function to trigger AI generation
	}: Props = $props();
</script>

<!-- Provider Selection -->
<div class="space-y-2">
	<div class="block text-sm font-medium">AI Provider:</div>
	<div class="flex gap-4">
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="radio"
				name="provider"
				value="openai"
				bind:group={provider}
				disabled={loading}
				class="cursor-pointer"
			/>
			<span>OpenAI</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<input
				type="radio"
				name="provider"
				value="gemini"
				bind:group={provider}
				disabled={loading}
				class="cursor-pointer"
			/>
			<span>Google Gemini</span>
		</label>
	</div>
</div>

<!-- Input Section -->
<div class="space-y-2">
	<label for="prompt" class="block text-sm font-medium">User Prompt:</label>
	<textarea
		id="prompt"
		bind:value={userPrompt}
		rows="3"
		class="w-full rounded-md border border-gray-300 px-3 py-2"
		placeholder="Enter a prompt to generate data. See help below for template variables."
	></textarea>
	
	<!-- Template Variable Help -->
	<details class="text-xs text-gray-600">
		<summary class="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
			💡 How to use template variables
		</summary>
		<div class="mt-2 space-y-1 rounded-md bg-gray-50 p-3 text-xs">
			<p class="font-medium">Reference data from previous AI requests in your prompts:</p>
			<ul class="ml-4 list-disc space-y-1">
				<li><code class="rounded bg-gray-200 px-1">{"{{store:app/users/item-1}}"}</code> - Reference a specific item</li>
				<li><code class="rounded bg-gray-200 px-1">{"{{store:app/users/item-1.name}}"}</code> - Reference a nested property</li>
				<li><code class="rounded bg-gray-200 px-1">{"{{store:app/users/+}}"}</code> - Reference all items matching a pattern</li>
			</ul>
			<p class="mt-2 text-gray-600">
				<strong>Example:</strong> "Create a product recommendation based on {"{{store:app/users/item-1}}"}"
			</p>
		</div>
	</details>

	<!-- Schema Selector -->
	<SchemaSelector {registeredSchemas} bind:selectedSchemaPattern {loading} />

	<!-- 
		Call AI button - disabled when:
		1. Currently loading (prevents duplicate requests)
		2. No schemas registered (can't generate without a schema)
	-->
	<button
		onclick={onCallAI}
		disabled={loading || registeredSchemas.length === 0}
		class="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
	>
		<!-- Dynamic button text based on loading state and selected provider -->
		{loading
			? `Calling ${provider === 'openai' ? 'OpenAI' : 'Gemini'}...`
			: `Call ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API`}
	</button>
</div>
