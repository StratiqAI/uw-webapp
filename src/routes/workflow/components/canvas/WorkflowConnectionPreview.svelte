<script lang="ts">
	import type { ConnectionPoint, GridElement, ConnectionSide } from '../../types';
	import { getConnectionPointPos } from '../../services/connections/connectionService';

	const {
		connectingFrom,
		fromElement,
		mouseX,
		mouseY,
		darkMode = false
	}: {
		connectingFrom: ConnectionPoint;
		fromElement: GridElement;
		mouseX: number;
		mouseY: number;
		darkMode?: boolean;
	} = $props();

	const fromPos = $derived(getConnectionPointPos(fromElement, connectingFrom.side as ConnectionSide));
</script>

<line
	x1={fromPos.x}
	y1={fromPos.y}
	x2={mouseX}
	y2={mouseY}
	stroke={darkMode ? '#94a3b8' : '#475569'}
	stroke-width="2.5"
	stroke-dasharray="5,5"
	opacity="0.5"
/>
