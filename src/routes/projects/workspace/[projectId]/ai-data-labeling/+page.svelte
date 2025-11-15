<!-- +page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { project as projectStore } from '$lib/stores/appStateStore';
	
	let { data }: { data: PageData } = $props();
	// Use reactive project store instead of static data
	let projectData = $derived($projectStore);
</script>

{#if projectData}
	<pre>{JSON.stringify(projectData, null, 2)}</pre>
{:else}
	<p>Loading project data...</p>
{/if}
