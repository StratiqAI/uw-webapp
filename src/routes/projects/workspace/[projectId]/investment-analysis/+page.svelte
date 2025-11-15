<!-- +page.svelte -->
<script>
	import { project as projectStore } from '$lib/stores/appStateStore.js';
	import STNLInputs from '$lib/components/properties/SNTL/STNLInputs.svelte';
	let { data } = $props();
	// Use reactive project store instead of static data
	let project = $derived($projectStore);
</script>

<STNLInputs />
