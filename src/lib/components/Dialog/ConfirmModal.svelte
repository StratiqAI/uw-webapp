<script lang="ts">
	/**
	 * In-app confirmation dialog (replaces window.confirm). Matches dashboard modal styling.
	 */
	interface Props {
		open?: boolean;
		title: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		/** When false, primary button uses indigo (non-destructive confirmations). */
		danger?: boolean;
		darkMode?: boolean;
		/** Above widget fullscreen overlay (100050). */
		zIndexClass?: string;
		onConfirm?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		message = '',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		danger = true,
		darkMode = false,
		zIndexClass = 'z-[100060]',
		onConfirm
	}: Props = $props();

	function handleConfirm() {
		onConfirm?.();
		open = false;
	}

	function handleCancel() {
		open = false;
	}

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') handleCancel();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

{#if open}
	<div
		class="fixed inset-0 {zIndexClass} flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-modal-title"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-black/50"
			aria-label="Dismiss dialog"
			onclick={handleCancel}
		></button>
		<div
			class="relative z-10 w-full max-w-sm rounded-xl border p-6 shadow-2xl {darkMode
				? 'border-slate-700 bg-slate-800'
				: 'border-slate-200 bg-white'}"
		>
			<h3
				id="confirm-modal-title"
				class="mb-2 text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}"
			>
				{title}
			</h3>
			{#if message}
				<p class="mb-5 text-sm whitespace-pre-wrap {darkMode ? 'text-slate-400' : 'text-slate-600'}">
					{message}
				</p>
			{/if}
			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={handleCancel}
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {darkMode
						? 'text-slate-300 hover:bg-slate-700 hover:text-white'
						: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}"
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					class="rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors {danger
						? 'bg-red-600 hover:bg-red-700'
						: 'bg-indigo-600 hover:bg-indigo-700'}"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
