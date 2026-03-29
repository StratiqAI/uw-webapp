<script lang="ts">
	import type { BrokerCardWidgetData } from './schema.js';
	import { useReactiveValidatedTopic, getDashboardWidgetHost } from '@stratiqai/dashboard-widget-sdk';

	interface Props {
		data: BrokerCardWidgetData;
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'broker-card-default', topicOverride, darkMode = false }: Props = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('brokerCard', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<BrokerCardWidgetData>(() => topic);
	let widgetData = $derived<BrokerCardWidgetData>(dataStream.current || data);

	function initialsFromName(name: string): string {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	let displayInitials = $derived(
		(widgetData.initials?.trim() || initialsFromName(widgetData.fullName)).slice(0, 4)
	);

	let cardClass = $derived(
		darkMode
			? 'rounded-xl border border-slate-700/80 bg-slate-800 shadow-sm'
			: 'rounded-xl border border-slate-200 bg-slate-800 shadow-md'
	);
</script>

<div class="broker-card-widget h-full flex flex-col justify-center">
	<div class={cardClass + ' overflow-hidden'}>
		<div class="flex items-start gap-3 p-4">
			{#if widgetData.avatarUrl}
				<img
					src={widgetData.avatarUrl}
					alt=""
					class="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-sky-400/30"
				/>
			{:else}
				<div
					class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-200 text-sm font-semibold tracking-tight text-sky-900"
					aria-hidden="true"
				>
					{displayInitials}
				</div>
			{/if}
			<div class="min-w-0 flex-1 pt-0.5">
				<p class="truncate text-base font-semibold text-white">{widgetData.fullName}</p>
				<p class="mt-0.5 truncate text-sm font-medium text-sky-400">{widgetData.company}</p>
			</div>
		</div>

		<div class="h-px bg-slate-600/80" role="presentation"></div>

		<div class="space-y-2.5 p-4">
			{#if widgetData.phone}
				<a
					href={'tel:' + widgetData.phone.replace(/\s+/g, '')}
					class="flex items-center gap-2.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
				>
					<svg class="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
					</svg>
					<span class="truncate">{widgetData.phone}</span>
				</a>
			{/if}
			{#if widgetData.email}
				<a
					href={'mailto:' + widgetData.email}
					class="flex items-center gap-2.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
				>
					<svg class="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
					</svg>
					<span class="truncate">{widgetData.email}</span>
				</a>
			{/if}
			{#if !widgetData.phone && !widgetData.email}
				<p class="text-sm text-slate-500">No contact details</p>
			{/if}
		</div>
	</div>
</div>
