<script lang="ts">
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import { FlipCard, fmt, pct, proFormaTheme } from '@stratiqai/widget-pro-forma-base';
	import type { ProFormaOpExConfig, ProFormaOpExInput, CustomExpenseRow } from './schema.js';
	import { computeOpExProjections, type OpExYearProjection } from './calculations.js';

	const FORM_STEP_RATE = '0.01';
	const FORM_STEP_CURRENCY = '1';

	let {
		data,
		widgetId = 'pro-forma-opex-default',
		topicOverride,
		darkMode = true,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<ProFormaOpExConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('proFormaOpEx', widgetId, topicOverride);
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

	// --- Flip state ---
	let isFlipped = $state(false);

	let draftUnitType = $state<'units' | 'sqft'>('units');
	let draftTotalUnits = $state(0);
	let draftTotalSqFt = $state(0);
	let draftEgiYear1 = $state(0);
	let draftEgiGrowth = $state(0.03);
	let draftBaseOpEx = $state(0);
	let draftExpenseGrowth = $state(0.03);
	let draftMgmtFeeRate = $state(0.04);
	let draftReservePerUnit = $state(250);
	let draftApplyGrowthReserves = $state(false);
	let draftCustomExpenses = $state<CustomExpenseRow[]>([]);
	let draftYears = $state(5);
	let draftPropertyName = $state('');

	function syncDraftFromData() {
		draftUnitType = widgetData.unitType;
		draftTotalUnits = widgetData.totalUnits;
		draftTotalSqFt = widgetData.totalSqFt;
		draftEgiYear1 = widgetData.egiYear1;
		draftEgiGrowth = widgetData.egiGrowthRate;
		draftBaseOpEx = widgetData.baseOperatingExpenses;
		draftExpenseGrowth = widgetData.expenseGrowthRate;
		draftMgmtFeeRate = widgetData.managementFeeRate;
		draftReservePerUnit = widgetData.reservePerUnit;
		draftApplyGrowthReserves = widgetData.applyGrowthToReserves;
		draftCustomExpenses = widgetData.customExpenses.map((r) => ({ ...r }));
		draftYears = widgetData.projectionYears;
		draftPropertyName = widgetData.propertyName ?? '';
	}

	function toggleFlip() {
		isFlipped = !isFlipped;
		if (isFlipped) syncDraftFromData();
	}

	$effect(() => {
		onConfigureReady?.(toggleFlip);
	});

	function applyConfig() {
		onUpdateConfig?.({
			unitType: draftUnitType,
			totalUnits: draftTotalUnits,
			totalSqFt: draftTotalSqFt,
			egiYear1: draftEgiYear1,
			egiGrowthRate: draftEgiGrowth,
			baseOperatingExpenses: draftBaseOpEx,
			expenseGrowthRate: draftExpenseGrowth,
			managementFeeRate: draftMgmtFeeRate,
			reservePerUnit: draftReservePerUnit,
			applyGrowthToReserves: draftApplyGrowthReserves,
			customExpenses: draftCustomExpenses.filter((r) => r.label.trim()),
			projectionYears: draftYears,
			propertyName: draftPropertyName.trim() || undefined
		});
		isFlipped = false;
	}

	function cancelConfig() {
		isFlipped = false;
	}

	function addCustomRow() {
		draftCustomExpenses = [
			...draftCustomExpenses,
			{ label: '', baseAmount: 0, growthRate: 0.03 }
		];
	}

	function removeCustomRow(index: number) {
		draftCustomExpenses = draftCustomExpenses.filter((_, i) => i !== index);
	}

	const quantityLabel = $derived(mergedConfig.unitType === 'sqft' ? 'Sq Ft' : 'Units');
	const reserveLabel = $derived(
		mergedConfig.unitType === 'sqft' ? 'Reserve / Sq Ft / Yr' : 'Reserve / Unit / Yr'
	);
</script>

<FlipCard {isFlipped} shellClass={t.shell} flipBackClass={t.flipBackBg}>
	{#snippet front()}
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
	{/snippet}

	{#snippet back()}
		<div class="flex min-h-full flex-col items-center px-4 py-5 sm:px-6">
			<div class="flex w-full max-w-lg flex-1 flex-col">
				<header class="mb-4 shrink-0 text-center sm:text-left">
					<h3 class="text-lg font-bold {t.cfgTitle}">
						Configure Operating Expenses
					</h3>
					<p class="mt-1 text-sm {t.muted}">
						Enter operating cost assumptions to project annual expenses across the holding period.
					</p>
				</header>

				<section class="{t.cfgPanel} max-h-[calc(100%-80px)] overflow-y-auto" aria-label="Widget configuration">
					<form
						class="flex flex-col gap-3"
						onsubmit={(e) => {
							e.preventDefault();
							applyConfig();
						}}
					>
						<!-- Property name -->
						<label class="block">
							<span class={t.cfgLabel}>Property Name (optional)</span>
							<input type="text" bind:value={draftPropertyName} class={t.cfgField} placeholder="e.g. Riverside Apartments" />
						</label>

						<!-- Unit type + quantity -->
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<label class="block">
								<span class={t.cfgLabel}>Measurement Type</span>
								<select bind:value={draftUnitType} class={t.cfgField}>
									<option value="units">Units</option>
									<option value="sqft">Square Footage</option>
								</select>
							</label>
							{#if draftUnitType === 'sqft'}
								<label class="block">
									<span class={t.cfgLabel}>Total Leasable Sq Ft</span>
									<input type="number" bind:value={draftTotalSqFt} min="0" step="1" class={t.cfgField} />
								</label>
							{:else}
								<label class="block">
									<span class={t.cfgLabel}>Total Number of Units</span>
									<input type="number" bind:value={draftTotalUnits} min="0" step="1" class={t.cfgField} />
								</label>
							{/if}
						</div>

						<!-- EGI inputs -->
						<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<legend class="px-1 text-xs font-semibold {t.muted}">Effective Gross Income (EGI)</legend>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<label class="block">
									<span class={t.cfgLabel}>Year 1 EGI ($)</span>
									<input type="number" bind:value={draftEgiYear1} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
								</label>
								<label class="block">
									<span class={t.cfgLabel}>EGI Growth Rate</span>
									<input type="number" bind:value={draftEgiGrowth} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
									<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3%/yr</p>
								</label>
							</div>
						</fieldset>

						<!-- Operating Expenses -->
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<label class="block">
								<span class={t.cfgLabel}>Base Year Operating Expenses ($)</span>
								<input type="number" bind:value={draftBaseOpEx} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
							</label>
							<label class="block">
								<span class={t.cfgLabel}>Annual Expense Growth Rate</span>
								<input type="number" bind:value={draftExpenseGrowth} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
								<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.03 = 3%/yr</p>
							</label>
						</div>

						<!-- Management Fee -->
						<label class="block">
							<span class={t.cfgLabel}>Management Fee (% of EGI)</span>
							<input type="number" bind:value={draftMgmtFeeRate} min="0" max="1" step={FORM_STEP_RATE} class={t.cfgField} />
							<p class="mt-0.5 text-[11px] {t.muted}">e.g. 0.04 = 4% of EGI</p>
						</label>

						<!-- Replacement Reserves -->
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<label class="block">
								<span class={t.cfgLabel}>Reserve / {draftUnitType === 'sqft' ? 'Sq Ft' : 'Unit'} / Year ($)</span>
								<input type="number" bind:value={draftReservePerUnit} min="0" step={FORM_STEP_CURRENCY} class={t.cfgField} />
							</label>
							<label class="flex items-center gap-2 self-end pb-2">
								<input type="checkbox" bind:checked={draftApplyGrowthReserves} class="rounded" />
								<span class="text-xs {t.muted}">Apply growth rate to reserves</span>
							</label>
						</div>

						<!-- Custom Expense Rows -->
						<fieldset class="rounded-lg border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
							<legend class="px-1 text-xs font-semibold {t.muted}">Additional Expense Rows</legend>
							{#each draftCustomExpenses as row, i}
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

						<!-- Projection years -->
						<label class="block">
							<span class={t.cfgLabel}>Projection Years</span>
							<input type="number" bind:value={draftYears} min="1" max="10" step="1" class={t.cfgField} />
						</label>

						<!-- Actions -->
						<div class="flex justify-end gap-2 border-t pt-4 {darkMode ? 'border-slate-600' : 'border-slate-200'}">
							<button type="button" class={t.cfgBtnSecondary} onclick={cancelConfig}>
								Cancel
							</button>
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
