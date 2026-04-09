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
	import { fmt, pct, proFormaTheme } from '@stratiqai/widget-pro-forma-base';
	import type { ProFormaLeveredCfConfig, ProFormaLeveredCfInput } from './schema.js';
	import { computeLeveredProjections } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-levered-cf-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaLeveredCfConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaLeveredCf', widgetId, topicOverride);
	const aiStatus = useAiGenerationStatus(() => topic);
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

	const configure = useWidgetConfigure<ProFormaLeveredCfConfig>({
		widgetId: () => widgetId,
		data: () => widgetData,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});
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
	{/if}
	{/snippet}

	{#snippet back()}
		<WidgetConfigureBack
			kind="proFormaLeveredCf"
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
					<input type="text" bind:value={configure.draft.propertyName} class={t.cfgField} />
				</label>
				<label class="block">
					<span class={t.cfgLabel}>Holding period (Year N = sale)</span>
					<input type="number" bind:value={configure.draft.projectionYears} min="1" max="10" class={t.cfgField} />
				</label>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Acquisition</legend>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<label class="block">
							<span class={t.cfgLabel}>Purchase ($)</span>
							<input type="number" bind:value={configure.draft.purchasePrice} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Acq. costs ($)</span>
							<input type="number" bind:value={configure.draft.acquisitionCosts} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Initial CapEx ($)</span>
							<input type="number" bind:value={configure.draft.initialCapEx} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
					</div>
				</fieldset>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">NOI</legend>
					<div class="grid grid-cols-2 gap-2">
						<label class="block">
							<span class={t.cfgLabel}>Y1 EGI ($)</span>
							<input type="number" bind:value={configure.draft.egiYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>EGI growth</span>
							<input type="number" bind:value={configure.draft.egiGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Y1 OpEx ($)</span>
							<input type="number" bind:value={configure.draft.totalOpexYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>OpEx growth</span>
							<input type="number" bind:value={configure.draft.opexGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
					</div>
				</fieldset>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Exit</legend>
					<div class="grid grid-cols-2 gap-2">
						<label class="block">
							<span class={t.cfgLabel}>Terminal cap</span>
							<input type="number" bind:value={configure.draft.terminalCapRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Cost of sale</span>
							<input type="number" bind:value={configure.draft.costOfSalePercent} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
					</div>
				</fieldset>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Debt</legend>
					<label class="block">
						<span class={t.cfgLabel}>Loan-to-value (of acquisition)</span>
						<input type="number" bind:value={configure.draft.loanLtv} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
					</label>
					<label class="block">
						<span class={t.cfgLabel}>Annual interest rate</span>
						<input type="number" bind:value={configure.draft.loanInterestRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
					</label>
					<label class="block">
						<span class={t.cfgLabel}>Amortization (years)</span>
						<input type="number" bind:value={configure.draft.amortizationYears} min="1" max="40" class={t.cfgField} />
					</label>
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={configure.draft.interestOnly} class="rounded" />
						<span class="text-sm {t.muted}">Interest-only (balance unchanged until payoff)</span>
					</label>
				</fieldset>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
