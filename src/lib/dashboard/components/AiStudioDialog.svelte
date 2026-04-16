<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import PromptStudioWorkspace from '../../../routes/(app)/p/[projectId]/prompts/components/PromptStudioWorkspace.svelte';

	interface Props {
		open?: boolean;
		data: { idToken: string; projects: Project[]; currentUser?: unknown };
		onClose?: () => void;
	}

	let { open = $bindable(false), data, onClose }: Props = $props();

	const darkMode = $derived(themeStore.darkMode);

	function close() {
		open = false;
		onClose?.();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-2 sm:p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="ai-studio-dialog-title"
			class="flex max-h-[min(92dvh,960px)] min-h-0 w-full max-w-[min(100%,1400px)] flex-col overflow-hidden rounded-xl border shadow-2xl {darkMode
				? 'border-slate-700 bg-slate-900'
				: 'border-slate-200 bg-slate-50'}"
		>
			<div
				class="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4 {darkMode
					? 'border-slate-700 bg-slate-900'
					: 'border-slate-200 bg-white'}"
			>
				<h2 id="ai-studio-dialog-title" class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Build widget — AI Studio
				</h2>
				<button
					type="button"
					onclick={close}
					class="rounded-lg p-1.5 text-sm transition-colors {darkMode
						? 'text-slate-400 hover:bg-slate-800 hover:text-white'
						: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}"
					aria-label="Close AI Studio"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				<PromptStudioWorkspace
					{data}
					embedded
					addToDashboardButtonLabel="Send to Dashboard"
					onSendToDashboardSuccess={close}
				/>
			</div>
		</div>
	</div>
{/if}
