<script lang="ts">
	// Simple UI state
	let address = $state('198 NE Combs Flat Rd, Prineville, OR 97754');
	let radiusValue = $state(1); // human units (mi/km)
	let units: 'mi' | 'km' | 'm' = $state('mi');
	let acsYear = $state(2023);
	let loading = $state(false);
	let error: string | null = $state(null);

	type PopulationJson = {
		population: {
			result: {
				input: {
					address: { address: string };
					benchmark: {
						isDefault: boolean;
						benchmarkDescription: string;
						id: string;
						benchmarkName: string;
					};
				};
				addressMatches: Array<{
					tigerLine: {
						side: string;
						tigerLineId: string;
					};
					coordinates: {
						x: number;
						y: number;
					};
					addressComponents: {
						zip: string;
						streetName: string;
						preType: string;
						city: string;
						preDirection: string;
						suffixDirection: string;
						fromAddress: string;
						state: string;
						suffixType: string;
						toAddress: string;
						suffixQualifier: string;
						preQualifier: string;
					};
					matchedAddress: string;
				}>;
			};
		};
	};

	let result: PopulationJson | null = $state(null);

	async function runQuery() {
		error = null;
		loading = true;

		try {
			const params = new URLSearchParams({
				address: address.trim(),
				radius: String(radiusValue),
				units,
				acsYear: String(acsYear)
			});
			console.log('Params: ', params.toString());

			const r = await fetch(`/api/population?${params.toString()}`);
			const response = await r.json();
			if (!r.ok) throw new Error(response?.error || `HTTP ${r.status}`);
			console.log('Result: ', JSON.stringify(response, null, 2));
			result = response;
			console.log('Result just set: ', JSON.stringify(result, null, 2));
		} catch (e: any) {
			error = e?.message ?? 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	function downloadJSON() {
		if (!result) return;
		const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `population_${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function fmt(n: number) {
		return new Intl.NumberFormat().format(n);
	}

	function m2ToMi2(m2: number) {
		return m2 / 2_589_988.110336; // square meters -> square miles
	}
	function m2ToKm2(m2: number) {
		return m2 / 1_000_000;
	}
</script>

<!-- Container -->
<div class="mx-auto max-w-5xl space-y-6 p-6">
	<h1 class="text-3xl font-bold tracking-tight">Population within a Radius</h1>
	<p class="text-muted-foreground text-sm">
		Area-weighted estimate from ACS 5-year (B01003). Enter an address and radius, then hit
		“Calculate.”
	</p>

	<!-- Card: Form -->
	<section class="rounded-2xl border bg-white p-5 shadow-sm">
		<div class="grid gap-4 md:grid-cols-4">
			<div class="md:col-span-2">
				<label for="address" class="mb-1 block text-sm font-medium">Address</label>
				<input
					id="address"
					bind:value={address}
					placeholder="123 Main St, City, ST ZIP"
					class="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
				/>
			</div>

			<div>
				<label for="radius" class="mb-1 block text-sm font-medium">Radius</label>
				<div class="flex gap-2">
					<input
						id="radius"
						type="number"
						min="0"
						step="0.1"
						bind:value={radiusValue}
						class="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
					/>
					<select id="units" bind:value={units} class="rounded-xl border px-2 py-2">
						<option value="mi">mi</option>
						<option value="km">km</option>
						<option value="m">m</option>
					</select>
				</div>
			</div>

			<div>
				<label for="acsYear" class="mb-1 block text-sm font-medium">ACS Year</label>
				<input
					id="acsYear"
					type="number"
					bind:value={acsYear}
					min="2013"
					max="2023"
					step="1"
					class="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
				/>
			</div>
		</div>

		<div class="mt-4 flex items-center gap-3">
			<button
				class="rounded-2xl bg-black px-4 py-2 text-white disabled:opacity-60"
				onclick={runQuery}
				disabled={loading}
			>
				{#if loading}Calculating…{/if}
				{#if !loading}Calculate{/if}
			</button>

			{#if result}
				<button class="rounded-2xl border px-4 py-2" onclick={downloadJSON}> Download JSON </button>
			{/if}
		</div>

		{#if error}
			<div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
				{error}
			</div>
		{/if}
	</section>

	<!-- Card: Result -->

	{#if result}
		<section class="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
			<div class="flex flex-col gap-1">
				<div class="text-muted-foreground text-sm">Address</div>
				<div class="font-medium">{result.population.result.input.address.address}</div>
			</div>

			<!-- <div class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-xl border p-4">
					<div class="text-muted-foreground text-sm">Estimated Population</div>
					<div class="text-3xl font-semibold">{fmt(result.population)}</div>
				</div>

				<div class="rounded-xl border p-4">
					<div class="text-muted-foreground text-sm">Radius</div>
					<div class="text-xl font-medium">
						{radiusValue}
						{units}
					</div>
				</div>

				<div class="rounded-xl border p-4">
					<div class="text-muted-foreground text-sm">Center (lat, lon)</div>
					<div class="font-mono text-xl">
						{result.center.lat.toFixed(6)}, {result.center.lon.toFixed(6)}
					</div>
				</div>
			</div> -->

			<!-- {#if result.details.length}
				<div class="mt-2">
					<h2 class="mb-2 text-lg font-semibold">Block Group Contributions</h2>
					<div class="overflow-x-auto rounded-xl border">
						<table class="min-w-full text-sm">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-3 py-2 text-left font-medium">GEOID (BG)</th>
									<th class="px-3 py-2 text-right font-medium">BG Pop</th>
									<th class="px-3 py-2 text-right font-medium">Frac in Circle</th>
									<th class="px-3 py-2 text-right font-medium">Weighted</th>
									<th class="px-3 py-2 text-right font-medium">BG Area</th>
									<th class="px-3 py-2 text-right font-medium">Area in Circle</th>
								</tr>
							</thead>
							<tbody>
								{#each result.details.sort((a, b) => b.weighted_contribution - a.weighted_contribution) as d}
									<tr class="border-t">
										<td class="px-3 py-2 font-mono">{d.geoid}</td>
										<td class="px-3 py-2 text-right">{fmt(d.population)}</td>
										<td class="px-3 py-2 text-right">{d.fraction_in_circle.toFixed(4)}</td>
										<td class="px-3 py-2 text-right font-medium">{fmt(d.weighted_contribution)}</td>
										<td class="px-3 py-2 text-right">
											{units === 'mi'
												? m2ToMi2(d.area_m2).toFixed(3) + ' mi²'
												: units === 'km'
													? m2ToKm2(d.area_m2).toFixed(3) + ' km²'
													: fmt(d.area_m2) + ' m²'}
										</td>
										<td class="px-3 py-2 text-right">
											{units === 'mi'
												? m2ToMi2(d.area_in_circle_m2).toFixed(3) + ' mi²'
												: units === 'km'
													? m2ToKm2(d.area_in_circle_m2).toFixed(3) + ' km²'
													: fmt(d.area_in_circle_m2) + ' m²'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if} -->

			<!-- <div class="grid gap-4 md:grid-cols-2">
				<div class="rounded-xl border p-4">
					<div class="text-muted-foreground mb-1 text-sm">Methodology</div>
					<p class="text-sm leading-6">{result.methodology}</p>
				</div>
				<div class="rounded-xl border p-4">
					<div class="text-muted-foreground mb-1 text-sm">Caveats</div>
					<ul class="list-disc pl-5 text-sm leading-6">
						{#each result.caveats as c}
							<li>{c}</li>
						{/each}
					</ul>
				</div>
			</div> -->

			<!-- <div class="rounded-xl border p-4">
				<div class="text-muted-foreground mb-1 text-sm">Sources</div>
				<ul class="list-disc pl-5 text-sm leading-6">
					{#each result.sources as s}
						<li>{s}</li>
					{/each}
				</ul>
			</div> -->
		</section>
		<pre>The result is: {JSON.stringify(result, null, 2)}</pre>
	{/if}
</div>

<style>
	/* Optional: light “muted-foreground” fallback if you don’t use shadcn/ui */
	:global(.text-muted-foreground) {
		color: rgb(113 113 122);
	}
</style>
