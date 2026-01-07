<!--
	StoredUsers.svelte
	
	Component for displaying a list of stored user data from the store.
	
	Features:
	- Lists all users stored at a specific path (default: app/users)
	- Shows user ID and data for each entry
	- Provides a "Clear All" button to remove all users
	- Customizable title and empty state message
	
	This component is used to display generated user data from AI calls.
-->

<script lang="ts">
	interface User {
		id: string;
		data: any;
	}

	interface Props {
		allUsers: User[];
		clearAllUsers: () => void;
		title?: string;
		emptyMessage?: string;
	}

	// Props with default values for title and emptyMessage
	let { 
		allUsers, // Array of user objects with id and data
		clearAllUsers, // Callback function to clear all users
		title = 'All Stored Users', // Customizable title
		emptyMessage = 'No users stored yet. Generate some users to see them here!' // Customizable empty state message
	}: Props = $props();
</script>

<div class="rounded-md border border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/30 p-4">
	<div class="mb-2 flex items-center justify-between">
		<!-- Display title with count -->
		<strong class="dark:text-indigo-200">{title} ({allUsers.length}):</strong>
		<!-- Only show clear button if there are users to clear -->
		{#if allUsers.length > 0}
			<button
				onclick={clearAllUsers}
				class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
			>
				Clear All
			</button>
		{/if}
	</div>
	{#if allUsers.length > 0}
		<!-- Render each user as a beautiful card -->
		<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each allUsers as { id, data }}
				{@const name = data?.name || 'Unknown'}
				{@const age = data?.age ?? null}
				{@const skill = data?.skill || 'Unknown'}
				<div
					class="group relative overflow-hidden rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md"
				>
					<!-- User card content -->
					<div class="p-5">
						<!-- ID badge (small, subtle) -->
						<div class="mb-3 text-xs text-gray-400 dark:text-gray-500">#{id.split('/').pop()}</div>

						<!-- Name (prominent) -->
						<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">{name}</h3>

						<!-- User details grid -->
						<div class="space-y-3">
							<!-- Age -->
							{#if age !== null}
								<div class="flex items-center gap-3">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
											/>
										</svg>
									</div>
									<div>
										<div class="text-xs text-gray-500 dark:text-gray-400">Age</div>
										<div class="text-sm font-medium text-gray-900 dark:text-slate-200">{age} years old</div>
									</div>
								</div>
							{/if}

							<!-- Skill Level -->
							<div class="flex items-center gap-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<div class="text-xs text-gray-500 dark:text-gray-400">Skill Level</div>
									<div class="mt-1">
										<span
											class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium {skill ===
											'beginner'
												? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
												: skill === 'intermediate'
													? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
													: skill === 'advanced'
														? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
														: skill === 'expert'
															? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
															: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}"
										>
											{skill.charAt(0).toUpperCase() + skill.slice(1)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Show empty state message when no users exist -->
		<p class="mt-4 text-sm text-gray-600 dark:text-gray-300">
			{emptyMessage}
		</p>
	{/if}
</div>
