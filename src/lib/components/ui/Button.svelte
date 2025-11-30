<script lang="ts">
    import { Button } from "flowbite-svelte";
    import type { Snippet } from 'svelte';

    let { href, icon = false, children, className = '', onclick } = $props<{
        href?: string;
        icon?: boolean;
        children?: Snippet;
        className?: string;
        onclick?: (e: MouseEvent) => void;
    }>();

    // class={`flex space-x-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 hover:dark:bg-gray-700 dark:text-gray-100 px-4 py-2 shadow-sm transition hover:bg-gray-50 hover:border-gray-400 ${className}`}
</script>

<Button
    href={href}
    class={`flex space-x-2 rounded-lg border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm text-gray-700 bg-white dark:text-gray-100 dark:bg-gray-800 ${className}`}
    onclick={onclick}
>
    {#if icon}
		<svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
    {/if}
    <span class="text-sm font-medium ">
        {#if children}
            {@render children()}
        {:else}
            Button
        {/if}
    </span>	
</Button>