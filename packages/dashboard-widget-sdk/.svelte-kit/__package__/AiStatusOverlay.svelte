<script lang="ts">
	interface Props {
		generating: boolean;
		error?: string;
		darkMode?: boolean;
		message?: string;
	}

	let { generating, error, darkMode = false, message = 'Generating content' }: Props = $props();
</script>

{#if generating}
	<div class="flex items-center gap-3 py-6" role="status" aria-live="polite">
		<svg
			class="h-5 w-5 shrink-0 animate-spin {darkMode ? 'text-indigo-400' : 'text-indigo-600'}"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			/>
		</svg>
		<span class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-600'}">
			{message}&hellip;
		</span>
	</div>
{:else if error}
	<div
		class="rounded-md border px-3 py-2 text-sm {darkMode
			? 'border-red-500/30 bg-red-500/10 text-red-400'
			: 'border-red-200 bg-red-50 text-red-600'}"
	>
		{error}
	</div>
{/if}
