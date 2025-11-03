<!-- +page.svelte -->
<script>
	import UploadArea from '$lib/components/Upload/UploadArea.svelte';
	import SourceCards from '$lib/components/workspace/SourceCards.svelte';
	import { project as projectStore } from '$lib/stores/project.svelte';
	console.log('In file get-started/+page.svelte');
	let { data } = $props();
	let idToken = data.idToken;
	// Use reactive project store instead of static data
	let project = $derived($projectStore);
	let isNewProject = $derived(data.isNewProject);
</script>

<section class="shadow">
	<h2 class="text-xl font-semibold">Welcome to Your StratiqAI Workspace for  {project?.name || (isNewProject ? 'New Project' : '')}</h2>
	<article class="my-4">	<p class="mb-2">
			Get started by uploading your first property or document.
		</p>
		<a href="/blog/uploading-your-first-property" class="text-sm hover:underline">Read more →</a>
	</article>

</section>

<div class="width-full">
	<section
		class="space-y-6 rounded-2xl bg-gradient-to-br from-zinc-50 via-red-50 to-indigo-50 p-2 shadow-md dark:bg-gray-800 dark:bg-none"
	>
		{#if $projectStore || isNewProject}
			<UploadArea {idToken} />
		{/if}
		<!-- <SourceCards columns={3} /> -->
	</section>
</div>

