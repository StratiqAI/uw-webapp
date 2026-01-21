<script lang="ts">
	import NewPropertyStep from '$lib/components/properties/NewPropertyStep.svelte';
	// import Button from '$lib/ui/Button.svelte';

	import Step1AddSource from '$lib/components/Upload/Step1AddSource.svelte';
	import Step2EnrichData from '$lib/components/Upload/Step2EnrichData.svelte';
	import { fade } from 'svelte/transition';

	interface Step {
		number: number;
		title: string;
		active: boolean;
		description: string;
	}

	let steps: Step[] = $state([
		{
			number: 1,
			title: 'Add Sources',
			active: true,
			description: 'Upload PDF files and other data sources'
		},
		{
			number: 2,
			title: 'Enrich with Industry Data',
			active: false,
			description: 'ESRI and other industry data sources'
		},
		{
			number: 3,
			title: 'StratiqAI Analysis',
			active: false,
			description: 'Next Generation AI Powered Analysis'
		},
		{
			number: 4,
			title: 'Build Reports',
			active: false,
			description: 'Generate Underwriting, Go/No Go, and Broker Reports'
		}
	]);
</script>


<div class="grid grid-cols-3 gap-6">
	<!-- Column 1 -->
	<div class="col-span-1">
		<!-- <header class="flex items-center justify-between mb-4">
			<h1 class="font-poppins text-2xl font-semibold">New Property Analysis</h1>			
		</header> -->
		<Step1AddSource />
		<!-- <NewPropertyStep bind:steps />

		{#if steps[0].active}
			<div in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
				<Step1AddSource />
			</div>
		{:else if steps[1].active}
			<div in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
				<Step2EnrichData />
			</div>
		{/if} -->
	</div>

	<!-- Columns 2 & 3 (Filler) -->
	<div class="col-span-2">
	<!-- Blog Section -->
	<section class="bg-white rounded-xl shadow p-6 mb-6">
		<h2 class="text-xl font-semibold mb-4">StratiqAI Blog</h2>
		<article class="mb-6">
			<h3 class="text-lg font-bold mb-2">Welcome to the StratiqAI Blog!</h3>
			<p class="text-gray-700 mb-2">
				Stay up to date with the latest news, product updates, and industry insights from the StratiqAI team.
			</p>
			<a href="/blog/welcome" class="text-blue-600 hover:underline text-sm">Read more →</a>
		</article>
		<article class="mb-6">
			<h3 class="text-lg font-bold mb-2">How AI is Transforming Property Analysis</h3>
			<p class="text-gray-700 mb-2">
				Discover how artificial intelligence is streamlining underwriting and property evaluation for real estate professionals.
			</p>
			<a href="/blog/ai-property-analysis" class="text-blue-600 hover:underline text-sm">Read more →</a>
		</article>
		<article>
			<h3 class="text-lg font-bold mb-2">Tips for Uploading Your First Property</h3>
			<p class="text-gray-700 mb-2">
				Get started quickly with our step-by-step guide to uploading and analyzing your first property in StratiqAI.
			</p>
			<a href="/blog/first-property-tips" class="text-blue-600 hover:underline text-sm">Read more →</a>
		</article>
	</section>

	</div>
</div>
