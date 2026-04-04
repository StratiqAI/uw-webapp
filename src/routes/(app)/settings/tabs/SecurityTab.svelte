<script lang="ts">
	import type { CurrentUser } from '$lib/types/auth';

	let { currentUser, darkMode = false } = $props<{
		currentUser?: CurrentUser;
		darkMode?: boolean;
	}>();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');

	let passwordRequirements = $derived({
		minLength: newPassword.length >= 10,
		maxLength: newPassword.length <= 100,
		lowercase: /[a-z]/.test(newPassword),
		uppercase: /[A-Z]/.test(newPassword),
		number: /[0-9]/.test(newPassword),
		special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
		match: newPassword === confirmPassword && confirmPassword.length > 0
	});

	let allRequirementsMet = $derived(
		passwordRequirements.minLength &&
			passwordRequirements.lowercase &&
			passwordRequirements.uppercase &&
			passwordRequirements.number &&
			passwordRequirements.special &&
			passwordRequirements.match
	);

	let lastSignIn = $derived.by(() => {
		if (currentUser?.iat) {
			return new Date(currentUser.iat * 1000).toLocaleString();
		}
		return 'Unknown';
	});

	let tokenExpiry = $derived.by(() => {
		if (currentUser?.exp) {
			return new Date(currentUser.exp * 1000).toLocaleString();
		}
		return 'Unknown';
	});

	let mfaEnabled = $derived(
		currentUser?.amr?.includes('mfa') || currentUser?.amr?.includes('sw') || false
	);

	function handlePasswordChange() {
		passwordError = '';
		passwordSuccess = '';

		if (!currentPassword) {
			passwordError = 'Current password is required.';
			return;
		}
		if (!allRequirementsMet) {
			passwordError = 'Please meet all password requirements.';
			return;
		}

		// Phase 1: Show success message (actual Cognito integration in Phase 3)
		passwordSuccess = 'Password change will be available once backend integration is complete.';
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
	}
</script>

{#snippet requirementCheck(met: boolean, label: string)}
	<li class="flex items-center gap-2 text-xs">
		{#if met}
			<svg class="h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
			</svg>
		{:else}
			<svg
				class="h-4 w-4 shrink-0 {darkMode ? 'text-slate-500' : 'text-slate-400'}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"
				></path>
			</svg>
		{/if}
		<span class={met ? (darkMode ? 'text-slate-300' : 'text-slate-600') : darkMode ? 'text-slate-500' : 'text-slate-400'}>
			{label}
		</span>
	</li>
{/snippet}

<div class="space-y-6">
	<!-- Change Password -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
			Change Password
		</h3>

		{#if passwordError}
			<div
				class="mb-4 rounded-lg border px-4 py-3 text-sm {darkMode
					? 'bg-red-900/20 border-red-800 text-red-400'
					: 'bg-red-50 border-red-200 text-red-700'}"
			>
				{passwordError}
			</div>
		{/if}
		{#if passwordSuccess}
			<div
				class="mb-4 rounded-lg border px-4 py-3 text-sm {darkMode
					? 'bg-emerald-900/20 border-emerald-800 text-emerald-400'
					: 'bg-emerald-50 border-emerald-200 text-emerald-700'}"
			>
				{passwordSuccess}
			</div>
		{/if}

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handlePasswordChange();
			}}
		>
			<div class="grid gap-6 sm:grid-cols-2">
				<div class="space-y-4">
					<div>
						<label
							for="currentPassword"
							class="mb-1.5 block text-sm font-medium {darkMode
								? 'text-slate-300'
								: 'text-slate-700'}"
						>
							Current Password
						</label>
						<input
							type="password"
							id="currentPassword"
							bind:value={currentPassword}
							placeholder="Enter current password"
							class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
								? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
								: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
						/>
					</div>
					<div>
						<label
							for="newPassword"
							class="mb-1.5 block text-sm font-medium {darkMode
								? 'text-slate-300'
								: 'text-slate-700'}"
						>
							New Password
						</label>
						<input
							type="password"
							id="newPassword"
							bind:value={newPassword}
							placeholder="Enter new password"
							class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
								? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
								: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
						/>
					</div>
					<div>
						<label
							for="confirmPassword"
							class="mb-1.5 block text-sm font-medium {darkMode
								? 'text-slate-300'
								: 'text-slate-700'}"
						>
							Confirm New Password
						</label>
						<input
							type="password"
							id="confirmPassword"
							bind:value={confirmPassword}
							placeholder="Confirm new password"
							class="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent {darkMode
								? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
								: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
						/>
					</div>
				</div>

				<!-- Requirements panel -->
				<div
					class="rounded-lg p-4 {darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} self-start"
				>
					<h4 class="mb-2 text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
						Password Requirements
					</h4>
					<ul class="space-y-2">
						{@render requirementCheck(passwordRequirements.minLength, 'At least 10 characters')}
						{@render requirementCheck(passwordRequirements.lowercase, 'At least one lowercase letter')}
						{@render requirementCheck(passwordRequirements.uppercase, 'At least one uppercase letter')}
						{@render requirementCheck(passwordRequirements.number, 'At least one number')}
						{@render requirementCheck(passwordRequirements.special, 'At least one special character (!@#$...)')}
						{@render requirementCheck(passwordRequirements.match, 'Passwords match')}
					</ul>
				</div>
			</div>

			<div
				class="mt-6 flex justify-end border-t pt-5 {darkMode
					? 'border-slate-700'
					: 'border-slate-200'}"
			>
				<button
					type="submit"
					disabled={!allRequirementsMet || !currentPassword}
					class="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors {allRequirementsMet &&
					currentPassword
						? 'bg-primary-600 hover:bg-primary-700'
						: darkMode
							? 'bg-slate-600 cursor-not-allowed'
							: 'bg-slate-300 cursor-not-allowed'}"
				>
					Update Password
				</button>
			</div>
		</form>
	</div>

	<!-- MFA & Session Info -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
			Security Overview
		</h3>
		<div class="space-y-4">
			<!-- MFA Status -->
			<div
				class="flex items-center justify-between rounded-lg px-4 py-3 {darkMode
					? 'bg-slate-700/50'
					: 'bg-slate-50'}"
			>
				<div>
					<p class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'}">
						Multi-Factor Authentication
					</p>
					<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">
						Add an extra layer of security to your account
					</p>
				</div>
				<span
					class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold {mfaEnabled
						? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
						: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}"
				>
					{#if mfaEnabled}
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
							></path>
						</svg>
						Enabled
					{:else}
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
							></path>
						</svg>
						Not Enabled
					{/if}
				</span>
			</div>

			<!-- Session Info -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-lg px-4 py-3 {darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}">
					<p class="text-xs font-medium uppercase tracking-wide {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						Last Sign-In
					</p>
					<p class="mt-1 text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'}">
						{lastSignIn}
					</p>
				</div>
				<div class="rounded-lg px-4 py-3 {darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}">
					<p class="text-xs font-medium uppercase tracking-wide {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						Session Expires
					</p>
					<p class="mt-1 text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'}">
						{tokenExpiry}
					</p>
				</div>
			</div>

			<!-- Sign out all sessions -->
			<div
				class="flex items-center justify-between rounded-lg border px-4 py-3 {darkMode
					? 'border-red-900/50 bg-red-900/10'
					: 'border-red-200 bg-red-50/50'}"
			>
				<div>
					<p class="text-sm font-medium {darkMode ? 'text-red-400' : 'text-red-700'}">
						Sign Out Everywhere
					</p>
					<p class="text-xs {darkMode ? 'text-red-400/70' : 'text-red-600/70'} mt-0.5">
						Sign out of all devices and sessions
					</p>
				</div>
				<a
					href="/auth/logout"
					class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors {darkMode
						? 'border-red-800 text-red-400 hover:bg-red-900/30'
						: 'border-red-300 text-red-700 hover:bg-red-100'}"
				>
					Sign Out All
				</a>
			</div>
		</div>
	</div>
</div>
