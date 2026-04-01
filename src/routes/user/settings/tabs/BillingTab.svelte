<script lang="ts">
	import { onMount } from 'svelte';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { Q_LIST_USAGE_RECORDS } from '@stratiqai/types-simple';
	import type { CurrentUser } from '$lib/types/auth';

	let { currentUser, darkMode = false } = $props<{
		currentUser?: CurrentUser;
		darkMode?: boolean;
	}>();

	let displayTenant = $derived(currentUser?.tenant ?? 'default');

	let creditBalance = $state<number | null>(null);
	let planName = $state('Free Tier');
	let invoices = $state<
		Array<{
			id: string;
			date: string;
			amount: string;
			status: string;
		}>
	>([]);

	interface UsageRecord {
		id: string;
		tenantId: string;
		ownerId: string;
		reportableObjectId: string;
		quantity: number;
		unit: string;
		metadata: string;
		timestamp: string;
		createdAt: string;
	}

	interface ParsedUsageRecord extends UsageRecord {
		parsedMeta: Record<string, unknown>;
	}

	let usageRecords = $state<ParsedUsageRecord[]>([]);
	let usageLoading = $state(false);
	let usageError = $state<string | null>(null);

	let tokenTotal = $derived(
		usageRecords
			.filter((r) => r.unit === 'TOKENS')
			.reduce((sum, r) => sum + r.quantity, 0)
	);

	let embeddingCallTotal = $derived(
		usageRecords
			.filter((r) => r.unit === 'API_CALLS' && r.parsedMeta.service === 'vertex-embedding')
			.reduce((sum, r) => sum + r.quantity, 0)
	);

	let pineconeQueryTotal = $derived(
		usageRecords
			.filter((r) => r.unit === 'API_CALLS' && r.parsedMeta.service === 'pinecone-query')
			.reduce((sum, r) => sum + r.quantity, 0)
	);

	let usageSummary = $derived([
		{ label: 'AI Tokens', used: tokenTotal, limit: null as number | null, unit: 'tokens' },
		{
			label: 'Embedding Calls',
			used: embeddingCallTotal,
			limit: null as number | null,
			unit: 'calls'
		},
		{
			label: 'Pinecone Queries',
			used: pineconeQueryTotal,
			limit: null as number | null,
			unit: 'queries'
		}
	]);

	let recentRecords = $derived(
		[...usageRecords]
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, 50)
	);

	function parseMetadata(raw: string): Record<string, unknown> {
		if (!raw) return {};
		try {
			return typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
		} catch {
			return {};
		}
	}

	function formatTimestamp(ts: string): string {
		try {
			return new Date(ts).toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return ts;
		}
	}

	function serviceLabel(meta: Record<string, unknown>): string {
		const s = meta.service as string | undefined;
		switch (s) {
			case 'vertex-embedding':
				return 'Vertex Embedding';
			case 'pinecone-query':
				return 'Pinecone Query';
			case 'gemini':
				return 'Gemini';
			case 'anthropic':
				return 'Anthropic';
			default:
				return s ?? 'Unknown';
		}
	}

	async function fetchUsageRecords() {
		if (!currentUser?.idToken || !currentUser?.tenant) return;
		usageLoading = true;
		usageError = null;
		try {
			const res = await gql<{
				listUsageRecords: { items: UsageRecord[]; nextToken: string | null };
			}>(Q_LIST_USAGE_RECORDS, { tenantId: currentUser.tenant, limit: 200 }, currentUser.idToken);

			usageRecords = (res.listUsageRecords?.items ?? []).map((r) => ({
				...r,
				parsedMeta: parseMetadata(r.metadata)
			}));
		} catch (err) {
			usageError = err instanceof Error ? err.message : 'Failed to load usage data';
		} finally {
			usageLoading = false;
		}
	}

	onMount(() => {
		fetchUsageRecords();
	});
</script>

<div class="space-y-6">
	<!-- Plan Overview -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<div class="flex items-start justify-between">
			<div>
				<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Current Plan
				</h3>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">
					Tenant: {displayTenant}
				</p>
			</div>
			<span
				class="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold {darkMode
					? 'bg-primary-900/40 text-primary-300'
					: 'bg-primary-100 text-primary-700'}"
			>
				{planName}
			</span>
		</div>

		<!-- Credit Balance -->
		<div
			class="mt-5 rounded-lg px-5 py-4 {darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}"
		>
			<div class="flex items-center justify-between">
				<div>
					<p
						class="text-xs font-medium uppercase tracking-wide {darkMode
							? 'text-slate-400'
							: 'text-slate-500'}"
					>
						Credit Balance
					</p>
					<p class="mt-1 text-2xl font-bold {darkMode ? 'text-white' : 'text-slate-900'}">
						{#if creditBalance !== null}
							{creditBalance.toLocaleString()}
						{:else}
							<span class="text-sm font-normal {darkMode ? 'text-slate-500' : 'text-slate-400'}"
								>Not available</span
							>
						{/if}
					</p>
				</div>
				<svg
					class="h-10 w-10 {darkMode ? 'text-primary-500/30' : 'text-primary-200'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
					/>
				</svg>
			</div>
		</div>
	</div>

	<!-- Usage Summary -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
				Usage Summary
			</h3>
			{#if usageLoading}
				<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">Loading...</span>
			{/if}
		</div>

		{#if usageError}
			<p class="mb-4 text-sm text-red-500">{usageError}</p>
		{/if}

		<div class="space-y-4">
			{#each usageSummary as usage}
				<div>
					<div class="mb-1.5 flex items-center justify-between">
						<span class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
							{usage.label}
						</span>
						<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							{usage.used.toLocaleString()}
							{#if usage.limit}
								/ {usage.limit.toLocaleString()}
							{/if}
							{usage.unit}
						</span>
					</div>
					{#if usage.limit}
						<div
							class="h-2 w-full overflow-hidden rounded-full {darkMode
								? 'bg-slate-700'
								: 'bg-slate-200'}"
						>
							<div
								class="h-full rounded-full transition-all bg-primary-500"
								style="width: {Math.min((usage.used / usage.limit) * 100, 100)}%"
							></div>
						</div>
					{:else}
						<div
							class="h-2 w-full overflow-hidden rounded-full {darkMode
								? 'bg-slate-700'
								: 'bg-slate-200'}"
						>
							<div
								class="h-full rounded-full bg-primary-500 transition-all"
								style="width: {usage.used > 0 ? '100%' : '0%'}"
							></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Usage Detail Table -->
	{#if recentRecords.length > 0}
		<div
			class="rounded-lg border p-6 {darkMode
				? 'bg-slate-800 border-slate-700'
				: 'bg-white border-slate-200'} shadow-sm"
		>
			<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
				Usage Detail
			</h3>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr
							class="border-b {darkMode
								? 'border-slate-700 text-slate-400'
								: 'border-slate-200 text-slate-500'}"
						>
							<th class="pb-3 text-left font-medium">Timestamp</th>
							<th class="pb-3 text-left font-medium">Service</th>
							<th class="pb-3 text-right font-medium">Quantity</th>
							<th class="pb-3 text-left font-medium">Unit</th>
							<th class="pb-3 text-left font-medium">Model</th>
						</tr>
					</thead>
					<tbody>
						{#each recentRecords as record}
							<tr class="border-b {darkMode ? 'border-slate-700/50' : 'border-slate-100'}">
								<td class="py-2.5 {darkMode ? 'text-slate-300' : 'text-slate-700'}">
									{formatTimestamp(record.timestamp)}
								</td>
								<td class="py-2.5">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium
										{record.parsedMeta.service === 'gemini' || record.parsedMeta.service === 'anthropic'
											? darkMode
												? 'bg-violet-900/30 text-violet-400'
												: 'bg-violet-100 text-violet-700'
											: record.parsedMeta.service === 'vertex-embedding'
												? darkMode
													? 'bg-sky-900/30 text-sky-400'
													: 'bg-sky-100 text-sky-700'
												: darkMode
													? 'bg-teal-900/30 text-teal-400'
													: 'bg-teal-100 text-teal-700'}"
									>
										{serviceLabel(record.parsedMeta)}
									</span>
								</td>
								<td
									class="py-2.5 text-right font-mono {darkMode
										? 'text-white'
										: 'text-slate-900'}"
								>
									{record.quantity.toLocaleString()}
								</td>
								<td class="py-2.5 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									{record.unit}
								</td>
								<td class="py-2.5 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									{(record.parsedMeta.model as string) ?? '—'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Invoice History -->
	<div
		class="rounded-lg border p-6 {darkMode
			? 'bg-slate-800 border-slate-700'
			: 'bg-white border-slate-200'} shadow-sm"
	>
		<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
			Invoice History
		</h3>

		{#if invoices.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr
							class="border-b {darkMode
								? 'border-slate-700 text-slate-400'
								: 'border-slate-200 text-slate-500'}"
						>
							<th class="pb-3 text-left font-medium">Date</th>
							<th class="pb-3 text-left font-medium">Amount</th>
							<th class="pb-3 text-left font-medium">Status</th>
							<th class="pb-3 text-right font-medium">Invoice</th>
						</tr>
					</thead>
					<tbody>
						{#each invoices as invoice}
							<tr class="border-b {darkMode ? 'border-slate-700/50' : 'border-slate-100'}">
								<td class="py-3 {darkMode ? 'text-slate-300' : 'text-slate-700'}">
									{invoice.date}
								</td>
								<td class="py-3 {darkMode ? 'text-white' : 'text-slate-900'} font-medium">
									{invoice.amount}
								</td>
								<td class="py-3">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {invoice.status ===
										'PAID'
											? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
											: invoice.status === 'OPEN'
												? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
												: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}"
									>
										{invoice.status}
									</span>
								</td>
								<td class="py-3 text-right">
									<button
										class="text-sm font-medium {darkMode
											? 'text-primary-400 hover:text-primary-300'
											: 'text-primary-600 hover:text-primary-700'} transition-colors"
									>
										View
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-lg py-12 {darkMode
					? 'bg-slate-700/30'
					: 'bg-slate-50'}"
			>
				<svg
					class="h-12 w-12 {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-3"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
					/>
				</svg>
				<p class="text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					No invoices yet
				</p>
				<p class="mt-1 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					Invoices will appear here once billing is active
				</p>
			</div>
		{/if}
	</div>
</div>
