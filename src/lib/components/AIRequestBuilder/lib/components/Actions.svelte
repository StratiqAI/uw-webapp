<!-- src/lib/components/Actions.svelte -->
<script lang="ts">
	interface Props {
		isSubmitting?: boolean;
		onSubmit?: () => void;
	}

	let { isSubmitting = false, onSubmit }: Props = $props();
</script>

<div class="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-6">
	<button
		type="button"
		onclick={() => onSubmit?.()}
		disabled={isSubmitting}
		class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-[0.9375rem] font-medium text-white shadow-[0_4px_12px_rgba(102,126,234,0.3)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(102,126,234,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
	>
		{#if isSubmitting}
			<svg
				class="h-4 w-4 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			Submitting...
		{:else}
			Submit to API
		{/if}
	</button>
</div>