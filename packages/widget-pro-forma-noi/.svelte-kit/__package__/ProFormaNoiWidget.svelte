<script lang="ts">
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import { FlipCard, fmt, pct, proFormaTheme } from '@stratiqai/widget-pro-forma-base';
	import type { ProFormaNoiConfig, ProFormaNoiInput } from './schema.js';
	import { computeNoiProjections, type NoiYearProjection } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-noi-default',
		topicOverride,
		darkMode = true,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaNoiConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaNoi', widgetId, topicOverride);
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

	/** NOI banner + accents — matches reference (#DCE6F1 / #002060) in light mode. */
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

	let isFlipped = $state(false);
	let draftEgiY1 = $state(0);
	let draftEgiGrowth = $state(0.03);
	let draftOpexY1 = $state(0);
	let draftOpexGrowth = $state(0.03);
	let draftYears = $state(5);
	let draftPropertyName = $state('');
	let draftShowBreakdown = $state(false);

	function syncDraft() {
		draftEgiY1 = widgetData.egiYear1;
		draftEgiGrowth = widgetData.egiGrowthRate;
		draftOpexY1 = widgetData.totalOpexYear1;
		draftOpexGrowth = widgetData.opexGrowthRate;
		draftYears = widgetData.projectionYears;
		draftPropertyName = widgetData.propertyName ?? '';
		draftShowBreakdown = widgetData.showBreakdown;
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
			egiYear1: draftEgiY1,
			egiGrowthRate: draftEgiGrowth,
			totalOpexYear1: draftOpexY1,
			opexGrowthRate: draftOpexGrowth,
			projectionYears: draftYears,
			propertyName: draftPropertyName.trim() || undefined,
			showBreakdown: draftShowBreakdown
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
	{/snippet}

	{#snippet back()}
		<div class="flex min-h-full flex-col items-center px-4 py-5 sm:px-6">
			<div class="flex w-full max-w-lg flex-1 flex-col">
				<header class="mb-4 shrink-0 text-center sm:text-left">
					<h3 class="text-lg font-bold {t.cfgTitle}">Configure Net Operating Income</h3>
					<p class="mt-1 text-sm {t.muted}">
						NOI is calculated as Effective Gross Income minus total operating expenses for each year.
						Match Year 1 values to your Revenue and OpEx widgets, or publish EGI / OpEx via topics.
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

						<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<legend class="px-1 text-xs font-semibold {t.muted}">Effective Gross Income</legend>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<label class="block">
									<span class={t.cfgLabel}>Year 1 EGI ($)</span>
									<input type="number" bind:value={draftEgiY1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>Annual EGI Growth</span>
									<input type="number" bind:value={draftEgiGrowth} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
									<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3%/yr</p>
								</label>
							</div>
						</fieldset>

						<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<legend class="px-1 text-xs font-semibold {t.muted}">Total Operating Expenses</legend>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<label class="block">
									<span class={t.cfgLabel}>Year 1 Total OpEx ($)</span>
									<input type="number" bind:value={draftOpexY1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>Annual OpEx Growth</span>
									<input type="number" bind:value={draftOpexGrowth} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
									<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3%/yr</p>
								</label>
							</div>
						</fieldset>

						<label class="block">
							<span class={t.cfgLabel}>Projection Years</span>
							<input type="number" bind:value={draftYears} min="1" max="10" step="1" class={t.cfgField} />
						</label>

						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={draftShowBreakdown} class="rounded" />
							<span class="text-sm {t.muted}">Show EGI and OpEx rows on the table</span>
						</label>

						<div class="flex justify-end gap-2 border-t pt-4 {darkMode ? 'border-slate-600' : 'border-slate-200'}">
							<button type="button" class={t.cfgBtnSecondary} onclick={cancelConfig}>Cancel</button>
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
