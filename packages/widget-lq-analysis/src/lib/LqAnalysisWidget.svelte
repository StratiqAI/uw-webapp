<script lang="ts">
	import {
		FlipCard,
		WidgetConfigureBack,
		useWidgetConfigure,
		useReactiveValidatedTopic,
		useExternalData,
		HostServices,
		getDashboardWidgetHost,
		AiStatusOverlay,
		useAiGenerationStatus,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import type { LqAnalysisConfig, LqAnalysisInput, LqAnalysisSortOrder } from './schema.js';
	import { resolveAreaFips, REGION_PRESETS } from './resolveAreaFips.js';
	import { loadLocationQuotientData } from './qcewSupabase.js';
	import type { SupabaseClient } from '@supabase/supabase-js';

	const DEFAULT_EXPORT_BASE_THRESHOLD = 1.08;
	const DEFAULT_LOCAL_BAND_LOW = 0.92;
	const DEFAULT_LOCAL_BAND_HIGH = 1.08;
	const DEFAULT_YEAR = 2025;
	const DEFAULT_SORT_ORDER: LqAnalysisSortOrder = 'lq_desc';
	const BAR_SCALE_MIN_ABS = 0.35;
	const YEAR_INPUT_MIN = 2025;
	const YEAR_INPUT_MAX = 2100;
	const FORM_STEP_EXPORT_THRESH = '0.05';
	const FORM_STEP_BAND = '0.01';
	const CUSTOM_AREA_FIPS_PLACEHOLDER = REGION_PRESETS[0].fips;

	let {
		data,
		widgetId = 'lq-analysis-default',
		topicOverride,
		darkMode = true,
		theme,
		refreshSignal = 0,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<LqAnalysisConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('lqAnalysis', widgetId, topicOverride);
	const topicData = useReactiveValidatedTopic<LqAnalysisInput>(topic);
	const aiStatus = useAiGenerationStatus(() => topic);

	const widgetData = $derived<LqAnalysisConfig>({
		city: data.city,
		state: data.state,
		zip: data.zip,
		areaFips: data.areaFips,
		year: data.year,
		regionLabel: data.regionLabel,
		sortOrder: data.sortOrder,
		exportBaseThreshold: data.exportBaseThreshold ?? DEFAULT_EXPORT_BASE_THRESHOLD,
		localBandLow: data.localBandLow ?? DEFAULT_LOCAL_BAND_LOW,
		localBandHigh: data.localBandHigh ?? DEFAULT_LOCAL_BAND_HIGH
	});

	const configure = useWidgetConfigure<LqAnalysisConfig>({
		widgetId: () => widgetId,
		data: () => widgetData,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));

	function applyLqConfig() {
		const d = configure.draft;
		configure.applyConfig({
			...widgetData,
			city: String(d.city ?? '').trim() || widgetData.city,
			state: String(d.state ?? '').trim() || widgetData.state,
			zip: d.zip,
			areaFips: String(d.areaFips ?? '').trim() || undefined,
			year: Number(d.year) || widgetData.year,
			regionLabel: String(d.regionLabel ?? '').trim() || widgetData.regionLabel,
			sortOrder: d.sortOrder,
			exportBaseThreshold: d.exportBaseThreshold,
			localBandLow: d.localBandLow ?? DEFAULT_LOCAL_BAND_LOW,
			localBandHigh: d.localBandHigh ?? DEFAULT_LOCAL_BAND_HIGH
		});
	}

	const inputFallback = $derived<LqAnalysisInput>({
		city: widgetData.city,
		state: widgetData.state,
		zip: widgetData.zip
	});

	const lqResult = useExternalData({
		input: () => topicData.current ?? inputFallback,
		config: () => ({
			year: widgetData.year,
			areaFips: widgetData.areaFips,
			sortOrder: widgetData.sortOrder,
			exportBaseThreshold: widgetData.exportBaseThreshold
		}),
		inputKeys: (inp) => [inp?.city, inp?.state, inp?.zip, refreshSignal],
		configKeys: (cfg) => [cfg.year, cfg.areaFips],

		async transform(input, config, services) {
			if (config.areaFips) return { areaFips: config.areaFips };
			const sb = services.get<SupabaseClient>(HostServices.SUPABASE);
			return { areaFips: await resolveAreaFips(input, sb) };
		},

		async fetchFn(resolved, config, services) {
			const sb = services.get<SupabaseClient>(HostServices.SUPABASE);
			if (!sb) throw new Error('Supabase client not available');
			return loadLocationQuotientData(sb, {
				areaFips: resolved.areaFips,
				year: config.year
			});
		}
	});

	const sectors = $derived(lqResult.data?.sectors ?? []);
	const totalAvgMonthlyEmp = $derived(lqResult.data?.totalAvgMonthlyEmp ?? 0);

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
			if (kind === 'export')
				return { bar: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-200' };
			if (kind === 'local')
				return { bar: 'bg-sky-500', badge: 'bg-sky-500/20 text-sky-200' };
			return { bar: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-200' };
		}
		if (kind === 'export')
			return {
				bar: 'bg-emerald-600',
				badge: 'border border-emerald-300/80 bg-emerald-100 text-emerald-950'
			};
		if (kind === 'local')
			return {
				bar: 'bg-sky-600',
				badge: 'border border-sky-300/80 bg-sky-100 text-sky-950'
			};
		return {
			bar: 'bg-amber-600',
			badge: 'border border-amber-300/80 bg-amber-100 text-amber-950'
		};
	}

	function patchConfig(p: Partial<LqAnalysisConfig>) {
		onUpdateConfig?.({ ...widgetData, ...p });
	}

	function onFrontRegionChange(fips: string) {
		const preset = REGION_PRESETS.find((r) => r.fips === fips);
		if (preset) {
			patchConfig({
				areaFips: fips,
				regionLabel: preset.label,
				city: preset.city,
				state: preset.state
			});
		} else {
			patchConfig({ areaFips: fips });
		}
	}

	const shellClass = $derived(
		darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
	);
	const flipBackClass = $derived(
		darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'
	);
	const frontText = $derived(darkMode ? 'text-slate-100' : 'text-slate-900');
	const muted = $derived(darkMode ? 'text-slate-400' : 'text-slate-700');
	const card = $derived(
		darkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-slate-50 border-slate-200'
	);
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
	const CONFIGURE_BLURB = `Supabase RPC over quarterly QCEW: qtr 1–3, MSA sector agglvl 44, own_code 5; total employment uses agglvl 80 / industry 10. Current table: year ${DEFAULT_YEAR}, Q1–Q3 only.`;
</script>

<div class="h-full min-h-[320px]">
	<FlipCard isFlipped={configure.isFlipped} {shellClass} {flipBackClass}>
		{#snippet front()}
			{#if aiStatus.generating || aiStatus.error}
				<div class="flex h-full items-center justify-center px-4 py-4">
					<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
				</div>
			{:else}
			<div class="flex h-full min-h-0 w-full flex-col overflow-auto {frontText}">
				<div
					class="flex flex-shrink-0 flex-col gap-3 border-b px-4 py-3 {darkMode
						? 'border-slate-700'
						: 'border-slate-200'} sm:flex-row sm:items-start sm:justify-between"
				>
					<div>
						<h2 class="text-lg font-bold tracking-tight">LQ analysis</h2>
						<p class="mt-0.5 text-sm {muted}">
							{widgetData.regionLabel} · Source: BLS QCEW
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<select
							class="rounded-md border px-2 py-1.5 text-sm {darkMode
								? 'border-slate-600 bg-slate-800 text-slate-100'
								: 'border-slate-300 bg-white'}"
							value={widgetData.areaFips ?? ''}
							onchange={(e) => onFrontRegionChange(e.currentTarget.value)}
						>
							{#each REGION_PRESETS as r}
								<option value={r.fips}>{r.label}</option>
							{/each}
							{#if widgetData.areaFips && !REGION_PRESETS.some((r) => r.fips === widgetData.areaFips)}
								<option value={widgetData.areaFips}>Custom ({widgetData.areaFips})</option>
							{/if}
						</select>
						<select
							class="rounded-md border px-2 py-1.5 text-sm {darkMode
								? 'border-slate-600 bg-slate-800 text-slate-100'
								: 'border-slate-300 bg-white'}"
							value={widgetData.sortOrder}
							onchange={(e) =>
								patchConfig({ sortOrder: e.currentTarget.value as LqAnalysisSortOrder })}
						>
							<option value="lq_desc">Sort: LQ high-low</option>
							<option value="lq_asc">Sort: LQ low-high</option>
							<option value="name_asc">Sort: Sector A-Z</option>
						</select>
					</div>
				</div>

				{#if lqResult.error}
					<div
						class="mx-4 mt-3 rounded-md border px-3 py-2 text-sm {darkMode
							? 'border-amber-600/50 bg-amber-950/40 text-amber-100'
							: 'border-amber-400/70 bg-amber-50 text-amber-950'}"
					>
						{lqResult.error}
					</div>
				{/if}

				<div class="grid flex-shrink-0 grid-cols-2 gap-2 p-4 lg:grid-cols-4">
					<div class="rounded-lg border p-3 {card}">
						<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">
							Base industries
						</div>
						<div class="mt-1 text-2xl font-bold">{summary.baseCount}</div>
						<div class="text-xs {muted}">LQ &gt; {widgetData.exportBaseThreshold}</div>
					</div>
					<div class="rounded-lg border p-3 {card}">
						<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">
							Avg LQ (export)
						</div>
						<div class="mt-1 text-2xl font-bold">{summary.avgExportLq || '—'}</div>
						<div class="text-xs {muted}">Base sectors only</div>
					</div>
					<div class="rounded-lg border p-3 {card}">
						<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">
							Top sector
						</div>
						<div class="mt-1 line-clamp-2 text-sm font-bold leading-tight">
							{summary.topTitle}
						</div>
						<div class="text-xs {muted}">LQ = {summary.topLq || '—'}</div>
					</div>
					<div class="rounded-lg border p-3 {card}">
						<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">
							Total local emp.
						</div>
						<div class="mt-1 text-2xl font-bold">{summary.empKLabel}</div>
						<div class="text-xs {muted}">thousands</div>
					</div>
				</div>

				<div class="mx-4 mb-4 flex min-h-0 flex-1 flex-col rounded-xl border p-3 {card}">
					<h3 class="mb-3 text-sm font-semibold">Location quotient by NAICS sector</h3>
					{#if lqResult.isLoading && sectors.length === 0}
						<div class="flex flex-1 items-center justify-center py-16 text-sm {muted}">
							Loading…
						</div>
					{:else if sortedSectors.length === 0}
						<div class="flex flex-1 items-center justify-center py-16 text-sm {muted}">
							No data
						</div>
					{:else}
						<div class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
							{#each sortedSectors as s}
								{@const st = sectorStyle(s.lq_avg)}
								{@const c = barColors(st.kind, darkMode)}
								{@const delta = s.lq_avg - 1}
								{@const halfPct = (Math.abs(delta) / barScale) * 50}
								<div
									class="grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_52px_auto] items-center gap-2 text-sm"
								>
									<div
										class="truncate pr-1 text-xs font-medium"
										title={s.industry_title}
									>
										{s.industry_title}
									</div>
									<div
										class="relative h-7 rounded {darkMode
											? 'bg-slate-950/40'
											: 'bg-slate-200/90'}"
									>
										<div
											class="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px {barMidlineClass}"
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
									<div
										class="text-right font-mono text-xs font-semibold tabular-nums {lqValueClass}"
									>
										{s.lq_avg.toFixed(2)}
									</div>
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
							<span class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span> Export base (LQ
							&gt; {widgetData.localBandHigh})
						</span>
						<span class="inline-flex items-center gap-1.5">
							<span class="h-2.5 w-2.5 rounded-sm bg-sky-500"></span> Meets local
						</span>
						<span class="inline-flex items-center gap-1.5">
							<span class="h-2.5 w-2.5 rounded-sm bg-amber-500"></span> Import dependent
						</span>
						<span class="inline-flex items-center gap-1.5">
							<span class="h-3 w-px {legendMidlineClass}"></span> National avg (LQ = 1)
						</span>
					</div>
					<p class="mt-2 text-[10px] leading-relaxed {muted}">
						LQ = (local industry emp ÷ total local emp) ÷ (national industry emp ÷ national
						emp). Source: quarterly QCEW in Supabase (RPC aggregates months within each
						quarter; qtr 1–3 for {DEFAULT_YEAR}).
					</p>
				</div>
			</div>
			{/if}
		{/snippet}
		{#snippet back()}
			<WidgetConfigureBack
				showAITab={true}
				kind="lqAnalysis"
				{widgetId}
				{darkMode}
				theme={resolvedTheme}
				{topicOverride}
				externalData={{
					isLoading: lqResult.isLoading,
					error: lqResult.error,
					refresh: lqResult.refresh
				}}
				onApply={applyLqConfig}
				onCancel={configure.cancelConfig}
			>
				{#snippet userFields()}
					<p class="text-sm {muted}">{CONFIGURE_BLURB}</p>
					<div class="flex flex-col gap-3">
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<label class="block">
								<span class={cfgLabelClass}>City</span>
								<input type="text" bind:value={configure.draft.city} class={cfgFieldClass} />
							</label>
							<label class="block">
								<span class={cfgLabelClass}>State</span>
								<input
									type="text"
									bind:value={configure.draft.state}
									class={cfgFieldClass}
									placeholder="e.g. OR"
								/>
							</label>
						</div>
						<label class="block">
							<span class={cfgLabelClass}>Preset MSA</span>
							<select
								class={cfgFieldClass}
								value={configure.draft.areaFips ?? ''}
								onchange={(e) => {
									const fips = e.currentTarget.value;
									const p = REGION_PRESETS.find((r) => r.fips === fips);
									if (p) {
										configure.draft = {
											...configure.draft,
											areaFips: fips,
											regionLabel: p.label,
											city: p.city,
											state: p.state
										};
									} else {
										configure.draft = {
											...configure.draft,
											areaFips: fips || undefined
										};
									}
								}}
							>
								<option value="">Auto-resolve from city/state</option>
								{#if configure.draft.areaFips && !REGION_PRESETS.some((r) => r.fips === configure.draft.areaFips)}
									<option value={configure.draft.areaFips}
										>Custom ({configure.draft.areaFips})</option
									>
								{/if}
								{#each REGION_PRESETS as r}
									<option value={r.fips}>{r.label} ({r.fips})</option>
								{/each}
							</select>
						</label>
						<label class="block">
							<span class={cfgLabelClass}>Custom FIPS code (overrides city/state lookup)</span>
							<input
								type="text"
								value={configure.draft.areaFips ?? ''}
								class="{cfgFieldClass} font-mono"
								placeholder={CUSTOM_AREA_FIPS_PLACEHOLDER}
								oninput={(e) => {
									const v = e.currentTarget.value;
									configure.draft = {
										...configure.draft,
										areaFips: v.trim() ? v : undefined
									};
								}}
							/>
						</label>
						<label class="block">
							<span class={cfgLabelClass}>Year</span>
							<input
								type="number"
								bind:value={configure.draft.year}
								min={YEAR_INPUT_MIN}
								max={YEAR_INPUT_MAX}
								class={cfgFieldClass}
							/>
							<p class="mt-1 text-[11px] leading-snug {muted}">
								Default year {DEFAULT_YEAR}; quarters 1–3 only in the current extract.
							</p>
						</label>
						<label class="block">
							<span class={cfgLabelClass}>Region display label</span>
							<input
								type="text"
								bind:value={configure.draft.regionLabel}
								class={cfgFieldClass}
							/>
						</label>
						<label class="block">
							<span class={cfgLabelClass}>Default sort</span>
							<select bind:value={configure.draft.sortOrder} class={cfgFieldClass}>
								<option value="lq_desc">LQ high → low</option>
								<option value="lq_asc">LQ low → high</option>
								<option value="name_asc">Sector A → Z</option>
							</select>
						</label>
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<label class="block">
								<span class={cfgLabelClass}>Export base &gt;</span>
								<input
									type="number"
									step={FORM_STEP_EXPORT_THRESH}
									bind:value={configure.draft.exportBaseThreshold}
									class={cfgFieldCompactClass}
								/>
							</label>
							<label class="block">
								<span class={cfgLabelClass}>Local band low</span>
								<input
									type="number"
									step={FORM_STEP_BAND}
									bind:value={configure.draft.localBandLow}
									class={cfgFieldCompactClass}
								/>
							</label>
							<label class="block">
								<span class={cfgLabelClass}>Local band high</span>
								<input
									type="number"
									step={FORM_STEP_BAND}
									bind:value={configure.draft.localBandHigh}
									class={cfgFieldCompactClass}
								/>
							</label>
						</div>
					</div>
				{/snippet}
			</WidgetConfigureBack>
		{/snippet}
	</FlipCard>
</div>
