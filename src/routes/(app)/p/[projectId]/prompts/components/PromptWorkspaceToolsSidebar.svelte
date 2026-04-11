<script lang="ts">
	let {
		darkMode,
		topK = $bindable(5),
		topKPerNs = $bindable(5),
		priority = $bindable<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM'),
		googleSearchEnabled = $bindable(true),
		documentScopeSelectedOnly = $bindable(false),
		hasDocuments = false
	} = $props<{
		darkMode: boolean;
		topK?: number;
		topKPerNs?: number;
		priority?: 'HIGH' | 'MEDIUM' | 'LOW';
		googleSearchEnabled?: boolean;
		documentScopeSelectedOnly?: boolean;
		hasDocuments?: boolean;
	}>();

	const panel = $derived(
		darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'
	);
	const label = $derived(darkMode ? 'text-slate-400' : 'text-slate-600');
	const inputCls = $derived(
		darkMode
			? 'border-slate-600 bg-slate-900 text-slate-100'
			: 'border-slate-200 bg-white text-slate-900'
	);
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden border-r {panel}">
	<div class="border-b px-3 py-2.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<h2 class="text-xs font-semibold uppercase tracking-wider {label}">AI tools</h2>
		<p class="mt-1 text-[10px] leading-snug {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			Google Search affects both vision-RAG and text runs. Structured JSON output is disabled while search is on.
		</p>
	</div>

	<div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
		<label class="flex cursor-pointer items-start gap-2">
			<input
				type="checkbox"
				bind:checked={googleSearchEnabled}
				class="mt-0.5 rounded border-slate-500"
			/>
			<span class="text-xs {darkMode ? 'text-slate-300' : 'text-slate-700'}">
				Enable Google Search grounding
			</span>
		</label>

		<div>
			<label for="pw-priority" class="mb-1 block text-xs font-medium {label}">Queue priority</label>
			<select
				id="pw-priority"
				bind:value={priority}
				class="w-full rounded-md border px-2 py-1.5 text-xs {inputCls}"
			>
				<option value="HIGH">High</option>
				<option value="MEDIUM">Medium</option>
				<option value="LOW">Low</option>
			</select>
		</div>

		<div class="rounded-md border {darkMode ? 'border-slate-600 bg-slate-900/40' : 'border-slate-200 bg-slate-50'} p-2">
			<p class="mb-2 text-[10px] font-medium uppercase tracking-wide {label}">Vision RAG (when documents + message)</p>
			<div class="space-y-2">
				<div>
					<label for="pw-topk" class="mb-0.5 block text-[11px] {label}">topK</label>
					<input
						id="pw-topk"
						type="number"
						min="1"
						max="50"
						bind:value={topK}
						class="w-full rounded border px-2 py-1 text-xs {inputCls}"
					/>
				</div>
				<div>
					<label for="pw-topkns" class="mb-0.5 block text-[11px] {label}">topK per namespace</label>
					<input
						id="pw-topkns"
						type="number"
						min="1"
						max="50"
						bind:value={topKPerNs}
						class="w-full rounded border px-2 py-1 text-xs {inputCls}"
					/>
				</div>
			</div>
		</div>

		{#if hasDocuments}
			<label class="flex cursor-pointer items-start gap-2">
				<input
					type="checkbox"
					bind:checked={documentScopeSelectedOnly}
					class="mt-0.5 rounded border-slate-500"
				/>
				<span class="text-xs {darkMode ? 'text-slate-300' : 'text-slate-700'}">
					Limit RAG to the selected document only (off = all project documents)
				</span>
			</label>
		{/if}
	</div>
</div>
