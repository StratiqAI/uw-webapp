<script lang="ts">
	import type {
		LocationQuotientWidgetData,
		LocationQuotientSortOrder,
		QcewSectorAggregate
	} from './schema.js';
	import {
		getDashboardWidgetHost,
		HostServices,
		FlipCard,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { SupabaseWidgetBase } from './SupabaseWidgetBase.svelte.js';
	import { loadLocationQuotientData } from './qcewSupabase.js';

	const DEFAULT_EXPORT_BASE_THRESHOLD = 1.08;
	const DEFAULT_LOCAL_BAND_LOW = 0.92;
	const DEFAULT_LOCAL_BAND_HIGH = 1.08;
	const DEFAULT_YEAR = 2025;
	const DEFAULT_SORT_ORDER = 'lq_desc' satisfies LocationQuotientSortOrder;
	const BAR_SCALE_MIN_ABS = 0.35;
	const SUPABASE_MISSING_CLIENT_MESSAGE =
		'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to load QCEW data.';

	const REGION_PRESETS = [
		{ label: 'Portland-Vancouver-Hillsboro, OR-WA', fips: 'C3890' },
		{ label: 'Seattle-Tacoma-Bellevue, WA', fips: 'C4266' },
		{ label: 'Austin-Round Rock-San Marcos, TX', fips: 'C1242' },
		{ label: 'Nashville-Davidson--Murfreesboro--Franklin, TN', fips: 'C3498' },
		{ label: 'Phoenix-Mesa-Chandler, AZ', fips: 'C3806' }
	] as const;

	const CUSTOM_AREA_FIPS_PLACEHOLDER = REGION_PRESETS[0].fips;

	let {
		data,
		widgetId = 'lq-widget-default',
		topicOverride: _topicOverride,
		darkMode = false,
		refreshSignal = 0,
		onConfigureReady,
		onUpdateConfig
	}: StandardWidgetProps<LocationQuotientWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const sbClient = host.services?.get<SupabaseClient>(HostServices.SUPABASE) ?? null;

	const widgetData = $derived<LocationQuotientWidgetData>({
		areaFips: data.areaFips,
		year: data.year,
		regionLabel: data.regionLabel,
		sortOrder: data.sortOrder,
		exportBaseThreshold: data.exportBaseThreshold ?? DEFAULT_EXPORT_BASE_THRESHOLD,
		localBandLow: data.localBandLow ?? DEFAULT_LOCAL_BAND_LOW,
		localBandHigh: data.localBandHigh ?? DEFAULT_LOCAL_BAND_HIGH
	});

	const supabase = new SupabaseWidgetBase({
		missingClientMessage: SUPABASE_MISSING_CLIENT_MESSAGE,
		getClient: () => sbClient
	});

	let isFlipped = $state(false);
	let sectors = $state<QcewSectorAggregate[]>([]);
	let totalAvgMonthlyEmp = $state(0);

	let draftAreaFips = $state('');
	let draftYear = $state(DEFAULT_YEAR);
	let draftRegionLabel = $state('');
	let draftSortOrder = $state<LocationQuotientSortOrder>(DEFAULT_SORT_ORDER);
	let draftExportThresh = $state(DEFAULT_EXPORT_BASE_THRESHOLD);
	let draftBandLow = $state(DEFAULT_LOCAL_BAND_LOW);
	let draftBandHigh = $state(DEFAULT_LOCAL_BAND_HIGH);

	function syncDraftFromData() {
		draftAreaFips = widgetData.areaFips;
		draftYear = widgetData.year;
		draftRegionLabel = widgetData.regionLabel;
		draftSortOrder = widgetData.sortOrder;
		draftExportThresh = widgetData.exportBaseThreshold;
		draftBandLow = widgetData.localBandLow ?? DEFAULT_LOCAL_BAND_LOW;
		draftBandHigh = widgetData.localBandHigh ?? DEFAULT_LOCAL_BAND_HIGH;
	}

	function toggleFlip() {
		isFlipped = !isFlipped;
		if (isFlipped) syncDraftFromData();
	}

	$effect(() => {
		onConfigureReady?.(toggleFlip);
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
		let maxAbs = BAR_SCALE_MIN_ABS;
		for (const s of sortedSectors) {
			maxAbs = Math.max(maxAbs, Math.abs(s.lq_avg - 1));
		}
		return maxAbs;
	});

	function sectorStyle(lq: number): { kind: 'export' | 'local' | 'import'; label: string } {
		const lo = widgetData.localBandLow ?? DEFAULT_LOCAL_BAND_LOW;
		const hi = widgetData.localBandHigh ?? DEFAULT_LOCAL_BAND_HIGH;
		if (lq > hi) return { kind: 'export', label: 'Export base' };
		if (lq >= lo) return { kind: 'local', label: 'Meets local' };
		return { kind: 'import', label: 'Import dep.' };
	}

	function barColors(kind: 'export' | 'local' | 'import', dark: boolean) {
		if (dark) {
			if (kind === 'export') return { bar: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-200' };
			if (kind === 'local') return { bar: 'bg-sky-500', badge: 'bg-sky-500/20 text-sky-200' };
			return { bar: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-200' };
		}
		if (kind === 'export') return { bar: 'bg-emerald-600', badge: 'border border-emerald-300/80 bg-emerald-100 text-emerald-950' };
		if (kind === 'local') return { bar: 'bg-sky-600', badge: 'border border-sky-300/80 bg-sky-100 text-sky-950' };
		return { bar: 'bg-amber-600', badge: 'border border-amber-300/80 bg-amber-100 text-amber-950' };
	}

	async function loadData() {
		const rpcInput = { areaFips: widgetData.areaFips, year: widgetData.year };
		const result = await supabase.runLoad((client) =>
			loadLocationQuotientData(client, rpcInput)
		);

		if (result !== undefined) {
			sectors = result.sectors;
			totalAvgMonthlyEmp = result.totalAvgMonthlyEmp;
			if (result.sectors.length === 0) {
				supabase.setError(
					`No sector rows for area ${widgetData.areaFips}, year ${widgetData.year}.`
				);
			}
			return;
		}

		if (supabase.error !== supabase.missingClientMessage) {
			sectors = [];
			totalAvgMonthlyEmp = 0;
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
		const r = refreshSignal ?? 0;
		if (r > prevRefresh) {
			prevRefresh = r;
			void loadData();
		}
	});

	function patchData(p: Partial<LocationQuotientWidgetData>) {
		onUpdateConfig?.({ ...widgetData, ...p });
	}

	function onFrontRegionChange(fips: string) {
		const preset = REGION_PRESETS.find((r) => r.fips === fips);
		patchData({
			areaFips: fips,
			regionLabel: preset?.label ?? widgetData.regionLabel
		});
	}

	function applyConfig() {
		onUpdateConfig?.({
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

	const shell = $derived(darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200');
	const muted = $derived(darkMode ? 'text-slate-400' : 'text-slate-700');
	const card = $derived(darkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-slate-50 border-slate-200');
	const lqValueClass = $derived(darkMode ? 'text-slate-200' : 'text-slate-900');
	const barMidlineClass = $derived(darkMode ? 'bg-white/90' : 'bg-slate-500/70');
	const legendMidlineClass = $derived(darkMode ? 'bg-white/80' : 'bg-slate-500');
	const cfgLabelClass = $derived(`block text-xs font-medium ${muted}`);
	const cfgFieldClass = $derived(
		darkMode
			? 'mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100'
			: 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm'
	);
	const cfgFieldCompactClass = $derived(
		darkMode
			? 'mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100'
			: 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm'
	);
	const cfgPanelClass = $derived(
		darkMode
			? 'rounded-xl border border-slate-600 bg-slate-900/90 p-4 shadow-sm'
			: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
	);
	const cfgBtnSecondaryClass = $derived(
		darkMode
			? 'rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800'
			: 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100'
	);
</script>

<FlipCard {isFlipped} shellClass={shell} flipBackClass={darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'}>
	{#snippet front()}
		<div class="absolute h-full w-full overflow-auto rounded-lg {shell} shadow-sm flex flex-col">
			<div class="flex flex-shrink-0 flex-col gap-3 border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'} sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 class="text-lg font-bold tracking-tight">Location quotient analysis</h2>
					<p class="mt-0.5 text-sm {muted}">{widgetData.regionLabel} · Source: BLS QCEW</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<select
						class="rounded-md border px-2 py-1.5 text-sm {darkMode ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white'}"
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
						class="rounded-md border px-2 py-1.5 text-sm {darkMode ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white'}"
						value={widgetData.sortOrder}
						onchange={(e) => patchData({ sortOrder: e.currentTarget.value as LocationQuotientSortOrder })}
					>
						<option value="lq_desc">Sort: LQ high-low</option>
						<option value="lq_asc">Sort: LQ low-high</option>
						<option value="name_asc">Sort: Sector A-Z</option>
					</select>
				</div>
			</div>

			{#if supabase.error}
				<div class="mx-4 mt-3 rounded-md border px-3 py-2 text-sm {darkMode ? 'border-amber-600/50 bg-amber-950/40 text-amber-100' : 'border-amber-400/70 bg-amber-50 text-amber-950'}">
					{supabase.error}
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
				{#if supabase.isLoading && sectors.length === 0}
					<div class="flex flex-1 items-center justify-center py-16 text-sm {muted}">Loading…</div>
				{:else if sortedSectors.length === 0}
					<div class="flex flex-1 items-center justify-center py-16 text-sm {muted}">No data</div>
				{:else}
					<div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
						{#each sortedSectors as s}
							{@const st = sectorStyle(s.lq_avg)}
							{@const c = barColors(st.kind, darkMode)}
							{@const delta = s.lq_avg - 1}
							{@const halfPct = (Math.abs(delta) / barScale) * 50}
							<div class="grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_52px_auto] items-center gap-2 text-sm">
								<div class="truncate pr-1 text-xs font-medium" title={s.industry_title}>{s.industry_title}</div>
								<div class="relative h-7 rounded {darkMode ? 'bg-slate-950/40' : 'bg-slate-200/90'}">
									<div class="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px {barMidlineClass}" aria-hidden="true"></div>
									{#if delta >= 0}
										<div class="absolute inset-y-1 left-1/2 rounded-r {c.bar}" style="width: {Math.min(halfPct, 50)}%; max-width: 50%"></div>
									{:else}
										<div class="absolute inset-y-1 right-1/2 rounded-l {c.bar}" style="width: {Math.min(halfPct, 50)}%; max-width: 50%"></div>
									{/if}
								</div>
								<div class="text-right text-xs font-mono tabular-nums font-semibold {lqValueClass}">{s.lq_avg.toFixed(2)}</div>
								<span class="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium {c.badge}">{st.label}</span>
							</div>
						{/each}
					</div>
				{/if}
				<div class="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-[11px] {darkMode ? 'border-slate-600' : 'border-slate-200'} {muted}">
					<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span> Export base (LQ &gt; {widgetData.localBandHigh})</span>
					<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-sky-500"></span> Meets local</span>
					<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-amber-500"></span> Import dependent</span>
					<span class="inline-flex items-center gap-1.5"><span class="h-3 w-px {legendMidlineClass}"></span> National avg (LQ = 1)</span>
				</div>
				<p class="mt-2 text-[10px] leading-relaxed {muted}">
					LQ = (local industry emp ÷ total local emp) ÷ (national industry emp ÷ national emp). Source: quarterly QCEW in Supabase.
				</p>
			</div>
		</div>
	{/snippet}
	{#snippet back()}
		<div class="flex min-h-full flex-col items-center px-4 py-5 sm:px-6">
			<div class="flex w-full max-w-lg flex-1 flex-col">
				<header class="mb-4 shrink-0 text-center sm:text-left">
					<h3 class="text-lg font-bold {darkMode ? 'text-slate-100' : 'text-slate-900'}">Configure location quotient</h3>
					<p class="mt-1 text-sm {muted}">Supabase RPC over quarterly QCEW data.</p>
				</header>
				<section class={cfgPanelClass} aria-label="Widget configuration">
					<form class="flex flex-col gap-3" onsubmit={(e) => { e.preventDefault(); applyConfig(); }}>
						<label class="block">
							<span class={cfgLabelClass}>Preset MSA</span>
							<select class={cfgFieldClass} value={draftAreaFips} onchange={(e) => { const fips = e.currentTarget.value; draftAreaFips = fips; const p = REGION_PRESETS.find((r) => r.fips === fips); if (p) draftRegionLabel = p.label; }}>
								{#if !REGION_PRESETS.some((r) => r.fips === draftAreaFips)}
									<option value={draftAreaFips}>Custom ({draftAreaFips})</option>
								{/if}
								{#each REGION_PRESETS as r}
									<option value={r.fips}>{r.label} ({r.fips})</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class={cfgLabelClass}>area_fips (custom)</span>
							<input type="text" bind:value={draftAreaFips} class="{cfgFieldClass} font-mono" placeholder={CUSTOM_AREA_FIPS_PLACEHOLDER} />
						</label>
						<label class="block">
							<span class={cfgLabelClass}>Year</span>
							<input type="number" bind:value={draftYear} min="2025" max="2100" class={cfgFieldClass} />
						</label>
						<label class="block">
							<span class={cfgLabelClass}>Region display label</span>
							<input type="text" bind:value={draftRegionLabel} class={cfgFieldClass} />
						</label>
						<label class="block">
							<span class={cfgLabelClass}>Default sort</span>
							<select bind:value={draftSortOrder} class={cfgFieldClass}>
								<option value="lq_desc">LQ high → low</option>
								<option value="lq_asc">LQ low → high</option>
								<option value="name_asc">Sector A → Z</option>
							</select>
						</label>
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<label class="block">
								<span class={cfgLabelClass}>Export base &gt;</span>
								<input type="number" step="0.05" bind:value={draftExportThresh} class={cfgFieldCompactClass} />
							</label>
							<label class="block">
								<span class={cfgLabelClass}>Local band low</span>
								<input type="number" step="0.01" bind:value={draftBandLow} class={cfgFieldCompactClass} />
							</label>
							<label class="block">
								<span class={cfgLabelClass}>Local band high</span>
								<input type="number" step="0.01" bind:value={draftBandHigh} class={cfgFieldCompactClass} />
							</label>
						</div>
						<div class="flex justify-end gap-2 border-t pt-4 {darkMode ? 'border-slate-600' : 'border-slate-200'}">
							<button type="button" class={cfgBtnSecondaryClass} onclick={cancelConfig}>Cancel</button>
							<button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Apply</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	{/snippet}
</FlipCard>
