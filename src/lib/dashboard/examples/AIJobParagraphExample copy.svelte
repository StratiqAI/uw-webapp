<script lang="ts">
	/**
	 * AI Job → Paragraph Widget Example
	 *
	 * This example shows how to:
	 * 1. Submit an AI job with structured output
	 * 2. Automatically create a producer via bridge
	 * 3. Display results in ParagraphWidget
	 */

	import { onDestroy, onMount } from 'svelte';
	import JobSubmission from '$lib/components/AI/JobSubmission.svelte';
	import ParagraphWidget from '$lib/dashboard/components/widgets/ParagraphWidget.svelte';
	import {
		WidgetChannels,
		getWidgetTextFormat,
		type ParagraphWidgetData,
		ParagraphWidgetDataSchema
	} from '$lib/dashboard/types/widgetSchemas';

	import { createJobWidgetBridge, type JobWidgetBridge } from '$lib/dashboard/types/widgetBridge';
	// import { z } from 'zod';
	import { paragraphTitleQuery } from '../types/OpenAIQueryDefs';
	import { project as projectStore } from '$lib/stores/appStateStore';

	// ===== Types =====
	interface Props {
		idToken: string;
		/** Optional: Custom prompt for the AI */
		prompt?: string;
		/** Optional: Custom widget ID */
		widgetId?: string;
		/** Optional: Model to use */
		model?: 'gpt-5-nano';
		/** Optional: Auto-submit on mount */
		autoSubmit?: boolean;
	}

	// Enhanced job status type
	type JobStatus = 'idle' | 'submitting' | 'processing' | 'completed' | 'error';

	interface JobState {
		status: JobStatus;
		jobId: string | null;
		error: Error | null;
		submittedAt: Date | null;
		completedAt: Date | null;
	}

	// // Response schema for better type safety
	// const AIResponseSchema = z.object({
	// 	title: z.string().optional().nullable(),
	// 	content: z.string(),
	// 	markdown: z.boolean().optional().nullable(),
	// 	output_parsed: z
	// 		.object({
	// 			title: z.string().optional(),
	// 			content: z.string().optional(),
	// 			markdown: z.boolean().optional()
	// 		})
	// 		.optional()
	// });

	// type AIResponse = z.infer<typeof ParagraphWidgetDataSchema>;

	// const createJobInput = (customPrompt?: string) => {
	// 	const textFormat = getWidgetTextFormat('paragraph', 'ParagraphContent');

	// 	return {
	// 		request: JSON.stringify({
	// 			model,
	// 			input: [
	// 				{
	// 					role: 'system',
	// 					content: `You are a helpful assistant that writes clear, informative paragraphs.
	// 					Structure your response with:
	// 					- A concise, descriptive title
	// 					- Well-formatted content (use markdown if it improves readability)
	// 					- Set markdown: true if you use markdown formatting`
	// 				},
	// 				{
	// 					role: 'user',
	// 					content: customPrompt || prompt
	// 				}
	// 			],
	// 			text: {
	// 				format: textFormat
	// 			}
	// 		}),
	// 		priority: 'HIGH' as const
	// 	};
	// };

	// ===== Props with defaults =====
	let {
		idToken,
		prompt = 'Summarize the latest AI developments in a short paragraph',
		widgetId = 'ai-paragraph-widget',
		model = 'gpt-5-nano',
		autoSubmit = false
	}: Props = $props();

	// ===== Enhanced State Management =====
	let bridge = $state<JobWidgetBridge | null>(null);
	let jobState = $state<JobState>({
		status: 'idle',
		jobId: null,
		error: null,
		submittedAt: null,
		completedAt: null
	});

	// Track retry attempts
	let retryCount = $state(0);
	const MAX_RETRIES = 3;

	// Track widget data updates
	let widgetData = $state<ParagraphWidgetData>({
		title: 'AI Generated Content',
		content: 'Waiting for AI to generate content... Click "Submit Job" to start.',
		markdown: false
	});

	// ===== Computed Properties =====
	let isProcessing = $derived(jobState.status === 'submitting' || jobState.status === 'processing');

	let processingTime = $derived(() => {
		if (!jobState.submittedAt) return null;
		const end = jobState.completedAt || new Date();
		return Math.round((end.getTime() - jobState.submittedAt.getTime()) / 1000);
	});

	let statusMessage = $derived(() => {
		switch (jobState.status) {
			case 'idle':
				return 'Ready to submit job';
			case 'submitting':
				return 'Submitting job...';
			case 'processing':
				return `Processing... ${processingTime ? `(${processingTime}s)` : ''}`;
			case 'completed':
				return `Completed in ${processingTime}s`;
			case 'error':
				return `Error: ${jobState.error?.message || 'Unknown error'}`;
			default:
				return '';
		}
	});

	// ===== Enhanced Job Configuration =====

	// Get vector store ID from current project
	const currentProject = $derived($projectStore);
	const getVectorStoreId = () => currentProject?.vectorStoreId || 'vs_68da2c6862088191a5b51b8b4566b300';
	
	let jobInput = $state(paragraphTitleQuery(prompt, model, getVectorStoreId()));

	// ===== Enhanced Transformation Logic =====
	function transformJobResult(result: unknown): ParagraphWidgetData {
		console.group('🔄 Transforming Job Result');
		console.log('Raw result:', result);
		console.log('Raw result type:', typeof result);

		try {
			// Parse string to object
			const parsed = typeof result === 'string' ? JSON.parse(result) : result;
			console.log('Parsed result:', parsed);
			console.log('Parsed keys:', Object.keys(parsed as any));

			// Check if it's already in the correct format (direct match)
			if (parsed && typeof parsed === 'object') {
				// Try direct validation first
				const directValidation = ParagraphWidgetDataSchema.safeParse(parsed);
				if (directValidation.success) {
					console.log('✅ Direct validation passed:', directValidation.data);
					console.groupEnd();
					return directValidation.data;
				}

				// Extract from various possible structures
				let extractedTitle: string | undefined;
				let extractedContent: string;
				let extractedMarkdown: boolean | undefined;

				// Try multiple extraction paths
				if (typeof parsed.content === 'string') {
					extractedContent = parsed.content;
					extractedTitle = parsed.title;
					extractedMarkdown = parsed.markdown;
				} else if (parsed.output_parsed && typeof parsed.output_parsed.content === 'string') {
					// Nested in output_parsed
					console.log('📦 Extracting from output_parsed');
					extractedContent = parsed.output_parsed.content;
					extractedTitle = parsed.output_parsed.title;
					extractedMarkdown = parsed.output_parsed.markdown;
				} else if (typeof parsed.text === 'string') {
					// Alternative field name
					extractedContent = parsed.text;
					extractedTitle = parsed.title || parsed.heading;
					extractedMarkdown = parsed.markdown || parsed.isMarkdown;
				} else if (parsed.content && typeof parsed.content === 'object') {
					// Content is an object - try to extract text field
					console.log('📦 Content is object, extracting text field');
					extractedContent =
						parsed.content.text || parsed.content.body || JSON.stringify(parsed.content);
					extractedTitle = parsed.title || parsed.content.title;
					extractedMarkdown = parsed.markdown || parsed.content.markdown || false;
				} else {
					// Last resort: Check all keys for likely content
					console.warn('⚠️ Using fallback extraction, available keys:', Object.keys(parsed));
					const possibleContent = parsed.body || parsed.message || parsed.response;
					extractedContent =
						typeof possibleContent === 'string' ? possibleContent : JSON.stringify(parsed, null, 2);
					extractedTitle = 'AI Response';
					extractedMarkdown = false;
				}

				const widgetData = {
					title: extractedTitle,
					content: extractedContent,
					markdown: extractedMarkdown ?? false
				} as ParagraphWidgetData;

				console.log('✅ Extracted widget data:', widgetData);
				console.groupEnd();
				return widgetData;
			}

			// Fallback for non-object
			console.warn('⚠️ Result is not an object, converting to string');
			console.groupEnd();
			return {
				title: 'AI Response',
				content: String(result),
				markdown: false
			} as ParagraphWidgetData;
		} catch (error) {
			console.error('❌ Transform error:', error);
			console.groupEnd();
			return {
				title: 'Error',
				content: `Failed to process: ${error instanceof Error ? error.message : 'Unknown'}`,
				markdown: false
			} as ParagraphWidgetData;
		}
	}

	// ===== Enhanced Job Handlers =====
	function handleJobComplete(update: any) {
		console.group(`🎯 Job Completed: ${update.id}`);

		jobState = {
			...jobState,
			status: 'completed',
			jobId: update.id,
			completedAt: new Date(),
			error: null
		};

		// Reset retry count on success
		retryCount = 0;

		try {
			// Create bridge with enhanced configuration
			bridge = createJobWidgetBridge({
				jobId: update.id,
				channel: WidgetChannels.paragraphContent,
				transformer: transformJobResult,
				filter: (update) => {
					const isComplete = ['COMPLETED', 'COMPLETE'].includes(update.status);
					const hasResult = update.result !== null && update.result !== undefined;
					return isComplete && hasResult;
				}
				// },
				// // Add error handler
				// onError: (error) => {
				// 	console.error('❌ Bridge error:', error);
				// 	jobState.error = error instanceof Error ? error : new Error(String(error));
				// }
			});

			console.log('✅ Bridge created successfully');
			console.log(`   Producer ID: job-${update.id}-to-paragraph-content`);
			console.log(`   Channel: paragraph-content`);
		} catch (error) {
			console.error('❌ Failed to create bridge:', error);
			jobState.error = error instanceof Error ? error : new Error('Failed to create bridge');
		} finally {
			console.groupEnd();
		}
	}

	function handleJobError(error: Error) {
		console.error('❌ Job error:', error);

		jobState = {
			...jobState,
			status: 'error',
			error,
			completedAt: new Date()
		};

		// Attempt retry if under limit
		if (retryCount < MAX_RETRIES) {
			retryCount++;
			console.log(`🔄 Retrying... (${retryCount}/${MAX_RETRIES})`);
			setTimeout(() => {
				jobState.status = 'idle';
				jobInput = paragraphTitleQuery(prompt, model, getVectorStoreId());
			}, 2000);
		}
	}

	// ===== Reset Function =====
	function resetJob() {
		if (bridge) {
			bridge.disconnect();
			bridge = null;
		}

		jobState = {
			status: 'idle',
			jobId: null,
			error: null,
			submittedAt: null,
			completedAt: null
		};

		retryCount = 0;
		jobInput = paragraphTitleQuery(prompt, model, getVectorStoreId());

		widgetData = {
			title: 'AI Generated Content',
			content: 'Waiting for AI to generate content... Click "Submit Job" to start.',
			markdown: false
		};
	}

	// ===== Lifecycle =====
	onMount(() => {
		if (autoSubmit) {
			console.log('🚀 Auto-submit configured (use JobSubmission component directly)');
		}
	});

	onDestroy(() => {
		if (bridge) {
			console.log('🧹 Cleaning up bridge and producer');
			bridge.disconnect();
		}
	});
</script>

<div class="space-y-6 rounded-lg border-2 border-blue-200 bg-white p-6 shadow-lg">
	<!-- Header -->
	<div class="border-b pb-4">
		<div class="flex items-start justify-between">
			<div>
				<h2 class="text-2xl font-bold text-gray-900">AI Job → Paragraph Widget</h2>
				<p class="mt-2 text-sm text-gray-600">
					Submit an AI job that automatically publishes results to a ParagraphWidget
				</p>
			</div>
			{#if jobState.status === 'completed' || jobState.status === 'error'}
				<button
					onclick={resetJob}
					class="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700
					       transition-colors hover:bg-gray-200"
				>
					Reset
				</button>
			{/if}
		</div>
	</div>

	<!-- Status Bar -->
	<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2">
				{#if isProcessing}
					<div class="h-3 w-3 animate-pulse rounded-full bg-blue-500"></div>
				{:else if jobState.status === 'completed'}
					<div class="h-3 w-3 rounded-full bg-green-500"></div>
				{:else if jobState.status === 'error'}
					<div class="h-3 w-3 rounded-full bg-red-500"></div>
				{:else}
					<div class="h-3 w-3 rounded-full bg-gray-400"></div>
				{/if}
				<span class="text-sm font-medium capitalize text-gray-700">
					{jobState.status}
				</span>
			</div>
			<span class="text-sm text-gray-600">{statusMessage()}</span>
		</div>
		{#if retryCount > 0}
			<span class="text-xs text-amber-600">
				Retry {retryCount}/{MAX_RETRIES}
			</span>
		{/if}
	</div>

	<!-- Info Panel -->
	<details class="rounded-lg bg-blue-50 p-4" open={jobState.status === 'idle'}>
		<summary class="cursor-pointer font-semibold text-blue-900"> ℹ️ How it works </summary>
		<ol class="mt-2 space-y-1 text-sm text-blue-800">
			<li>1. AI job uses OpenAI text format (zodTextFormat with ParagraphWidget schema)</li>
			<li>2. Job completes → handleJobComplete() creates bridge</li>
			<li>3. Bridge creates ValidatedPublisher for 'paragraph-content' channel</li>
			<li>4. Bridge validates and publishes job result to mapObjectStore</li>
			<li>5. ParagraphWidget (consumer) receives and displays validated data</li>
		</ol>
	</details>

	<!-- Job Configuration -->
	<div class="space-y-3">
		<h3 class="font-semibold text-gray-900">Configuration</h3>
		<div class="grid grid-cols-2 gap-3 text-sm">
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
				<span class="font-medium text-gray-600">Model:</span>
				<span class="ml-2 text-gray-900">{model}</span>
			</div>
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
				<span class="font-medium text-gray-600">Widget ID:</span>
				<span class="ml-2 font-mono text-xs text-gray-900">{widgetId}</span>
			</div>
		</div>
	</div>

	<!-- Job Submission -->
	<div class="space-y-3">
		<h3 class="font-semibold text-gray-900">Step 1: Submit AI Job</h3>
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<JobSubmission
				{idToken}
				{jobInput}
				onJobComplete={handleJobComplete}
				onJobError={handleJobError}
			/>
		</div>
	</div>

	<!-- Bridge Status -->
	{#if bridge}
		<div class="space-y-3">
			<h3 class="font-semibold text-gray-900">Step 2: Bridge Status</h3>
			<div class="rounded-lg border border-green-200 bg-green-50 p-4">
				<div class="space-y-2 text-sm">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<span class="font-medium">Producer Created:</span>
							<span
								class="ml-2 rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white"
							>
								✓ Yes
							</span>
						</div>
						<div>
							<span class="font-medium">Status:</span>
							{#if bridge.getStatus().connected}
								<span class="ml-2 text-green-700">🟢 Connected</span>
							{:else}
								<span class="ml-2 text-gray-600">⚫ Disconnected</span>
							{/if}
						</div>
					</div>

					<div class="space-y-1">
						<div>
							<span class="font-medium">Channel:</span>
							<code class="ml-2 rounded bg-white px-2 py-1 text-xs">paragraph-content</code>
						</div>
						<div>
							<span class="font-medium">Producer ID:</span>
							<code class="ml-2 rounded bg-white px-2 py-1 text-xs">
								job-{jobState.jobId}-to-paragraph-content
							</code>
						</div>
					</div>

					{#if bridge.getStatus().lastUpdate}
						<div>
							<span class="font-medium">Last Update:</span>
							<span class="ml-2 text-gray-700">
								{bridge.getStatus()?.lastUpdate?.toLocaleTimeString()}
							</span>
						</div>
					{/if}

					{#if bridge.getStatus().lastError}
						<div class="mt-2 rounded border border-red-300 bg-red-50 p-2">
							<p class="text-xs font-semibold text-red-800">Validation Error:</p>
							<pre class="mt-1 overflow-x-auto text-xs text-red-700">{JSON.stringify(
									bridge.getStatus().lastError,
									null,
									2
								)}</pre>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Widget Display -->
	<div class="space-y-3">
		<h3 class="font-semibold text-gray-900">Step 3: Widget Display</h3>
		<div class="rounded-lg border-2 border-purple-300 bg-purple-50 p-4">
			<p class="mb-3 text-xs text-purple-700">
				This widget automatically receives data from the producer via mapObjectStore
			</p>
			<div class="min-h-[150px] rounded-lg border-2 border-purple-400 bg-white p-4">
				<ParagraphWidget data={widgetData as any} {widgetId} channelId="paragraph-content" />
			</div>
		</div>
	</div>

	<!-- Debug Panel -->
	<details class="rounded-lg bg-gray-50 p-4">
		<summary class="cursor-pointer font-semibold text-gray-900"> 🐛 Debug Information </summary>
		<div class="mt-3 space-y-3">
			<p class="text-xs text-gray-600">
				Open browser console (F12) to see detailed logs. Use MapStore Debug Panel for inspection.
			</p>

			{#if jobState.jobId}
				<div class="rounded bg-gray-100 p-3">
					<h4 class="text-xs font-semibold text-gray-700">Current State:</h4>
					<pre class="mt-2 overflow-x-auto text-xs text-gray-600">{JSON.stringify(
							{
								status: jobState.status,
								jobId: jobState.jobId,
								processingTime: processingTime ? `${processingTime}s` : null,
								retryCount,
								hasError: !!jobState.error,
								bridgeConnected: bridge?.getStatus().connected || false
							},
							null,
							2
						)}</pre>
				</div>
			{/if}
		</div>
	</details>
</div>

<style>
	code {
		font-family: 'Fira Code', 'Cascadia Code', monospace;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	details summary::-webkit-details-marker {
		display: none;
	}

	details summary::before {
		content: '▶';
		display: inline-block;
		margin-right: 0.5rem;
		transition: transform 0.2s;
	}

	details[open] summary::before {
		transform: rotate(90deg);
	}
</style>
