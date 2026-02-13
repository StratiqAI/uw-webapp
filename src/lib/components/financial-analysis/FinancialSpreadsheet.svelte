<script lang="ts">
	import * as XLSX from 'xlsx';
	import { onMount } from 'svelte';

	const DEFAULT_URL = '/financial-analysis/StratiqAI-DCF.xlsx';

	interface Props {
		darkMode: boolean;
	}

	let { darkMode }: Props = $props();

	let sheetNames = $state<string[]>([]);
	let activeSheetIndex = $state(0);
	let rows = $state<(string | number | undefined)[][]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let workbookRef = $state<XLSX.WorkBook | null>(null);

	const ZOOM_MIN = 50;
	const ZOOM_MAX = 200;
	const ZOOM_STEP = 5;
	let zoomLevel = $state(100);

	function zoomIn() {
		zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
	}
	function zoomOut() {
		zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
	}
	function zoomReset() {
		zoomLevel = 100;
	}

	function parseWorkbookFull(workbook: XLSX.WorkBook) {
		workbookRef = workbook;
		sheetNames = workbook.SheetNames;
		if (sheetNames.length === 0) {
			rows = [];
			return;
		}
		activeSheetIndex = 0;
		const sheet = workbook.Sheets[sheetNames[0]];
		rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | undefined)[][];
	}

	function selectSheet(index: number) {
		if (!workbookRef || index < 0 || index >= sheetNames.length) return;
		activeSheetIndex = index;
		const sheet = workbookRef.Sheets[sheetNames[index]];
		rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | undefined)[][];
	}

	async function loadFromUrl(url: string) {
		loading = true;
		error = null;
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
			const buf = await res.arrayBuffer();
			const workbook = XLSX.read(buf, { type: 'array' });
			parseWorkbookFull(workbook);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load spreadsheet';
			rows = [];
			sheetNames = [];
			workbookRef = null;
		} finally {
			loading = false;
		}
	}

	function onFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		loading = true;
		error = null;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const data = ev.target?.result;
				if (!(data instanceof ArrayBuffer)) return;
				const workbook = XLSX.read(data, { type: 'array' });
				parseWorkbookFull(workbook);
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to parse file';
				rows = [];
				sheetNames = [];
				workbookRef = null;
			} finally {
				loading = false;
			}
		};
		reader.readAsArrayBuffer(file);
		input.value = '';
	}

	onMount(() => {
		loadFromUrl(DEFAULT_URL);
	});

	const maxCols = $derived(
		rows.length ? Math.max(...rows.map((r) => r.length)) : 0
	);

	function cellDisplay(value: string | number | undefined): string {
		if (value === undefined || value === null) return '';
		if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
		return String(value);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-2">
		{#if sheetNames.length > 1}
			<div class="flex flex-wrap gap-1">
				{#each sheetNames as name, i}
					<button
						type="button"
						onclick={() => selectSheet(i)}
						class="rounded px-3 py-1.5 text-sm font-medium transition-colors {activeSheetIndex === i
							? darkMode
								? 'bg-indigo-600 text-white'
								: 'bg-indigo-100 text-indigo-800'
							: darkMode
								? 'text-slate-400 hover:bg-slate-700'
								: 'text-slate-600 hover:bg-slate-100'}"
					>
						{name}
					</button>
				{/each}
			</div>
		{/if}
		<div
			class="flex items-center gap-1 rounded-lg border {darkMode
				? 'border-slate-600 bg-slate-800/50'
				: 'border-slate-200 bg-slate-50'}"
			role="group"
			aria-label="Spreadsheet zoom"
		>
			<button
				type="button"
				onclick={zoomOut}
				disabled={zoomLevel <= ZOOM_MIN}
				class="flex h-8 w-8 items-center justify-center rounded-l-md transition-colors disabled:opacity-40 disabled:pointer-events-none {darkMode
					? 'text-slate-300 hover:bg-slate-700'
					: 'text-slate-600 hover:bg-slate-200'}"
				title="Zoom out"
				aria-label="Zoom out"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
				</svg>
			</button>
			<button
				type="button"
				onclick={zoomReset}
				class="min-w-14 px-2 py-1 text-xs font-medium {darkMode
					? 'text-slate-300 hover:bg-slate-700'
					: 'text-slate-600 hover:bg-slate-200'}"
				title="Reset zoom to 100%"
			>
				{zoomLevel}%
			</button>
			<button
				type="button"
				onclick={zoomIn}
				disabled={zoomLevel >= ZOOM_MAX}
				class="flex h-8 w-8 items-center justify-center rounded-r-md transition-colors disabled:opacity-40 disabled:pointer-events-none {darkMode
					? 'text-slate-300 hover:bg-slate-700'
					: 'text-slate-600 hover:bg-slate-200'}"
				title="Zoom in"
				aria-label="Zoom in"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
			</button>
		</div>
		<label
			class="cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors {darkMode
				? 'border-slate-600 text-slate-300 hover:bg-slate-700'
				: 'border-slate-300 text-slate-600 hover:bg-slate-100'}"
		>
			Upload file
			<input
				type="file"
				accept=".xlsx,.xls"
				class="hidden"
				onchange={onFileSelected}
			/>
		</label>
	</div>

	{#if loading}
		<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading spreadsheet…</p>
	{:else if error}
		<p class="text-sm {darkMode ? 'text-red-400' : 'text-red-600'}">{error}</p>
	{:else if rows.length === 0}
		<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No data in this sheet.</p>
	{:else}
		<div
			class="overflow-auto rounded-xl border shadow-sm {darkMode
				? 'border-slate-600 bg-slate-800/30'
				: 'border-slate-200 bg-white'}"
			style="min-width: max-content;"
		>
			<table
				class="spreadsheet-table spreadsheet-zoom w-full border-collapse text-sm {darkMode ? 'text-slate-200' : 'text-slate-800'}"
				style="min-width: max-content; --zoom: {zoomLevel / 100};"
			>
				{#if rows.length > 0}
					{@const headerRow = rows[0]}
					<thead>
						<tr class="{darkMode ? 'bg-slate-700/80' : 'bg-slate-100'}">
							{#each Array.from({ length: maxCols }, (_, i) => i) as c}
								{@const cell = headerRow[c]}
								<th
									class="spreadsheet-cell border-b-2 border-r font-medium {darkMode
										? 'border-slate-500 text-slate-100'
										: 'border-slate-300 text-slate-700'} {typeof cell === 'number'
										? 'tabular-nums'
										: ''}"
								>
									{cellDisplay(cell)}
								</th>
							{/each}
						</tr>
					</thead>
				{/if}
				<tbody>
					{#each rows.length > 0 ? rows.slice(1) : rows as row, r}
						<tr
							class="group {r % 2 === 0
								? darkMode
									? 'bg-slate-800/20 hover:bg-slate-700/30'
									: 'bg-white hover:bg-slate-50/80'
								: darkMode
									? 'bg-slate-800/40 hover:bg-slate-700/30'
									: 'bg-slate-50/60 hover:bg-slate-100'}"
						>
							{#each Array.from({ length: maxCols }, (_, i) => i) as c}
								{@const cell = row[c]}
								<td
									class="spreadsheet-cell border-r border-b {darkMode
										? 'border-slate-600/80'
										: 'border-slate-200'} {c === 0
										? darkMode
											? 'bg-slate-700/40 font-medium text-slate-200'
											: 'bg-slate-100/80 font-medium text-slate-700'
										: ''} {typeof cell === 'number' ? 'tabular-nums text-right' : 'text-left'}"
								>
									{cellDisplay(cell)}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.spreadsheet-table {
		--cell-padding-x: 0.75rem;
		--cell-padding-y: 0.5rem;
		--cell-min-width: 5rem;
	}
	.spreadsheet-table.spreadsheet-zoom {
		table-layout: fixed;
		font-size: calc(0.875rem * var(--zoom, 1));
	}
	.spreadsheet-table.spreadsheet-zoom .spreadsheet-cell {
		padding: calc(var(--cell-padding-y) * var(--zoom, 1)) calc(var(--cell-padding-x) * var(--zoom, 1));
		width: calc(var(--cell-min-width) * var(--zoom, 1));
		min-width: calc(var(--cell-min-width) * var(--zoom, 1));
		max-width: calc(var(--cell-min-width) * var(--zoom, 1));
		box-sizing: border-box;
	}
	.spreadsheet-cell {
		padding: var(--cell-padding-y) var(--cell-padding-x);
		min-width: var(--cell-min-width);
		white-space: nowrap;
	}
	.spreadsheet-cell:last-child {
		border-right: none;
	}
	thead .spreadsheet-cell {
		padding: 0.625rem var(--cell-padding-x);
		white-space: nowrap;
	}
	.spreadsheet-table.spreadsheet-zoom thead .spreadsheet-cell {
		padding: calc(0.625rem * var(--zoom, 1)) calc(var(--cell-padding-x) * var(--zoom, 1));
	}
</style>
