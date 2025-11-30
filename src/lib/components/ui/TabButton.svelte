<script lang="ts">
  import type { Snippet } from 'svelte';

  type TabButtonProps = {
    onclick?: (e: MouseEvent) => void;
    href?: string;
    className?: string;
    children?: Snippet;
  };

  const {
    onclick = undefined,
    href,
    className = '',
    children
  }: TabButtonProps = $props();

  const defaultClasses: string =
    'inline-block text-sm font-medium text-center disabled:cursor-not-allowed py-2 px-4 rounded-lg transition-all duration-200 border border-transparent';

  const mergedClasses: string = $derived(`${defaultClasses} ${className}`.trim());
</script>

{#if href}
  <a href={href} class={mergedClasses} onclick={onclick}>
    {@render children?.()}
  </a>
{:else}
  <button type="button" class={mergedClasses} onclick={onclick}>
    {@render children?.()}
  </button>
{/if}