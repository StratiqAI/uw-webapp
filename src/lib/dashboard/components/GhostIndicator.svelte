<script lang="ts">
	import type { Position, Size } from '$lib/dashboard/types/widget';

	interface Props {
		position: Position;
		size: Size;
		valid?: boolean;
	}

	let { position, size, valid = true }: Props = $props();

	const cells = $derived.by(() => {
		const out: Array<{ col: number; row: number; delay: number }> = [];
		const total = size.colSpan * size.rowSpan;
		for (let r = 0; r < size.rowSpan; r++) {
			for (let c = 0; c < size.colSpan; c++) {
				const idx = r * size.colSpan + c;
				out.push({
					col: position.gridColumn + c,
					row: position.gridRow + r,
					delay: (idx / total) * 120
				});
			}
		}
		return out;
	});
</script>

{#each cells as cell (`${cell.col}:${cell.row}`)}
	<div
		class="ghost-cell pointer-events-none rounded-lg"
		class:ghost-cell--valid={valid}
		class:ghost-cell--invalid={!valid}
		style="
			grid-column: {cell.col};
			grid-row: {cell.row};
			animation-delay: {cell.delay}ms;
		"
	></div>
{/each}

<style>
	@keyframes ghostFadeIn {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.ghost-cell {
		z-index: 5;
		animation: ghostFadeIn 0.18s ease-out both;
	}

	.ghost-cell--valid {
		background: rgba(59, 130, 246, 0.18);
		border: 2px solid rgba(59, 130, 246, 0.45);
		box-shadow: inset 0 0 12px rgba(59, 130, 246, 0.08);
	}

	.ghost-cell--invalid {
		background: rgba(239, 68, 68, 0.14);
		border: 2px solid rgba(239, 68, 68, 0.40);
		box-shadow: inset 0 0 12px rgba(239, 68, 68, 0.06);
	}
</style>
