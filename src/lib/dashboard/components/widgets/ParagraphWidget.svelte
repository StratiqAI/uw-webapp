<!-- ParagraphWidget.svelte -->
<!-- Requirements:  
	 - ParagraphWidgetDataSchema: A Zod schema for all the data required to display information in a paragraph widget
	 - WidgetId: A unique identifier for the paragraph widget
 -->
<script lang="ts">
	// Importing Svelte Library Functions
	import { getContext } from 'svelte';
	import {
		WIDGET_TITLE_BAR_CONTEXT,
		type WidgetTitleBarContext
	} from '$lib/dashboard/context/widgetTitleBarContext';

	// Importing 3rd Party Libraries
	import { z } from 'zod';

	// Data Types
	import { ParagraphWidgetDataSchema } from '$lib/dashboard/types/widgetSchemas';
	import type { ParagraphWidget } from '$lib/dashboard/types/widget';

	// Authentication
	import type { CurrentUser } from '$lib/types/auth';
	import type { JobUpdate } from '$lib/dashboard/lib/JobManager';

	// ValidatedTopicStore integration
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { submitAIJob, type JobSubmissionCallbacks } from './utils/aiJobSubmission';
	import { paragraphTitleQuery } from '$lib/dashboard/types/OpenAIQueryDefs';
	import { project as projectStore } from '$lib/stores/appStateStore';

	// Inferred Types
	type ParagraphWidgetData = z.infer<typeof ParagraphWidgetDataSchema>;
			
	// UI Components
	import { Alert, Spinner } from 'flowbite-svelte';
	import TypeWriter from '$lib/components/TypeWriter/TypeWriter.svelte';

	//////////////////////////////////////////////////////////////////////////////////////////////
	// Component Props & State
	//////////////////////////////////////////////////////////////////////////////////////////////

	interface Props {
		data: ParagraphWidget['data'];
		darkMode?: boolean;
		/** Optional custom widget ID for consumer registration */
		widgetId?: string;
		/** Optional topic override */
		topicOverride?: string;
		/** Optional prompt for AI content generation */
		defaultPrompt?: string;
		/** Enable/disable AI generation button */
		enableAIGeneration?: boolean;
		/** Custom CSS classes */
		class?: string;
		/** Callback to expose AI generation function to parent */
		onAIGenerationReady?: (generateFn: (prompt: string) => Promise<void>) => void;
		/** Callback to expose flip control to parent */
		onFlipControlReady?: (flipFn: () => void) => void;
		/** When true, AI connection status is shown in the host title bar instead of over the body. */
		showTitleInChrome?: boolean;
	}

	const {
		data,
		darkMode = false,
		widgetId = 'paragraph-widget-default',
		topicOverride,
		defaultPrompt = 'Write a paragraph about the economy around the property',
		enableAIGeneration = true,
		class: className = '',
		onAIGenerationReady,
		onFlipControlReady,
		showTitleInChrome = false
	}: Props = $props();

	const titleBarCtx = getContext<WidgetTitleBarContext | undefined>(WIDGET_TITLE_BAR_CONTEXT);

	// Get topic path for this widget
	const topic = $derived(getWidgetTopic('paragraph', widgetId, topicOverride));

	// Local state management
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let lastUpdateTime = $state<Date | null>(null);
	let connectionState = $state<'Researching' | 'Ready' | 'Complete'>('Complete');
	let isFlipped = $state(false);
	let customPromptInput = $state('');

	// Get current user from context
	const pageData = getContext<{ currentUser: CurrentUser }>('pageData');
	const currentUser = $derived(pageData?.currentUser);

	// Computed state
	const canSubmitJob = $derived(
		!isLoading && currentUser?.idToken && enableAIGeneration && connectionState !== 'Ready'
	);

	const formattedUpdateTime = $derived(
		lastUpdateTime?.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}) ?? null
	);

	//////////////////////////////////////////////////////////////////////////////////////////////
	// ValidatedTopicStore Integration
	//////////////////////////////////////////////////////////////////////////////////////////////

	// Subscribe to data updates using ValidatedTopicStore hook (reactive to topic changes)
	const dataStream = useReactiveValidatedTopic<ParagraphWidgetData>(() => topic);
	
	// Merge store data with initial data
	let widgetData = $derived<ParagraphWidgetData>({
		title: dataStream.current?.title ?? data.title,
		content: dataStream.current?.content ?? data.content,
		markdown: dataStream.current?.markdown ?? data.markdown ?? false
	});

	// Track when data updates from store
	$effect(() => {
		if (dataStream.current) {
			lastUpdateTime = new Date();
		}
	});

	$effect(() => {
		console.log(`📝 ParagraphWidget:${widgetId} - Initialized with ValidatedTopicStore`);
		console.log(`   Topic: ${topic}`);
		console.log(`   Initial data:`, data);
	});

	/** Lift AI connection state to WidgetWrapper title bar when the card has a header. */
	$effect(() => {
		if (!titleBarCtx || !enableAIGeneration || !showTitleInChrome) {
			titleBarCtx?.setAiConnectionState(null);
			return;
		}
		titleBarCtx.setAiConnectionState(connectionState);
		return () => titleBarCtx.setAiConnectionState(null);
	});

	//////////////////////////////////////////////////////////////////////////////////////////////
	// Helper Functions
	//////////////////////////////////////////////////////////////////////////////////////////////

	function validateData(data: unknown): ParagraphWidgetData {
		try {
			return ParagraphWidgetDataSchema.parse(data);
		} catch (err) {
			console.error('Invalid widget data:', err);
			return {
				title: 'Error',
				content: 'Failed to load widget content',
				markdown: false
			};
		}
	}

	function clearError() {
		error = null;
	}

	//////////////////////////////////////////////////////////////////////////////////////////////
	// AI Job Management
	//////////////////////////////////////////////////////////////////////////////////////////////

	const jobCallbacks: JobSubmissionCallbacks = {
		onJobComplete: (update: JobUpdate) => {
			try {
				isLoading = false;

				const result = JSON.parse(update.result as string);
				const parsedOutput = result.output_parsed;

				if (!parsedOutput) {
					throw new Error('Invalid AI response format');
				}

				const newData: ParagraphWidgetData = {
					title: parsedOutput.title || null,
					content: parsedOutput.content || '',
					markdown: (parsedOutput.markdown ?? false) as boolean | null
				};

				console.log(`✅ AI content generated: "${newData.title || 'Untitled'}"`);
				
				// Publish to ValidatedTopicStore using the current topic
				const currentTopic = getWidgetTopic('paragraph', widgetId, topicOverride);
				const published = validatedTopicStore.publish(currentTopic, newData);
				if (!published) {
					console.error('❌ Failed to publish to ValidatedTopicStore');
					error = 'Failed to save generated content';
				}
			} catch (err) {
				console.error('Failed to process AI response:', err);
				error = 'Failed to process AI response';
				isLoading = false;
			}
		},

		onJobError: (err: Error) => {
			console.error('❌ Job failed:', err);
			error = err.message || 'AI generation failed';
			isLoading = false;
		},

		onStatusUpdate: (update: JobUpdate) => {
			console.log('📊 Job status:', update.status);
		},

		onConnectionStateChange: (state: string) => {
			console.log('🔌 Connection state:', state);
			const stateMap: Record<string, typeof connectionState> = {
				connected: 'Researching',
				connecting: 'Ready',
				disconnected: 'Complete'
			};
			connectionState = stateMap[state] || 'Complete';
		}
	};

	async function handleAIGeneration(customPrompt?: string) {
		if (!currentUser?.idToken) {
			error = 'Authentication required';
			return;
		}

		const promptToUse = customPrompt || defaultPrompt;

		try {
			error = null;
			isLoading = true;

			console.log('projectStore:', $projectStore);
			console.log('projectStore.vectorStoreId:', $projectStore?.vectorStoreId);
			const vectorStoreId = $projectStore?.vectorStoreId || 'vs_68da2c6862088191a5b51b8b4566b300';

			await submitAIJob(
				paragraphTitleQuery(promptToUse, 'gpt-5-nano', vectorStoreId),
				currentUser.idToken,
				jobCallbacks
			);
		} catch (err) {
			console.error('Failed to submit AI job:', err);
			error = 'Failed to submit AI request';
			isLoading = false;
		}
	}

	// Flip control functions
	function toggleFlip() {
		isFlipped = !isFlipped;
		if (isFlipped) {
			customPromptInput = defaultPrompt;
		}
	}

	function handleFormSubmit() {
		if (customPromptInput.trim()) {
			handleAIGeneration(customPromptInput);
			isFlipped = false;
			customPromptInput = '';
		}
	}

	function handleFormCancel() {
		isFlipped = false;
		customPromptInput = '';
	}

	// Expose AI generation function to parent component
	$effect(() => {
		if (onAIGenerationReady) {
			onAIGenerationReady(handleAIGeneration);
		}
	});

	// Expose flip control to parent component
	$effect(() => {
		if (onFlipControlReady) {
			onFlipControlReady(toggleFlip);
		}
	});
</script>

<div class="flip-container h-full {className}" class:flipped={isFlipped}>
	<div class="flip-card h-full">
		<!-- FRONT SIDE -->
		<div
			class="flip-card-front absolute h-full w-full overflow-auto rounded-lg {darkMode ? 'bg-slate-800' : 'bg-white'} shadow-sm"
		>
			<!-- Error Display -->
			{#if error}
				<Alert
					color="red"
					dismissable
					class="absolute left-4 right-4 top-4 z-20"
					onclose={clearError}
				>
					{error}
				</Alert>
			{/if}

			<!-- AI connection status (over body only when there is no host title bar) -->
			{#if enableAIGeneration && !showTitleInChrome}
				<div class="absolute right-12 top-4 z-10 flex items-center gap-2">
					<div class="flex items-center gap-1">
						<div
							class="h-2 w-2 rounded-full"
							class:bg-green-500={connectionState === 'Researching' && !darkMode}
							class:bg-green-400={connectionState === 'Researching' && darkMode}
							class:bg-yellow-500={connectionState === 'Ready' && !darkMode}
							class:bg-yellow-400={connectionState === 'Ready' && darkMode}
							class:bg-blue-500={connectionState === 'Complete' && !darkMode}
							class:bg-blue-400={connectionState === 'Complete' && darkMode}
						></div>
						<span class="text-xs {darkMode ? 'text-slate-300' : 'text-slate-600'}">
							{connectionState}
						</span>
					</div>
				</div>
			{/if}

			<!-- Content Display -->
			<div class="px-4 pb-4 pt-4" class:loading={isLoading}>
				<!-- {#if widgetData.title}
					<h3 class="mb-3 text-xl font-semibold {darkMode ? 'text-slate-100' : 'text-slate-800'}">
						{widgetData.title}
					</h3>
				{/if} -->

				{#if isLoading && !widgetData.content}
					<div class="flex items-center justify-center py-12">
						<Spinner size="8" color="gray" />
					</div>
				{:else}
					{#key widgetData.content}
						<div class="custom-prose max-w-none">
							{#if widgetData.markdown}
								<TypeWriter text={widgetData.content} speed={2} {darkMode} />
							{:else}
								<TypeWriter text={widgetData.content} speed={2} {darkMode} />
							{/if}
						</div>
					{/key}
				{/if}

				<!-- Update Timestamp -->
				{#if formattedUpdateTime}
					<div class="mt-4 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						Last updated: {formattedUpdateTime}
					</div>
				{/if}
			</div>
		</div>

		<!-- BACK SIDE -->
		<div
			class="flip-card-back absolute h-full w-full overflow-auto rounded-lg bg-gradient-to-br {darkMode ? 'from-blue-900 to-indigo-950' : 'from-blue-50 to-indigo-100'} shadow-sm"
		>
			<div class="flex h-full flex-col p-6">
				<!-- Header -->
				<div class="mb-6 flex items-center gap-3">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full {darkMode ? 'bg-blue-500' : 'bg-blue-600'}"
					>
						<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
					</div>
					<div>
						<h3 class="text-xl font-bold {darkMode ? 'text-slate-100' : 'text-slate-900'}">
							AI Local Economy Agent
						</h3>
						<p class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
							The Local Economy Agent specializes in providing detailed economic analysis in
							targeted markets
						</p>
					</div>
				</div>

				<!-- Form -->
				<form
					class="flex flex-1 flex-col gap-4"
					onsubmit={(e) => {
						e.preventDefault();
						handleFormSubmit();
					}}
				>
					<div class="flex-1">
						<label
							for="custom-prompt-{widgetId}"
							class="mb-2 block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}"
						>
							Enter custom instructions for this agent
						</label>
						<textarea
							id="custom-prompt-{widgetId}"
							bind:value={customPromptInput}
							class="h-16 w-full rounded-lg border {darkMode ? 'border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'} px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Example: Write a paragraph about the economy around the property"
							onkeydown={(e) => {
								if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
									e.preventDefault();
									handleFormSubmit();
								} else if (e.key === 'Escape') {
									handleFormCancel();
								}
							}}
						></textarea>
						<p class="mt-2 text-xs {darkMode ? 'text-slate-300' : 'text-slate-600'}">
							Tip: Press <kbd class="rounded {darkMode ? 'bg-slate-700' : 'bg-slate-200'} px-1.5 py-0.5"
								>Ctrl+Enter</kbd
							>
							to submit, <kbd class="rounded {darkMode ? 'bg-slate-700' : 'bg-slate-200'} px-1.5 py-0.5">Esc</kbd> to
							cancel
						</p>
					</div>

					<!-- Buttons -->
					<div class="flex justify-end gap-3">
						<button
							type="button"
							onclick={handleFormCancel}
							class="rounded-lg border {darkMode ? 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 focus:ring-slate-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300'} px-5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!customPromptInput.trim() || isLoading}
							class="flex items-center gap-2 rounded-lg {darkMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isLoading}
								<Spinner size="4" />
								<span>Generating...</span>
							{:else}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
								<span>Generate Content</span>
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>

<style>
	/* Flip Container */
	.flip-container {
		perspective: 1000px;
		position: relative;
	}

	.flip-card {
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.flip-container.flipped .flip-card {
		transform: rotateY(180deg);
	}

	.flip-card-front,
	.flip-card-back {
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	.flip-card-front {
		transform: rotateY(0deg);
	}

	.flip-card-back {
		transform: rotateY(180deg);
	}

	/* Loading state overlay */
	.loading {
		opacity: 0.75;
	}

	/* Custom prose styles */
	.custom-prose {
		line-height: 1.75;
	}


	/* Keyboard shortcut keys */
	kbd {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
	}
</style>
