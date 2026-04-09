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
	import type { ProFormaOpExConfig, ProFormaOpExInput, CustomExpenseRow } from './schema.js';
	import { computeOpExProjections, type OpExYearProjection } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-opex-default',
		topicOverride,
		darkMode = true,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaOpExConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaOpEx', widgetId, topicOverride);
	const aiStatus = useAiGenerationStatus(() => topic);
	const topicData = useReactiveValidatedTopic<ProFormaOpExInput>(topic);

	const widgetData = $derived<ProFormaOpExConfig>({
		unitType: data.unitType ?? 'units',
		totalUnits: data.totalUnits ?? 0,
		totalSqFt: data.totalSqFt ?? 0,
		egiYear1: data.egiYear1 ?? 0,
		egiGrowthRate: data.egiGrowthRate ?? 0.03,
		baseOperatingExpenses: data.baseOperatingExpenses ?? 0,
		expenseGrowthRate: data.expenseGrowthRate ?? 0.03,
		managementFeeRate: data.managementFeeRate ?? 0.04,
		reservePerUnit: data.reservePerUnit ?? 250,
		applyGrowthToReserves: data.applyGrowthToReserves ?? false,
		customExpenses: data.customExpenses ?? [],
		projectionYears: data.projectionYears ?? 5,
		propertyName: data.propertyName
	});

	const mergedConfig = $derived<ProFormaOpExConfig>({
		...widgetData,
		...(topicData.current?.egiYear1 != null ? { egiYear1: topicData.current.egiYear1 } : {}),
		...(topicData.current?.totalUnits != null ? { totalUnits: topicData.current.totalUnits } : {}),
		...(topicData.current?.totalSqFt != null ? { totalSqFt: topicData.current.totalSqFt } : {})
	});

	const projections = $derived<OpExYearProjection[]>(computeOpExProjections(mergedConfig));
	const t = $derived(proFormaTheme(darkMode));

	const configure = useWidgetConfigure<ProFormaOpExConfig>({
		widgetId: () => widgetId,
		data: () => widgetData,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	function addCustomRow() {
		configure.draft.customExpenses = [
			...configure.draft.customExpenses,
			{ label: '', baseAmount: 0, growthRate: 0.03 }
		];
	}

	function removeCustomRow(index: number) {
		configure.draft.customExpenses = configure.draft.customExpenses.filter((_, i) => i !== index);
	}

	const quantityLabel = $derived(mergedConfig.unitType === 'sqft' ? 'Sq Ft' : 'Units');
	const reserveLabel = $derived(
		mergedConfig.unitType === 'sqft' ? 'Reserve / Sq Ft / Yr' : 'Reserve / Unit / Yr'
	);
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
						class="px-4 py-2.5 text-left text-sm font-bold tracking-tight {t.headerBg} {t.headerText} rounded-t-lg"
					>
						Operating Expenses
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
				<!-- Section header -->
				<tr class={t.sectionHeaderBg}>
					<td
						colspan={mergedConfig.projectionYears + 2}
						class="px-4 py-1.5 text-xs uppercase tracking-wider {t.sectionHeaderText}"
					>
						Operating Expenses
					</td>
				</tr>

				<!-- Operating Expenses row -->
				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Operating Expenses</td>
					{#each projections as p}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmt(p.operatingExpenses)}
						</td>
					{/each}
				</tr>

				<!-- Management Fee row -->
				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">
						Management Fee
						<span class="ml-1 opacity-60">({pct(mergedConfig.managementFeeRate)})</span>
					</td>
					{#each projections as p}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmt(p.managementFee)}
						</td>
					{/each}
				</tr>

				<!-- Replacement Reserves row -->
				<tr class="border-b {t.cellBorder}">
					<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">Replacement Reserves</td>
					{#each projections as p}
						<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
							{fmt(p.replacementReserves)}
						</td>
					{/each}
				</tr>

				<!-- Custom expense rows -->
				{#each mergedConfig.customExpenses as row}
					<tr class="border-b {t.cellBorder}">
						<td class="py-1.5 pl-8 pr-4 text-xs {t.labelText}">{row.label}</td>
						{#each projections as p}
							<td class="px-3 py-1.5 text-right font-mono text-xs tabular-nums {t.cellText}">
								{fmt(p.customExpenses[row.label] ?? 0)}
							</td>
						{/each}
					</tr>
				{/each}

				<!-- Total Operating Expenses -->
				<tr class={t.subtotalBg}>
					<td class="py-2 pl-8 pr-4 text-xs {t.subtotalText}">
						Total Operating Expenses
					</td>
					{#each projections as p}
						<td class="px-3 py-2 text-right font-mono text-xs tabular-nums {t.subtotalText}">
							{fmt(p.totalOperatingExpenses)}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>

		<!-- Summary bar -->
		<div
			class="shrink-0 flex flex-wrap items-center gap-x-6 gap-y-1 border-t px-4 py-2.5 text-[11px] {t.summaryBorder} {t.muted}"
		>
			<span>{mergedConfig.unitType === 'sqft' ? mergedConfig.totalSqFt.toLocaleString() : mergedConfig.totalUnits.toLocaleString()} {quantityLabel}</span>
			<span>OpEx Growth {pct(mergedConfig.expenseGrowthRate)}/yr</span>
			<span>Mgmt Fee {pct(mergedConfig.managementFeeRate)}</span>
			<span>${mergedConfig.reservePerUnit.toLocaleString()} {reserveLabel}</span>
			{#if mergedConfig.customExpenses.length > 0}
				<span>+{mergedConfig.customExpenses.length} custom row{mergedConfig.customExpenses.length > 1 ? 's' : ''}</span>
			{/if}
		</div>
	{/if}
	{/snippet}

	{#snippet back()}
		<WidgetConfigureBack
			kind="proFormaOpEx"
			{widgetId}
			{darkMode}
			theme={theme ?? 'dark'}
			{topicOverride}
			showAITab={true}
			onApply={() => configure.applyConfig({
				...configure.draft,
				propertyName: configure.draft.propertyName?.trim() || undefined,
				customExpenses: configure.draft.customExpenses.filter((r) => r.label.trim())
			})}
			onCancel={configure.cancelConfig}
		>
			{#snippet userFields()}
				<label class="block">
					<span class={t.cfgLabel}>Property Name (optional)</span>
					<input type="text" bind:value={configure.draft.propertyName} class={t.cfgField} placeholder="e.g. Riverside Apartments" />
				</label>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<label class="block">
						<span class={t.cfgLabel}>Measurement Type</span>
						<select bind:value={configure.draft.unitType} class={t.cfgField}>
							<option value="units">Units</option>
							<option value="sqft">Square Footage</option>
						</select>
					</label>
					{#if configure.draft.unitType === 'sqft'}
						<label class="block">
							<span class={t.cfgLabel}>Total Leasable Sq Ft</span>
							<input type="number" bind:value={configure.draft.totalSqFt} min="0" step="1" class={t.cfgField} />
						</label>
					{:else}
						<label class="block">
							<span class={t.cfgLabel}>Total Number of Units</span>
							<input type="number" bind:value={configure.draft.totalUnits} min="0" step="1" class={t.cfgField} />
						</label>
					{/if}
				</div>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Effective Gross Income (EGI)</legend>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<label class="block">
							<span class={t.cfgLabel}>Year 1 EGI ($)</span>
							<input type="number" bind:value={configure.draft.egiYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
						</label>
						<label class="block">
							<span class={t.cfgLabel}>EGI Growth Rate</span>
							<input type="number" bind:value={configure.draft.egiGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
							<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3%/yr</p>
						</label>
					</div>
				</fieldset>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<label class="block">
						<span class={t.cfgLabel}>Base Year Operating Expenses ($)</span>
						<input type="number" bind:value={configure.draft.baseOperatingExpenses} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
					</label>
					<label class="block">
						<span class={t.cfgLabel}>Annual Expense Growth Rate</span>
						<input type="number" bind:value={configure.draft.expenseGrowthRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
						<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3%/yr</p>
					</label>
				</div>

				<label class="block">
					<span class={t.cfgLabel}>Management Fee (% of EGI)</span>
					<input type="number" bind:value={configure.draft.managementFeeRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
					<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.04 = 4% of EGI</p>
				</label>

				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<label class="block">
						<span class={t.cfgLabel}>Reserve / {configure.draft.unitType === 'sqft' ? 'Sq Ft' : 'Unit'} / Year ($)</span>
						<input type="number" bind:value={configure.draft.reservePerUnit} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
					</label>
					<label class="flex items-center gap-2 self-end pb-2">
						<input type="checkbox" bind:checked={configure.draft.applyGrowthToReserves} class="rounded" />
						<span class="text-xs {t.muted}">Apply growth rate to reserves</span>
					</label>
				</div>

				<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<legend class="px-1 text-xs font-semibold {t.muted}">Additional Expense Rows</legend>
					{#each configure.draft.customExpenses as row, i}
						<div class="mb-2 grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
							<label class="block">
								<span class={t.cfgLabel}>Label</span>
								<input type="text" bind:value={row.label} class={t.cfgField} placeholder="e.g. Property Tax" />
							</label>
							<label class="block">
								<span class={t.cfgLabel}>Base Amt ($)</span>
								<input type="number" bind:value={row.baseAmount} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
							</label>
							<label class="block">
								<span class={t.cfgLabel}>Growth</span>
								<input type="number" bind:value={row.growthRate} min="0" max="1" step={FORM_STEP_RATE} class="{t.cfgField} w-20" />
							</label>
							<button
								type="button"
								class="mb-0.5 rounded-md p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
								onclick={() => removeCustomRow(i)}
								title="Remove row"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
							</button>
						</div>
					{/each}
					<button
						type="button"
						class="mt-1 flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium {darkMode ? 'text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'}"
						onclick={addCustomRow}
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
						Add Expense Row
					</button>
				</fieldset>

				<label class="block">
					<span class={t.cfgLabel}>Projection Years</span>
					<input type="number" bind:value={configure.draft.projectionYears} min="1" max="10" step="1" class={t.cfgField} />
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
