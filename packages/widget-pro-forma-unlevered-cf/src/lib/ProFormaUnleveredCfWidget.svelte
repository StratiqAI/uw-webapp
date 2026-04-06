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
	import type { ProFormaUnleveredCfConfig, ProFormaUnleveredCfInput } from './schema.js';
	import { computeUnleveredProjections } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-unlevered-cf-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaUnleveredCfConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaUnleveredCf', widgetId, topicOverride);
	const aiStatus = useAiGenerationStatus(() => topic);
	const topicData = useReactiveValidatedTopic<ProFormaUnleveredCfInput>(topic);

	const widgetData = $derived<ProFormaUnleveredCfConfig>({
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
		costOfSalePercent: data.costOfSalePercent ?? 0.03
	});

	const mergedConfig = $derived<ProFormaUnleveredCfConfig>({
		...widgetData,
		...(topicData.current?.egiYear1 != null ? { egiYear1: topicData.current.egiYear1 } : {}),
		...(topicData.current?.totalOpexYear1 != null
			? { totalOpexYear1: topicData.current.totalOpexYear1 }
			: {}),
		...(topicData.current?.purchasePrice != null
			? { purchasePrice: topicData.current.purchasePrice }
			: {})
	});

	const result = $derived(computeUnleveredProjections(mergedConfig));
	const columns = $derived(result.columns);
	const t = $derived(proFormaTheme(darkMode));

	function fmtCf(year: number, value: number): string {
		if (year === 0 && value === 0 && mergedConfig.purchasePrice + mergedConfig.acquisitionCosts + mergedConfig.initialCapEx === 0) {
			return '-';
		}
		if (value === 0 && year > 0) return '-';
		if (value < 0) return `(${fmt(Math.abs(value))})`;
		return fmt(value);
	}

	function fmtAcq(year: number, amount: number): string {
		if (year !== 0 || amount === 0) return '-';
		return `(${fmt(amount)})`;
	}

	function fmtSale(year: number, N: number, amount: number, valid: boolean): string {
		if (year !== N) return '-';
		if (!valid) return '—';
		if (amount === 0) return '-';
		return fmt(amount);
	}

	const configure = useWidgetConfigure<ProFormaUnleveredCfConfig>({
		data: () => widgetData,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	const N = $derived(mergedConfig.projectionYears);
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
						colspan={N + 2}
						class="px-4 py-2.5 text-left text-sm font-bold tracking-tight {t.headerBg} {t.headerText} rounded-t-lg"
					>
						Unlevered Before-Tax Cash Flow
						{#if mergedConfig.propertyName}
							<span class="ml-2 font-normal opacity-80">— {mergedConfig.propertyName}</span>
						{/if}
					</th>
				</tr>
				<tr class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b">
					<th class="px-4 py-2 text-left text-xs font-medium {t.muted} w-[220px] min-w-[180px]">
						($)
					</th>
					{#each columns as c}
						<th class="px-3 py-2 text-right text-xs font-medium {t.muted} min-w-[100px]">
							Year {c.year}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr class={t.sectionHeaderBg}>
					<td colspan={N + 2} class="px-4 py-1.5 text-xs uppercase tracking-wider {t.sectionHeaderText}">
						Unlevered before-tax cash flow
					</td>
				</tr>

				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Acquisition Cost</td>
					{#each columns as c}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmtAcq(c.year, c.acquisitionCost)}
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
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">
						Net Sale Proceeds (Reversion)
						{#if !result.exitCapValid}
							<span class="ml-1 text-[10px] opacity-70">(set exit cap)</span>
						{/if}
					</td>
					{#each columns as c}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmtSale(c.year, N, c.netSaleProceeds, result.exitCapValid)}
						</td>
					{/each}
				</tr>

				<tr class="border-b-2 {t.cellBorder} {t.subtotalBg}">
					<td class="py-2 pl-8 pr-4 text-xs {t.subtotalText}">Unlevered Before-Tax CF</td>
					{#each columns as c}
						<td class="px-3 py-2 text-right font-mono text-xs tabular-nums {t.subtotalText}">
							{fmtCf(c.year, c.unleveredBeforeTaxCf)}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>

		<div
			class="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-[11px] {t.summaryBorder} {t.muted}"
		>
			<span>Exit cap {pct(mergedConfig.terminalCapRate)}</span>
			<span>Cost of sale {pct(mergedConfig.costOfSalePercent)}</span>
			<span>Year {N + 1} NOI (reversion) ${fmt(result.year6Noi)}</span>
			{#if result.exitCapValid && result.grossSalePrice != null}
				<span>Gross sale ${fmt(result.grossSalePrice)}</span>
			{/if}
		</div>
	{/if}
	{/snippet}

	{#snippet back()}
		<WidgetConfigureBack
			kind="proFormaUnleveredCf"
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
					<span class={t.cfgLabel}>Holding period (last column year)</span>
					<input type="number" bind:value={configure.draft.projectionYears} min="1" max="10" step="1" class={t.cfgField} />
					<p class="mt-0.5 text-[11px] {t.muted}">Table shows Year 0 … Year N (e.g. 5 → sale in Year 5).</p>
				</label>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Acquisition (Year 0)</legend>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<label class="block">
							<span class={t.cfgLabel}>Purchase Price ($)</span>
							<input type="number" bind:value={configure.draft.purchasePrice} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Acquisition Costs ($)</span>
							<input type="number" bind:value={configure.draft.acquisitionCosts} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Initial CapEx ($)</span>
							<input type="number" bind:value={configure.draft.initialCapEx} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
					</div>
				</fieldset>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">NOI bridge (same as Revenue / OpEx)</legend>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label class="block">
							<span class={t.cfgLabel}>Year 1 EGI ($)</span>
							<input type="number" bind:value={configure.draft.egiYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>EGI growth / yr</span>
							<input type="number" bind:value={configure.draft.egiGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Year 1 Total OpEx ($)</span>
							<input type="number" bind:value={configure.draft.totalOpexYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>OpEx growth / yr</span>
							<input type="number" bind:value={configure.draft.opexGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						</label>
					</div>
				</fieldset>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Reversion (Year N)</legend>
					<label class="block">
						<span class={t.cfgLabel}>Terminal cap rate (exit)</span>
						<input type="number" bind:value={configure.draft.terminalCapRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						<p class="mt-0.5 text-[11px] {t.muted}">
							Must be greater than zero or sale proceeds show as unavailable (#DIV/0! equivalent).
						</p>
					</label>
					<label class="block">
						<span class={t.cfgLabel}>Cost of sale (% of gross price)</span>
						<input type="number" bind:value={configure.draft.costOfSalePercent} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
					</label>
				</fieldset>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
