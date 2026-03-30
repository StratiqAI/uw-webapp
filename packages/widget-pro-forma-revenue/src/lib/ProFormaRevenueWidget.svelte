<script lang="ts">
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import { FlipCard, fmt, fmtDeduction, pct, proFormaTheme } from '@stratiqai/widget-pro-forma-base';
	import type { ProFormaRevenueConfig, ProFormaRevenueInput } from './schema.js';
	import { computeRevenueProjections, type YearProjection } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-revenue-default',
		topicOverride,
		darkMode = true,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaRevenueConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaRevenue', widgetId, topicOverride);
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

	// --- Flip state & draft config ---
	let isFlipped = $state(false);

	let draftUnitType = $state<'units' | 'sqft'>('units');
	let draftTotalUnits = $state(0);
	let draftTotalSqFt = $state(0);
	let draftMarketRent = $state(0);
	let draftRentGrowth = $state(0.03);
	let draftVacancyRate = $state(0.05);
	let draftOtherIncome = $state(0);
	let draftOtherGrowth = $state(0.02);
	let draftYears = $state(5);
	let draftPropertyName = $state('');

	function syncDraftFromData() {
		draftUnitType = widgetData.unitType;
		draftTotalUnits = widgetData.totalUnits;
		draftTotalSqFt = widgetData.totalSqFt;
		draftMarketRent = widgetData.marketRentPerUnit;
		draftRentGrowth = widgetData.rentGrowthRate;
		draftVacancyRate = widgetData.vacancyRate;
		draftOtherIncome = widgetData.otherIncomeAnnual;
		draftOtherGrowth = widgetData.otherIncomeGrowthRate;
		draftYears = widgetData.projectionYears;
		draftPropertyName = widgetData.propertyName ?? '';
	}

	function toggleFlip() {
		isFlipped = !isFlipped;
		if (isFlipped) syncDraftFromData();
	}

	$effect(() => {
		onConfigureReady?.(toggleFlip);
	});

	function applyConfig() {
		onUpdateConfig?.({
			unitType: draftUnitType,
			totalUnits: draftTotalUnits,
			totalSqFt: draftTotalSqFt,
			marketRentPerUnit: draftMarketRent,
			rentGrowthRate: draftRentGrowth,
			vacancyRate: draftVacancyRate,
			otherIncomeAnnual: draftOtherIncome,
			otherIncomeGrowthRate: draftOtherGrowth,
			projectionYears: draftYears,
			propertyName: draftPropertyName.trim() || undefined
		});
		isFlipped = false;
	}

	function cancelConfig() {
		isFlipped = false;
	}

	const quantityLabel = $derived(mergedConfig.unitType === 'sqft' ? 'Sq Ft' : 'Units');
	const rentLabel = $derived(
		mergedConfig.unitType === 'sqft' ? 'Rent / Sq Ft / Mo' : 'Rent / Unit / Mo'
	);
</script>

<FlipCard {isFlipped} shellClass={t.shell} flipBackClass={t.flipBackBg}>
	{#snippet front()}
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
	{/snippet}

	{#snippet back()}
		<div class="flex min-h-full flex-col items-center px-4 py-5 sm:px-6">
			<div class="flex w-full max-w-lg flex-1 flex-col">
				<header class="mb-4 shrink-0 text-center sm:text-left">
					<h3 class="text-lg font-bold {t.cfgTitle}">
						Configure Revenue Projections
					</h3>
					<p class="mt-1 text-sm {t.muted}">
						Enter property fundamentals to generate a multi-year before-tax cash flow
						analysis.
					</p>
				</header>

				<section class={t.cfgPanel} aria-label="Widget configuration">
					<form
						class="flex flex-col gap-3"
						onsubmit={(e) => {
							e.preventDefault();
							applyConfig();
						}}
					>
						<label class="block">
							<span class={t.cfgLabel}>Property Name (optional)</span>
							<input type="text" bind:value={draftPropertyName} class={t.cfgField} placeholder="e.g. Riverside Apartments" />
						</label>

						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<label class="block">
								<span class={t.cfgLabel}>Measurement Type</span>
								<select bind:value={draftUnitType} class={t.cfgField}>
									<option value="units">Units</option>
									<option value="sqft">Square Footage</option>
								</select>
							</label>
							{#if draftUnitType === 'sqft'}
								<label class="block">
									<span class={t.cfgLabel}>Total Leasable Sq Ft</span>
									<input type="number" bind:value={draftTotalSqFt} min="0" step="1" class={t.cfgField} />
								</label>
							{:else}
								<label class="block">
									<span class={t.cfgLabel}>Total Number of Units</span>
									<input type="number" bind:value={draftTotalUnits} min="0" step="1" class={t.cfgField} />
								</label>
							{/if}
						</div>

						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<label class="block">
								<span class={t.cfgLabel}>
									Market Rent / {draftUnitType === 'sqft' ? 'Sq Ft' : 'Unit'} / Month ($)
								</span>
								<input type="number" bind:value={draftMarketRent} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
							</label>
							<label class="block">
								<span class={t.cfgLabel}>Annual Rent Growth Rate</span>
								<input type="number" bind:value={draftRentGrowth} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
								<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3% per year</p>
							</label>
						</div>

						<label class="block">
							<span class={t.cfgLabel}>Vacancy Rate</span>
							<input type="number" bind:value={draftVacancyRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
							<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.05 = 5% vacancy</p>
						</label>

						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<label class="block">
								<span class={t.cfgLabel}>Other Income (Annual $)</span>
								<input type="number" bind:value={draftOtherIncome} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								<p class="mt-0.5 text-[11px] {t.muted}">Parking, laundry, storage, etc.</p>
							</label>
							<label class="block">
								<span class={t.cfgLabel}>Other Income Growth Rate</span>
								<input type="number" bind:value={draftOtherGrowth} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
								<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.02 = 2% per year</p>
							</label>
						</div>

						<label class="block">
							<span class={t.cfgLabel}>Projection Years</span>
							<input type="number" bind:value={draftYears} min="1" max="10" step="1" class={t.cfgField} />
						</label>

						<div class="flex justify-end gap-2 border-t pt-4 {darkMode ? 'border-slate-600' : 'border-slate-200'}">
							<button type="button" class={t.cfgBtnSecondary} onclick={cancelConfig}>
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
				</section>
			</div>
		</div>
	{/snippet}
</FlipCard>
