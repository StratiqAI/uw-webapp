<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Form state
	let username = $state('');
	let fullName = $state('');
	let email = $state('');
	let phone = $state('');
	let timezone = $state('UTC-08:00 - Pacific Standard Time (PST)');
	let accountType = $state('Choose your account type');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	// Avatar state (empty until user uploads a photo)
	let avatarUrl = $state('');
	let showTimezoneTooltip = $state(false);
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
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
					</svg>
				</div>
				<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Account Settings</h1>
			</div>
			</div>

		<!-- Main Content -->
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-4xl mx-auto px-6 py-8">
				<!-- Account Information Section -->
				<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg p-6 mb-6 shadow-sm">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
							</svg>
						</div>
						<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Account Information</h2>
					</div>

					<!-- Avatar Section -->
					<div class="flex items-center gap-6 mb-6 pb-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						{#if avatarUrl}
							<img
								src={avatarUrl}
								alt=""
								class="h-20 w-20 rounded-full {darkMode ? 'ring-2 ring-slate-700' : 'ring-2 ring-slate-200'} object-cover"
							/>
						{:else}
							<div
								class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full ring-2 {darkMode
									? 'bg-slate-700 text-slate-400 ring-slate-700'
									: 'bg-slate-100 text-slate-500 ring-slate-200'}"
								aria-hidden="true"
							>
								<svg class="h-10 w-10" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
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
								class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors flex items-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
								</svg>
								Upload
							</button>
							<button
								type="button"
								class="px-4 py-2 text-sm font-medium {darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'} border rounded-lg transition-colors"
							>
								Remove
							</button>
						</div>
					</div>

					<!-- Account Form -->
					<form onsubmit={(e) => { e.preventDefault(); }}>
						<div class="grid gap-6 sm:grid-cols-2">
							<div>
								<label for="username" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Username <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="username"
									bind:value={username}
									placeholder="Ex. BonnieG"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
									required
								/>
							</div>
							<div>
								<label for="fullname" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Full Name <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="fullname"
									bind:value={fullName}
									placeholder="Ex. Bonnie Green"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
									required
								/>
							</div>
							<div>
								<label for="email" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Email <span class="text-red-500">*</span>
								</label>
								<div class="relative">
									<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg class="w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
										</svg>
									</div>
									<input
										type="email"
										id="email"
										bind:value={email}
										placeholder="name@example.com"
										class="w-full pl-10 pr-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
										required
									/>
								</div>
							</div>
							<div>
								<label for="phone-input" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
									Phone Number
								</label>
								<div class="relative">
									<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg class="w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
										</svg>
									</div>
									<input
										type="text"
										id="phone-input"
										bind:value={phone}
										placeholder="123-456-7890"
										pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
										class="w-full pl-10 pr-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
									/>
								</div>
							</div>
							<div>
								<label for="timezone" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2 flex items-center gap-2">
									Timezone
									<button
										type="button"
										onclick={() => showTimezoneTooltip = !showTimezoneTooltip}
										class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
										aria-label="Timezone information"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
										</svg>
									</button>
								</label>
								<select
									id="timezone"
									bind:value={timezone}
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
								>
									<option>UTC-08:00 - Pacific Standard Time (PST)</option>
									<option value="-12:00">(GMT -12:00) Eniwetok, Kwajalein</option>
									<option value="-11:00">(GMT -11:00) Midway Island, Samoa</option>
									<option value="-10:00">(GMT -10:00) Hawaii</option>
									<option value="-09:00">(GMT -9:00) Alaska</option>
									<option value="-08:00">(GMT -8:00) Pacific Time (US &amp; Canada)</option>
									<option value="-07:00">(GMT -7:00) Mountain Time (US &amp; Canada)</option>
									<option value="-06:00">(GMT -6:00) Central Time (US &amp; Canada)</option>
									<option value="-05:00">(GMT -5:00) Eastern Time (US &amp; Canada)</option>
									<option value="+00:00">(GMT) Western Europe Time, London</option>
									<option value="+01:00">(GMT +1:00) Brussels, Copenhagen, Madrid, Paris</option>
									<option value="+09:00">(GMT +9:00) Tokyo, Seoul</option>
								</select>
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
						</div>

						<div class="mt-6 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t flex justify-end">
							<button
								type="submit"
								class="px-5 py-2.5 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
							>
								Save changes
							</button>
						</div>
					</form>
				</div>

				<!-- Password Section -->
				<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg p-6 shadow-sm">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
							</svg>
						</div>
						<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Password</h2>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); }}>
						<div class="grid gap-6 sm:grid-cols-2">
							<div class="space-y-4">
								<div>
									<label for="current-password" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
										Current Password
									</label>
									<input
										type="password"
										id="current-password"
										bind:value={currentPassword}
										placeholder="Enter your current password"
										class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
										required
									/>
								</div>
								<div>
									<label for="new-password" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
										New Password
									</label>
									<input
										type="password"
										id="new-password"
										bind:value={newPassword}
										placeholder="Enter your new password"
										class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
										required
									/>
								</div>
								<div>
									<label for="confirm-password" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
										Confirm New Password
									</label>
									<input
										type="password"
										id="confirm-password"
										bind:value={confirmPassword}
										placeholder="Confirm new password"
										class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
										required
									/>
								</div>
							</div>
							<div class="{darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-lg p-4">
								<h3 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-2">Password Requirements</h3>
								<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-4">Ensure that these requirements are met:</p>
								<ul class="space-y-2 text-xs {darkMode ? 'text-slate-300' : 'text-slate-600'}">
									<li class="flex items-center gap-2">
										<svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
										</svg>
										At least 10 characters (and up to 100 characters)
									</li>
									<li class="flex items-center gap-2">
										<svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
										</svg>
										At least one lowercase character
									</li>
									<li class="flex items-center gap-2">
										<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
										</svg>
										Inclusion of at least one special character, e.g., ! @ # ?
									</li>
									<li class="flex items-center gap-2">
										<svg class="w-4 h-4 {darkMode ? 'text-slate-500' : 'text-slate-400'} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
										</svg>
										Significantly different from your previous passwords
									</li>
								</ul>
							</div>
						</div>

						<div class="mt-6 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t flex justify-end">
							<button
								type="submit"
								class="px-5 py-2.5 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors"
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
