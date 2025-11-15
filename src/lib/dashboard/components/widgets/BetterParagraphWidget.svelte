<!-- ParagraphWidget.svelte -->
<script lang="ts">
    import { getContext, onDestroy } from 'svelte';
    import { Alert, Spinner, Button } from 'flowbite-svelte';
    import TypeWriter from '$lib/components/TypeWriter/TypeWriter.svelte';
    
    // Import widget AI service
    import { 
      createWidgetAIService, 
      connectionLabels, 
      connectionColors,
      ConnectionState 
    } from '$lib/dashboard/services/widget-ai-service';
    import { WIDGET_TYPES } from '$lib/dashboard/widget-system';
    
    // Types
    import type { ParagraphWidgetData } from '$lib/dashboard/widget-system';
    import type { CurrentUser } from '$lib/types/auth';
    import { project as projectStore } from '$lib/stores/appStateStore';
    
    // ============================================================================
    // Props
    // ============================================================================
    
    interface Props {
      data: ParagraphWidgetData;
      channelId?: string;
      widgetId?: string;
      defaultPrompt?: string;
      enableAI?: boolean;
      class?: string;
      onAIReady?: (generateFn: (prompt: string) => Promise<void>) => void;
      onFlipReady?: (flipFn: () => void) => void;
    }
    
    const {
      data,
      channelId = 'paragraph-content',
      widgetId = 'paragraph-widget',
      defaultPrompt = 'Write a paragraph about the economy around the property',
      enableAI = true,
      class: className = '',
      onAIReady,
      onFlipReady
    }: Props = $props();
    
    // ============================================================================
    // Service Setup
    // ============================================================================
    
    const pageData = getContext<{ currentUser: CurrentUser }>('pageData');
    const currentUser = $derived(pageData?.currentUser);
    
    // Create widget AI service
    const service = createWidgetAIService({
      type: WIDGET_TYPES.PARAGRAPH,
      channelId,
      widgetId,
      initialData: data,
      defaultPrompt,
      enableAI,
      vectorStoreId: $projectStore?.vectorStoreId || 'vs_default'
    });
    
    // State from service
    const state = $derived($service.state);
    const widgetData = $derived($service.data);
    
    // Computed
    const canSubmit = $derived(
      !state.loading && 
      currentUser?.idToken && 
      enableAI && 
      state.promptText.trim()
    );
    
    const connectionLabel = $derived(
      state.connectionState === ConnectionState.CONNECTED ? 'Researching' :
      state.connectionState === ConnectionState.CONNECTING ? 'Ready' :
      state.connectionState === ConnectionState.ERROR ? 'Error' :
      'Complete'
    );
    
    const connectionColor = $derived(connectionColors[state.connectionState]);
    
    // ============================================================================
    // Event Handlers
    // ============================================================================
    
    async function handleSubmit() {
      if (canSubmit && currentUser?.idToken) {
        await service.actions.generate(state.promptText, currentUser.idToken);
        service.actions.toggleFlip();
        service.actions.setPrompt('');
      }
    }
    
    function handleCancel() {
      service.actions.toggleFlip();
      service.actions.setPrompt(defaultPrompt);
    }
    
    // Expose functions to parent
    $effect(() => {
      if (onAIReady && currentUser?.idToken) {
        onAIReady((prompt) => service.actions.generate(prompt, currentUser.idToken!));
      }
      if (onFlipReady) {
        onFlipReady(() => service.actions.toggleFlip());
      }
    });
    
    // Cleanup
    onDestroy(() => {
      service.destroy();
    });
  </script>
  
  <div class="flip-container h-full {className}" class:flipped={state.isFlipped}>
    <div class="flip-card h-full">
      <!-- FRONT SIDE -->
      <div class="flip-card-front absolute h-full w-full overflow-auto rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <!-- Error Alert -->
        {#if state.error}
          <Alert 
            color="red" 
            dismissable 
            class="absolute left-4 right-4 top-4 z-20" 
            onclose={() => service.actions.clearError()}
          >
            {state.error}
          </Alert>
        {/if}
        
        <!-- Status Indicator -->
        {#if enableAI}
          <div class="absolute right-4 top-4 z-10 flex items-center gap-2">
            <div class="flex items-center gap-1.5">
              <div 
                class="h-2 w-2 rounded-full transition-colors"
                class:bg-green-500={connectionColor === 'green'}
                class:bg-yellow-500={connectionColor === 'yellow'}
                class:bg-gray-400={connectionColor === 'gray'}
                class:bg-red-500={connectionColor === 'red'}
              ></div>
              <span class="text-xs text-gray-600 dark:text-gray-400">
                {connectionLabel}
              </span>
            </div>
            
            {#if state.progress !== null}
              <div class="flex items-center gap-1">
                <div class="h-1 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div 
                    class="h-full bg-blue-500 transition-all"
                    style="width: {state.progress}%"
                  ></div>
                </div>
                <span class="text-xs text-gray-500">{state.progress}%</span>
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Content -->
        <div class="p-6" class:opacity-50={state.loading}>
          {#if state.loading && !widgetData.content}
            <div class="flex items-center justify-center py-12">
              <Spinner size="8" color="gray" />
            </div>
          {:else}
            {#key widgetData.content}
              <div class="prose max-w-none dark:prose-invert">
                <TypeWriter 
                  text={widgetData.content} 
                  speed={2}
                  markdown={widgetData.markdown}
                />
              </div>
            {/key}
          {/if}
          
          {#if state.lastUpdate}
            <div class="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Updated: {state.lastUpdate.toLocaleTimeString()}
            </div>
          {/if}
        </div>
      </div>
      
      <!-- BACK SIDE -->
      <div class="flip-card-back absolute h-full w-full overflow-auto rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm dark:from-gray-900 dark:to-gray-800">
        <div class="flex h-full flex-col p-6">
          <!-- Header -->
          <div class="mb-6">
            <h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              AI Content Generator
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Generate custom content using AI
            </p>
          </div>
          
          <!-- Form -->
          <form onsubmit|preventDefault={handleSubmit} class="flex flex-1 flex-col">
            <div class="flex-1">
              <label 
                for="prompt-{widgetId}" 
                class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Enter your prompt
              </label>
              <textarea
                id="prompt-{widgetId}"
                value={state.promptText}
                oninput={(e) => service.actions.setPrompt(e.currentTarget.value)}
                class="h-32 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={defaultPrompt}
                onkeydown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmit();
                  } else if (e.key === 'Escape') {
                    handleCancel();
                  }
                }}
              />
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <kbd>Ctrl+Enter</kbd> to submit • <kbd>Esc</kbd> to cancel
              </p>
            </div>
            
            <!-- Actions -->
            <div class="mt-4 flex justify-end gap-3">
              <Button color="alternative" on:click={handleCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!canSubmit}
              >
                {#if state.loading}
                  <Spinner size="4" class="mr-2" />
                  Generating...
                {:else}
                  Generate
                {/if}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  
  <style>
    .flip-container {
      perspective: 1000px;
    }
    
    .flip-card {
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.6s;
    }
    
    .flip-container.flipped .flip-card {
      transform: rotateY(180deg);
    }
    
    .flip-card-front,
    .flip-card-back {
      backface-visibility: hidden;
    }
    
    .flip-card-back {
      transform: rotateY(180deg);
    }
    
    kbd {
      @apply rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-700;
    }
  </style>