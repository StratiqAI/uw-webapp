<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { streamCatalog } from '$lib/stores/streamCatalog.svelte';
	import { schemaToFields, findMatchingTopics, formatJson, type FieldDescriptor } from './utils';

	interface Props {
		darkMode: boolean;
		onSelectTopic?: (topic: string) => void;
	}

	let { darkMode, onSelectTopic }: Props = $props();

	let filter = $state('');
	let expandedPatterns = $state<Set<string>>(new Set());
	let highlightedPattern = $state<string | null>(null);

	let patternSchemas = $derived.by(() => {
		void validatedTopicStore.schemaVersion;
		return validatedTopicStore.getRegisteredSchemas();
	});

	let allDefs = $derived.by(() => {
		void validatedTopicStore.schemaVersion;
		return validatedTopicStore.getAllSchemaDefinitions();
	});

	let catalogOnly = $derived(allDefs.filter((d) => !d.topicPattern));

	let filteredPatternSchemas = $derived(
		filter
			? patternSchemas.filter((s) => s.pattern.toLowerCase().includes(filter.toLowerCase()))
			: patternSchemas
	);

	let filteredCatalog = $derived(
		filter
			? catalogOnly.filter((d) => d.id.toLowerCase().includes(filter.toLowerCase()) || d.name.toLowerCase().includes(filter.toLowerCase()))
			: catalogOnly
	);

	function togglePattern(pattern: string) {
		const next = new Set(expandedPatterns);
		if (next.has(pattern)) next.delete(pattern);
		else next.add(pattern);
		expandedPatterns = next;
	}

	let matchingTopics = $derived.by(() => {
		if (!highlightedPattern) return [];
		void validatedTopicStore.tree;
		return findMatchingTopics(validatedTopicStore.tree, highlightedPattern);
	});
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Search -->
	<div class="border-b p-2 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<input
			type="text"
			placeholder="Filter schemas..."
			class="w-full rounded border px-2.5 py-1.5 text-xs
				{darkMode ? 'border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}
				focus:outline-none focus:ring-1 focus:ring-indigo-500"
			bind:value={filter}
		/>
	</div>

	{#snippet fieldRow(field: FieldDescriptor, depth: number)}
		<div class="flex items-center gap-1.5 py-0.5" style="padding-left: {depth * 14}px">
			<span class="font-mono text-xs {darkMode ? 'text-slate-300' : 'text-slate-700'}">{field.name}</span>
			<span class="rounded px-1 py-0 text-xs font-mono
				{field.type === 'string' ? (darkMode ? 'text-green-400' : 'text-green-600') :
				 field.type === 'number' || field.type === 'integer' ? (darkMode ? 'text-blue-400' : 'text-blue-600') :
				 field.type === 'boolean' ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
				 field.type === 'enum' ? (darkMode ? 'text-purple-400' : 'text-purple-600') :
				 (darkMode ? 'text-slate-400' : 'text-slate-500')}">{field.type}{field.nullable ? '?' : ''}</span>
			{#if field.required}
				<span class="text-red-400 text-xs">*</span>
			{/if}
		</div>
		{#if field.children}
			{#each field.children as child}
				{@render fieldRow(child, depth + 1)}
			{/each}
		{/if}
	{/snippet}

	<div class="flex-1 overflow-y-auto p-2 space-y-1">
		<!-- Topic-bound schemas -->
		{#each filteredPatternSchemas as { pattern, schema, id } (pattern)}
			{@const fields = schemaToFields(schema as Record<string, unknown>)}
			{@const isExpanded = expandedPatterns.has(pattern)}
			{@const isHighlighted = highlightedPattern === pattern}
			{@const streamCount = id ? streamCatalog.getStreamsBySchemaId(id).length : 0}
			<div class="rounded border {isHighlighted ? (darkMode ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-indigo-300 bg-indigo-50/50') : (darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white')}">
				<button
					type="button"
					class="flex w-full items-center gap-2 px-2.5 py-2 text-left"
					onclick={() => togglePattern(pattern)}
				>
					<svg class="h-3 w-3 shrink-0 transition-transform {isExpanded ? 'rotate-90' : ''} {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
					</svg>
					<code class="min-w-0 flex-1 truncate text-xs font-medium {darkMode ? 'text-amber-400' : 'text-amber-700'}">{pattern}</code>
					{#if streamCount > 0}
						<span class="text-xs rounded-full px-1.5 py-0.5 {darkMode ? 'bg-teal-900/40 text-teal-400' : 'bg-teal-50 text-teal-700'}" title="{streamCount} stream{streamCount !== 1 ? 's' : ''} use this schema">
							{streamCount}▸
						</span>
					{/if}
					{#if fields.length > 0}
						<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">{fields.length}p</span>
					{/if}
				</button>

				{#if isExpanded}
					<div class="border-t px-2.5 pb-2 {darkMode ? 'border-slate-700' : 'border-slate-100'}">
						{#if fields.length > 0}
							<div class="mt-2 space-y-0.5">
								{#each fields as field}
									{@render fieldRow(field, 0)}
								{/each}
							</div>
						{/if}

						<div class="mt-2 border-t pt-2 {darkMode ? 'border-slate-700' : 'border-slate-100'}">
							<button
								type="button"
								class="text-xs font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} transition-colors"
								onclick={() => highlightedPattern = highlightedPattern === pattern ? null : pattern}
							>
								{isHighlighted ? 'Hide' : 'Show'} matching topics
							</button>
							{#if isHighlighted && matchingTopics.length > 0}
								<ul class="mt-1 space-y-0.5">
									{#each matchingTopics as t}
										<li>
											<button
												type="button"
												class="w-full text-left rounded px-2 py-0.5 font-mono text-xs transition-colors
													{darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}"
												onclick={() => onSelectTopic?.(t)}
											>{t}</button>
										</li>
									{/each}
								</ul>
							{:else if isHighlighted}
								<p class="mt-1 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">No topics match this pattern</p>
							{/if}
						</div>

						<details class="mt-2">
							<summary class="cursor-pointer text-xs {darkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}">Raw JSON Schema</summary>
							<pre class="mt-1 rounded p-2 text-xs overflow-x-auto {darkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600'}">{formatJson(schema)}</pre>
						</details>
					</div>
				{/if}
			</div>
		{:else}
			<p class="px-3 py-4 text-center text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
				{filter ? 'No topic-bound schemas match filter' : 'No topic-bound schemas registered'}
			</p>
		{/each}

		<!-- Catalog-only schemas -->
		{#if filteredCatalog.length > 0}
			<div class="mt-3 border-t pt-2 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<p class="px-2 pb-1 text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-500' : 'text-slate-400'}">Catalog-only</p>
				{#each filteredCatalog as def (def.id)}
					{@const fields = schemaToFields(def.jsonSchema as Record<string, unknown>)}
					{@const isExpanded = expandedPatterns.has(def.id)}
					{@const defStreamCount = streamCatalog.getStreamsBySchemaId(def.id).length}
					<div class="rounded border {darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'}">
						<button
							type="button"
							class="flex w-full items-center gap-2 px-2.5 py-2 text-left"
							onclick={() => togglePattern(def.id)}
						>
							<svg class="h-3 w-3 shrink-0 transition-transform {isExpanded ? 'rotate-90' : ''} {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
							</svg>
							<span class="min-w-0 flex-1 truncate text-xs">
								<code class="font-medium {darkMode ? 'text-teal-400' : 'text-teal-700'}">{def.id}</code>
								<span class="{darkMode ? 'text-slate-500' : 'text-slate-400'}"> — {def.name}</span>
							</span>
							{#if defStreamCount > 0}
								<span class="text-xs rounded-full px-1.5 py-0.5 {darkMode ? 'bg-teal-900/40 text-teal-400' : 'bg-teal-50 text-teal-700'}" title="{defStreamCount} stream{defStreamCount !== 1 ? 's' : ''} use this schema">
									{defStreamCount}▸
								</span>
							{/if}
						</button>
						{#if isExpanded}
							<div class="border-t px-2.5 pb-2 {darkMode ? 'border-slate-700' : 'border-slate-100'}">
								{#if def.description}
									<p class="mt-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">{def.description}</p>
								{/if}
								{#if fields.length > 0}
									<div class="mt-2 space-y-0.5">
										{#each fields as field}
											{@render fieldRow(field, 0)}
										{/each}
									</div>
								{/if}
								<details class="mt-2">
									<summary class="cursor-pointer text-xs {darkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}">Raw JSON Schema</summary>
									<pre class="mt-1 rounded p-2 text-xs overflow-x-auto {darkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600'}">{formatJson(def.jsonSchema)}</pre>
								</details>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
