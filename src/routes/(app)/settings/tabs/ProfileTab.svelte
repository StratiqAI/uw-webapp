<script lang="ts">
	import type { CurrentUser } from '$lib/types/auth';

	let { currentUser, darkMode = false } = $props<{
		currentUser?: CurrentUser;
		darkMode?: boolean;
	}>();

	let displayName = $state(currentUser?.name || currentUser?.givenName || '');
	let email = $derived(currentUser?.email || '');
	let emailVerified = $derived(currentUser?.emailVerified ?? false);
	let phone = $state(currentUser?.phoneNumber || '');
	let jobTitle = $state('');
	let company = $state('');
	let licenseState = $state('');
	let licenseNumber = $state('');
	let bio = $state('');
	let avatarUrl = $state(currentUser?.pictureUrl || '');

	const JOB_TITLES = [
		'Broker',
		'Investor',
		'Analyst',
		'Asset Manager',
		'Portfolio Manager',
		'Lender',
		'Developer',
		'Appraiser',
		'Property Manager',
		'Other'
	];

	const US_STATES = [
		'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
		'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
		'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
		'VA','WA','WV','WI','WY','DC'
	];

	let primaryMarkets = $state<string[]>([]);
	let marketInput = $state('');

	const SUGGESTED_MARKETS = [
		'New York Metro', 'Los Angeles', 'Chicago', 'San Francisco Bay Area',
		'Miami / South Florida', 'Dallas-Fort Worth', 'Houston', 'Atlanta',
		'Boston', 'Seattle', 'Washington D.C.', 'Denver', 'Phoenix',
		'Philadelphia', 'Minneapolis', 'San Diego', 'Austin', 'Nashville',
		'Charlotte', 'Tampa Bay', 'Portland', 'Raleigh-Durham', 'Salt Lake City',
		'Las Vegas', 'Orlando', 'Detroit', 'Columbus', 'Indianapolis'
	];

	let showMarketSuggestions = $state(false);
	let filteredMarkets = $derived(
		marketInput.trim()
			? SUGGESTED_MARKETS.filter(
					(m) =>
						m.toLowerCase().includes(marketInput.toLowerCase()) &&
						!primaryMarkets.includes(m)
				)
			: SUGGESTED_MARKETS.filter((m) => !primaryMarkets.includes(m))
	);

	function addMarket(market: string) {
		if (market.trim() && !primaryMarkets.includes(market.trim())) {
			primaryMarkets = [...primaryMarkets, market.trim()];
		}
		marketInput = '';
		showMarketSuggestions = false;
	}

	function removeMarket(market: string) {
		primaryMarkets = primaryMarkets.filter((m) => m !== market);
	}

	function handleMarketKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (filteredMarkets.length > 0) {
				addMarket(filteredMarkets[0]);
			} else if (marketInput.trim()) {
				addMarket(marketInput);
			}
		}
	}

	function handleSave() {
		// Phase 1: localStorage interim persistence
		const profileData = {
			displayName,
			phone,
			jobTitle,
			company,
			licenseState,
			licenseNumber,
			bio,
			avatarUrl,
			primaryMarkets
		};
		try {
			localStorage.setItem('user-settings-profile', JSON.stringify(profileData));
		} catch {}
	}

	function loadSaved() {
		try {
			const saved = localStorage.getItem('user-settings-profile');
			if (saved) {
				const data = JSON.parse(saved);
				if (data.displayName && !displayName) displayName = data.displayName;
				if (data.phone && !phone) phone = data.phone;
				if (data.jobTitle) jobTitle = data.jobTitle;
				if (data.company) company = data.company;
				if (data.licenseState) licenseState = data.licenseState;
				if (data.licenseNumber) licenseNumber = data.licenseNumber;
				if (data.bio) bio = data.bio;
				if (data.avatarUrl) avatarUrl = data.avatarUrl;
				if (data.primaryMarkets) primaryMarkets = data.primaryMarkets;
			}
		} catch {}
	}

	$effect(() => {
		if (typeof window !== 'undefined') loadSaved();
	});
</script>

<div class="space-y-6">
	<!-- Avatar Section -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
			Profile Photo
		</h3>
		<div class="flex items-center gap-6">
			{#if avatarUrl}
				<img
					src={avatarUrl}
					alt="Profile"
					class="h-20 w-20 rounded-full object-cover ring-2 {darkMode
						? 'ring-slate-700'
						: 'ring-slate-200'}"
				/>
			{:else}
				<div
					class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full ring-2 {darkMode
						? 'bg-slate-700 text-slate-400 ring-slate-700'
						: 'bg-slate-100 text-slate-500 ring-slate-200'}"
				>
					<svg
						class="h-10 w-10"
						fill="currentColor"
						viewBox="0 0 16 16"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							fill-rule="evenodd"
							d="M8 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{/if}
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors {darkMode
						? 'bg-primary-600 hover:bg-primary-700'
						: 'bg-primary-600 hover:bg-primary-700'}"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						></path>
					</svg>
					Upload
				</button>
				{#if avatarUrl}
					<button
						type="button"
						onclick={() => (avatarUrl = '')}
						class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors {darkMode
							? 'border-slate-600 text-slate-300 hover:bg-slate-700'
							: 'border-slate-300 text-slate-700 hover:bg-slate-100'}"
					>
						Remove
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Personal Info -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
			Personal Information
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
						for="displayName"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Full Name
					</label>
					<input
						type="text"
						id="displayName"
						bind:value={displayName}
						placeholder="Your full name"
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					/>
				</div>
				<div>
					<label
						for="email"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Email
					</label>
					<div class="relative">
						<input
							type="email"
							id="email"
							value={email}
							disabled
							class="w-full rounded-lg border px-3 py-2 pr-20 text-sm {darkMode
								? 'bg-slate-700/50 border-slate-600 text-slate-400'
								: 'bg-slate-50 border-slate-300 text-slate-500'} cursor-not-allowed"
						/>
						{#if emailVerified}
							<span
								class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-emerald-500"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									></path>
								</svg>
								Verified
							</span>
						{/if}
					</div>
				</div>
				<div>
					<label
						for="phone"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Phone Number
					</label>
					<input
						type="tel"
						id="phone"
						bind:value={phone}
						placeholder="(555) 123-4567"
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					/>
				</div>
				<div>
					<label
						for="jobTitle"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Job Title
					</label>
					<select
						id="jobTitle"
						bind:value={jobTitle}
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white'
							: 'bg-white border-slate-300 text-slate-900'}"
					>
						<option value="">Select your role</option>
						{#each JOB_TITLES as title}
							<option value={title}>{title}</option>
						{/each}
					</select>
				</div>
				<div class="sm:col-span-2">
					<label
						for="company"
						class="mb-1.5 block text-sm font-medium {darkMode
							? 'text-slate-300'
							: 'text-slate-700'}"
					>
						Company / Organization
					</label>
					<input
						type="text"
						id="company"
						bind:value={company}
						placeholder="Your company name"
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					/>
				</div>
			</div>

			<!-- Professional License -->
			<div class="mt-5 border-t pt-5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-3">
					Professional License
					<span class="ml-1 text-xs font-normal {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						>(optional)</span
					>
				</h4>
				<div class="grid gap-5 sm:grid-cols-2">
					<div>
						<label
							for="licenseState"
							class="mb-1.5 block text-sm font-medium {darkMode
								? 'text-slate-300'
								: 'text-slate-700'}"
						>
							State
						</label>
						<select
							id="licenseState"
							bind:value={licenseState}
							class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
								? 'bg-slate-700 border-slate-600 text-white'
								: 'bg-white border-slate-300 text-slate-900'}"
						>
							<option value="">Select state</option>
							{#each US_STATES as st}
								<option value={st}>{st}</option>
							{/each}
						</select>
					</div>
					<div>
						<label
							for="licenseNumber"
							class="mb-1.5 block text-sm font-medium {darkMode
								? 'text-slate-300'
								: 'text-slate-700'}"
						>
							License Number
						</label>
						<input
							type="text"
							id="licenseNumber"
							bind:value={licenseNumber}
							placeholder="e.g. 01234567"
							class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
								? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
								: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
						/>
					</div>
				</div>
			</div>

			<!-- Primary Markets -->
			<div class="mt-5 border-t pt-5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-3">
					Primary Markets
				</h4>
				<div class="relative">
					<input
						type="text"
						bind:value={marketInput}
						onfocus={() => (showMarketSuggestions = true)}
						onblur={() => setTimeout(() => (showMarketSuggestions = false), 200)}
						onkeydown={handleMarketKeydown}
						placeholder="Type to search markets..."
						class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					/>
					{#if showMarketSuggestions && filteredMarkets.length > 0}
						<div
							class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border shadow-lg {darkMode
								? 'bg-slate-700 border-slate-600'
								: 'bg-white border-slate-200'}"
						>
							{#each filteredMarkets.slice(0, 10) as market}
								<button
									type="button"
									class="w-full px-3 py-2 text-left text-sm transition-colors {darkMode
										? 'text-slate-200 hover:bg-slate-600'
										: 'text-slate-700 hover:bg-slate-50'}"
									onmousedown={() => addMarket(market)}
								>
									{market}
								</button>
							{/each}
						</div>
					{/if}
				</div>
				{#if primaryMarkets.length > 0}
					<div class="mt-3 flex flex-wrap gap-2">
						{#each primaryMarkets as market}
							<span
								class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium {darkMode
									? 'bg-primary-900/40 text-primary-300'
									: 'bg-primary-100 text-primary-700'}"
							>
								{market}
								<button
									type="button"
									onclick={() => removeMarket(market)}
									class="ml-0.5 rounded-full p-0.5 transition-colors {darkMode
										? 'hover:bg-primary-800 text-primary-400'
										: 'hover:bg-primary-200 text-primary-500'}"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										></path>
									</svg>
								</button>
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Bio -->
			<div class="mt-5 border-t pt-5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
				<label
					for="bio"
					class="mb-1.5 block text-sm font-medium {darkMode
						? 'text-slate-300'
						: 'text-slate-700'}"
				>
					Bio
				</label>
				<textarea
					id="bio"
					bind:value={bio}
					rows="4"
					placeholder="Brief professional summary..."
					class="w-full resize-none rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				></textarea>
				<p class="mt-1 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					{bio.length}/500 characters
				</p>
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
					Save Profile
				</button>
			</div>
		</form>
	</div>
</div>
