<script lang="ts">
	import OpenAIResponsesBuilder from '$lib/components/OpenAIResponsesBuilder.svelte';
	import type { PageData } from './$types';
	import ParagraphDisplayParent from '$lib/dashboard/examples/ParagraphDisplayParent.svelte';

	let { data }: { data: PageData } = $props();
	let { idToken } = data;

	let generatedConfig = $state<any>(null);

	function handleGenerate(config: any) {
		generatedConfig = config;
		console.log('Generated Configuration:', generatedConfig);

		// You can now use this configuration to call the OpenAI API
		// Example: await fetch('/api/openai-responses', { method: 'POST', body: JSON.stringify(generatedConfig) })
	}
</script>

<div class="page-container">
	<OpenAIResponsesBuilder onGenerate={handleGenerate} />

	{#if generatedConfig}
		<ParagraphDisplayParent
			idToken={data.idToken}
			jobConfig={generatedConfig}
			widgetId="api-builder-paragraph"
		/>
	{/if}
</div>

<style>
	.page-container {
		min-height: 100vh;
		background: #f9fafb;
	}
</style>
