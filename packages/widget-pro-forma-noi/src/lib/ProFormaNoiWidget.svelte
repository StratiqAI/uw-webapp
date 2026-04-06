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
	import type { ProFormaNoiConfig, ProFormaNoiInput } from './schema.js';
	import { computeNoiProjections, type NoiYearProjection } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-noi-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaNoiConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaNoi', widgetId, topicOverride);
	const aiStatus = useAiGenerationStatus(() => topic);
	const topicData = useReactiveValidatedTopic<ProFormaNoiInput>(topic);

	const widgetData = $derived<ProFormaNoiConfig>({
		egiYear1: data.egiYear1 ?? 0,
		egiGrowthRate: data.egiGrowthRate ?? 0.03,
		totalOpexYear1: data.totalOpexYear1 ?? 0,
		opexGrowthRate: data.opexGrowthRate ?? 0.03,
		projectionYears: data.projectionYears ?? 5,
		propertyName: data.propertyName,
		showBreakdown: data.showBreakdown ?? false
	});

	const mergedConfig = $derived<ProFormaNoiConfig>({
		...widgetData,
		...(topicData.current?.egiYear1 != null ? { egiYear1: topicData.current.egiYear1 } : {}),
		...(topicData.current?.totalOpexYear1 != null
			? { totalOpexYear1: topicData.current.totalOpexYear1 }
			: {})
	});

	const projections = $derived<NoiYearProjection[]>(computeNoiProjections(mergedConfig));
	const t = $derived(proFormaTheme(darkMode));

	const noiBanner = $derived(
		darkMode
			? 'bg-sky-950/50 text-sky-100 border-b-2 border-sky-700'
			: 'bg-[#DCE6F1] text-[#002060] border-b-2 border-[#002060]'
	);
	const noiRowLabel = $derived(darkMode ? 'text-sky-100 font-bold' : 'text-[#002060] font-bold');
	const noiRowValue = $derived(darkMode ? 'text-slate-100 font-semibold' : 'text-[#002060] font-semibold');
	const noiDoubleRule = $derived(darkMode ? 'border-b-4 border-double border-sky-600' : 'border-b-4 border-double border-[#002060]');

	function fmtNoi(year: number, value: number): string {
		if (year === 0 || value === 0) return '-';
		if (value < 0) return `(${fmt(Math.abs(value))})`;
		return fmt(value);
	}

	const configure = useWidgetConfigure<ProFormaNoiConfig>({
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
					<th
						colspan={mergedConfig.projectionYears + 2}
						class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide {noiBanner} rounded-t-lg"
					>
						Net Operating Income (NOI)
						{#if mergedConfig.propertyName}
							<span class="ml-2 font-semibold normal-case opacity-90">
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
				{#if mergedConfig.showBreakdown}
					<tr class="border-b {t.cellBorder}">
						<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Effective Gross Income (EGI)</td>
						{#each projections as p}
							<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
								{fmt(p.effectiveGrossIncome)}
							</td>
						{/each}
					</tr>
					<tr class="border-b {t.cellBorder}">
						<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Less: Total Operating Expenses</td>
						{#each projections as p}
							<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
								{p.year === 0 || p.totalOperatingExpenses === 0
									? '-'
									: `(${fmt(p.totalOperatingExpenses)})`}
							</td>
						{/each}
					</tr>
				{/if}

				<tr class="{noiDoubleRule} {t.subtotalBg}">
					<td class="py-2.5 pl-8 pr-4 text-xs {noiRowLabel}">Net Operating Income</td>
					{#each projections as p}
						<td
							class="px-3 py-2.5 text-right font-mono text-xs tabular-nums {noiRowValue} {p.netOperatingIncome < 0 && p.year > 0 ? (darkMode ? 'text-red-300' : 'text-red-700') : ''}"
						>
							{fmtNoi(p.year, p.netOperatingIncome)}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>

		<div
			class="shrink-0 flex flex-wrap items-center gap-x-6 gap-y-1 border-t px-4 py-2.5 text-[11px] {t.summaryBorder} {t.muted}"
		>
			<span>EGI Y1 ${mergedConfig.egiYear1.toLocaleString()} · Growth {pct(mergedConfig.egiGrowthRate)}/yr</span>
			<span>OpEx Y1 ${mergedConfig.totalOpexYear1.toLocaleString()} · Growth {pct(mergedConfig.opexGrowthRate)}/yr</span>
		</div>
	{/if}
	{/snippet}

	{#snippet back()}
		<WidgetConfigureBack
			kind="proFormaNoi"
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

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Effective Gross Income</legend>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label class="block">
							<span class={t.cfgLabel}>Year 1 EGI ($)</span>
							<input type="number" bind:value={configure.draft.egiYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Annual EGI Growth</span>
							<input type="number" bind:value={configure.draft.egiGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
							<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3%/yr</p>
						</label>
					</div>
				</fieldset>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Total Operating Expenses</legend>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label class="block">
							<span class={t.cfgLabel}>Year 1 Total OpEx ($)</span>
							<input type="number" bind:value={configure.draft.totalOpexYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>Annual OpEx Growth</span>
							<input type="number" bind:value={configure.draft.opexGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
							<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3%/yr</p>
						</label>
					</div>
				</fieldset>

				<label class="block">
					<span class={t.cfgLabel}>Projection Years</span>
					<input type="number" bind:value={configure.draft.projectionYears} min="1" max="10" step="1" class={t.cfgField} />
				</label>

				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={configure.draft.showBreakdown} class="rounded" />
					<span class="text-sm {t.muted}">Show EGI and OpEx rows on the table</span>
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
