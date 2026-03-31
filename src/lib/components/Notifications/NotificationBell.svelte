<script lang="ts">
	import { notificationStore, type Notification } from '$lib/stores/notifications.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { goto } from '$app/navigation';
	import type { Project } from '@stratiqai/types-simple';

	interface NotificationBellProps {
		projects?: Project[];
		projectName?: string;
	}

	let { projects, projectName }: NotificationBellProps = $props();
	
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let notifications = $derived(notificationStore.notifications);
	let unreadCount = $derived(notificationStore.unreadCount);
	let showPanel = $derived(notificationStore.showPanel);

	// Close panel when clicking outside
	$effect(() => {
		if (!showPanel || typeof window === 'undefined') return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('[data-notifications-panel]') && !target.closest('[data-notifications-button]')) {
				notificationStore.setPanel(false);
			}
		};
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	function handleNotificationClick(notification: Notification) {
		if (notification.parentId) {
			goto(`/projects/workspace/${notification.parentId}/get-started`);
			notificationStore.setPanel(false);
		}
	}

	function getProjectName(notification: Notification): string {
		if (projectName) return projectName;
		if (projects) {
			const project = projects.find(p => p.id === notification.parentId);
			return project?.name || 'Project';
		}
		return 'Project';
	}

	/**
	 * Extract processing status from notification properties
	 * Processing status events store eventType in properties
	 */
	function getProcessingStatus(notification: Notification): string | null {
		if (!notification.properties) return null;
		try {
			const props = typeof notification.properties === 'string' 
				? JSON.parse(notification.properties) 
				: notification.properties;
			return props.eventType || null;
		} catch {
			return null;
		}
	}

	/**
	 * Get notification icon based on processing status
	 */
	function getNotificationIcon(status: string | null): string {
		if (!status) return 'bell';
		switch (status) {
			case 'AnalysisStarted':
			case 'PageAnalysisStarted':
				return 'clock'; // Processing
			case 'Complete':
			case 'PageAnalysisComplete':
			case 'Classified':
				return 'check-circle'; // Success
			case 'Error':
				return 'exclamation-circle'; // Error
			default:
				return 'bell';
		}
	}
</script>

<div class="relative">
	<button
		data-notifications-button
		type="button"
		onclick={() => notificationStore.togglePanel()}
		class="relative p-1.5 sm:p-2 {darkMode
			? 'text-slate-300 hover:text-indigo-400 hover:bg-indigo-900/20'
			: 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'} rounded-md transition-colors"
		aria-label="Notifications"
		title={unreadCount > 0
			? `Notifications — ${unreadCount} unread`
			: 'Notifications — no unread'}
	>
		<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
			></path>
		</svg>
		{#if unreadCount > 0}
			<span
				class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white"
			>
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</button>
	{#if showPanel}
		<div
			data-notifications-panel
			role="menu"
			aria-label="Notifications"
			class="absolute right-0 top-full mt-2 w-96 {darkMode
				? 'border-slate-700 bg-slate-800'
				: 'border-slate-200 bg-white'} z-50 rounded-lg border shadow-xl max-h-96 overflow-hidden flex flex-col"
		>
			<div
				class="flex items-center justify-between border-b {darkMode
					? 'border-slate-700'
					: 'border-slate-200'} px-4 py-3"
			>
				<h3
					class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}"
				>
					Notifications
				</h3>
				{#if notifications.length > 0}
					<button
						type="button"
						onclick={() => notificationStore.clearAll()}
						class="text-xs {darkMode
							? 'text-slate-400 hover:text-slate-200'
							: 'text-slate-500 hover:text-slate-700'} transition-colors"
					>
						Clear all
					</button>
				{/if}
			</div>
			<div class="flex-1 overflow-y-auto">
				{#if notifications.length > 0}
					<div class="divide-y {darkMode ? 'divide-slate-700' : 'divide-slate-200'}">
						{#each notifications as notification}
							<button
								type="button"
								onclick={() => handleNotificationClick(notification)}
								class="w-full text-left px-4 py-3 hover:bg-slate-50 {darkMode
									? 'hover:bg-slate-700'
									: ''} transition-colors"
							>
								<div class="flex items-start gap-3">
									<div
										class="h-8 w-8 flex-shrink-0 {darkMode
											? 'bg-indigo-900'
											: 'bg-indigo-100'} flex items-center justify-center rounded-lg"
									>
										<svg
											class="h-4 w-4 {darkMode
												? 'text-indigo-300'
												: 'text-indigo-600'}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
											></path>
										</svg>
									</div>
									<div class="min-w-0 flex-1">
										<p
											class="text-sm {darkMode
												? 'text-white'
												: 'text-slate-900'} font-medium"
										>
											{getProjectName(notification)}
										</p>
										<p
											class="text-sm {darkMode
												? 'text-slate-300'
												: 'text-slate-600'} mt-1"
										>
											{notification.message}
										</p>
										<p
											class="text-xs {darkMode
												? 'text-slate-400'
												: 'text-slate-500'} mt-1"
										>
											{new Date(notification.createdAt).toLocaleString()}
										</p>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="px-4 py-8 text-center">
						<svg
							class="mx-auto h-12 w-12 {darkMode
								? 'text-slate-600'
								: 'text-slate-300'} mb-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
							></path>
						</svg>
						<p
							class="text-sm {darkMode
								? 'text-slate-400'
								: 'text-slate-500'}"
						>
							No notifications yet
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

