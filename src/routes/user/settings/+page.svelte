<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	// Form state
	let name = $state('');
	let zip = $state('');
	let country = $state('');
	let city = $state('');
	let address = $state('');
	let organization = $state('');
	let department = $state('');
	let accountType = $state('Choose your account type');
	let biography = $state('');
	let facebook = $state('');
	let dribbble = $state('');
	let twitter = $state('');
	let behance = $state('');
	let github = $state('');
	let pinterest = $state('');
	let instagram = $state('');
	let tiktok = $state('');

	let showAccountTypeTooltip = $state(false);
</script>

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<!-- Header -->
		<div class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm">
			<div class="flex items-center gap-4">
				<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
					</svg>
				</div>
				<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Settings</h1>
			</div>
			<div class="flex items-center gap-2">
				<button
					class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
					onclick={toggleDarkMode}
					aria-label="Toggle dark mode"
					title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if darkMode}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Main Content -->
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-6xl mx-auto px-6 py-8">
				<!-- General Information Section -->
				<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg p-6 mb-6 shadow-sm">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
							</svg>
						</div>
						<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">General Information</h2>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); }}>
						<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
							<div>
								<label for="name" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Your Name <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="name"
									bind:value={name}
									placeholder="Ex. Bonnie Green"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
									required
								/>
							</div>
							<div>
								<label for="zip" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									ZIP/Postal Code
								</label>
								<input
									type="text"
									id="zip"
									bind:value={zip}
									placeholder="Ex. 123456"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="country" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Country <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="country"
									bind:value={country}
									placeholder="United States"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
									required
								/>
							</div>
							<div>
								<label for="city" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Town/City <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="city"
									bind:value={city}
									placeholder="Ex. Sacramento"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
									required
								/>
							</div>
							<div>
								<label for="address" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Full Address <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="address"
									bind:value={address}
									placeholder="174 Cayuga Ave, San Francisco, CA 94112"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
									required
								/>
							</div>
							<div>
								<label for="organization" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Your Organization
								</label>
								<input
									type="text"
									id="organization"
									bind:value={organization}
									placeholder="Ex. StratiqAI LLC"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="department" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Department
								</label>
								<input
									type="text"
									id="department"
									bind:value={department}
									placeholder="Marketing"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="account-type" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2 flex items-center gap-2">
									Account Type
									<button
										type="button"
										onclick={() => showAccountTypeTooltip = !showAccountTypeTooltip}
										class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
										aria-label="Account type information"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
										</svg>
									</button>
								</label>
								<select
									id="account-type"
									bind:value={accountType}
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								>
									<option>Choose your account type</option>
									<option value="personal">Personal</option>
									<option value="business">Business</option>
									<option value="education">Education/University</option>
								</select>
							</div>
							<div class="sm:col-span-2 lg:col-span-1">
								<label for="biography" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Biography
								</label>
								<textarea
									id="biography"
									bind:value={biography}
									rows="8"
									placeholder="Hello, my name is..."
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
								></textarea>
							</div>
						</div>

						<div class="mt-6 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t flex justify-end">
							<button
								type="submit"
								class="px-5 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
							>
								Save changes
							</button>
						</div>
					</form>
				</div>

				<!-- Social Section -->
				<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg p-6 shadow-sm">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
							</svg>
						</div>
						<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Social Profiles</h2>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); }}>
						<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
							<div>
								<label for="facebook" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Facebook
								</label>
								<input
									type="text"
									id="facebook"
									bind:value={facebook}
									placeholder="Enter your facebook account"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="dribbble" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Dribbble
								</label>
								<input
									type="text"
									id="dribbble"
									bind:value={dribbble}
									placeholder="Enter your dribbble account"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="twitter" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Twitter
								</label>
								<input
									type="text"
									id="twitter"
									bind:value={twitter}
									placeholder="Enter your twitter account"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="behance" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Behance
								</label>
								<input
									type="text"
									id="behance"
									bind:value={behance}
									placeholder="Enter your behance account"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="github" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									GitHub
								</label>
								<input
									type="text"
									id="github"
									bind:value={github}
									placeholder="Enter your github account"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="pinterest" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Pinterest
								</label>
								<input
									type="text"
									id="pinterest"
									bind:value={pinterest}
									placeholder="Enter your pinterest account"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="instagram" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Instagram
								</label>
								<input
									type="text"
									id="instagram"
									bind:value={instagram}
									placeholder="Enter your instagram account"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
							<div>
								<label for="tiktok" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									TikTok
								</label>
								<input
									type="text"
									id="tiktok"
									bind:value={tiktok}
									placeholder="Enter your tiktok account"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								/>
							</div>
						</div>

						<div class="mt-6 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t flex justify-end">
							<button
								type="submit"
								class="px-5 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
							>
								Save changes
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>
