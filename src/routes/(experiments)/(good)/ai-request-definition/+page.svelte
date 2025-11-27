<!-- src/App.svelte -->
<script lang="ts">
	import { writable } from 'svelte/store';
	import { loadState, saveState } from '$lib/components/AIRequestBuilder/lib/state';
	import type { Message, SchemaProperty, SavedState } from '$lib/components/AIRequestBuilder/lib/state';
	import { buildOutput } from '$lib/components/AIRequestBuilder/lib/schema';
	import { submitToAPI } from '$lib/components/AIRequestBuilder/lib/api';
	import { notification } from '$lib/components/AIRequestBuilder/lib/stores';

	import Configuration from '$lib/components/AIRequestBuilder/lib/components/Configuration.svelte';
	import Messages from '$lib/components/AIRequestBuilder/lib/components/Messages.svelte';
	import VectorStores from '$lib/components/AIRequestBuilder/lib/components/VectorStores.svelte';
	import SchemaProperties from '$lib/components/AIRequestBuilder/lib/components/SchemaProperties.svelte';
	import Output from '$lib/components/AIRequestBuilder/lib/components/Output.svelte';
	import Actions from '$lib/components/AIRequestBuilder/lib/components/Actions.svelte';
	import ApiResult from '$lib/components/AIRequestBuilder/lib/components/ApiResult.svelte';
	import Notification from '$lib/components/AIRequestBuilder/lib/components/Notification.svelte';

	// Initialize state with saved values or defaults
	const savedState = loadState();

	const model = writable(savedState?.model || 'gpt-4o');
	const schemaName = writable(savedState?.schemaName || 'responseSchema');
	const strict = writable(savedState?.strict ?? true);
	const messages = writable<Message[]>(
		savedState?.messages || [
			{
				role: 'system',
				content: 'Extract the details from the file',
				id: crypto.randomUUID()
			}
		]
	);
	const vectorStoreIds = writable<string[]>(
		savedState?.vectorStoreIds || ['vs_6918d2ecf0f48191af572585f63ab54a']
	);
	const properties = writable<SchemaProperty[]>(savedState?.properties || []);

	// Group stores for easy passing and saving
	const state = { model, schemaName, strict, messages, vectorStoreIds, properties };

	// Save state whenever it changes
	const combinedState = writable<SavedState>();
	const unsub = model.subscribe((value) => combinedState.update((s) => ({ ...s, model: value })));
	// Repeat for all stores... (A more elegant way is shown below)
	$: saveState({
		model: $model,
		schemaName: $schemaName,
		strict: $strict,
		messages: $messages,
		vectorStoreIds: $vectorStoreIds,
		properties: $properties
	});


	// API submission state
	let isSubmitting = writable(false);
	let apiResult = writable<any>(null);
	let apiError = writable<string | null>(null);
	let elapsedTime = writable<number | null>(null);
	let activeTab = writable<'json' | 'response'>('json');

	function showNotification(message: string, duration = 3000) {
		notification.set(message);
		setTimeout(() => notification.set(null), duration);
	}

	async function handleSubmit() {
		isSubmitting.set(true);
		apiError.set(null);
		apiResult.set(null);
		elapsedTime.set(null);

		const startTime = performance.now();

		const outputConfig = buildOutput(
			$model,
			$messages,
			$vectorStoreIds,
			$schemaName,
			$strict,
			$properties
		);

		const result = await submitToAPI(outputConfig);

		const endTime = performance.now();
		const elapsed = endTime - startTime;
		elapsedTime.set(elapsed);

		if (result.error) {
			apiError.set(result.error);
			activeTab.set('response');
		} else {
			apiResult.set(result.data);
			showNotification(`API submission successful! (${elapsed.toFixed(0)}ms)`);
			activeTab.set('response');
		}

		isSubmitting.set(false);
	}
</script>

<div class="flex h-screen w-full flex-col overflow-hidden bg-white font-sans">
	<!-- Header -->
	<div class="shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-6 text-white">
		<h2 class="m-0 text-2xl font-semibold tracking-tight text-white">
			OpenAI Responses Parse API Builder
		</h2>
	</div>

	<!-- Main Content Container -->
	<div class="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden bg-slate-50 lg:grid-cols-2">
		<!-- Left Column: Inputs -->
		<div
			class="overflow-y-auto border-b border-r-0 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-8 lg:border-b-0 lg:border-r"
		>
			<Configuration {model} {schemaName} {strict} />
			<Messages {messages} />
			<VectorStores {vectorStoreIds} />
			<SchemaProperties {properties} />
		</div>

		<!-- Right Column: Tabbed JSON Preview and API Response -->
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 p-8">
			<!-- Tabs -->
			<div class="mb-4 flex gap-2 border-b border-slate-200">
				<button
					type="button"
					onclick={() => activeTab.set('json')}
					class="px-4 py-2 text-sm font-medium transition-colors {$activeTab === 'json'
						? 'border-b-2 border-indigo-500 text-indigo-600'
						: 'text-slate-600 hover:text-slate-900'}"
				>
					Generated JSON
				</button>
				<button
					type="button"
					onclick={() => activeTab.set('response')}
					class="px-4 py-2 text-sm font-medium transition-colors {$activeTab === 'response'
						? 'border-b-2 border-indigo-500 text-indigo-600'
						: 'text-slate-600 hover:text-slate-900'}"
				>
					API Response
					{#if $apiResult || $apiError}
						<span
							class="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800"
						>
							{$apiError ? '!' : '✓'}
						</span>
					{/if}
				</button>
			</div>

			<!-- Tab Panels -->
			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				{#if $activeTab === 'json'}
					<Output {state} onCopy={() => showNotification('JSON copied to clipboard!')} />
				{:else}
					<div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
						{#if $apiError}
							<div class="rounded-lg border-2 border-red-200 bg-white p-6 shadow-sm">
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
								<p class="text-sm text-red-700">{$apiError}</p>
							</div>
						{:else if $apiResult}
							<div class="flex min-h-0 flex-1 flex-col rounded-lg border-2 border-green-200 bg-white p-6 shadow-sm">
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
											{#if $elapsedTime !== null}
												<p class="text-xs text-green-600">
													<svg
														class="mr-1 inline-block h-3 w-3"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
													Elapsed time: {$elapsedTime < 1000
														? `${$elapsedTime.toFixed(0)}ms`
														: `${($elapsedTime / 1000).toFixed(2)}s`}
												</p>
											{/if}
										</div>
									</div>
									<button
										type="button"
										onclick={() => {
											navigator.clipboard.writeText(JSON.stringify($apiResult, null, 2));
											showNotification('Result copied to clipboard!');
										}}
										class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 shadow-sm transition-all duration-200 hover:border-green-400 hover:bg-green-50 hover:shadow-md active:scale-[0.98]"
									>
										<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
											<path
												d="M5.5 4.5H3.5C2.67 4.5 2 5.17 2 6V12.5C2 13.33 2.67 14 3.5 14H10C10.83 14 11.5 13.33 11.5 12.5V10.5M11.5 4.5H13.5C14.33 4.5 15 5.17 15 6V12.5C15 13.33 14.33 14 13.5 14H7C6.17 14 5.5 13.33 5.5 12.5V10.5M11.5 4.5V2M11.5 4.5H9.5M11.5 4.5V6.5"
												stroke="currentColor"
												stroke-width="1.2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
										Copy Result
									</button>
								</div>
								<pre
									class="m-0 min-h-0 flex-1 overflow-auto rounded-lg border border-green-200 bg-slate-950 p-5 font-mono text-sm leading-relaxed text-green-100"
									>{JSON.stringify($apiResult, null, 2)}</pre
								>
							</div>
						{:else}
							<div class="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-12">
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
									<p class="mt-1 text-xs text-slate-400">Submit a request to see results here</p>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Footer Actions -->
	<div class="shrink-0">
		<Actions onSubmit={handleSubmit} isSubmitting={$isSubmitting} />
	</div>

	<!-- Global Notification Component -->
	<Notification />
</div>