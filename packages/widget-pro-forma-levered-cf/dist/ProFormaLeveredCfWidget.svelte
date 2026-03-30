<script lang="ts">
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import { FlipCard, fmt, pct, proFormaTheme } from '@stratiqai/widget-pro-forma-base';
	import type { ProFormaLeveredCfConfig, ProFormaLeveredCfInput } from './schema.js';
	import { computeLeveredProjections } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-levered-cf-default',
		topicOverride,
		darkMode = true,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaLeveredCfConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaLeveredCf', widgetId, topicOverride);
	const topicData = useReactiveValidatedTopic<ProFormaLeveredCfInput>(topic);

	const widgetData = $derived<ProFormaLeveredCfConfig>({
		propertyName: data.propertyName,
		projectionYears: data.projectionYears ?? 5,
		purchasePrice: data.purchasePrice ?? 0,
		acquisitionCosts: data.acquisitionCosts ?? 0,
		initialCapEx: data.initialCapEx ?? 0,
		egiYear1: data.egiYear1 ?? 0,
		egiGrowthRate: data.egiGrowthRate ?? 0.03,
		totalOpexYear1: data.totalOpexYear1 ?? 0,
		opexGrowthRate: data.opexGrowthRate ?? 0.03,
		terminalCapRate: data.terminalCapRate ?? 0.055,
		costOfSalePercent: data.costOfSalePercent ?? 0.03,
		loanLtv: data.loanLtv ?? 0.65,
		loanInterestRate: data.loanInterestRate ?? 0.065,
		amortizationYears: data.amortizationYears ?? 30,
		interestOnly: data.interestOnly ?? false
	});

	const mergedConfig = $derived<ProFormaLeveredCfConfig>({
		...widgetData,
		...(topicData.current?.egiYear1 != null ? { egiYear1: topicData.current.egiYear1 } : {}),
		...(topicData.current?.totalOpexYear1 != null
			? { totalOpexYear1: topicData.current.totalOpexYear1 }
			: {}),
		...(topicData.current?.purchasePrice != null
			? { purchasePrice: topicData.current.purchasePrice }
			: {})
	});

	const result = $derived(computeLeveredProjections(mergedConfig));
	const columns = $derived(result.columns);
	const t = $derived(proFormaTheme(darkMode));
	const N = $derived(mergedConfig.projectionYears);

	function fmtCf(year: number, value: number): string {
		if (year === 0 && value === 0) return '-';
		if (value === 0 && year > 0) return '-';
		if (value < 0) return `(${fmt(Math.abs(value))})`;
		return fmt(value);
	}

	function fmtEquity(year: number, amount: number): string {
		if (year !== 0 || amount === 0) return '-';
		return `(${fmt(amount)})`;
	}

	function fmtSaleLevered(year: number, amount: number, valid: boolean): string {
		if (year !== N) return '-';
		if (!valid || amount === 0) return '—';
		return fmt(amount);
	}

	let isFlipped = $state(false);
	let draftPropertyName = $state('');
	let draftYears = $state(5);
	let draftPurchase = $state(0);
	let draftAcqCosts = $state(0);
	let draftCapEx = $state(0);
	let draftEgiY1 = $state(0);
	let draftEgiGrowth = $state(0.03);
	let draftOpexY1 = $state(0);
	let draftOpexGrowth = $state(0.03);
	let draftExitCap = $state(0.055);
	let draftCostSale = $state(0.03);
	let draftLtv = $state(0.65);
	let draftLoanRate = $state(0.065);
	let draftAmort = $state(30);
	let draftIo = $state(false);

	function syncDraft() {
		draftPropertyName = widgetData.propertyName ?? '';
		draftYears = widgetData.projectionYears;
		draftPurchase = widgetData.purchasePrice;
		draftAcqCosts = widgetData.acquisitionCosts;
		draftCapEx = widgetData.initialCapEx;
		draftEgiY1 = widgetData.egiYear1;
		draftEgiGrowth = widgetData.egiGrowthRate;
		draftOpexY1 = widgetData.totalOpexYear1;
		draftOpexGrowth = widgetData.opexGrowthRate;
		draftExitCap = widgetData.terminalCapRate;
		draftCostSale = widgetData.costOfSalePercent;
		draftLtv = widgetData.loanLtv;
		draftLoanRate = widgetData.loanInterestRate;
		draftAmort = widgetData.amortizationYears;
		draftIo = widgetData.interestOnly;
	}

	function toggleFlip() {
		isFlipped = !isFlipped;
		if (isFlipped) syncDraft();
	}

	$effect(() => {
		onConfigureReady?.(toggleFlip);
	});

	function applyConfig() {
		onUpdateConfig?.({
			propertyName: draftPropertyName.trim() || undefined,
			projectionYears: draftYears,
			purchasePrice: draftPurchase,
			acquisitionCosts: draftAcqCosts,
			initialCapEx: draftCapEx,
			egiYear1: draftEgiY1,
			egiGrowthRate: draftEgiGrowth,
			totalOpexYear1: draftOpexY1,
			opexGrowthRate: draftOpexGrowth,
			terminalCapRate: draftExitCap,
			costOfSalePercent: draftCostSale,
			loanLtv: draftLtv,
			loanInterestRate: draftLoanRate,
			amortizationYears: draftAmort,
			interestOnly: draftIo
		});
		isFlipped = false;
	}

	function cancelConfig() {
		isFlipped = false;
	}
</script>

<FlipCard {isFlipped} shellClass={t.shell} flipBackClass={t.flipBackBg}>
	{#snippet front()}
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr>
					<th colspan={N + 2} class="px-4 py-2.5 text-left text-sm font-bold tracking-tight {t.headerBg} {t.headerText} rounded-t-lg">
						Levered Before-Tax Cash Flow
						{#if mergedConfig.propertyName}
							<span class="ml-2 font-normal opacity-80">— {mergedConfig.propertyName}</span>
						{/if}
					</th>
				</tr>
				<tr class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b">
					<th class="px-4 py-2 text-left text-xs font-medium {t.muted} w-[200px] min-w-[160px]">($)</th>
					{#each columns as c}
						<th class="px-3 py-2 text-right text-xs font-medium {t.muted} min-w-[88px]">Year {c.year}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr class={t.sectionHeaderBg}>
					<td colspan={N + 2} class="px-4 py-1.5 text-xs uppercase tracking-wider {t.sectionHeaderText}">
						Levered before-tax cash flow
					</td>
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Equity Investment</td>
					{#each columns as c}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmtEquity(c.year, c.equityInvestment)}
						</td>
					{/each}
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Net Operating Income</td>
					{#each columns as c}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{c.year === 0 ? '-' : fmt(c.netOperatingIncome)}
						</td>
					{/each}
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Less: Debt Service</td>
					{#each columns as c}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{c.year === 0 || c.debtService === 0
								? '-'
								: `(${fmt(c.debtService)})`}
						</td>
					{/each}
				</tr>

				<tr class="border-b-2 {t.cellBorder} {t.subtotalBg}">
					<td class="py-1.5 pl-8 pr-4 text-xs font-semibold {t.subtotalText}">Before-Tax Cash Flow (Ops)</td>
					{#each columns as c}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums font-semibold {t.subtotalText}">
							{c.year === 0 ? '-' : fmtCf(c.year, c.beforeTaxCashFlowOps)}
						</td>
					{/each}
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Net Sale Proceeds (after payoff)</td>
					{#each columns as c}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmtSaleLevered(c.year, c.netSaleProceedsAfterPayoff, result.exitCapValid)}
						</td>
					{/each}
				</tr>

				<tr class="{t.subtotalBg}">
					<td class="py-2 pl-8 pr-4 text-xs {t.subtotalText}">Levered Before-Tax CF</td>
					{#each columns as c}
						<td class="px-3 py-2 text-right font-mono text-xs tabular-nums {t.subtotalText}">
							{fmtCf(c.year, c.leveredBeforeTaxCf)}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>

		<div
			class="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2.5 text-[11px] {t.summaryBorder} {t.muted}"
		>
			<span>LTV {pct(mergedConfig.loanLtv)}</span>
			<span>Loan ${fmt(result.loanAmount)}</span>
			<span>Rate {pct(mergedConfig.loanInterestRate)}</span>
			<span>{mergedConfig.interestOnly ? 'I/O' : `${mergedConfig.amortizationYears}yr amort`}</span>
			<span>Payoff Y{N} ${fmt(result.remainingLoanAtSale)}</span>
		</div>
	{/snippet}

	{#snippet back()}
		<div class="flex min-h-full flex-col items-center px-4 py-5 sm:px-6">
			<div class="flex w-full max-w-lg flex-1 flex-col">
				<header class="mb-4 shrink-0 text-center sm:text-left">
					<h3 class="text-lg font-bold {t.cfgTitle}">Configure Levered Cash Flow</h3>
					<p class="mt-1 text-sm {t.muted}">
						Same acquisition, NOI, and exit as the unlevered model, plus loan terms. Equity = acquisition − loan.
					</p>
				</header>

				<section class="{t.cfgPanel} max-h-[calc(100%-72px)] overflow-y-auto" aria-label="Widget configuration">
					<form
						class="flex flex-col gap-3"
						onsubmit={(e) => {
							e.preventDefault();
							applyConfig();
						}}
					>
						<label class="block">
							<span class={t.cfgLabel}>Property Name (optional)</span>
							<input type="text" bind:value={draftPropertyName} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Holding period (Year N = sale)</span>
							<input type="number" bind:value={draftYears} min="1" max="10" class={t.cfgField} />
						</label>

						<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<legend class="px-1 text-xs font-semibold {t.muted}">Acquisition</legend>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
								<label class="block">
									<span class={t.cfgLabel}>Purchase ($)</span>
									<input type="number" bind:value={draftPurchase} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>Acq. costs ($)</span>
									<input type="number" bind:value={draftAcqCosts} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>Initial CapEx ($)</span>
									<input type="number" bind:value={draftCapEx} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								</label>
							</div>
						</fieldset>

						<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<legend class="px-1 text-xs font-semibold {t.muted}">NOI</legend>
							<div class="grid grid-cols-2 gap-2">
								<label class="block">
									<span class={t.cfgLabel}>Y1 EGI ($)</span>
									<input type="number" bind:value={draftEgiY1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>EGI growth</span>
									<input type="number" bind:value={draftEgiGrowth} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>Y1 OpEx ($)</span>
									<input type="number" bind:value={draftOpexY1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>OpEx growth</span>
									<input type="number" bind:value={draftOpexGrowth} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
								</label>
							</div>
						</fieldset>

						<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<legend class="px-1 text-xs font-semibold {t.muted}">Exit</legend>
							<div class="grid grid-cols-2 gap-2">
								<label class="block">
									<span class={t.cfgLabel}>Terminal cap</span>
									<input type="number" bind:value={draftExitCap} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>Cost of sale</span>
									<input type="number" bind:value={draftCostSale} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
								</label>
							</div>
						</fieldset>

						<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<legend class="px-1 text-xs font-semibold {t.muted}">Debt</legend>
							<label class="block">
								<span class={t.cfgLabel}>Loan-to-value (of acquisition)</span>
								<input type="number" bind:value={draftLtv} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
							</label>
							<label class="block">
								<span class={t.cfgLabel}>Annual interest rate</span>
								<input type="number" bind:value={draftLoanRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
							</label>
							<label class="block">
								<span class={t.cfgLabel}>Amortization (years)</span>
								<input type="number" bind:value={draftAmort} min="1" max="40" class={t.cfgField} />
							</label>
							<label class="flex items-center gap-2">
								<input type="checkbox" bind:checked={draftIo} class="rounded" />
								<span class="text-sm {t.muted}">Interest-only (balance unchanged until payoff)</span>
							</label>
						</fieldset>

						<div class="flex justify-end gap-2 border-t pt-4 {darkMode ? 'border-slate-600' : 'border-slate-200'}">
							<button type="button" class={t.cfgBtnSecondary} onclick={cancelConfig}>Cancel</button>
							<button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
								Apply
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	{/snippet}
</FlipCard>
