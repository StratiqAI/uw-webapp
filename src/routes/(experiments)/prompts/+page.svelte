<script lang="ts">
    import { createPromptManager } from './prompts';
    import { onMount } from 'svelte';
    import type { PageProps } from './$types';

    // Get the Props for the Component
    let componentProps: PageProps = $props();

    // Get idToken from server-side load function
    let idToken = componentProps.data?.idToken;

    // Instantiate the manager with idToken
    const promptManager = createPromptManager(idToken!);

    // Load data on mount
    onMount(() => {
        promptManager.loadList();
    });

    // Handle Form Submit
    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        
        await promptManager.create({
            name: formData.get('name'),
            model: 'gpt-4',
            inputs: '{}',
            variables: []
        });
        
        // Reset form...
    }
</script>

<div class="p-6">
    <h1 class="text-2xl font-bold mb-4">My Prompts</h1>

    <!-- Loading State -->
    {#if promptManager.isLoading}
        <div class="animate-pulse">Loading...</div>
    {/if}

    <!-- Error State -->
    {#if promptManager.error}
        <div class="text-red-500 bg-red-50 p-4 rounded">
            {promptManager.error}
        </div>
    {/if}

    <!-- Create Form -->
    <form onsubmit={handleSubmit} class="mb-8 flex gap-2">
        <input name="name" placeholder="New Prompt Name" class="border p-2 rounded" required />
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">
            Create
        </button>
    </form>

    <!-- List -->
    <div class="grid gap-4">
        {#each promptManager.items as prompt (prompt.id)}
            <div class="border p-4 rounded shadow-sm flex justify-between items-center bg-white">
                <div>
                    <h3 class="font-semibold">{prompt.name}</h3>
                    <p class="text-sm text-gray-500">{prompt.model}</p>
                </div>
                <button 
                    onclick={() => promptManager.delete(prompt.id)}
                    class="text-red-600 hover:bg-red-50 px-3 py-1 rounded"
                >
                    Delete
                </button>
            </div>
        {/each}
    </div>
    
    <!-- Load More -->
    {#if promptManager.nextToken}
        <button 
            onclick={() => promptManager.loadList(20, promptManager.nextToken)}
            class="mt-4 text-blue-600 underline"
        >
            Load More
        </button>
    {/if}
</div>