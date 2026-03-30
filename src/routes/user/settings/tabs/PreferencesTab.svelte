<script lang="ts">
	import { themeStore, type AppTheme } from '$lib/stores/themeStore.svelte';

	let { darkMode = false } = $props<{ darkMode?: boolean }>();

	let currentTheme = $derived(themeStore.theme);

	let timezone = $state('America/New_York');
	let currency = $state('USD');
	let areaUnit = $state('sqft');
	let numberLocale = $state('en-US');

	let defaultPropertyTypes = $state<string[]>([]);
	let defaultCapRate = $state('');
	let defaultDiscountRate = $state('');
	let defaultHoldPeriod = $state('');
	let defaultVacancyRate = $state('');

	const TIMEZONES = [
		{ value: 'America/New_York', label: 'Eastern Time (ET)' },
		{ value: 'America/Chicago', label: 'Central Time (CT)' },
		{ value: 'America/Denver', label: 'Mountain Time (MT)' },
		{ value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
		{ value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
		{ value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
		{ value: 'Europe/London', label: 'GMT / London' },
		{ value: 'Europe/Paris', label: 'Central European Time (CET)' },
		{ value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
		{ value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
		{ value: 'Asia/Singapore', label: 'Singapore Time (SGT)' }
	];

	const CURRENCIES = [
		{ value: 'USD', label: 'USD ($)', symbol: '$' },
		{ value: 'EUR', label: 'EUR (\u20AC)', symbol: '\u20AC' },
		{ value: 'GBP', label: 'GBP (\u00A3)', symbol: '\u00A3' },
		{ value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
		{ value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
		{ value: 'JPY', label: 'JPY (\u00A5)', symbol: '\u00A5' },
		{ value: 'AED', label: 'AED', symbol: 'AED' },
		{ value: 'SGD', label: 'SGD (S$)', symbol: 'S$' }
	];

	const LOCALES = [
		{ value: 'en-US', label: '1,234.56 (US)' },
		{ value: 'en-GB', label: '1,234.56 (UK)' },
		{ value: 'de-DE', label: '1.234,56 (DE)' },
		{ value: 'fr-FR', label: '1 234,56 (FR)' },
		{ value: 'ja-JP', label: '1,234.56 (JP)' }
	];

	const PROPERTY_TYPES = [
		'Office',
		'Retail',
		'Industrial',
		'Multifamily',
		'Hospitality',
		'Mixed-Use',
		'Land',
		'Healthcare',
		'Self-Storage',
		'Data Center',
		'Life Sciences',
		'Student Housing',
		'Senior Living',
		'Manufactured Housing'
	];

	function togglePropertyType(pt: string) {
		if (defaultPropertyTypes.includes(pt)) {
			defaultPropertyTypes = defaultPropertyTypes.filter((t) => t !== pt);
		} else {
			defaultPropertyTypes = [...defaultPropertyTypes, pt];
		}
	}

	function handleSave() {
		const prefsData = {
			timezone,
			currency,
			areaUnit,
			numberLocale,
			defaultPropertyTypes,
			defaultCapRate,
			defaultDiscountRate,
			defaultHoldPeriod,
			defaultVacancyRate
		};
		try {
			localStorage.setItem('user-settings-preferences', JSON.stringify(prefsData));
		} catch {}
	}

	function loadSaved() {
		try {
			const saved = localStorage.getItem('user-settings-preferences');
			if (saved) {
				const data = JSON.parse(saved);
				if (data.timezone) timezone = data.timezone;
				if (data.currency) currency = data.currency;
				if (data.areaUnit) areaUnit = data.areaUnit;
				if (data.numberLocale) numberLocale = data.numberLocale;
				if (data.defaultPropertyTypes) defaultPropertyTypes = data.defaultPropertyTypes;
				if (data.defaultCapRate) defaultCapRate = data.defaultCapRate;
				if (data.defaultDiscountRate) defaultDiscountRate = data.defaultDiscountRate;
				if (data.defaultHoldPeriod) defaultHoldPeriod = data.defaultHoldPeriod;
				if (data.defaultVacancyRate) defaultVacancyRate = data.defaultVacancyRate;
			}
		} catch {}
	}

	$effect(() => {
		if (typeof window !== 'undefined') loadSaved();
	});
</script>

<div class="space-y-6">
	<!-- Appearance -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
			Appearance
		</h3>
		<div class="flex gap-3">
			{#each ['light', 'dark', 'warm'] as theme}
				<button
					type="button"
					onclick={() => themeStore.setTheme(theme as AppTheme)}
					class="flex flex-col items-center gap-2 rounded-lg border-2 px-6 py-4 text-sm font-medium transition-all {currentTheme ===
					theme
						? darkMode
							? 'border-primary-500 bg-primary-900/30 text-primary-300'
							: 'border-primary-500 bg-primary-50 text-primary-700'
						: darkMode
							? 'border-slate-600 text-slate-400 hover:border-slate-500'
							: 'border-slate-200 text-slate-600 hover:border-slate-300'}"
				>
					{#if theme === 'light'}
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
							/>
						</svg>
					{:else if theme === 'dark'}
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
							/>
						</svg>
					{:else}
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
							/>
						</svg>
					{/if}
					<span class="capitalize">{theme}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Regional Settings -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
			Regional Settings
		</h3>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="grid gap-5 sm:grid-cols-2">
				<div>
					<label
						for="timezone"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Timezone
					</label>
					<select
						id="timezone"
						bind:value={timezone}
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white'
							: 'bg-white border-slate-300 text-slate-900'}"
					>
						{#each TIMEZONES as tz}
							<option value={tz.value}>{tz.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label
						for="currency"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Currency
					</label>
					<select
						id="currency"
						bind:value={currency}
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white'
							: 'bg-white border-slate-300 text-slate-900'}"
					>
						{#each CURRENCIES as c}
							<option value={c.value}>{c.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label
						for="areaUnit"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Area Units
					</label>
					<select
						id="areaUnit"
						bind:value={areaUnit}
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white'
							: 'bg-white border-slate-300 text-slate-900'}"
					>
						<option value="sqft">Square Feet (sq ft)</option>
						<option value="sqm">Square Meters (sq m)</option>
					</select>
				</div>
				<div>
					<label
						for="numberLocale"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Number Format
					</label>
					<select
						id="numberLocale"
						bind:value={numberLocale}
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white'
							: 'bg-white border-slate-300 text-slate-900'}"
					>
						{#each LOCALES as l}
							<option value={l.value}>{l.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<div
				class="mt-6 flex justify-end border-t pt-5 {darkMode
					? 'border-slate-700'
					: 'border-slate-200'}"
			>
				<button
					type="submit"
					class="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors bg-primary-600 hover:bg-primary-700"
				>
					Save Preferences
				</button>
			</div>
		</form>
	</div>

	<!-- Property Type Preferences -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1">
			Default Property Types
		</h3>
		<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">
			Select property types you typically work with. These are used as defaults for new analyses.
		</p>
		<div class="flex flex-wrap gap-2">
			{#each PROPERTY_TYPES as pt}
				<button
					type="button"
					onclick={() => togglePropertyType(pt)}
					class="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all {defaultPropertyTypes.includes(
						pt
					)
						? darkMode
							? 'border-primary-500 bg-primary-900/40 text-primary-300'
							: 'border-primary-500 bg-primary-50 text-primary-700'
						: darkMode
							? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
							: 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700'}"
				>
					{pt}
				</button>
			{/each}
		</div>
	</div>

	<!-- Underwriting Defaults -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1">
			Default Underwriting Assumptions
		</h3>
		<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">
			Pre-populate new analysis projects with these defaults. You can always override per-project.
		</p>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="grid gap-5 sm:grid-cols-2">
				<div>
					<label
						for="capRate"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Default Cap Rate (%)
					</label>
					<input
						type="number"
						id="capRate"
						bind:value={defaultCapRate}
						step="0.1"
						min="0"
						max="30"
						placeholder="e.g. 6.5"
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					/>
				</div>
				<div>
					<label
						for="discountRate"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Default Discount Rate (%)
					</label>
					<input
						type="number"
						id="discountRate"
						bind:value={defaultDiscountRate}
						step="0.1"
						min="0"
						max="30"
						placeholder="e.g. 8.0"
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					/>
				</div>
				<div>
					<label
						for="holdPeriod"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Default Hold Period (years)
					</label>
					<input
						type="number"
						id="holdPeriod"
						bind:value={defaultHoldPeriod}
						step="1"
						min="1"
						max="30"
						placeholder="e.g. 5"
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					/>
				</div>
				<div>
					<label
						for="vacancyRate"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Default Vacancy Rate (%)
					</label>
					<input
						type="number"
						id="vacancyRate"
						bind:value={defaultVacancyRate}
						step="0.5"
						min="0"
						max="100"
						placeholder="e.g. 5.0"
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					/>
				</div>
			</div>

			<div
				class="mt-6 flex justify-end border-t pt-5 {darkMode
					? 'border-slate-700'
					: 'border-slate-200'}"
			>
				<button
					type="submit"
					class="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors bg-primary-600 hover:bg-primary-700"
				>
					Save Preferences
				</button>
			</div>
		</form>
	</div>
</div>
