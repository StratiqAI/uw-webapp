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
	import type { LfprDashboardConfig, LfprDriver } from './schema.js';
	import { DEMO_LFPR_CONFIG } from './demoData.js';

	let {
		data,
		widgetId = 'lfpr-dashboard-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<LfprDashboardConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('lfprDashboard', widgetId, topicOverride);
	const topicData = useReactiveValidatedTopic<LfprDashboardConfig>(topic);
	const aiStatus = useAiGenerationStatus(() => topic);

	const cfg = $derived<LfprDashboardConfig>({
		...DEMO_LFPR_CONFIG,
		...data,
		...(topicData.current ?? {})
	});

	const configure = useWidgetConfigure({
		data: () => cfg,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	const trendMin = $derived(Math.min(...cfg.trendData.map((d) => d.rate)) - 1.5);
	const trendMax = $derived(Math.max(...cfg.trendData.map((d) => d.rate)) + 1);
	const trendRange = $derived(trendMax - trendMin);

	function barHeight(rate: number): number {
		if (trendRange === 0) return 50;
		return ((rate - trendMin) / trendRange) * 100;
	}

	function barColor(rate: number, idx: number): string {
		if (idx === 0) return darkMode ? 'bg-slate-500' : 'bg-slate-400';
		const prev = cfg.trendData[idx - 1].rate;
		if (rate > prev) return darkMode ? 'bg-emerald-500' : 'bg-emerald-500';
		if (rate < prev) return darkMode ? 'bg-rose-500' : 'bg-rose-500';
		return darkMode ? 'bg-amber-500' : 'bg-amber-500';
	}

	function impactBadge(impact: LfprDriver['impact'], positive: boolean): string {
		if (positive) {
			if (impact === 'high') return darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
			if (impact === 'moderate') return darkMode ? 'bg-emerald-500/10 text-emerald-500/80 border-emerald-500/20' : 'bg-emerald-50/60 text-emerald-600 border-emerald-200/60';
			return darkMode ? 'bg-slate-700 text-emerald-500/60 border-slate-600' : 'bg-slate-100 text-emerald-500 border-slate-200';
		}
		if (impact === 'high') return darkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
		if (impact === 'moderate') return darkMode ? 'bg-rose-500/10 text-rose-500/80 border-rose-500/20' : 'bg-rose-50/60 text-rose-600 border-rose-200/60';
		return darkMode ? 'bg-slate-700 text-rose-500/60 border-slate-600' : 'bg-slate-100 text-rose-500 border-slate-200';
	}

	function directionArrow(dir: string): string {
		if (dir === 'up') return '▲';
		if (dir === 'down') return '▼';
		return '►';
	}

	function directionColor(dir: string): string {
		if (dir === 'up') return darkMode ? 'text-emerald-400' : 'text-emerald-600';
		if (dir === 'down') return darkMode ? 'text-rose-400' : 'text-rose-600';
		return darkMode ? 'text-amber-400' : 'text-amber-600';
	}

	function yoyColor(val: number): string {
		if (val > 0) return darkMode ? 'text-emerald-400' : 'text-emerald-600';
		if (val < 0) return darkMode ? 'text-rose-400' : 'text-rose-600';
		return darkMode ? 'text-amber-400' : 'text-amber-600';
	}

	function yoyBadgeBg(val: number): string {
		if (val > 0) return darkMode ? 'bg-emerald-500/15' : 'bg-emerald-50';
		if (val < 0) return darkMode ? 'bg-rose-500/15' : 'bg-rose-50';
		return darkMode ? 'bg-amber-500/15' : 'bg-amber-50';
	}

	const muted = $derived(darkMode ? 'text-slate-400' : 'text-slate-700');
	const card = $derived(
		darkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-slate-50 border-slate-200'
	);
	const borderColor = $derived(darkMode ? 'border-slate-700' : 'border-slate-200');

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
			<div class="shrink-0 border-b px-4 py-3 {borderColor}">
				<h2 class="text-[10px] font-semibold uppercase tracking-wider {muted}">
					Economic Data Dashboard
				</h2>
				<p class="mt-1 text-[11px] italic {muted}">
					Of all people who could work, what percentage are actually in the labor force?
				</p>
			</div>

			<div class="min-h-0 flex-1 overflow-auto">
				<div class="grid grid-cols-3 gap-3 px-4 py-3">
					<div class="rounded-lg border p-3 text-center {card}">
						<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">
							Adult Population
						</div>
						<div class="mt-1 font-mono text-lg font-bold tabular-nums {darkMode ? 'text-sky-300' : 'text-sky-700'}">
							{cfg.adultPopulation}M
						</div>
						<div class="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold {yoyBadgeBg(cfg.adultPopYoy)} {yoyColor(cfg.adultPopYoy)}">
							{cfg.adultPopYoy > 0 ? '+' : ''}{cfg.adultPopYoy}% YoY
						</div>
						<div class="mt-1 text-[10px] {muted}">
							Civilian noninstitutional population 16+
						</div>
					</div>

					<div class="rounded-lg border p-3 text-center {card} ring-1 {darkMode ? 'ring-cyan-500/30' : 'ring-cyan-300'}">
						<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">
							LFPR
						</div>
						<div class="mt-1 flex items-baseline justify-center gap-2">
							<span class="font-mono text-3xl font-bold tabular-nums {darkMode ? 'text-cyan-300' : 'text-cyan-700'}">
								{cfg.lfpr}%
							</span>
							<span class="text-sm font-semibold {directionColor(cfg.lfprDirection)}">
								{directionArrow(cfg.lfprDirection)}
							</span>
						</div>
						<div class="mt-1 text-[10px] font-medium {muted}">
							Labor Force Participation Rate
						</div>
					</div>

					<div class="rounded-lg border p-3 text-center {card}">
						<div class="text-[10px] font-semibold uppercase tracking-wider {muted}">
							Labor Force
						</div>
						<div class="mt-1 font-mono text-lg font-bold tabular-nums {darkMode ? 'text-amber-300' : 'text-amber-700'}">
							{cfg.laborForce}M
						</div>
						<div class="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold {yoyBadgeBg(cfg.laborForceYoy)} {yoyColor(cfg.laborForceYoy)}">
							{cfg.laborForceYoy > 0 ? '+' : ''}{cfg.laborForceYoy}% YoY
						</div>
						<div class="mt-1 text-[10px] {muted}">
							Employed + actively seeking work
						</div>
					</div>
				</div>

				<div class="mx-4 mb-3 rounded-lg border p-2.5 {card}">
					<div class="flex items-center justify-center gap-2 text-xs">
						<span class="rounded-md border px-2.5 py-1 font-mono font-semibold tabular-nums {darkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-300 bg-amber-50 text-amber-700'}">
							Labor Force ({cfg.laborForce}M)
						</span>
						<span class="text-base font-bold {muted}">/</span>
						<span class="rounded-md border px-2.5 py-1 font-mono font-semibold tabular-nums {darkMode ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-sky-300 bg-sky-50 text-sky-700'}">
							Adult Population ({cfg.adultPopulation}M)
						</span>
						<span class="text-base font-bold {muted}">=</span>
						<span class="rounded-md border px-2.5 py-1 font-mono font-bold tabular-nums {darkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-cyan-300 bg-cyan-50 text-cyan-700'}">
							LFPR {cfg.lfpr}%
						</span>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3 px-4 pb-4">
					<div class="rounded-lg border p-3 {card}">
						<div class="mb-3 flex items-center justify-between">
							<h3 class="text-[10px] font-semibold uppercase tracking-wider {muted}">
								LFPR Trend (5-Year)
							</h3>
							<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold {directionColor(cfg.lfprDirection)} {cfg.lfprDirection === 'down' ? (darkMode ? 'bg-rose-500/15' : 'bg-rose-50') : cfg.lfprDirection === 'up' ? (darkMode ? 'bg-emerald-500/15' : 'bg-emerald-50') : (darkMode ? 'bg-amber-500/15' : 'bg-amber-50')}">
								{directionArrow(cfg.lfprDirection)} {cfg.lfprDirection === 'down' ? 'Declining' : cfg.lfprDirection === 'up' ? 'Rising' : 'Flat'}
							</span>
						</div>

						<div class="flex items-end justify-between gap-2" style="height: 120px;">
							{#each cfg.trendData as yr, idx}
								<div class="flex flex-1 flex-col items-center gap-1">
									<span class="text-[10px] font-mono font-semibold tabular-nums {idx === cfg.trendData.length - 1 ? (darkMode ? 'text-cyan-300' : 'text-cyan-700') : muted}">
										{yr.rate}%
									</span>
									<div class="w-full flex items-end" style="height: 90px;">
										<div
											class="w-full rounded-t transition-all {barColor(yr.rate, idx)} {idx === cfg.trendData.length - 1 ? 'ring-1 ' + (darkMode ? 'ring-cyan-400/40' : 'ring-cyan-500/40') : ''}"
											style="height: {barHeight(yr.rate)}%;"
										></div>
									</div>
									<span class="text-[10px] font-semibold {idx === cfg.trendData.length - 1 ? (darkMode ? 'text-slate-100' : 'text-slate-900') : muted}">
										{yr.year}
									</span>
								</div>
							{/each}
						</div>
					</div>

					<div class="flex flex-col gap-3">
						<div class="rounded-lg border p-3 {card}">
							<h3 class="mb-2 text-[10px] font-semibold uppercase tracking-wider {darkMode ? 'text-emerald-400' : 'text-emerald-600'}">
								Growth Drivers (+)
							</h3>
							<p class="mb-2 text-[10px] italic {muted}">Why is the labor force expanding?</p>
							<div class="space-y-2">
								{#each cfg.growthDrivers as driver}
									<div class="flex gap-2">
										<span class="mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase {impactBadge(driver.impact, true)}">
											{driver.impact}
										</span>
										<div class="min-w-0">
											<div class="text-xs font-semibold">{driver.label}</div>
											<div class="text-[10px] leading-relaxed {muted}">{driver.description}</div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<div class="rounded-lg border p-3 {card}">
							<h3 class="mb-2 text-[10px] font-semibold uppercase tracking-wider {darkMode ? 'text-rose-400' : 'text-rose-600'}">
								Participation Drags (-)
							</h3>
							<p class="mb-2 text-[10px] italic {muted}">Why is it not growing faster?</p>
							<div class="space-y-2">
								{#each cfg.dragDrivers as driver}
									<div class="flex gap-2">
										<span class="mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase {impactBadge(driver.impact, false)}">
											{driver.impact}
										</span>
										<div class="min-w-0">
											<div class="text-xs font-semibold">{driver.label}</div>
											<div class="text-[10px] leading-relaxed {muted}">{driver.description}</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		{/if}
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			showAITab={true}
			kind="lfprDashboard"
			{widgetId}
			{darkMode}
			theme={theme ?? 'dark'}
			{topicOverride}
			onApply={configure.applyConfig}
			onCancel={configure.cancelConfig}
		>
			{#snippet userFields()}
				<label class="block">
					<span class={labelClass}>Title</span>
					<input
						type="text"
						class={inputFieldClass}
						value={configure.draft.title ?? ''}
						oninput={(e) => {
							const v = e.currentTarget.value;
							configure.draft = { ...configure.draft, title: v ? v : undefined };
						}}
					/>
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
