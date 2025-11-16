<!-- src/lib/components/Output.svelte -->
<script lang="ts">
	import { buildOutput } from '../schema';
	import { derived } from 'svelte/store';
	import type { Writable } from 'svelte/store';
	import type { Message, SchemaProperty } from '../state';

	interface State {
		model: Writable<string>;
		schemaName: Writable<string>;
		strict: Writable<boolean>;
		messages: Writable<Message[]>;
		vectorStoreIds: Writable<string[]>;
		properties: Writable<SchemaProperty[]>;
	}

	export let state: State;
	export let onCopy: () => void;

	const outputJson = derived(
		[state.model, state.messages, state.vectorStoreIds, state.schemaName, state.strict, state.properties],
		([$model, $messages, $vectorStoreIds, $schemaName, $strict, $properties]) => {
			const output = buildOutput($model, $messages, $vectorStoreIds, $schemaName, $strict, $properties);
			return JSON.stringify(output, null, 2);
		}
	);

	function copyToClipboard() {
		navigator.clipboard.writeText($outputJson);
		onCopy();
	}
</script>

<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-800 p-6">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="m-0 text-base font-semibold text-slate-200">Generated JSON</h3>
		<button
			type="button"
			onclick={copyToClipboard}
			class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] border-none border-slate-200 bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98]"
		>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
				<path
					d="M5.5 4.5H3.5C2.67 4.5 2 5.17 2 6V12.5C2 13.33 2.67 14 3.5 14H10C10.83 14 11.5 13.33 11.5 12.5V10.5M11.5 4.5H13.5C14.33 4.5 15 5.17 15 6V12.5C15 13.33 14.33 14 13.5 14H7C6.17 14 5.5 13.33 5.5 12.5V10.5M11.5 4.5V2M11.5 4.5H9.5M11.5 4.5V6.5"
					stroke="currentColor"
					stroke-width="1.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			Copy
		</button>
	</div>
	<pre
		class="m-0 min-h-0 flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-5 font-mono text-sm leading-relaxed text-slate-300"
		>{$outputJson}</pre
	>
</div>