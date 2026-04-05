<script lang="ts">
	interface Props {
		data: unknown;
		topic?: string;
	}

	let { data, topic }: Props = $props();
</script>

<div class="json-fallback p-4 h-full overflow-auto">
	<div class="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
		{#if topic}
			Topic: {topic}
		{:else}
			Raw Data
		{/if}
	</div>
	<pre class="text-xs font-mono bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>
</div>

