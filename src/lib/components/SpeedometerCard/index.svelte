<script lang="ts">
	import Button from "$lib/components/ui/Button.svelte";

	export let title: string;
	export let value: number;
	export let description: string;
	export let buttonText: string;
	export let buttonLink: string;
	export let className: string = "";

	// Map 0-100 to -90° to 90° rotation around the bottom center (100,100)
	const rotation = (value / 100) * 180 - 90;
</script>

<div class="flex w-80 h-100 flex-col items-center rounded-lg bg-white p-6 border border-gray-400 shadow {className}">
	<h2 class="mb-4 text-lg font-medium">{title}</h2>

	<div class="relative h-24 w-48 ">
		<svg width="200" height="100" viewBox="0 0 200 100" class="block">
			<defs>
				<linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color="#F87171" />
					<stop offset="50%" stop-color="#FACC15" />
					<stop offset="100%" stop-color="#34D399" />
				</linearGradient>
			</defs>
			<!-- Gauge Arc -->
			<path
				d="M200,100 A100,100 0 0 0 0,100 L25,100 A75,75 0 0 1 175,100 Z"
				fill="url(#gaugeGradient)"
			/>
			<!-- Needle Group -->
			<g transform="rotate({rotation} 100 100)">
				<!-- Needle Triangle -->
				<polygon points="95,100 105,110 96,10" fill="#1F2937" />
				<!-- Pivot Circle -->
				<circle cx="100" cy="100" r="4" fill="#1F2937" />
			</g>
		</svg>
	</div>

	<p class="mt-4 text-4xl font-bold">{value}%</p>
	<p class="mb-4 mt-2 text-center text-sm text-gray-500">{description}</p>

    <Button href={buttonLink} className="mt-auto mb-0">{buttonText}</Button>
</div>
