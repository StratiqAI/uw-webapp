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
	import {
		fmt,
		pct,
		proFormaTheme,
		irr,
		npv,
		equityMultiple,
		cashOnCash
	} from '@stratiqai/widget-pro-forma-base';
	import {
		computeLeveredProjections,
		extractLeveredCashFlows
	} from '@stratiqai/widget-pro-forma-levered-cf';
	import type { ProFormaLeveredReturnsConfig, ProFormaLeveredReturnsInput } from './schema.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-levered-returns-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaLeveredReturnsConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaLeveredReturns', widgetId, topicOverride);
	const aiStatus = useAiGenerationStatus(() => topic);
	const topicData = useReactiveValidatedTopic<ProFormaLeveredReturnsInput>(topic);

	const widgetData = $derived<ProFormaLeveredReturnsConfig>({
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
		interestOnly: data.interestOnly ?? false,
		leveredDiscountRate: data.leveredDiscountRate ?? 0.12
	});

	const mergedConfig = $derived<ProFormaLeveredReturnsConfig>({
		...widgetData,
		...(topicData.current?.egiYear1 != null ? { egiYear1: topicData.current.egiYear1 } : {}),
		...(topicData.current?.totalOpexYear1 != null
			? { totalOpexYear1: topicData.current.totalOpexYear1 }
			: {}),
		...(topicData.current?.purchasePrice != null
			? { purchasePrice: topicData.current.purchasePrice }
			: {})
	});

	const levResult = $derived(computeLeveredProjections(mergedConfig));
	const cfs = $derived(extractLeveredCashFlows(levResult));
	const irrVal = $derived(irr(cfs));
	const npvVal = $derived(npv(mergedConfig.leveredDiscountRate, cfs));
	const multVal = $derived(equityMultiple(cfs));
	const y0Equity = $derived(levResult.columns[0]?.equityInvestment ?? 0);
	const y1Ops = $derived(levResult.columns[1]?.beforeTaxCashFlowOps ?? 0);
	const cocVal = $derived(cashOnCash(y0Equity, y1Ops));

	const N = $derived(mergedConfig.projectionYears);
	const years = $derived(Array.from({ length: N + 1 }, (_, i) => i));

	const t = $derived(proFormaTheme(darkMode));

	function cellMetric(y: number, value: string): string {
		return y === 0 ? value : '-';
	}

	const configure = useWidgetConfigure<ProFormaLeveredReturnsConfig>({
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
						Levered Return Metrics
						{#if mergedConfig.propertyName}
							<span class="ml-2 font-normal opacity-80">— {mergedConfig.propertyName}</span>
						{/if}
					</th>
				</tr>
				<tr class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b">
					<th class="px-4 py-2 text-left text-xs font-medium {t.muted} w-[200px]">($)</th>
					{#each years as y}
						<th class="px-3 py-2 text-right text-xs font-medium {t.muted} min-w-[72px]">Year {y}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr class={t.sectionHeaderBg}>
					<td colspan={N + 2} class="px-4 py-1.5 text-xs uppercase tracking-wider {t.sectionHeaderText}">
						Levered return metrics
					</td>
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Levered IRR</td>
					{#each years as y}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{cellMetric(y, irrVal === null ? '—' : pct(irrVal))}
						</td>
					{/each}
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Levered NPV</td>
					{#each years as y}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{cellMetric(y, Number.isFinite(npvVal) ? fmt(npvVal) : '—')}
						</td>
					{/each}
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Equity Multiple (Levered)</td>
					{#each years as y}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{cellMetric(y, multVal === null ? '—' : `${multVal.toFixed(2)}x`)}
						</td>
					{/each}
				</tr>

				<tr class="{t.subtotalBg}">
					<td class="py-2 pl-8 pr-4 text-xs {t.subtotalText}">Cash-on-Cash Return (Year 1)</td>
					{#each years as y}
						<td class="px-3 py-2 text-right font-mono text-xs tabular-nums {t.subtotalText}">
							{cellMetric(y, cocVal === null ? '—' : pct(cocVal))}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>

		<div class="shrink-0 border-t px-4 py-2.5 text-[11px] {t.summaryBorder} {t.muted}">
			Levered discount (NPV) {pct(mergedConfig.leveredDiscountRate)} · Based on levered before-tax cash flows
		</div>
	{/if}
	{/snippet}

	{#snippet back()}
		<WidgetConfigureBack
			kind="proFormaLeveredReturns"
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
					<span class={t.cfgLabel}>Property name (optional)</span>
					<input type="text" bind:value={configure.draft.propertyName} class={t.cfgField} />
				</label>
				<label class="block">
					<span class={t.cfgLabel}>Levered discount rate (NPV)</span>
					<input
						type="number"
						bind:value={configure.draft.leveredDiscountRate}
						min="0"
						max="1"
						step={FORM_STEP_RATE}
						class={t.cfgField}
					/>
				</label>
				<label class="block">
					<span class={t.cfgLabel}>Holding period (Year N)</span>
					<input type="number" bind:value={configure.draft.projectionYears} min="1" max="10" class={t.cfgField} />
				</label>
				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Acquisition</legend>
					<div class="grid grid-cols-3 gap-2">
						<label class="block"
							><span class={t.cfgLabel}>Purchase</span>
							<input type="number" bind:value={configure.draft.purchasePrice} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block"
							><span class={t.cfgLabel}>Acq. costs</span>
							<input type="number" bind:value={configure.draft.acquisitionCosts} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block"
							><span class={t.cfgLabel}>CapEx</span>
							<input type="number" bind:value={configure.draft.initialCapEx} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
					</div>
				</fieldset>
				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">NOI</legend>
					<div class="grid grid-cols-2 gap-2">
						<label class="block"
							><span class={t.cfgLabel}>Y1 EGI</span>
							<input type="number" bind:value={configure.draft.egiYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block"
							><span class={t.cfgLabel}>EGI gr.</span>
							<input type="number" bind:value={configure.draft.egiGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
						<label class="block"
							><span class={t.cfgLabel}>Y1 OpEx</span>
							<input type="number" bind:value={configure.draft.totalOpexYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block"
							><span class={t.cfgLabel}>OpEx gr.</span>
							<input type="number" bind:value={configure.draft.opexGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
					</div>
				</fieldset>
				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Exit</legend>
					<div class="grid grid-cols-2 gap-2">
						<label class="block"
							><span class={t.cfgLabel}>Terminal cap</span>
							<input type="number" bind:value={configure.draft.terminalCapRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
						<label class="block"
							><span class={t.cfgLabel}>Cost of sale</span>
							<input type="number" bind:value={configure.draft.costOfSalePercent} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
					</div>
				</fieldset>
				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Debt</legend>
					<label class="block">
						<span class={t.cfgLabel}>Loan-to-value</span>
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
						<span class="text-sm {t.muted}">Interest-only</span>
					</label>
				</fieldset>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
