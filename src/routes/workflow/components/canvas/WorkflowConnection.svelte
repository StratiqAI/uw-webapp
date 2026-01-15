<script lang="ts">
	import type { Connection, GridElement, ConnectionSide } from '../../types';
	import { getConnectionPointPos } from '../../services/connections/connectionService';

	const {
		connection,
		fromElement,
		toElement,
		darkMode = false,
		isDragging = false,
		onDelete
	}: {
		connection: Connection;
		fromElement: GridElement;
		toElement: GridElement;
		darkMode?: boolean;
		isDragging?: boolean;
		onDelete?: (connectionId: string) => void;
	} = $props();

	function handleDelete() {
		if (onDelete) {
			onDelete(connection.id);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Delete' && onDelete) {
			onDelete(connection.id);
		}
	}

	const fromPos = $derived(getConnectionPointPos(fromElement, connection.fromSide as ConnectionSide));
	const toPos = $derived(getConnectionPointPos(toElement, connection.toSide as ConnectionSide));
</script>

<g>
	<path
		d="M {fromPos.x} {fromPos.y} C {fromPos.x + 100} {fromPos.y}, {toPos.x - 100} {toPos.y}, {toPos.x} {toPos.y}"
		stroke={darkMode ? '#cbd5e1' : '#475569'}
		stroke-width="2.5"
		fill="none"
		marker-end="url(#arrowhead)"
		class="pointer-events-auto cursor-pointer hover:stroke-red-500 {isDragging ? '' : 'transition-colors'}"
		style={isDragging ? 'transition: none;' : ''}
		onclick={handleDelete}
		onkeydown={handleKeydown}
		role="button"
		tabindex="0"
		aria-label="Delete connection"
	/>
</g>
