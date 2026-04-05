<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		isFlipped: boolean;
		shellClass: string;
		flipBackClass: string;
		front: Snippet;
		back: Snippet;
	}

	let { isFlipped, shellClass, flipBackClass, front, back }: Props = $props();
</script>

<div class="flip-container h-full min-h-0" class:flipped={isFlipped}>
	<div class="flip-card h-full min-h-0">
		<div
			class="flip-card-front absolute h-full min-h-0 w-full overflow-auto rounded-lg border {shellClass} shadow-sm flex flex-col"
		>
			{@render front()}
		</div>
		<div
			class="flip-card-back absolute h-full min-h-0 w-full overflow-auto rounded-lg border {flipBackClass} shadow-sm"
		>
			{@render back()}
		</div>
	</div>
</div>

<style>
	.flip-container {
		perspective: 1200px;
		position: relative;
	}
	.flip-card {
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.flip-container.flipped .flip-card {
		transform: rotateY(180deg);
	}
	.flip-card-front,
	.flip-card-back {
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
	.flip-card-back {
		transform: rotateY(180deg);
	}
</style>
