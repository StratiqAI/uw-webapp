<script lang="ts">
	let { property } = $props();
	const menuItems = $derived([
		{ label: 'Document Review', active: false, href: `/properties/${property.id}/document` },
		{ label: 'Summary', active: true, href: `/properties/${property.id}/summary` },
		{ label: 'Investment Analysis', active: false, href: `/properties/${property.id}/analysis` },
		{ label: 'Market overview', active: false, href: `/properties/${property.id}/market` },
		{ label: 'Sales comps', active: false, href: `/properties/${property.id}/salescomps` },
		{ label: 'Rent comps', active: false, href: `/properties/${property.id}/rentcomps` }
	]);
</script>

<aside class="flex min-w-50 flex-col border-r border-l border-gray-200 bg-white">
	<div class="flex-1 p-4">
		<!-- Placeholder thumbnail -->
		<div class="mb-4 px-2 flex items-center justify-center rounded bg-gray-100">
			<img
				src={property.image}
				alt="Property thumbnail"
				class="max-h-50 max-w-50 rounded object-contain"
			/>
		</div>

		<h2 class="font-semibold">{property.name}</h2>
		<!-- <div class="mt-2 flex flex-wrap gap-2">
			{#each property.statusTags as tag}
				<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{tag}</span>
			{/each}
		</div> -->

		<nav class="mt-6 space-y-1 text-sm text-gray-600">
			{#each menuItems as item}
				<a
					class="block rounded px-2 py-1 hover:bg-gray-100 {item.active ? 'bg-gray-100' : ''}"
					href={item.href}>{item.label}</a
				>
			{/each}
		</nav>
	</div>
</aside>
