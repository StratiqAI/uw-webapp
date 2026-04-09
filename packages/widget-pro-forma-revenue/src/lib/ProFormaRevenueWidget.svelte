<script lang="ts">
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		FlipCard,
		WidgetConfigureBack,
		useWidgetConfigure,
		AiStatusOverlay,
		useAiGenerationStatus,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import { fmt, fmtDeduction, pct, proFormaTheme } from '@stratiqai/widget-pro-forma-base';
	import type { ProFormaRevenueConfig, ProFormaRevenueInput } from './schema.js';
	import { computeRevenueProjections, type YearProjection } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-revenue-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaRevenueConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaRevenue', widgetId, topicOverride);
	const aiStatus = useAiGenerationStatus(() => topic);
	const topicData = useReactiveValidatedTopic<ProFormaRevenueInput>(topic);

	const widgetData = $derived<ProFormaRevenueConfig>({
		unitType: data.unitType ?? 'units',
		totalUnits: data.totalUnits ?? 0,
		totalSqFt: data.totalSqFt ?? 0,
		marketRentPerUnit: data.marketRentPerUnit ?? 0,
		rentGrowthRate: data.rentGrowthRate ?? 0.03,
		vacancyRate: data.vacancyRate ?? 0.05,
		otherIncomeAnnual: data.otherIncomeAnnual ?? 0,
		otherIncomeGrowthRate: data.otherIncomeGrowthRate ?? 0.02,
		projectionYears: data.projectionYears ?? 5,
		propertyName: data.propertyName
	});

	const mergedConfig = $derived<ProFormaRevenueConfig>({
		...widgetData,
		...(topicData.current?.totalUnits != null ? { totalUnits: topicData.current.totalUnits } : {}),
		...(topicData.current?.totalSqFt != null ? { totalSqFt: topicData.current.totalSqFt } : {}),
		...(topicData.current?.marketRentPerUnit != null
			? { marketRentPerUnit: topicData.current.marketRentPerUnit }
			: {}),
		...(topicData.current?.otherIncomeAnnual != null
			? { otherIncomeAnnual: topicData.current.otherIncomeAnnual }
			: {})
	});

	const projections = $derived<YearProjection[]>(computeRevenueProjections(mergedConfig));
	const t = $derived(proFormaTheme(darkMode));

	const configure = useWidgetConfigure<ProFormaRevenueConfig>({
		widgetId,
		data: () => widgetData,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	const quantityLabel = $derived(mergedConfig.unitType === 'sqft' ? 'Sq Ft' : 'Units');
	const rentLabel = $derived(
		mergedConfig.unitType === 'sqft' ? 'Rent / Sq Ft / Mo' : 'Rent / Unit / Mo'
	);
</script>

<FlipCard isFlipped={configure.isFlipped} shellClass={t.shell} flipBackClass={t.flipBackBg}>
	{#snippet front()}
		{#if aiStatus.generating || aiStatus.error}
			<div class="flex h-full items-center justify-center px-4 py-4">
				<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
			</div>
		{:else}
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr>
					<th
						colspan={mergedConfig.projectionYears + 2}
						class="px-4 py-2.5 text-left text-sm font-bold tracking-tight {t.headerBg} {t.headerText} rounded-t-lg"
					>
						Before-Tax Cash Flow Analysis
						{#if mergedConfig.propertyName}
							<span class="ml-2 font-normal opacity-80">
								— {mergedConfig.propertyName}
							</span>
						{/if}
					</th>
				</tr>
				<tr class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b">
					<th class="px-4 py-2 text-left text-xs font-medium {t.muted} w-[220px] min-w-[180px]">
						($)
					</th>
					{#each projections as p}
						<th class="px-3 py-2 text-right text-xs font-medium {t.muted} min-w-[100px]">
							Year {p.year}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr class={t.sectionHeaderBg}>
					<td
						colspan={mergedConfig.projectionYears + 2}
						class="px-4 py-1.5 text-xs uppercase tracking-wider {t.sectionHeaderText}"
					>
						Revenue
					</td>
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Gross Potential Rent</td>
					{#each projections as p}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmt(p.grossPotentialRent)}
						</td>
					{/each}
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">
						Less: Vacancy Loss
						<span class="ml-1 opacity-60">({pct(mergedConfig.vacancyRate)})</span>
					</td>
					{#each projections as p}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmtDeduction(p.vacancyLoss)}
						</td>
					{/each}
				</tr>

				<tr class="border-b-2 {t.cellBorder} {t.subtotalBg}">
					<td class="py-1.5 pl-8 pr-4 text-xs italic {t.subtotalText}">
						Effective Rental Income
					</td>
					{#each projections as p}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.subtotalText}">
							{fmt(p.effectiveRentalIncome)}
						</td>
					{/each}
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Plus: Other Income</td>
					{#each projections as p}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmt(p.otherIncome)}
						</td>
					{/each}
				</tr>

				<tr class={t.subtotalBg}>
					<td class="py-2 pl-8 pr-4 text-xs {t.subtotalText}">
						Effective Gross Income (EGI)
					</td>
					{#each projections as p}
						<td class="px-3 py-2 text-right font-mono text-xs tabular-nums {t.subtotalText}">
							{fmt(p.effectiveGrossIncome)}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>

		<div
			class="shrink-0 flex flex-wrap items-center gap-x-6 gap-y-1 border-t px-4 py-2.5 text-[11px] {t.summaryBorder} {t.muted}"
		>
			<span>{mergedConfig.unitType === 'sqft' ? mergedConfig.totalSqFt.toLocaleString() : mergedConfig.totalUnits.toLocaleString()} {quantityLabel}</span>
			<span>${mergedConfig.marketRentPerUnit.toLocaleString()} {rentLabel}</span>
			<span>Vacancy {pct(mergedConfig.vacancyRate)}</span>
			<span>Rent Growth {pct(mergedConfig.rentGrowthRate)}/yr</span>
			{#if mergedConfig.otherIncomeAnnual > 0}
				<span>Other Income ${mergedConfig.otherIncomeAnnual.toLocaleString()}/yr</span>
			{/if}
		</div>
	{/if}
	{/snippet}

	{#snippet back()}
		<WidgetConfigureBack
			kind="proFormaRevenue"
			{widgetId}
			{darkMode}
			theme={theme ?? 'dark'}
			{topicOverride}
			showAITab={true}
			onApply={() => configure.applyConfig({
				...configure.draft,
				propertyName: configure.draft.propertyName?.trim() || undefined
			})}
			onCancel={configure.cancelConfig}
		>
			{#snippet userFields()}
				<label class="block">
					<span class={t.cfgLabel}>Property Name (optional)</span>
					<input type="text" bind:value={configure.draft.propertyName} class={t.cfgField} placeholder="e.g. Riverside Apartments" />
				</label>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<label class="block">
						<span class={t.cfgLabel}>Measurement Type</span>
						<select bind:value={configure.draft.unitType} class={t.cfgField}>
							<option value="units">Units</option>
							<option value="sqft">Square Footage</option>
						</select>
					</label>
					{#if configure.draft.unitType === 'sqft'}
						<label class="block">
							<span class={t.cfgLabel}>Total Leasable Sq Ft</span>
							<input type="number" bind:value={configure.draft.totalSqFt} min="0" step="1" class={t.cfgField} />
						</label>
					{:else}
						<label class="block">
							<span class={t.cfgLabel}>Total Number of Units</span>
							<input type="number" bind:value={configure.draft.totalUnits} min="0" step="1" class={t.cfgField} />
						</label>
					{/if}
				</div>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<label class="block">
						<span class={t.cfgLabel}>
							Market Rent / {configure.draft.unitType === 'sqft' ? 'Sq Ft' : 'Unit'} / Month ($)
						</span>
						<input type="number" bind:value={configure.draft.marketRentPerUnit} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
					</label>
					<label class="block">
						<span class={t.cfgLabel}>Annual Rent Growth Rate</span>
						<input type="number" bind:value={configure.draft.rentGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3% per year</p>
					</label>
				</div>

				<label class="block">
					<span class={t.cfgLabel}>Vacancy Rate</span>
					<input type="number" bind:value={configure.draft.vacancyRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
					<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.05 = 5% vacancy</p>
				</label>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<label class="block">
						<span class={t.cfgLabel}>Other Income (Annual $)</span>
						<input type="number" bind:value={configure.draft.otherIncomeAnnual} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						<p class="mt-0.5 text-[11px] {t.muted}">Parking, laundry, storage, etc.</p>
					</label>
					<label class="block">
						<span class={t.cfgLabel}>Other Income Growth Rate</span>
						<input type="number" bind:value={configure.draft.otherIncomeGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.02 = 2% per year</p>
					</label>
				</div>

				<label class="block">
					<span class={t.cfgLabel}>Projection Years</span>
					<input type="number" bind:value={configure.draft.projectionYears} min="1" max="10" step="1" class={t.cfgField} />
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
