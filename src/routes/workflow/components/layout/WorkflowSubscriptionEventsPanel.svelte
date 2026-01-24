<script lang="ts">
	import type { WorkflowSyncManager, SubscriptionEvent } from '$lib/realtime/websocket/syncManagers/WorkflowSyncManager';
	import { onMount, onDestroy } from 'svelte';

	const {
		syncManager = null,
		workflowId = null,
		darkMode = false
	}: {
		syncManager?: WorkflowSyncManager | null;
		workflowId?: string | null;
		darkMode?: boolean;
	} = $props();

	let events = $state<SubscriptionEvent[]>([]);
	let unsubscribe: (() => void) | null = null;

	function getEventTypeColor(event: SubscriptionEvent) {
		switch (event.operation) {
			case 'create':
				return darkMode ? 'text-emerald-400' : 'text-emerald-600';
			case 'update':
				return darkMode ? 'text-blue-400' : 'text-blue-600';
			case 'delete':
				return darkMode ? 'text-red-400' : 'text-red-600';
			case 'statusChange':
				return darkMode ? 'text-amber-400' : 'text-amber-600';
			default:
				return darkMode ? 'text-slate-400' : 'text-slate-600';
		}
	}

	function getEntityTypeLabel(entityType: string) {
		switch (entityType) {
			case 'workflow':
				return 'Workflow';
			case 'workflowExecution':
				return 'Execution';
			case 'workflowNodeExecution':
				return 'Node';
			default:
				return entityType;
		}
	}

	function formatTimestamp(date: Date) {
		return date.toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	function shouldShowEvent(event: SubscriptionEvent): boolean {
		if (!workflowId) return true;
		
		// Filter events for the current workflow
		if (event.entityType === 'workflow') {
			return event.entityId === workflowId;
		}
		
		if (event.entityType === 'workflowExecution') {
			return event.data?.parentId === workflowId;
		}
		
		if (event.entityType === 'workflowNodeExecution') {
			// We'd need to check the workflowExecutionId's workflowId, but for now show all node executions
			return true;
		}
		
		return true;
	}

	onMount(() => {
		if (syncManager) {
			// Get existing events
			events = syncManager.subscriptionEvents.filter(shouldShowEvent);
			
			// Subscribe to new events
			unsubscribe = syncManager.onSubscriptionEvent((event) => {
				if (shouldShowEvent(event)) {
					events = [...events, event];
					// Keep only the last 500 events for performance
					if (events.length > 500) {
						events = events.slice(-500);
					}
				}
			});
		}
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	function clearEvents() {
		if (syncManager) {
			syncManager.clearSubscriptionEvents();
			events = [];
		}
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3
			class="text-sm font-semibold {darkMode ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-2"
		>
			<svg
				class="w-4 h-4 {darkMode ? 'text-slate-400' : 'text-slate-500'}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
				></path>
			</svg>
			Subscription Events
			{#if events.length > 0}
				<span
					class="ml-1.5 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}"
				>
					({events.length})
				</span>
			{/if}
		</h3>
		{#if syncManager && events.length > 0}
			<button
				type="button"
				onclick={clearEvents}
				class="text-xs {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} font-medium"
			>
				Clear
			</button>
		{/if}
	</div>

	{#if !syncManager}
		<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			Sync manager not available. Subscription events will appear here when available.
		</p>
	{:else if events.length === 0}
		<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'}">
			No subscription events yet. Events will appear here as they are received.
		</p>
	{:else}
		<div class="space-y-2 max-h-96 overflow-y-auto">
			{#each events.slice().reverse() as event (event.id)}
				<div
					class="{darkMode
						? 'bg-slate-800 border-slate-700'
						: 'bg-slate-50 border-slate-200'} border rounded-lg p-3"
				>
					<div class="flex items-center justify-between gap-2 mb-1.5">
						<div class="flex items-center gap-2">
							<span
								class="text-xs font-medium px-1.5 py-0.5 rounded {getEventTypeColor(event)} bg-opacity-10"
							>
								{event.operation.toUpperCase()}
							</span>
							<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'}">
								{getEntityTypeLabel(event.entityType)}
							</span>
						</div>
						<span class="text-xs font-mono {darkMode ? 'text-slate-500' : 'text-slate-500'}">
							{formatTimestamp(event.timestamp)}
						</span>
					</div>
					<div class="text-xs font-mono {darkMode ? 'text-slate-500' : 'text-slate-500'} truncate mb-1">
						ID: {event.entityId.slice(0, 8)}…
					</div>
					{#if event.error}
						<div
							class="text-xs {darkMode ? 'text-red-400' : 'text-red-600'} mt-1 p-2 rounded {darkMode
								? 'bg-red-900/20'
								: 'bg-red-50'} border {darkMode ? 'border-red-800' : 'border-red-200'}"
						>
							Error: {event.error}
						</div>
					{:else if event.data}
						<details class="mt-1">
							<summary
								class="text-xs {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'} cursor-pointer"
							>
								View Data
							</summary>
							<pre
								class="mt-2 text-xs {darkMode
									? 'text-slate-300 bg-slate-900 border-slate-700'
									: 'text-slate-700 bg-white border-slate-200'} p-2 rounded border overflow-x-auto"
							>{JSON.stringify(event.data, null, 2)}</pre>
						</details>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
