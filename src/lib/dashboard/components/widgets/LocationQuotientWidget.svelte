<script lang="ts">
	import type { LocationQuotientWidget as LQW } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import {
		loadLocationQuotientData,
		type QcewSectorAggregate
	} from '$lib/dashboard/services/qcewSupabase';
	import { createSupabaseBrowserClient } from '$lib/supabase/browser';

	interface Props {
		data: LQW['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
		onConfigureFlipReady?: (toggleFlip: () => void) => void;
		onUpdateData: (data: LQW['data']) => void;
		/** Bumped from WidgetWrapper for menu actions */
		lqSignals?: { refresh: number; exportRequest: number };
	}

	let {
		data,
		widgetId = 'lq-widget-default',
		topicOverride,
		darkMode = true,
		onConfigureFlipReady,
		onUpdateData,
		lqSignals = { refresh: 0, exportRequest: 0 }
	}: Props = $props();

	const topic = $derived(getWidgetTopic('locationQuotient', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<LQW['data']>(() => topic);

	const widgetData = $derived<LQW['data']>({
		areaFips: dataStream.current?.areaFips ?? data.areaFips,
		year: dataStream.current?.year ?? data.year,
		regionLabel: dataStream.current?.regionLabel ?? data.regionLabel,
		sortOrder: dataStream.current?.sortOrder ?? data.sortOrder,
		exportBaseThreshold: dataStream.current?.exportBaseThreshold ?? data.exportBaseThreshold ?? 1.25,
		localBandLow: dataStream.current?.localBandLow ?? data.localBandLow ?? 0.92,
		localBandHigh: dataStream.current?.localBandHigh ?? data.localBandHigh ?? 1.08
	});

	/** `fips` values aligned with `qcew_quarterly_data` (not the same as all annual QCEW MSA codes). */
	const REGION_PRESETS = [
		{ label: 'Portland-Vancouver-Hillsboro, OR-WA', fips: 'C3980' },
		{ label: 'Seattle-Tacoma-Bellevue, WA', fips: 'C4266' },
		{ label: 'Austin-Round Rock-San Marcos, TX', fips: 'C1242' },
		{ label: 'Nashville-Davidson--Murfreesboro--Franklin, TN', fips: 'C3498' },
		{ label: 'Phoenix-Mesa-Chandler, AZ', fips: 'C3806' }
	] as const;

	let isFlipped = $state(false);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let sectors = $state<QcewSectorAggregate[]>([]);
	let totalAvgMonthlyEmp = $state(0);

	// Config form draft (back face)
	let draftAreaFips = $state('');
	let draftYear = $state(2025);
	let draftRegionLabel = $state('');
	let draftSortOrder = $state<LQW['data']['sortOrder']>('lq_desc');
	let draftExportThresh = $state(1.25);
	let draftBandLow = $state(0.92);
	let draftBandHigh = $state(1.08);

	function syncDraftFromData() {
		draftAreaFips = widgetData.areaFips;
		draftYear = widgetData.year;
		draftRegionLabel = widgetData.regionLabel;
		draftSortOrder = widgetData.sortOrder;
		draftExportThresh = widgetData.exportBaseThreshold;
		draftBandLow = widgetData.localBandLow ?? 0.92;
		draftBandHigh = widgetData.localBandHigh ?? 1.08;
	}

	function toggleFlip() {
		isFlipped = !isFlipped;
		if (isFlipped) syncDraftFromData();
	}

	$effect(() => {
		onConfigureFlipReady?.(toggleFlip);
	});

	const sortedSectors = $derived.by(() => {
		const list = [...sectors];
		const o = widgetData.sortOrder;
		if (o === 'lq_desc') list.sort((a, b) => b.lq_avg - a.lq_avg);
		else if (o === 'lq_asc') list.sort((a, b) => a.lq_avg - b.lq_avg);
		else list.sort((a, b) => a.industry_title.localeCompare(b.industry_title));
		return list;
	});

	const baseSectors = $derived(
		sortedSectors.filter((s) => s.lq_avg > widgetData.exportBaseThreshold)
	);

	const summary = $derived.by(() => {
		const base = baseSectors;
		const avgExportLq =
			base.length > 0 ? base.reduce((a, s) => a + s.lq_avg, 0) / base.length : 0;
		const top = sortedSectors[0];
		const empK = totalAvgMonthlyEmp / 1000;
		return {
			baseCount: base.length,
			avgExportLq: Math.round(avgExportLq * 100) / 100,
			topTitle: top?.industry_title ?? '—',
			topLq: top?.lq_avg ?? 0,
			empKLabel:
				empK >= 100 ? `${Math.round(empK).toLocaleString()}K` : `${empK.toFixed(1)}K`
		};
	});

	const barScale = $derived.by(() => {
		let maxAbs = 0.35;
		for (const s of sortedSectors) {
			maxAbs = Math.max(maxAbs, Math.abs(s.lq_avg - 1));
		}
		return maxAbs;
	});

	function sectorStyle(lq: number): { kind: 'export' | 'local' | 'import'; label: string } {
		const lo = widgetData.localBandLow ?? 0.92;
		const hi = widgetData.localBandHigh ?? 1.08;
		if (lq > hi) return { kind: 'export', label: 'Export base' };
		if (lq >= lo) return { kind: 'local', label: 'Meets local' };
		return { kind: 'import', label: 'Import dep.' };
	}

	function barColors(kind: 'export' | 'local' | 'import') {
		if (kind === 'export') return { bar: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-300' };
		if (kind === 'local') return { bar: 'bg-sky-500', badge: 'bg-sky-500/20 text-sky-200' };
		return { bar: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-200' };
	}

	async function loadData() {
		const supabase = createSupabaseBrowserClient();
		if (!supabase) {
			error = 'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to load QCEW data.';
			return;
		}
		error = null;
		isLoading = true;
		try {
			const result = await loadLocationQuotientData(supabase, {
				areaFips: widgetData.areaFips,
				year: widgetData.year
			});
			sectors = result.sectors;
			totalAvgMonthlyEmp = result.totalAvgMonthlyEmp;
			if (result.sectors.length === 0) {
				error = `No sector rows for area ${widgetData.areaFips}, year ${widgetData.year}. Verify area_fips and year 2025 in qcew_quarterly_data (2025 Q1–Q3 only).`;
			}
		} catch (e) {
			sectors = [];
			totalAvgMonthlyEmp = 0;
			error = e instanceof Error ? e.message : 'Failed to load data';
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const { areaFips, year } = widgetData;
		void areaFips;
		void year;
		void loadData();
	});

	let prevRefresh = 0;
	$effect(() => {
		const r = lqSignals.refresh;
		if (r > prevRefresh) {
			prevRefresh = r;
			void loadData();
		}
	});

	let prevExport = 0;
	$effect(() => {
		const e = lqSignals.exportRequest;
		if (e > prevExport) {
			prevExport = e;
			const payload = {
				config: widgetData,
				sectors,
				totalAvgMonthlyEmp,
				exportedAt: new Date().toISOString()
			};
			const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `location-quotient-${widgetId}.json`;
			a.click();
			URL.revokeObjectURL(url);
		}
	});

	function patchData(p: Partial<LQW['data']>) {
		onUpdateData({ ...widgetData, ...p });
	}

	function onFrontRegionChange(fips: string) {
		const preset = REGION_PRESETS.find((r) => r.fips === fips);
		patchData({
			areaFips: fips,
			regionLabel: preset?.label ?? widgetData.regionLabel
		});
	}

	function applyConfig() {
		onUpdateData({
			areaFips: draftAreaFips.trim() || widgetData.areaFips,
			year: Number(draftYear) || widgetData.year,
			regionLabel: draftRegionLabel.trim() || widgetData.regionLabel,
			sortOrder: draftSortOrder,
			exportBaseThreshold: draftExportThresh,
			localBandLow: draftBandLow,
			localBandHigh: draftBandHigh
		});
		isFlipped = false;
	}

	function cancelConfig() {
		isFlipped = false;
	}

	const shell = $derived(
		darkMode
			? 'bg-slate-900 text-slate-100 border-slate-700'
			: 'bg-white text-slate-900 border-slate-200'
	);
	const muted = $derived(darkMode ? 'text-slate-400' : 'text-slate-500');
	const card = $derived(darkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-slate-50 border-slate-200');
</script>

<div class="flip-container h-full min-h-[320px]" class:flipped={isFlipped}>
	<div class="flip-card h-full min-h-[320px]">
		<!-- FRONT -->
		<div
			class="flip-card-front absolute h-full w-full overflow-auto rounded-lg border {shell} shadow-sm flex flex-col"
		>
			<div class="flex flex-shrink-0 flex-col gap-3 border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'} sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 class="text-lg font-bold tracking-tight">Location quotient analysis</h2>
					<p class="mt-0.5 text-sm {muted}">
						{widgetData.regionLabel} · Source: BLS QCEW
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<select
						class="rounded-md border px-2 py-1.5 text-sm {darkMode
							? 'border-slate-600 bg-slate-800 text-slate-100'
							: 'border-slate-300 bg-white'}"
						value={widgetData.areaFips}
						onchange={(e) => onFrontRegionChange(e.currentTarget.value)}
					>
						{#each REGION_PRESETS as r}
							<option value={r.fips}>{r.label}</option>
						{/each}
						{#if !REGION_PRESETS.some((r) => r.fips === widgetData.areaFips)}
							<option value={widgetData.areaFips}>Custom ({widgetData.areaFips})</option>
						{/if}
					</select>
					<select
						class="rounded-md border px-2 py-1.5 text-sm {darkMode
							? 'border-slate-600 bg-slate-800 text-slate-100'
							: 'border-slate-300 bg-white'}"
						value={widgetData.sortOrder}
						onchange={(e) =>
							patchData({ sortOrder: e.currentTarget.value as LQW['data']['sortOrder'] })}
					>
						<option value="lq_desc">Sort: LQ high-low</option>
						<option value="lq_asc">Sort: LQ low-high</option>
						<option value="name_asc">Sort: Sector A-Z</option>
					</select>
				</div>
			</div>

			{#if error}
				<div class="mx-4 mt-3 rounded-md border border-amber-600/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
					{error}
				</div>
			{/if}

			<div class="grid flex-shrink-0 grid-cols-2 gap-2 p-4 lg:grid-cols-4">
				<div class="rounded-lg border p-3 {card}">
					<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">Base industries</div>
					<div class="mt-1 text-2xl font-bold">{summary.baseCount}</div>
					<div class="text-xs {muted}">LQ &gt; {widgetData.exportBaseThreshold}</div>
				</div>
				<div class="rounded-lg border p-3 {card}">
					<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">Avg LQ (export)</div>
					<div class="mt-1 text-2xl font-bold">{summary.avgExportLq || '—'}</div>
					<div class="text-xs {muted}">Base sectors only</div>
				</div>
				<div class="rounded-lg border p-3 {card}">
					<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">Top sector</div>
					<div class="mt-1 line-clamp-2 text-sm font-bold leading-tight">{summary.topTitle}</div>
					<div class="text-xs {muted}">LQ = {summary.topLq || '—'}</div>
				</div>
				<div class="rounded-lg border p-3 {card}">
					<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">Total local emp.</div>
					<div class="mt-1 text-2xl font-bold">{summary.empKLabel}</div>
					<div class="text-xs {muted}">thousands</div>
				</div>
			</div>

			<div class="mx-4 mb-4 flex min-h-0 flex-1 flex-col rounded-xl border p-3 {card}">
				<h3 class="mb-3 text-sm font-semibold">Location quotient by NAICS sector</h3>
				{#if isLoading && sectors.length === 0}
					<div class="flex flex-1 items-center justify-center py-16 text-sm {muted}">Loading…</div>
				{:else if sortedSectors.length === 0}
					<div class="flex flex-1 items-center justify-center py-16 text-sm {muted}">No data</div>
				{:else}
					<div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
						{#each sortedSectors as s}
							{@const st = sectorStyle(s.lq_avg)}
							{@const c = barColors(st.kind)}
							{@const delta = s.lq_avg - 1}
							{@const halfPct = (Math.abs(delta) / barScale) * 50}
							<div class="grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_52px_auto] items-center gap-2 text-sm">
								<div class="truncate pr-1 text-xs font-medium" title={s.industry_title}>
									{s.industry_title}
								</div>
								<div class="relative h-7 rounded bg-slate-950/40">
									<div
										class="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-white/90"
										aria-hidden="true"
									></div>
									{#if delta >= 0}
										<div
											class="absolute inset-y-1 left-1/2 rounded-r {c.bar}"
											style="width: {Math.min(halfPct, 50)}%; max-width: 50%"
										></div>
									{:else}
										<div
											class="absolute inset-y-1 right-1/2 rounded-l {c.bar}"
											style="width: {Math.min(halfPct, 50)}%; max-width: 50%"
										></div>
									{/if}
								</div>
								<div class="text-right text-xs font-mono tabular-nums">{s.lq_avg.toFixed(2)}</div>
								<span
									class="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium {c.badge}"
								>
									{st.label}
								</span>
							</div>
						{/each}
					</div>
				{/if}

				<div
					class="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-[11px] {darkMode
						? 'border-slate-600'
						: 'border-slate-200'} {muted}"
				>
					<span class="inline-flex items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span> Export base (LQ &gt; {widgetData.localBandHigh})
					</span>
					<span class="inline-flex items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-sm bg-sky-500"></span> Meets local
					</span>
					<span class="inline-flex items-center gap-1.5">
						<span class="h-2.5 w-2.5 rounded-sm bg-amber-500"></span> Import dependent
					</span>
					<span class="inline-flex items-center gap-1.5">
						<span class="h-3 w-px bg-white/80"></span> National avg (LQ = 1)
					</span>
				</div>
				<p class="mt-2 text-[10px] leading-relaxed {muted}">
					LQ = (local industry emp ÷ total local emp) ÷ (national industry emp ÷ national emp). Source:
					quarterly QCEW in Supabase (RPC aggregates months within each quarter; qtr 1–3 for 2025).
				</p>
			</div>
		</div>

		<!-- BACK (configure) -->
		<div
			class="flip-card-back absolute h-full w-full overflow-auto rounded-lg border {darkMode
				? 'border-slate-600 bg-slate-900'
				: 'border-slate-200 bg-slate-50'} shadow-sm"
		>
			<div class="flex h-full flex-col p-5">
				<h3 class="text-lg font-bold {darkMode ? 'text-slate-100' : 'text-slate-900'}">
					Configure location quotient
				</h3>
				<p class="mt-1 text-sm {muted}">
					Supabase RPC over quarterly QCEW: qtr 1–3, MSA sector agglvl 44, own_code 5; total employment
					uses agglvl 80 / industry 10. Current table: year 2025, Q1–Q3 only.
				</p>
				<form
					class="mt-4 flex flex-1 flex-col gap-3"
					onsubmit={(e) => {
						e.preventDefault();
						applyConfig();
					}}
				>
					<label class="block">
						<span class="text-xs font-medium {muted}">Preset MSA</span>
						<select
							class="mt-1 w-full rounded-lg border px-3 py-2 text-sm {darkMode
								? 'border-slate-600 bg-slate-800 text-slate-100'
								: 'border-slate-300 bg-white'}"
							value={draftAreaFips}
							onchange={(e) => {
								const fips = e.currentTarget.value;
								draftAreaFips = fips;
								const p = REGION_PRESETS.find((r) => r.fips === fips);
								if (p) draftRegionLabel = p.label;
							}}
						>
							{#if !REGION_PRESETS.some((r) => r.fips === draftAreaFips)}
								<option value={draftAreaFips}>Custom ({draftAreaFips})</option>
							{/if}
							{#each REGION_PRESETS as r}
								<option value={r.fips}>{r.label} ({r.fips})</option>
							{/each}
						</select>
					</label>
					<label class="block">
						<span class="text-xs font-medium {muted}">area_fips (custom)</span>
						<input
							type="text"
							bind:value={draftAreaFips}
							class="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm {darkMode
								? 'border-slate-600 bg-slate-800 text-slate-100'
								: 'border-slate-300 bg-white'}"
							placeholder="C3980"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium {muted}">Year</span>
						<input
							type="number"
							bind:value={draftYear}
							min="2025"
							max="2100"
							class="mt-1 w-full rounded-lg border px-3 py-2 text-sm {darkMode
								? 'border-slate-600 bg-slate-800 text-slate-100'
								: 'border-slate-300 bg-white'}"
						/>
						<p class="mt-1 text-[11px] leading-snug {muted}">
							Default year 2025; quarters 1–3 only in the current extract.
						</p>
					</label>
					<label class="block">
						<span class="text-xs font-medium {muted}">Region display label</span>
						<input
							type="text"
							bind:value={draftRegionLabel}
							class="mt-1 w-full rounded-lg border px-3 py-2 text-sm {darkMode
								? 'border-slate-600 bg-slate-800 text-slate-100'
								: 'border-slate-300 bg-white'}"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium {muted}">Default sort</span>
						<select
							bind:value={draftSortOrder}
							class="mt-1 w-full rounded-lg border px-3 py-2 text-sm {darkMode
								? 'border-slate-600 bg-slate-800 text-slate-100'
								: 'border-slate-300 bg-white'}"
						>
							<option value="lq_desc">LQ high → low</option>
							<option value="lq_asc">LQ low → high</option>
							<option value="name_asc">Sector A → Z</option>
						</select>
					</label>
					<div class="grid grid-cols-3 gap-2">
						<label class="block">
							<span class="text-xs font-medium {muted}">Export base &gt;</span>
							<input
								type="number"
								step="0.05"
								bind:value={draftExportThresh}
								class="mt-1 w-full rounded-lg border px-2 py-2 text-sm {darkMode
									? 'border-slate-600 bg-slate-800'
									: 'border-slate-300 bg-white'}"
							/>
						</label>
						<label class="block">
							<span class="text-xs font-medium {muted}">Local band low</span>
							<input
								type="number"
								step="0.01"
								bind:value={draftBandLow}
								class="mt-1 w-full rounded-lg border px-2 py-2 text-sm {darkMode
									? 'border-slate-600 bg-slate-800'
									: 'border-slate-300 bg-white'}"
							/>
						</label>
						<label class="block">
							<span class="text-xs font-medium {muted}">Local band high</span>
							<input
								type="number"
								step="0.01"
								bind:value={draftBandHigh}
								class="mt-1 w-full rounded-lg border px-2 py-2 text-sm {darkMode
									? 'border-slate-600 bg-slate-800'
									: 'border-slate-300 bg-white'}"
							/>
						</label>
					</div>
					<div class="mt-auto flex justify-end gap-2 pt-4">
						<button
							type="button"
							class="rounded-lg border px-4 py-2 text-sm font-medium {darkMode
								? 'border-slate-600 text-slate-200 hover:bg-slate-800'
								: 'border-slate-300 hover:bg-slate-100'}"
							onclick={cancelConfig}
						>
							Cancel
						</button>
						<button
							type="submit"
							class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
						>
							Apply
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>

<style>
	.flip-container {
		perspective: 1200px;
		position: relative;
	}
	.flip-card {
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.flip-container.flipped .flip-card {
		transform: rotateY(180deg);
	}
	.flip-card-front,
	.flip-card-back {
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
	.flip-card-back {
		transform: rotateY(180deg);
	}
</style>
