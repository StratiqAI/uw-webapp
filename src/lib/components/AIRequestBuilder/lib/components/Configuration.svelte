<!-- src/lib/components/Configuration.svelte -->
<script lang="ts">
	import type { Writable } from 'svelte/store';

	export let model: Writable<string>;
	export let schemaName: Writable<string>;
	export let strict: Writable<boolean>;
</script>

<div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
		Configuration
	</div>
	<div class="grid grid-cols-[2fr_2fr_1fr] items-end gap-4">
		<div class="flex flex-col gap-2">
			<label for="model-select" class="mb-1.5 text-sm font-semibold text-slate-700">Model</label>
			<select
				id="model-select"
				bind:value={$model}
				class="font-inherit w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
			>
				<option value="gpt-4.1-mini">gpt-4.1-mini</option>
				<option value="gpt-4.1-nano">gpt-4.1-nano</option>
				<option value="gpt-5-mini">gpt-5-mini</option>
				<option value="gpt-5-nano">gpt-5-nano</option>
			</select>
		</div>
		<div class="flex flex-col gap-2">
			<label for="schema-name-input" class="mb-1.5 text-sm font-semibold text-slate-700"
				>Schema Name</label
			>
			<input
				id="schema-name-input"
				type="text"
				bind:value={$schemaName}
				class="font-inherit w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>
		<div class="flex flex-col justify-end gap-2 pb-2">
			<label
				class="flex cursor-pointer select-none items-center gap-2 rounded-lg border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:from-indigo-50 hover:to-indigo-100"
			>
				<input
					type="checkbox"
					bind:checked={$strict}
					class="m-0 h-4 w-4 cursor-pointer accent-indigo-500"
				/>
				<span class="font-medium">Strict Mode</span>
			</label>
		</div>
	</div>
</div>