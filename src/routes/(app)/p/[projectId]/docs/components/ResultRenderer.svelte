<script lang="ts">
	import Self from './ResultRenderer.svelte';

	interface Props {
		value: unknown;
		darkMode?: boolean;
		depth?: number;
	}

	let { value, darkMode = true, depth = 0 }: Props = $props();

	const MAX_DEPTH = 4;

	function humanizeKey(key: string): string {
		const spaced = key
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ');
		return spaced
			.split(' ')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join(' ');
	}

	function isPrimitive(v: unknown): v is string | number | boolean | null | undefined {
		return v === null || v === undefined || typeof v !== 'object';
	}

	function isPlainObject(v: unknown): v is Record<string, unknown> {
		return v !== null && typeof v === 'object' && !Array.isArray(v);
	}

	type RenderKind =
		| 'null'
		| 'primitive'
		| 'object-table'
		| 'primitive-list'
		| 'mixed-list'
		| 'kv-card'
		| 'nested-object'
		| 'single-array-wrapper'
		| 'fallback';

	interface RenderPlan {
		kind: RenderKind;
		title?: string;
		columns?: string[];
		rows?: Record<string, unknown>[];
		items?: unknown[];
		entries?: [string, unknown][];
		innerArray?: unknown[];
		raw?: string;
	}

	const plan = $derived.by((): RenderPlan => {
		if (value === null || value === undefined) {
			return { kind: 'null' };
		}

		if (depth >= MAX_DEPTH) {
			return { kind: 'fallback', raw: JSON.stringify(value, null, 2) };
		}

		if (isPrimitive(value)) {
			return { kind: 'primitive' };
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				return { kind: 'null' };
			}

			const allObjects = value.every(isPlainObject);
			if (allObjects) {
				const colSet = new Set<string>();
				for (const row of value as Record<string, unknown>[]) {
					for (const k of Object.keys(row)) colSet.add(k);
				}
				return {
					kind: 'object-table',
					columns: [...colSet],
					rows: value as Record<string, unknown>[]
				};
			}

			const allPrimitive = value.every(isPrimitive);
			if (allPrimitive) {
				return { kind: 'primitive-list', items: value };
			}

			return { kind: 'mixed-list', items: value };
		}

		if (isPlainObject(value)) {
			const entries = Object.entries(value);
			if (entries.length === 0) {
				return { kind: 'null' };
			}

			if (entries.length === 1) {
				const [key, val] = entries[0];
				if (Array.isArray(val)) {
					return { kind: 'single-array-wrapper', title: humanizeKey(key), innerArray: val };
				}
			}

			const allValsPrimitive = entries.every(([, v]) => isPrimitive(v));
			if (allValsPrimitive) {
				return { kind: 'kv-card', entries };
			}

			return { kind: 'nested-object', entries };
		}

		return { kind: 'fallback', raw: JSON.stringify(value, null, 2) };
	});

	function formatPrimitive(v: unknown): string {
		if (v === null || v === undefined) return '\u2014';
		if (typeof v === 'boolean') return v ? 'Yes' : 'No';
		return String(v);
	}

	function cellIsNumeric(v: unknown): boolean {
		return typeof v === 'number';
	}
</script>

{#if plan.kind === 'null'}
	<p class="text-xs italic {darkMode ? 'text-slate-500' : 'text-slate-400'}">No data</p>

{:else if plan.kind === 'primitive'}
	{#if typeof value === 'boolean'}
		<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
			{value
				? (darkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
				: (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
			}">
			{value ? 'Yes' : 'No'}
		</span>
	{:else if typeof value === 'number'}
		<span class="font-mono text-xs {darkMode ? 'text-slate-200' : 'text-slate-800'}">{value}</span>
	{:else}
		<span class="text-sm {darkMode ? 'text-slate-200' : 'text-slate-800'}">{String(value)}</span>
	{/if}

{:else if plan.kind === 'object-table' && plan.columns && plan.rows}
	<div class="overflow-x-auto rounded border {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<table class="w-full text-xs">
			<thead>
				<tr class="{darkMode ? 'bg-slate-800/80' : 'bg-slate-50'}">
					{#each plan.columns as col}
						<th class="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider
							{darkMode ? 'text-slate-400 border-b border-slate-700' : 'text-slate-500 border-b border-slate-200'}">
							{humanizeKey(col)}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each plan.rows as row, i}
					<tr class="{i % 2 === 1
						? (darkMode ? 'bg-slate-800/40' : 'bg-slate-50/50')
						: (darkMode ? 'bg-transparent' : 'bg-white')}
						{darkMode ? 'border-b border-slate-700/50' : 'border-b border-slate-100'}">
						{#each plan.columns as col}
							{@const cellValue = row[col]}
							<td class="px-3 py-2 align-top {cellIsNumeric(cellValue) ? 'font-mono' : ''}
								{darkMode ? 'text-slate-200' : 'text-slate-700'}">
								{#if isPlainObject(cellValue) || Array.isArray(cellValue)}
									<Self value={cellValue} {darkMode} depth={depth + 1} />
								{:else}
									{formatPrimitive(cellValue)}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

{:else if plan.kind === 'primitive-list' && plan.items}
	<div class="flex flex-wrap gap-1.5">
		{#each plan.items as item}
			<span class="inline-flex rounded-md px-2 py-0.5 text-xs
				{darkMode ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
				{formatPrimitive(item)}
			</span>
		{/each}
	</div>

{:else if plan.kind === 'mixed-list' && plan.items}
	<div class="space-y-2">
		{#each plan.items as item, i}
			<div class="flex gap-2">
				<span class="mt-0.5 shrink-0 text-[10px] font-mono {darkMode ? 'text-slate-600' : 'text-slate-400'}">{i + 1}.</span>
				<div class="min-w-0 flex-1">
					<Self value={item} {darkMode} depth={depth + 1} />
				</div>
			</div>
		{/each}
	</div>

{:else if plan.kind === 'single-array-wrapper' && plan.innerArray !== undefined}
	<div>
		{#if plan.title}
			<h4 class="mb-2 text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'}">
				{plan.title}
			</h4>
		{/if}
		<Self value={plan.innerArray} {darkMode} depth={depth + 1} />
	</div>

{:else if plan.kind === 'kv-card' && plan.entries}
	<div class="rounded border {darkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50'} divide-y {darkMode ? 'divide-slate-700/60' : 'divide-slate-200'}">
		{#each plan.entries as [key, val]}
			<div class="flex items-baseline gap-3 px-3 py-2">
				<span class="shrink-0 text-[11px] font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">{humanizeKey(key)}</span>
				<span class="ml-auto text-right text-xs {cellIsNumeric(val) ? 'font-mono' : ''} {darkMode ? 'text-slate-200' : 'text-slate-800'}">
					{formatPrimitive(val)}
				</span>
			</div>
		{/each}
	</div>

{:else if plan.kind === 'nested-object' && plan.entries}
	<div class="space-y-3">
		{#each plan.entries as [key, val]}
			<div>
				<h4 class="mb-1.5 text-xs font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'}">
					{humanizeKey(key)}
				</h4>
				{#if isPrimitive(val)}
					<span class="text-sm {cellIsNumeric(val) ? 'font-mono' : ''} {darkMode ? 'text-slate-200' : 'text-slate-800'}">
						{formatPrimitive(val)}
					</span>
				{:else}
					<div class="pl-2 border-l-2 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
						<Self value={val} {darkMode} depth={depth + 1} />
					</div>
				{/if}
			</div>
		{/each}
	</div>

{:else if plan.kind === 'fallback'}
	<pre class="max-h-60 overflow-auto text-xs leading-relaxed font-mono p-2.5 rounded border
		{darkMode ? 'bg-slate-950 text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-800 border-slate-200'}">{plan.raw ?? JSON.stringify(value, null, 2)}</pre>
{/if}
