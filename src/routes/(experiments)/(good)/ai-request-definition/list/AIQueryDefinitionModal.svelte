<script lang="ts">
	import { Button, Input, Label, Modal, Textarea } from 'flowbite-svelte';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { GraphQLOperationGenerator } from '@stratiqai/types';
	// @ts-ignore - types may not be fully exported yet
	import type { AIQueryDefinition } from '@stratiqai/types';
	// @ts-ignore - types may not be fully exported yet
	import { AIQueryDefinitionSchemas } from '@stratiqai/types';

	const aiQueryDefinitionGenerator = new GraphQLOperationGenerator('AIQueryDefinition', AIQueryDefinitionSchemas);
	const M_CREATE_AI_QUERY_DEFINITION = aiQueryDefinitionGenerator.generateCreateMutation();
	const M_UPDATE_AI_QUERY_DEFINITION = aiQueryDefinitionGenerator.generateUpdateMutation();

	export interface AIQueryDefinitionModalProps {
		open?: boolean;
		data: Partial<AIQueryDefinition>;
		idToken: string;
		onSuccess?: () => Promise<void>;
	}

	let {
		open = $bindable(true),
		data,
		idToken,
		onSuccess
	}: AIQueryDefinitionModalProps = $props();

	// Form state
	let formName = $state('');
	let formDescription = $state('');
	let formProperties = $state('');
	let isSaving = $state(false);
	let activeTab = $state<'json' | 'response'>('json');
	let apiResult = $state<any>(null);
	let apiError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let elapsedTime = $state<number | null>(null);
	const jsonPlaceholder = '{"model": "gpt-4o", "input": [...], "tools": [...]}';

	// Initialize form when data changes or modal opens
	$effect(() => {
		if (open) {
			formName = data.name || '';
			formDescription = data.description || '';
			if (data.properties) {
				// If properties is already a string, use it; otherwise stringify it
				formProperties = typeof data.properties === 'string' 
					? data.properties 
					: JSON.stringify(data.properties, null, 2);
			} else {
				formProperties = '{}';
			}
			// Reset preview state
			apiResult = null;
			apiError = null;
			activeTab = 'json';
		}
	});

	// Computed JSON preview
	let jsonPreview = $derived.by(() => {
		try {
			const parsed = JSON.parse(formProperties || '{}');
			return JSON.stringify(parsed, null, 2);
		} catch {
			return formProperties || '{}';
		}
	});

	// Validate JSON
	function validateJson(): boolean {
		try {
			JSON.parse(formProperties || '{}');
			return true;
		} catch {
			return false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!formName.trim()) {
			alert('Name is required');
			return;
		}

		if (!validateJson()) {
			alert('Properties must be valid JSON');
			return;
		}

		isSaving = true;
		try {
			if (data && data.id) {
				// Update existing AI query definition
				const input = {
					id: data.id,
					name: formName.trim(),
					description: formDescription.trim() || null,
					properties: formProperties.trim()
				};
				await gql<{ updateAIQueryDefinition: AIQueryDefinition }>(
					M_UPDATE_AI_QUERY_DEFINITION,
					{ input },
					idToken
				);
			} else {
				// Create new AI query definition
				const input = {
					name: formName.trim(),
					description: formDescription.trim() || null,
					properties: formProperties.trim()
				};
				await gql<{ createAIQueryDefinition: AIQueryDefinition }>(
					M_CREATE_AI_QUERY_DEFINITION,
					{ input },
					idToken
				);
			}

			open = false;
			if (onSuccess) {
				await onSuccess();
			}
		} catch (err) {
			console.error('Error saving AI query definition:', err);
			alert('Error saving AI query definition: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			isSaving = false;
		}
	}

	async function handleTestAPI() {
		if (!validateJson()) {
			alert('Properties must be valid JSON before testing');
			return;
		}

		isSubmitting = true;
		apiError = null;
		apiResult = null;
		elapsedTime = null;

		const startTime = performance.now();

		try {
			const config = JSON.parse(formProperties);
			// Import the API submission function
			const { submitToAPI } = await import('$lib/components/AIRequestBuilder/lib/api');
			const result = await submitToAPI(config);

			const endTime = performance.now();
			elapsedTime = endTime - startTime;

			if (result.error) {
				apiError = result.error;
				activeTab = 'response';
			} else {
				apiResult = result.data;
				activeTab = 'response';
			}
		} catch (err) {
			apiError = err instanceof Error ? err.message : String(err);
			activeTab = 'response';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Modal
	bind:open
	title={data.id ? 'Edit AI Query Definition' : 'Create AI Query Definition'}
	size="xl"
	class="m-4"
>
	<form onsubmit={handleSubmit}>
		<div class="grid min-h-[600px] grid-cols-1 gap-4 lg:grid-cols-2">
			<!-- Left Column: Form Inputs -->
			<div class="flex flex-col space-y-4 overflow-y-auto p-4">
				<Label>
					<span>Name *</span>
					<Input
						bind:value={formName}
						placeholder="e.g. Broker Information Extractor"
						required
						class="mt-1"
					/>
				</Label>
				<Label>
					<span>Description</span>
					<Textarea
						bind:value={formDescription}
						rows={3}
						class="mt-1 w-full"
						placeholder="Description of what this AI query definition does"
					/>
				</Label>
				<Label>
					<span>Properties (JSON) *</span>
					<Textarea
						bind:value={formProperties}
						rows={12}
						class="mt-1 w-full font-mono text-sm"
						placeholder={jsonPlaceholder}
					/>
					{#if formProperties && !validateJson()}
						<p class="mt-1 text-xs text-red-600">Invalid JSON format</p>
					{/if}
				</Label>
			</div>

			<!-- Right Column: JSON Preview and API Response -->
			<div class="flex min-h-0 flex-col overflow-hidden border-l border-slate-200 p-4">
				<!-- Tabs -->
				<div class="mb-4 flex gap-2 border-b border-slate-200">
					<button
						type="button"
						onclick={() => activeTab = 'json'}
						class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'json'
							? 'border-b-2 border-indigo-500 text-indigo-600'
							: 'text-slate-600 hover:text-slate-900'}"
					>
						JSON Preview
					</button>
					<button
						type="button"
						onclick={() => activeTab = 'response'}
						class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'response'
							? 'border-b-2 border-indigo-500 text-indigo-600'
							: 'text-slate-600 hover:text-slate-900'}"
					>
						API Response
						{#if apiResult || apiError}
							<span
								class="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800"
							>
								{apiError ? '!' : '✓'}
							</span>
						{/if}
					</button>
				</div>

				<!-- Tab Panels -->
				<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
					{#if activeTab === 'json'}
						<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
							<div class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
								<span class="text-sm font-medium text-slate-700">Preview</span>
								<button
									type="button"
									onclick={() => {
										navigator.clipboard.writeText(jsonPreview);
										alert('JSON copied to clipboard!');
									}}
									class="text-xs text-indigo-600 hover:text-indigo-800"
								>
									Copy
								</button>
							</div>
							<pre
								class="m-0 min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-800"
							>{jsonPreview}</pre>
						</div>
					{:else}
						<div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
							{#if apiError}
								<div class="rounded-lg border-2 border-red-200 bg-white p-4 shadow-sm">
									<div class="mb-2 flex items-center gap-2">
										<svg
											class="h-5 w-5 text-red-600"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										<h3 class="text-lg font-semibold text-red-800">Error</h3>
									</div>
									<p class="text-sm text-red-700">{apiError}</p>
								</div>
							{:else if apiResult}
								<div class="flex min-h-0 flex-1 flex-col rounded-lg border-2 border-green-200 bg-white p-4 shadow-sm">
									<div class="mb-4 flex items-center justify-between">
										<div class="flex items-center gap-3">
											<svg
												class="h-5 w-5 text-green-600"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											<div>
												<h3 class="text-lg font-semibold text-green-800">API Response</h3>
												{#if elapsedTime !== null}
													<p class="text-xs text-green-600">
														Elapsed time: {elapsedTime < 1000
															? `${elapsedTime.toFixed(0)}ms`
															: `${(elapsedTime / 1000).toFixed(2)}s`}
													</p>
												{/if}
											</div>
										</div>
										<button
											type="button"
											onclick={() => {
												navigator.clipboard.writeText(JSON.stringify(apiResult, null, 2));
												alert('Result copied to clipboard!');
											}}
											class="text-xs text-green-700 hover:text-green-800"
										>
											Copy
										</button>
									</div>
									<pre
										class="m-0 min-h-0 flex-1 overflow-auto rounded-lg border border-green-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-green-100"
									>{JSON.stringify(apiResult, null, 2)}</pre>
								</div>
							{:else}
								<div class="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-8">
									<div class="text-center">
										<svg
											class="mx-auto h-12 w-12 text-slate-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
										<p class="mt-4 text-sm text-slate-500">No API response yet</p>
										<p class="mt-1 text-xs text-slate-400">Click "Test API" to test the configuration</p>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Modal Footer -->
		<div class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
			<Button
				type="button"
				color="alternative"
				onclick={() => (open = false)}
				disabled={isSaving}
			>
				Cancel
			</Button>
			<div class="flex gap-2">
				<Button
					type="button"
					color="light"
					onclick={handleTestAPI}
					disabled={isSubmitting || !validateJson()}
				>
					{isSubmitting ? 'Testing...' : 'Test API'}
				</Button>
				<Button type="submit" disabled={isSaving || !formName.trim() || !validateJson()}>
					{isSaving ? 'Saving...' : data.id ? 'Save' : 'Create'}
				</Button>
			</div>
		</div>
	</form>
</Modal>
