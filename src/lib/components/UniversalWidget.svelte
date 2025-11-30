<script lang="ts">
	import { mapStore } from '$lib/stores/MapStore';
	import { uiRegistry } from '$lib/stores/ComponentRegistry';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		topic: string;
	}

	let { topic }: Props = $props();

	// Initialize data stream only on client
	let currentData = $state<unknown>(undefined);
	let unsubscribe: (() => void) | null = null;

	// 2. Resolve Metadata (We need to know the Schema ID associated with this topic)
	let meta = $derived.by(() => {
		if (!browser || !mapStore) return null;
		try {
			return mapStore.getMetadata(topic);
		} catch {
			return null;
		}
	});

	// 3. Resolve the Component
	let entry = $derived(uiRegistry.resolve(meta?.schemaId, topic));
	let RenderComponent = $derived(entry.component);

	// Dark mode support
	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Initialize on mount (client-side only)
	onMount(() => {
		if (browser && mapStore) {
			const stream = mapStore.getStream(topic);
			unsubscribe = stream.subscribe((val: unknown) => {
				currentData = val;
			});
		}
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});
</script>

<div class="widget-container h-full w-full overflow-hidden flex flex-col {darkMode ? 'bg-slate-900' : 'bg-white'}">
	{#if currentData !== undefined && currentData !== null}
		<!-- Pass data AND schemaId so AutoView can look up definitions -->
		<div class="h-full overflow-auto">
			<RenderComponent
				data={currentData}
				{topic}
				schemaId={meta?.schemaId}
				{darkMode}
				{...entry.options}
			/>
		</div>
	{:else}
		<div class="h-full flex items-center justify-center">
			<div class="text-center">
				<div class="animate-pulse mb-2">
					<div class="w-16 h-16 mx-auto rounded-full {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				</div>
				<div class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					Waiting for data...
				</div>
				<div class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'} mt-1">
					Topic: {topic}
				</div>
			</div>
		</div>
	{/if}
</div>

