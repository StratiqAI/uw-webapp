<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		darkMode = false,
		labelledBy,
		maxWidthClass = 'max-w-4xl',
		maxHeightClass = 'max-h-[85vh]',
		containerClass = '',
		onClose,
		children
	}: {
		darkMode?: boolean;
		labelledBy: string;
		maxWidthClass?: string;
		maxHeightClass?: string;
		containerClass?: string;
		onClose?: () => void;
		children?: Snippet;
	} = $props();

	function handleOverlayKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose?.();
		}
	}
</script>

<div
	class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
	onclick={onClose}
	onkeydown={handleOverlayKeydown}
	role="dialog"
	aria-modal="true"
	aria-labelledby={labelledBy}
	tabindex="-1"
>
	<div
		class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full {maxWidthClass} {maxHeightClass} {containerClass} m-4 border"
		onclick={(event) => event.stopPropagation()}
		onkeydown={(event) => event.stopPropagation()}
		role="presentation"
	>
		{@render children?.()}
	</div>
</div>
