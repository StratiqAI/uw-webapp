<script lang="ts">
	import type { Snippet } from 'svelte';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('dashboard');

	interface Props {
		widgetType: string;
		children: Snippet;
	}

	let { widgetType, children }: Props = $props();

	const darkMode = $derived(themeStore.darkMode);

	const cardClass = $derived(
		darkMode
			? 'border-slate-600 bg-slate-900/95 text-slate-100'
			: 'border-slate-200 bg-white text-slate-900 shadow-sm'
	);

	const labelClass = $derived(
		darkMode ? 'text-slate-400' : 'text-slate-500'
	);

	const errorClass = $derived(darkMode ? 'text-red-400' : 'text-red-600');

	function formatError(error: unknown): string {
		if (error instanceof Error) return error.message;
		if (
			typeof error === 'object' &&
			error !== null &&
			'message' in error &&
			typeof (error as { message: unknown }).message === 'string'
		) {
			return (error as { message: string }).message;
		}
		return String(error);
	}

	function handleError(error: unknown, _reset: () => void) {
		log.error('Widget render failed', { widgetType, error });
	}
</script>

<svelte:boundary onerror={handleError}>
	{@render children()}

	{#snippet failed(error, reset)}
		<div
			class="flex flex-col gap-3 rounded-lg border p-4 {cardClass}"
			role="alert"
		>
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<span class="text-sm font-semibold tracking-tight">Widget error</span>
				<span class="font-mono text-xs {labelClass}">{widgetType}</span>
			</div>
			<p class="whitespace-pre-wrap wrap-break-word text-sm {errorClass}">
				{formatError(error)}
			</p>
			<button
				type="button"
				class="self-start rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 {darkMode
					? 'bg-slate-700 text-slate-100 hover:bg-slate-600 focus-visible:ring-slate-400 focus-visible:ring-offset-slate-900'
					: 'bg-slate-800 text-white hover:bg-slate-700 focus-visible:ring-slate-500 focus-visible:ring-offset-white'}"
				onclick={reset}
			>
				Retry
			</button>
		</div>
	{/snippet}
</svelte:boundary>
