<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { collectAllPaths, formatJson } from './utils';

	interface Props {
		darkMode: boolean;
		isOpen: boolean;
		ontoggle: () => void;
	}

	let { darkMode, isOpen, ontoggle }: Props = $props();

	let topicInput = $state('');
	let valueInput = $state('{\n  \n}');
	let result = $state<{ ok: boolean; message: string } | null>(null);
	let showSuggestions = $state(false);

	let allPaths = $derived.by(() => {
		void validatedTopicStore.tree;
		return collectAllPaths(validatedTopicStore.tree);
	});

	let suggestions = $derived(
		topicInput.length > 0
			? allPaths.filter((p) => p.toLowerCase().includes(topicInput.toLowerCase())).slice(0, 8)
			: []
	);

	function publish() {
		if (!topicInput.trim()) {
			result = { ok: false, message: 'Topic path is required' };
			return;
		}
		try {
			const parsed = JSON.parse(valueInput);
			const ok = validatedTopicStore.publish(topicInput.trim(), parsed);
			if (ok) {
				result = { ok: true, message: `Published to "${topicInput.trim()}"` };
				setTimeout(() => result = null, 3000);
			} else {
				const errs = validatedTopicStore.errors.get(topicInput.trim());
				result = { ok: false, message: errs ? JSON.stringify(errs, null, 2) : 'Validation failed' };
			}
		} catch (e) {
			result = { ok: false, message: `Invalid JSON: ${(e as Error).message}` };
		}
	}

	function loadCurrent() {
		if (!topicInput.trim()) return;
		const data = validatedTopicStore.at(topicInput.trim());
		if (data !== undefined) {
			valueInput = formatJson(data);
		}
	}

	function selectSuggestion(path: string) {
		topicInput = path;
		showSuggestions = false;
	}
</script>

{#if isOpen}
	<div class="border-t {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}">
		<div class="flex items-center justify-between px-4 py-2 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
			<h3 class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">Publish to Store</h3>
			<button
				type="button"
				class="rounded p-1 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} transition-colors"
				onclick={ontoggle}
				aria-label="Close publish panel"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
			</button>
		</div>

		<div class="grid grid-cols-[1fr_2fr] gap-4 p-4">
			<!-- Left: topic + actions -->
			<div class="space-y-3">
				<div class="relative">
					<label class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						Topic path
						<input
							type="text"
							class="mt-1 w-full rounded border px-3 py-1.5 text-sm font-mono
								{darkMode ? 'border-slate-600 bg-slate-900 text-slate-200 placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}
								focus:outline-none focus:ring-2 focus:ring-indigo-500"
							placeholder="widgets/metric/my-widget"
							bind:value={topicInput}
							onfocus={() => showSuggestions = true}
							onblur={() => setTimeout(() => showSuggestions = false, 200)}
						/>
					</label>
					{#if showSuggestions && suggestions.length > 0}
						<ul class="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border shadow-lg
							{darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'}">
							{#each suggestions as s}
								<li>
									<button
										type="button"
										class="w-full px-3 py-1.5 text-left font-mono text-xs transition-colors
											{darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}"
										onmousedown={() => selectSuggestion(s)}
									>{s}</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div class="flex gap-2">
					<button
						type="button"
						class="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
						onclick={publish}
					>Publish</button>
					<button
						type="button"
						class="rounded px-3 py-1.5 text-sm font-medium transition-colors
							{darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}"
						onclick={loadCurrent}
						title="Load current value at this topic"
					>Load current</button>
				</div>

				{#if result}
					<div class="rounded border p-2 text-xs
						{result.ok
							? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400'
							: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400'}">
						<pre class="whitespace-pre-wrap">{result.message}</pre>
					</div>
				{/if}
			</div>

			<!-- Right: JSON value -->
			<label class="block">
				<span class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-600'}">JSON value</span>
				<textarea
					class="w-full rounded border font-mono text-sm p-3 min-h-[120px] resize-y
						{darkMode ? 'border-slate-600 bg-slate-900 text-slate-200' : 'border-slate-300 bg-white text-slate-900'}
						focus:outline-none focus:ring-2 focus:ring-indigo-500"
					bind:value={valueInput}
				></textarea>
			</label>
		</div>
	</div>
{/if}
