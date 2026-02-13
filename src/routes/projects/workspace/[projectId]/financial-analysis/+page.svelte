<script lang="ts">
	import { page } from '$app/stores';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import FinancialSpreadsheet from '$lib/components/financial-analysis/FinancialSpreadsheet.svelte';

	let { data } = $props();

	const projectId = $derived($page.params.projectId ?? '');
	const darkMode = $derived(darkModeStore.darkMode);
</script>

<div class="w-full min-h-0 flex flex-col">
	<div class="w-full px-4 py-6">
		<FinancialSpreadsheet {darkMode} />
	</div>
</div>
