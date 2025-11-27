<script>
	import Map from './Map.svelte';
	import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';

	// IMPORTANT: Replace this with your actual Geoapify API key
	const myApiKey = PUBLIC_GEOAPIFY_API_KEY;
</script>

<div class="bg-slate-100 min-h-screen text-slate-800">
	<main class="max-w-5xl mx-auto p-4 sm:p-8">
		<h1 class="text-4xl sm:text-5xl font-bold text-center text-blue-700 mb-2">Svelte 5 Map</h1>
		<p class="text-center text-slate-500 mb-8">A map component built with Runes and TailwindCSS</p>

		<!-- 
      The Map component will fill its parent. 
      So, we must give its parent a specific size using Tailwind classes.
      We also add some decorative classes for a better look.
    -->
		<div class="h-[60vh] w-full rounded-xl shadow-2xl overflow-hidden border-2 border-slate-200">
			<!-- 
        Pass the API key to the component as a prop.
        You can also override the default lat, lon, and zoom.
      -->
			<Map apiKey={myApiKey} lat={34.0522} lon={-118.2437} zoom={11} />
		</div>

		<div class="text-center mt-12">
			<p class="text-lg">This is content below the map container.</p>
			<p class="text-slate-600">The component is fully encapsulated and reusable.</p>
		</div>
	</main>
</div>