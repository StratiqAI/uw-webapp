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
	import type { EconBaseMultiplierConfig, EconBaseIndustry } from './schema.js';
	import { DEMO_INDUSTRIES } from './demoData.js';

	let {
		data,
		widgetId = 'econ-base-multiplier-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<EconBaseMultiplierConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('econBaseMultiplier', widgetId, topicOverride);
	const topicData = useReactiveValidatedTopic<EconBaseMultiplierConfig>(topic);
	const aiStatus = useAiGenerationStatus(() => topic);

	const widgetData = $derived<EconBaseMultiplierConfig>({
		regionLabel: data.regionLabel,
		industries: data.industries?.length ? data.industries : DEMO_INDUSTRIES,
		...(topicData.current ?? {})
	});

	const configure = useWidgetConfigure({
		widgetId,
		data: () => widgetData,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	let industries = $state<EconBaseIndustry[]>([]);

	$effect(() => {
		industries = [...widgetData.industries];
	});

	const totalLocalEmp = $derived(industries.reduce((s, r) => s + r.localEmp, 0));
	const totalNationalEmp = $derived(industries.reduce((s, r) => s + r.nationalEmp, 0));

	interface ComputedRow {
		industry: EconBaseIndustry;
		lq: number;
		basicEmp: number | null;
	}

	const computedRows = $derived.by((): ComputedRow[] => {
		if (totalLocalEmp === 0 || totalNationalEmp === 0) {
			return industries.map((ind) => ({ industry: ind, lq: 0, basicEmp: null }));
		}
		return industries.map((ind) => {
			const localShare = ind.localEmp / totalLocalEmp;
			const nationalShare = ind.nationalEmp / totalNationalEmp;
			const lq = nationalShare > 0 ? localShare / nationalShare : 0;
			const basicEmp =
				lq > 1 ? Math.round(ind.localEmp - (ind.nationalEmp / totalNationalEmp) * totalLocalEmp) : null;
			return { industry: ind, lq, basicEmp };
		});
	});

	const totalBasicEmp = $derived(
		computedRows.reduce((s, r) => s + (r.basicEmp ?? 0), 0)
	);

	const multiplier = $derived(totalBasicEmp > 0 ? totalLocalEmp / totalBasicEmp : 0);

	const nonBasicPerBasic = $derived(multiplier > 0 ? multiplier - 1 : 0);

	function removeIndustry(idx: number) {
		industries = industries.filter((_, i) => i !== idx);
		persistIndustries();
	}

	function addIndustry() {
		industries = [
			...industries,
			{ name: 'New Industry', naicsCode: '00', localEmp: 0, nationalEmp: 0 }
		];
		persistIndustries();
	}

	function clearAll() {
		industries = [];
		persistIndustries();
	}

	function persistIndustries() {
		onUpdateConfig?.({ ...widgetData, industries });
	}

	function fmtNum(n: number): string {
		return n.toLocaleString();
	}

	const shell = $derived(
		darkMode
			? 'bg-slate-900 text-slate-100 border-slate-700'
			: 'bg-white text-slate-900 border-slate-200'
	);
	const muted = $derived(darkMode ? 'text-slate-400' : 'text-slate-700');
	const card = $derived(
		darkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-slate-50 border-slate-200'
	);
	const headerBg = $derived(darkMode ? 'bg-slate-800' : 'bg-slate-50');
	const rowHover = $derived(darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50');
	const divider = $derived(darkMode ? 'divide-slate-700' : 'divide-slate-200');
	const borderColor = $derived(darkMode ? 'border-slate-700' : 'border-slate-200');
	const lqGreen = $derived(darkMode ? 'text-emerald-400' : 'text-emerald-600');
	const basicGreen = $derived(darkMode ? 'text-emerald-400' : 'text-emerald-600');
	const totalsColor = $derived(darkMode ? 'text-cyan-400' : 'text-cyan-600');
	const removeBtn = $derived(
		darkMode
			? 'text-slate-600 hover:text-rose-400'
			: 'text-slate-300 hover:text-rose-500'
	);
	const secondaryBtn = $derived(
		darkMode
			? 'rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800'
			: 'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100'
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
			<div class="flex shrink-0 items-start justify-between border-b px-4 py-3 {borderColor}">
				<div>
					<h2 class="text-[11px] font-bold uppercase tracking-widest {muted}">
						Industry Employment Data
					</h2>
				</div>
				<div class="text-[11px] {muted}">Local vs. National (CQEW)</div>
			</div>

			<div class="min-h-0 flex-1 overflow-auto">
				<table class="w-full text-sm">
					<thead class="sticky top-0 {headerBg}">
						<tr class="border-b {borderColor}">
							<th class="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider {muted}">
								Industry / NAICS
							</th>
							<th class="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider {muted}">
								Local Emp
							</th>
							<th class="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider {muted}">
								Nat'l Emp
							</th>
							<th class="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider {muted}">
								LQ
							</th>
							<th class="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider {muted}">
								Basic Emp
							</th>
							<th class="w-8 px-2 py-2.5"></th>
						</tr>
					</thead>
					<tbody class="divide-y {divider}">
						{#each computedRows as row, idx}
							<tr class="transition-colors {rowHover}">
								<td class="px-4 py-2.5 text-sm font-medium">
									{row.industry.name} ({row.industry.naicsCode})
								</td>
								<td class="px-4 py-2.5 text-right font-mono text-sm tabular-nums">
									{fmtNum(row.industry.localEmp)}
								</td>
								<td class="px-4 py-2.5 text-right font-mono text-sm tabular-nums">
									{fmtNum(row.industry.nationalEmp)}
								</td>
								<td class="px-4 py-2.5 text-right font-mono text-sm font-semibold tabular-nums {row.lq > 1 ? lqGreen : ''}">
									{row.lq.toFixed(2)}
								</td>
								<td class="px-4 py-2.5 text-right font-mono text-sm tabular-nums {row.basicEmp != null ? basicGreen : ''}">
									{#if row.basicEmp != null}
										{fmtNum(row.basicEmp)}
									{:else}
										<span class={muted}>&mdash;</span>
									{/if}
								</td>
								<td class="w-8 px-2 py-2.5 text-center">
									<button
										class="text-sm {removeBtn}"
										onclick={() => removeIndustry(idx)}
										aria-label="Remove {row.industry.name}"
									>
										&times;
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if computedRows.length > 0}
				<div class="shrink-0 border-t {borderColor}">
					<div class="grid grid-cols-[1fr_auto_auto_auto_auto_32px] items-center px-4 py-2.5">
						<div class="text-sm font-bold {darkMode ? 'text-rose-400' : 'text-rose-600'}">
							TOTALS
						</div>
						<div class="w-24 text-right font-mono text-sm font-bold tabular-nums {totalsColor}">
							{fmtNum(totalLocalEmp)}
						</div>
						<div class="w-28 text-right font-mono text-sm font-bold tabular-nums {totalsColor}">
							{fmtNum(totalNationalEmp)}
						</div>
						<div class="w-16"></div>
						<div class="w-24 text-right font-mono text-sm font-bold tabular-nums {totalsColor}">
							{fmtNum(totalBasicEmp)}
						</div>
						<div class="w-8"></div>
					</div>
				</div>
			{/if}

			<div class="flex shrink-0 items-center gap-3 border-t px-4 py-2.5 {borderColor}">
				<button class={secondaryBtn} onclick={addIndustry}>+ Add Industry</button>
				<button class={secondaryBtn} onclick={clearAll}>Clear All</button>
			</div>

			{#if totalBasicEmp > 0}
				<div class="shrink-0 border-t px-4 py-3 {borderColor}">
					<div class="rounded-lg border p-3 {card}">
						<div class="flex items-baseline gap-2">
							<span class="text-[10px] font-semibold uppercase tracking-wider {muted}">
								Economic Base Multiplier
							</span>
							<span class="text-xl font-bold font-mono tabular-nums {darkMode ? 'text-cyan-300' : 'text-cyan-700'}">
								{multiplier.toFixed(2)}
							</span>
						</div>
						<p class="mt-1.5 text-xs leading-relaxed {muted}">
							For every 1 job created in an export-oriented (basic) industry,
							<span class="font-semibold {darkMode ? 'text-slate-200' : 'text-slate-800'}">
								{multiplier.toFixed(2)} total jobs
							</span>
							are supported in the local economy
							(1 basic + {nonBasicPerBasic.toFixed(2)} non-basic).
						</p>
					</div>
				</div>
			{/if}

			<div class="shrink-0 border-t px-4 py-2.5 {borderColor}">
				<p class="text-[10px] leading-relaxed {muted}">
					LQ = (local_i / total_local) / (nat_i / total_nat) &nbsp;|&nbsp;
					<span class="inline-flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-sm bg-emerald-500"></span> LQ &gt; 1 = basic (export)
					</span>
					&nbsp;|&nbsp;
					<span class="inline-flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-sm {darkMode ? 'bg-slate-500' : 'bg-slate-400'}"></span> LQ &le; 1 = non-basic (local serving)
					</span>
				</p>
			</div>
		</div>
		{/if}
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			showAITab={true}
			kind="econBaseMultiplier"
			{widgetId}
			{darkMode}
			theme={theme ?? 'dark'}
			{topicOverride}
			onApply={configure.applyConfig}
			onCancel={configure.cancelConfig}
		>
			{#snippet userFields()}
				<label class="block">
					<span class={labelClass}>Region label</span>
					<input
						type="text"
						class={inputFieldClass}
						value={configure.draft.regionLabel ?? ''}
						oninput={(e) => {
							const v = e.currentTarget.value;
							configure.draft = { ...configure.draft, regionLabel: v ? v : undefined };
						}}
					/>
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
