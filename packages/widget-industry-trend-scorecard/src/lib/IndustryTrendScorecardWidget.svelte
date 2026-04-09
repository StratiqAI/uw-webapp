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
	import type { IndustryTrendScorecardConfig, IndustryData, QuarterMetrics } from './schema.js';
	import { DEMO_INDUSTRIES, DEMO_QUARTERS, DEMO_WEIGHTS } from './demoData.js';
	import * as d3 from 'd3';

	type MetricTab = 'emp' | 'lq' | 'wage' | 'estab';

	const TAB_LABELS: Record<MetricTab, string> = {
		emp: 'Employment YoY %',
		lq: 'LQ Trend',
		wage: 'Wage YoY %',
		estab: 'Estab YoY %'
	};

	const CHART_TITLES: Record<MetricTab, string> = {
		emp: 'Employment \u2014 Over-the-Year % Change',
		lq: 'Location Quotient \u2014 Over Time',
		wage: 'Wages \u2014 Over-the-Year % Change',
		estab: 'Establishments \u2014 Over-the-Year % Change'
	};

	const METRIC_ACCESSOR: Record<MetricTab, (q: QuarterMetrics) => number> = {
		emp: (q) => q.empYoy,
		lq: (q) => q.lqValue,
		wage: (q) => q.wageYoy,
		estab: (q) => q.estabYoy
	};

	let {
		data,
		widgetId = 'industry-trend-scorecard-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<IndustryTrendScorecardConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('industryTrendScorecard', widgetId, topicOverride);
	const topicData = useReactiveValidatedTopic<IndustryTrendScorecardConfig>(topic);
	const aiStatus = useAiGenerationStatus(() => topic);

	const widgetData = $derived<IndustryTrendScorecardConfig>({
		quarters: data.quarters?.length ? data.quarters : DEMO_QUARTERS,
		industries: data.industries?.length ? data.industries : DEMO_INDUSTRIES,
		weights: data.weights ?? DEMO_WEIGHTS,
		...(topicData.current ?? {})
	});

	const configure = useWidgetConfigure({
		widgetId,
		data: () => widgetData,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	let activeTab = $state<MetricTab>('emp');
	let hiddenIndustries = $state<Set<string>>(new Set());
	let sortColumn = $state<string>('score');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	function toggleIndustry(name: string) {
		const next = new Set(hiddenIndustries);
		if (next.has(name)) next.delete(name);
		else next.add(name);
		hiddenIndustries = next;
	}

	const lastQuarterData = $derived.by(() => {
		return widgetData.industries.map((ind) => {
			const last = ind.data[ind.data.length - 1];
			return { industry: ind, metrics: last };
		});
	});

	function minMaxNorm(values: number[]): number[] {
		const min = Math.min(...values);
		const max = Math.max(...values);
		if (max === min) return values.map(() => 50);
		return values.map((v) => ((v - min) / (max - min)) * 100);
	}

	function lqTrendScore(trend: string): number {
		if (trend === 'rising') return 100;
		if (trend === 'falling') return 0;
		return 50;
	}

	interface ScoredIndustry {
		industry: IndustryData;
		metrics: QuarterMetrics;
		score: number;
	}

	const scoredIndustries = $derived.by((): ScoredIndustry[] => {
		const items = lastQuarterData;
		if (items.length === 0) return [];

		const empVals = items.map((i) => i.metrics.empYoy);
		const wageVals = items.map((i) => i.metrics.wageYoy);
		const estabVals = items.map((i) => i.metrics.estabYoy);

		const empNorm = minMaxNorm(empVals);
		const wageNorm = minMaxNorm(wageVals);
		const estabNorm = minMaxNorm(estabVals);

		const w = widgetData.weights;
		const totalWeight = w.emp + w.lq + w.wage + w.estab;
		if (totalWeight === 0) return items.map((i) => ({ ...i, score: 0 }));

		return items.map((item, idx) => {
			const lqN = lqTrendScore(item.industry.lqTrend);
			const composite =
				(empNorm[idx] * w.emp + lqN * w.lq + wageNorm[idx] * w.wage + estabNorm[idx] * w.estab) /
				totalWeight;
			return { ...item, score: Math.round(composite) };
		});
	});

	const sortedIndustries = $derived.by(() => {
		const list = [...scoredIndustries];
		const col = sortColumn;
		const dir = sortDirection;

		list.sort((a, b) => {
			let cmp = 0;
			if (col === 'score') cmp = a.score - b.score;
			else if (col === 'name') cmp = a.industry.name.localeCompare(b.industry.name);
			else if (col === 'emp') cmp = a.metrics.empYoy - b.metrics.empYoy;
			else if (col === 'lq') cmp = lqTrendScore(a.industry.lqTrend) - lqTrendScore(b.industry.lqTrend);
			else if (col === 'wage') cmp = a.metrics.wageYoy - b.metrics.wageYoy;
			else if (col === 'estab') cmp = a.metrics.estabYoy - b.metrics.estabYoy;
			return dir === 'asc' ? cmp : -cmp;
		});
		return list;
	});

	function handleSort(col: string) {
		if (sortColumn === col) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col;
			sortDirection = col === 'name' ? 'asc' : 'desc';
		}
	}

	function sortArrow(col: string): string {
		if (sortColumn !== col) return '';
		return sortDirection === 'asc' ? ' \u2191' : ' \u2193';
	}

	function fmtPct(v: number): string {
		const sign = v > 0 ? '+' : '';
		return `${sign}${v.toFixed(1)}%`;
	}

	function pctColorClass(v: number): string {
		if (v > 0) return darkMode ? 'text-emerald-400' : 'text-emerald-600';
		if (v < 0) return darkMode ? 'text-rose-400' : 'text-rose-600';
		return muted;
	}

	function trendBadgeClass(trend: string): string {
		if (trend === 'rising')
			return darkMode
				? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
				: 'bg-emerald-100 text-emerald-700 border-emerald-300';
		if (trend === 'falling')
			return darkMode
				? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
				: 'bg-rose-100 text-rose-700 border-rose-300';
		return darkMode
			? 'bg-slate-600/40 text-slate-300 border-slate-500/30'
			: 'bg-slate-200 text-slate-600 border-slate-300';
	}

	function scoreBarColor(score: number): string {
		if (score >= 60) return darkMode ? 'bg-emerald-500' : 'bg-emerald-500';
		if (score >= 30) return darkMode ? 'bg-amber-500' : 'bg-amber-500';
		return darkMode ? 'bg-rose-500' : 'bg-rose-500';
	}

	function scoreTextColor(score: number): string {
		if (score >= 60) return darkMode ? 'text-emerald-400' : 'text-emerald-600';
		if (score >= 30) return darkMode ? 'text-amber-400' : 'text-amber-600';
		return darkMode ? 'text-rose-400' : 'text-rose-600';
	}

	let svgEl: SVGSVGElement | null = $state(null);

	$effect(() => {
		void activeTab;
		void widgetData;
		void hiddenIndustries;
		void darkMode;
		drawChart();
	});

	function drawChart() {
		if (!svgEl) return;
		const quarters = widgetData.quarters;
		const industries = widgetData.industries;
		if (quarters.length === 0 || industries.length === 0) return;

		const accessor = METRIC_ACCESSOR[activeTab];
		const isPercentage = activeTab !== 'lq';

		const rect = svgEl.getBoundingClientRect();
		const totalW = rect.width || 600;
		const totalH = rect.height || 280;
		const margin = { top: 16, right: 20, bottom: 24, left: 48 };
		const w = totalW - margin.left - margin.right;
		const h = totalH - margin.top - margin.bottom;

		const root = d3.select(svgEl);
		root.selectAll('*').remove();
		root.attr('viewBox', `0 0 ${totalW} ${totalH}`).attr('preserveAspectRatio', 'xMidYMid meet');

		const g = root.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		const visibleInds = industries.filter((ind) => !hiddenIndustries.has(ind.name));

		let allVals: number[] = [];
		for (const ind of visibleInds) {
			for (const q of ind.data) allVals.push(accessor(q));
		}
		if (allVals.length === 0) allVals = [0];
		const yMin = Math.min(0, ...allVals);
		const yMax = Math.max(0, ...allVals);
		const yPad = (yMax - yMin) * 0.15 || 1;

		const xScale = d3.scalePoint<string>().domain(quarters).range([0, w]).padding(0.1);
		const yScale = d3
			.scaleLinear()
			.domain([yMin - yPad, yMax + yPad])
			.range([h, 0]);

		const axisColor = darkMode ? '#94a3b8' : '#64748b';
		const gridColor = darkMode ? '#334155' : '#e2e8f0';

		const yTicks = yScale.ticks(6);
		g.selectAll('.grid-line')
			.data(yTicks)
			.enter()
			.append('line')
			.attr('x1', 0)
			.attr('x2', w)
			.attr('y1', (d: number) => yScale(d))
			.attr('y2', (d: number) => yScale(d))
			.attr('stroke', gridColor)
			.attr('stroke-width', 0.5);

		if (isPercentage && yMin < 0) {
			g.append('line')
				.attr('x1', 0)
				.attr('x2', w)
				.attr('y1', yScale(0))
				.attr('y2', yScale(0))
				.attr('stroke', axisColor)
				.attr('stroke-width', 1)
				.attr('stroke-dasharray', '6,4');
		}

		g.selectAll('.y-label')
			.data(yTicks)
			.enter()
			.append('text')
			.attr('x', -8)
			.attr('y', (d: number) => yScale(d))
			.attr('dy', '0.35em')
			.attr('text-anchor', 'end')
			.attr('fill', axisColor)
			.attr('font-size', '10px')
			.text((d: number) => (isPercentage ? `${d > 0 ? '+' : ''}${d.toFixed(0)}%` : d.toFixed(2)));

		g.selectAll('.x-label')
			.data(quarters)
			.enter()
			.append('text')
			.attr('x', (d: string) => xScale(d) ?? 0)
			.attr('y', h + 18)
			.attr('text-anchor', 'middle')
			.attr('fill', axisColor)
			.attr('font-size', '10px')
			.text((d: string) => d);

		const line = d3
			.line<number>()
			.x((_, i) => xScale(quarters[i]) ?? 0)
			.y((d) => yScale(d));

		for (const ind of visibleInds) {
			const vals = ind.data.map(accessor);

			g.append('path')
				.datum(vals)
				.attr('fill', 'none')
				.attr('stroke', ind.color)
				.attr('stroke-width', 2.5)
				.attr('d', line as any);

			g.selectAll(`.dot-${ind.naicsCode}`)
				.data(vals)
				.enter()
				.append('circle')
				.attr('cx', (_: number, i: number) => xScale(quarters[i]) ?? 0)
				.attr('cy', (d: number) => yScale(d))
				.attr('r', 4)
				.attr('fill', ind.color)
				.attr('stroke', darkMode ? '#0f172a' : '#ffffff')
				.attr('stroke-width', 1.5);
		}
	}

	const muted = $derived(darkMode ? 'text-slate-400' : 'text-slate-700');
	const headerBg = $derived(darkMode ? 'bg-slate-800' : 'bg-slate-50');
	const rowHover = $derived(darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50');
	const divider = $derived(darkMode ? 'divide-slate-700' : 'divide-slate-200');
	const borderColor = $derived(darkMode ? 'border-slate-700' : 'border-slate-200');
	const tabInactive = $derived(
		darkMode
			? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
			: 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
	);
	const tabActive = $derived(
		darkMode
			? 'border-emerald-500 bg-emerald-600 text-white'
			: 'border-emerald-500 bg-emerald-500 text-white'
	);

	const flipShellClass = $derived(
		darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
	);
	const flipBackClass = $derived(
		darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'
	);
	const inputFieldClass = $derived(
		darkMode
			? 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
			: 'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
	);
	const labelClass = $derived(darkMode ? 'text-xs font-medium text-slate-400' : 'text-xs font-medium text-slate-500');
</script>

<FlipCard
	isFlipped={configure.isFlipped}
	shellClass={flipShellClass}
	flipBackClass={flipBackClass}
>
	{#snippet front()}
		{#if aiStatus.generating || aiStatus.error}
			<div class="flex h-full items-center justify-center px-4 py-4">
				<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
			</div>
		{:else}
		<div class="flex h-full min-h-0 flex-col overflow-hidden {darkMode ? 'text-slate-100' : 'text-slate-900'}">
			<div class="flex shrink-0 flex-wrap gap-1.5 border-b px-4 py-2.5 {borderColor}">
				{#each (['emp', 'lq', 'wage', 'estab'] as const) as tab}
					<button
						class="rounded-md border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors {activeTab === tab ? tabActive : tabInactive}"
						onclick={() => (activeTab = tab)}
					>
						{#if activeTab === tab}<span class="mr-1">&blacktriangle;</span>{/if}
						{TAB_LABELS[tab]}
					</button>
				{/each}
			</div>

			<div class="shrink-0 border-b px-4 pt-3 pb-2 {borderColor}">
				<div class="mb-2 flex items-start justify-between">
					<h3 class="text-[10px] font-bold uppercase tracking-wider {muted}">
						{CHART_TITLES[activeTab]}
					</h3>
					<span class="text-[10px] {muted}">Click legend to toggle industries</span>
				</div>
				<div class="relative w-full" style="height: 240px;">
					<svg bind:this={svgEl} class="h-full w-full"></svg>
				</div>
				<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 pb-1">
					{#each widgetData.industries as ind}
						<button
							class="inline-flex items-center gap-1.5 text-[10px] transition-opacity {hiddenIndustries.has(ind.name) ? 'opacity-30' : ''}"
							onclick={() => toggleIndustry(ind.name)}
						>
							<span
								class="inline-block h-[3px] w-4 rounded-full"
								style="background-color: {ind.color}"
							></span>
							<span class={muted}>{ind.name}</span>
						</button>
					{/each}
				</div>
				<p class="pb-1 text-[10px] {muted}">
					{#if activeTab !== 'lq'}
						Dashed line = 0% (no change). Values above = growth, below = contraction.
					{:else}
						LQ values over time. Higher values indicate greater local concentration.
					{/if}
				</p>
			</div>

			<div class="min-h-0 flex-1 overflow-auto">
				<div class="flex items-start justify-between px-4 pt-3 pb-2">
					<h3 class="text-[10px] font-bold uppercase tracking-wider {muted}">
						Industry Rankings &mdash; Composite Trend Score
					</h3>
					<span class="text-[10px] {muted}">Click column headers to sort</span>
				</div>
				<table class="w-full text-sm">
					<thead class="sticky top-0 {headerBg}">
						<tr class="border-b {borderColor}">
							<th class="w-8 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider {muted}"></th>
							<th
								class="cursor-pointer px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider select-none {muted}"
								onclick={() => handleSort('name')}
							>
								Industry{sortArrow('name')}
							</th>
							<th
								class="cursor-pointer px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider select-none {muted}"
								onclick={() => handleSort('emp')}
							>
								Emp YoY%{sortArrow('emp')}
							</th>
							<th
								class="cursor-pointer px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider select-none {muted}"
								onclick={() => handleSort('lq')}
							>
								LQ Trend{sortArrow('lq')}
							</th>
							<th
								class="cursor-pointer px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider select-none {muted}"
								onclick={() => handleSort('wage')}
							>
								Wage YoY%{sortArrow('wage')}
							</th>
							<th
								class="cursor-pointer px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider select-none {muted}"
								onclick={() => handleSort('estab')}
							>
								Estab YoY%{sortArrow('estab')}
							</th>
							<th
								class="cursor-pointer px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider select-none {muted}"
								onclick={() => handleSort('score')}
							>
								Score{sortArrow('score')}
							</th>
						</tr>
					</thead>
					<tbody class="divide-y {divider}">
						{#each sortedIndustries as row, idx}
							<tr class="transition-colors {rowHover}">
								<td class="w-8 px-2 py-2 text-center font-mono text-xs tabular-nums {muted}">
									{idx + 1}
								</td>
								<td class="px-3 py-2">
									<span class="inline-flex items-center gap-2 text-sm font-medium">
										<span
											class="inline-block h-2.5 w-2.5 rounded-sm"
											style="background-color: {row.industry.color}"
										></span>
										{row.industry.name} ({row.industry.naicsCode})
									</span>
								</td>
								<td class="px-3 py-2 text-right font-mono text-sm tabular-nums {pctColorClass(row.metrics.empYoy)}">
									{fmtPct(row.metrics.empYoy)}
								</td>
								<td class="px-3 py-2 text-center">
									<span
										class="inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize {trendBadgeClass(row.industry.lqTrend)}"
									>
										{row.industry.lqTrend.charAt(0).toUpperCase() + row.industry.lqTrend.slice(1)}
									</span>
								</td>
								<td class="px-3 py-2 text-right font-mono text-sm tabular-nums {pctColorClass(row.metrics.wageYoy)}">
									{fmtPct(row.metrics.wageYoy)}
								</td>
								<td class="px-3 py-2 text-right font-mono text-sm tabular-nums {pctColorClass(row.metrics.estabYoy)}">
									{fmtPct(row.metrics.estabYoy)}
								</td>
								<td class="px-3 py-2">
									<div class="flex items-center gap-2">
										<span class="w-8 text-right font-mono text-sm font-bold tabular-nums {scoreTextColor(row.score)}">
											{row.score}
										</span>
										<div class="h-3.5 flex-1 overflow-hidden rounded-sm {darkMode ? 'bg-slate-700' : 'bg-slate-200'}">
											<div
												class="h-full rounded-sm transition-all {scoreBarColor(row.score)}"
												style="width: {row.score}%"
											></div>
										</div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		{/if}
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			showAITab={true}
			kind="industryTrendScorecard"
			{widgetId}
			{darkMode}
			theme={theme ?? 'dark'}
			{topicOverride}
			onApply={configure.applyConfig}
			onCancel={configure.cancelConfig}
		>
			{#snippet userFields()}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<label class="block">
						<span class={labelClass}>Weight: Emp</span>
						<input
							type="number"
							min="0"
							max="100"
							class={inputFieldClass}
							bind:value={configure.draft.weights.emp}
						/>
					</label>
					<label class="block">
						<span class={labelClass}>Weight: LQ</span>
						<input
							type="number"
							min="0"
							max="100"
							class={inputFieldClass}
							bind:value={configure.draft.weights.lq}
						/>
					</label>
					<label class="block">
						<span class={labelClass}>Weight: Wage</span>
						<input
							type="number"
							min="0"
							max="100"
							class={inputFieldClass}
							bind:value={configure.draft.weights.wage}
						/>
					</label>
					<label class="block">
						<span class={labelClass}>Weight: Estab</span>
						<input
							type="number"
							min="0"
							max="100"
							class={inputFieldClass}
							bind:value={configure.draft.weights.estab}
						/>
					</label>
				</div>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
