<script lang="ts">
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Notification preferences state
	let flowbiteCommunication = $state(false);
	let accountActivity = $state(true);
	let mobilePushNotifications = $state(true);
	let emailNotification = $state(false);
	let meetupsNearMe = $state(true);
	let someoneMentionsMe = $state(true);
	let collaboratorRequest = $state(true);
	let teamInvitations = $state(false);
	let anyoneFollowsMe = $state(false);
	let invitationAccepted = $state(false);
	let weeklyNewsletter = $state(true);
	let products = $state(true);
	let community = $state(false);
	let jobs = $state(false);
</script>

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<!-- Header -->
		<div class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm">
			<div class="flex items-center gap-4">
				<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
					</svg>
				</div>
				<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Notifications</h1>
			</div>
			</div>

		<!-- Main Content -->
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="max-w-4xl mx-auto px-6 py-8">
				<!-- Notifications Card -->
				<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg p-6 shadow-sm">
					<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
						<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
							<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
							</svg>
						</div>
						<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Notification Preferences</h2>
					</div>

					<form onsubmit={(e) => { e.preventDefault(); }}>
						<!-- Alerts & Notifications Section -->
						<div class="mb-8">
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Alerts & Notifications</h3>
								<button
									type="button"
									class="text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} transition-colors"
								>
									Select all
								</button>
							</div>
							<div class="space-y-4">
								<label class="relative flex items-start gap-4 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={flowbiteCommunication}
										class="sr-only peer"
									/>
									<div class="relative w-11 h-6 {darkMode ? 'bg-slate-700' : 'bg-slate-300'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:{darkMode ? 'bg-indigo-600' : 'bg-indigo-600'}"></div>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											StratiqAI Communication
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Get StratiqAI news, announcements, and product updates
										</p>
									</div>
								</label>

								<label class="relative flex items-start gap-4 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={accountActivity}
										class="sr-only peer"
									/>
									<div class="relative w-11 h-6 {darkMode ? 'bg-slate-700' : 'bg-slate-300'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:{darkMode ? 'bg-indigo-600' : 'bg-indigo-600'}"></div>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											Account Activity
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Get important notifications about you or activity you've missed
										</p>
									</div>
								</label>

								<label class="relative flex items-start gap-4 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={mobilePushNotifications}
										class="sr-only peer"
									/>
									<div class="relative w-11 h-6 {darkMode ? 'bg-slate-700' : 'bg-slate-300'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:{darkMode ? 'bg-indigo-600' : 'bg-indigo-600'}"></div>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											Mobile Push Notifications
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Receive push notifications whenever your company requires your attention
										</p>
									</div>
								</label>

								<label class="relative flex items-start gap-4 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={emailNotification}
										class="sr-only peer"
									/>
									<div class="relative w-11 h-6 {darkMode ? 'bg-slate-700' : 'bg-slate-300'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:{darkMode ? 'bg-indigo-600' : 'bg-indigo-600'}"></div>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											Email Notification
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Receive email notifications whenever your company requires your attention
										</p>
									</div>
								</label>

								<label class="relative flex items-start gap-4 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={meetupsNearMe}
										class="sr-only peer"
									/>
									<div class="relative w-11 h-6 {darkMode ? 'bg-slate-700' : 'bg-slate-300'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:{darkMode ? 'bg-indigo-600' : 'bg-indigo-600'}"></div>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											Events Near Me
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Get an email when a StratiqAI event is posted close to my location
										</p>
									</div>
								</label>
							</div>
						</div>

						<!-- Email me when Section -->
						<div class="mb-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Email me when:</h3>
								<button
									type="button"
									class="text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} transition-colors"
								>
									Select all
								</button>
							</div>
							<div class="space-y-3">
								<label class="flex items-center gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={someoneMentionsMe}
										class="w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<span class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
										Someone mentions me
									</span>
								</label>

								<label class="flex items-center gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={collaboratorRequest}
										class="w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<span class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
										Someone asks me to be a collaborator on one of their projects
									</span>
								</label>

								<label class="flex items-center gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={teamInvitations}
										class="w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<span class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
										I receive invitations to invite new team members
									</span>
								</label>

								<label class="flex items-center gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={anyoneFollowsMe}
										class="w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<span class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
										Anyone follows me
									</span>
								</label>

								<label class="flex items-center gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={invitationAccepted}
										class="w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<span class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
										Someone accepts my invitation
									</span>
								</label>
							</div>
						</div>

						<!-- Subscribe me to Section -->
						<div class="mb-6 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Subscribe me to:</h3>
								<button
									type="button"
									class="text-sm font-medium {darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} transition-colors"
								>
									Select all
								</button>
							</div>
							<div class="space-y-4">
								<label class="flex items-start gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={weeklyNewsletter}
										class="mt-0.5 w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											Weekly Newsletter
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Get the latest news for StratiqAI and platform updates
										</p>
									</div>
								</label>

								<label class="flex items-start gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={products}
										class="mt-0.5 w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											Products
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Get notified when a product has been updated or launched
										</p>
									</div>
								</label>

								<label class="flex items-start gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={community}
										class="mt-0.5 w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											StratiqAI Community
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Monday: Latest design news & community highlights
										</p>
									</div>
								</label>

								<label class="flex items-start gap-3 cursor-pointer group">
									<input
										type="checkbox"
										bind:checked={jobs}
										class="mt-0.5 w-4 h-4 {darkMode ? 'bg-slate-700 border-slate-600 text-indigo-600 focus:ring-indigo-500' : 'bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500'} border rounded focus:ring-2"
									/>
									<div class="flex-1">
										<span class="block text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} group-hover:{darkMode ? 'text-indigo-300' : 'text-indigo-600'} transition-colors">
											StratiqAI Jobs
										</span>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5">
											Friday: New career and freelance project opportunities
										</p>
									</div>
								</label>
							</div>
						</div>

						<!-- Save Button -->
						<div class="pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t flex justify-end">
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
