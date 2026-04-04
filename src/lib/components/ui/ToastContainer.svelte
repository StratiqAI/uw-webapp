<script lang="ts">
	import { toastStore, type Toast } from '$lib/stores/toastStore.svelte';

	let { darkMode = false }: { darkMode?: boolean } = $props();

	let toasts = $derived(toastStore.toasts);

	function variantClasses(variant: Toast['variant']) {
		const base = 'rounded-lg border shadow-lg px-4 py-3 text-sm font-medium';
		if (darkMode) {
			switch (variant) {
				case 'success':
					return `${base} bg-emerald-900/95 border-emerald-700 text-emerald-50`;
				case 'error':
					return `${base} bg-red-900/95 border-red-700 text-red-50`;
				default:
					return `${base} bg-slate-800 border-slate-600 text-slate-100`;
			}
		} else {
			switch (variant) {
				case 'success':
					return `${base} bg-emerald-50 border-emerald-200 text-emerald-800`;
				case 'error':
					return `${base} bg-red-50 border-red-200 text-red-800`;
				default:
					return `${base} bg-white border-slate-200 text-slate-900`;
			}
		}
	}

	function iconPath(variant: Toast['variant']): string {
		switch (variant) {
			case 'success':
				return 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'error':
				return 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z';
		}
	}
</script>

<div
	class="pointer-events-none fixed top-0 right-0 z-[100] flex min-w-[280px] max-w-[420px] flex-col gap-3 p-4"
	aria-live="polite"
	aria-label="Notifications"
>
	{#each toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-start gap-3 {variantClasses(toast.variant)}"
			role="status"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 shrink-0"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d={iconPath(toast.variant)} />
			</svg>
			<p class="flex-1 break-words pt-0.5">{toast.message}</p>
			<button
				type="button"
				onclick={() => toastStore.remove(toast.id)}
				class="shrink-0 rounded p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 {darkMode ? 'focus:ring-slate-500' : 'focus:ring-slate-400'}"
				aria-label="Dismiss"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/each}
</div>
