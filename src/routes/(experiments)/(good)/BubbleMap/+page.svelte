<!-- src/routes/+page.svelte -->
<script>
	import BubbleMap from './BubbleMap.svelte';
</script>

<svelte:head>
	<title>Svelte 5 Bubble Map</title>
</svelte:head>

<main>
	<h1>D3 Bubble Map in Svelte 5</h1>
	<p>
		A Svelte 5 + Runes implementation of the D3 example from
		<a href="https://observablehq.com/@d3/bubble-map/2" target="_blank" rel="noopener noreferrer">
			ObservableHQ
		</a>.
	</p>
	<div class="map-wrapper">
		<BubbleMap />
	</div>
</main>

<style>
	main {
		max-width: 960px;
		margin: 2rem auto;
		padding: 0 1rem;
		text-align: center;
	}
	.map-wrapper {
		border: 1px solid #eee;
		border-radius: 8px;
		margin-top: 2rem;
		padding: 1rem;
		box-shadow: 0 4px 12px rgba(0,0,0,0.05);
	}
</style>