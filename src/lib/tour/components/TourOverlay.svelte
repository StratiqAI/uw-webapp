<script lang="ts">
	import type { SpotlightRect } from '../types';
	import { fade } from 'svelte/transition';

	interface Props {
		spotlight: SpotlightRect | null;
		onclick?: () => void;
	}

	let { spotlight, onclick }: Props = $props();

	let prefersReduced = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		prefersReduced = mq.matches;
		const handler = (e: MediaQueryListEvent) => (prefersReduced = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

<div
	class="fixed inset-0 z-100000"
	transition:fade={{ duration: prefersReduced ? 0 : 200 }}
	role="presentation"
>
	<svg
		class="absolute inset-0 h-full w-full"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<defs>
			<mask id="tour-spotlight-mask">
				<rect x="0" y="0" width="100%" height="100%" fill="white" />
				{#if spotlight}
					<rect
						x={spotlight.x}
						y={spotlight.y}
						width={spotlight.width}
						height={spotlight.height}
						rx={spotlight.radius}
						ry={spotlight.radius}
						fill="black"
						class={prefersReduced ? '' : 'tour-spotlight-rect'}
					/>
				{/if}
			</mask>
		</defs>
		<rect
			x="0"
			y="0"
			width="100%"
			height="100%"
			fill="rgba(0,0,0,0.6)"
			mask="url(#tour-spotlight-mask)"
		/>
	</svg>

	<!-- Clickable backdrop (outside spotlight) -->
	<button
		type="button"
		class="absolute inset-0 z-1 cursor-default"
		aria-label="Close tour"
		onclick={onclick}
	></button>

	<!-- Transparent click-blocker over the spotlight area to prevent accidental interaction -->
	{#if spotlight}
		<div
			class="pointer-events-auto absolute z-2"
			style="
				left: {spotlight.x}px;
				top: {spotlight.y}px;
				width: {spotlight.width}px;
				height: {spotlight.height}px;
				border-radius: {spotlight.radius}px;
			"
		></div>
	{/if}
</div>

<style>
	.tour-spotlight-rect {
		transition:
			x 0.35s cubic-bezier(0.4, 0, 0.2, 1),
			y 0.35s cubic-bezier(0.4, 0, 0.2, 1),
			width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
			height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
