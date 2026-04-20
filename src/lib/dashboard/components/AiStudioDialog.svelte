<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import PromptStudioWorkspace from '../../../routes/(app)/p/[projectId]/prompts/components/PromptStudioWorkspace.svelte';
    # update
	interface Props {
		open?: boolean;
		data: { idToken: string; projects: Project[]; currentUser?: unknown };
		onClose?: () => void;
	}

	let { open = $bindable(false), data, onClose }: Props = $props();

	const darkMode = $derived(themeStore.darkMode);
	let maximized = $state(false);

	function close() {
		maximized = false;
		open = false;
		onClose?.();
	}

	function toggleMaximize() {
		maximized = !maximized;
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	$effect(() => {
		if (!open) maximized = false;
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-100 flex bg-black/60 {maximized
			? 'p-0'
			: 'items-center justify-center p-1 sm:p-2'}"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="ai-studio-dialog-title"
			class="flex min-h-0 flex-col overflow-hidden border shadow-2xl {darkMode
				? 'border-slate-700 bg-slate-900'
				: 'border-slate-200 bg-slate-50'} {maximized
				? 'h-full max-h-dvh w-full flex-1 rounded-none'
				: 'h-[min(96dvh,1100px)] w-full max-w-[min(100%,1920px)] rounded-xl'}"
		>
			<div
				class="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4 {darkMode
					? 'border-slate-700 bg-slate-900'
					: 'border-slate-200 bg-white'}"
			>
				<h2 id="ai-studio-dialog-title" class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Build widget — AI Studio
				</h2>
				<div class="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onclick={toggleMaximize}
						aria-pressed={maximized}
						aria-label={maximized ? 'Restore dialog size' : 'Maximize to full screen'}
						class="rounded-lg p-1.5 text-sm transition-colors {darkMode
							? 'text-slate-400 hover:bg-slate-800 hover:text-white'
							: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}"
					>
						{#if maximized}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
								/>
							</svg>
						{:else}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
								/>
							</svg>
						{/if}
					</button>
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
