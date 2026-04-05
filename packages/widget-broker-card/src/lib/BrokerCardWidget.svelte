<script lang="ts">
	import type { BrokerCardWidgetData } from './schema.js';
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		FlipCard,
		WidgetConfigureBack,
		useWidgetConfigure,
		type StandardWidgetProps,
		type DashboardAppTheme
	} from '@stratiqai/dashboard-widget-sdk';

	type Props = StandardWidgetProps<BrokerCardWidgetData>;

	let {
		data,
		widgetId = 'broker-card-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: Props = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('brokerCard', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<BrokerCardWidgetData>(() => topic);
	let widgetData = $derived<BrokerCardWidgetData>(dataStream.current || data);

	const configure = useWidgetConfigure<BrokerCardWidgetData>({
		data: () => widgetData,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	const inputFieldClass = $derived(
		darkMode
			? 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
			: 'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
	);

	const palette = $derived.by((): DashboardAppTheme => {
		if (theme === 'warm' || theme === 'light' || theme === 'dark') return theme;
		return darkMode ? 'dark' : 'light';
	});

	function initialsFromName(name: string): string {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	let displayInitials = $derived(
		(widgetData.initials?.trim() || initialsFromName(widgetData.fullName)).slice(0, 4)
	);

	const innerShellClass = $derived(
		palette === 'dark'
			? 'bg-linear-to-b from-slate-900 to-slate-950'
			: 'bg-transparent'
	);

	const nameClass = $derived(
		palette === 'dark' ? 'text-slate-100' : 'text-slate-900'
	);

	const companyClass = $derived(
		palette === 'dark'
			? 'text-amber-200/95'
			: palette === 'warm'
				? 'text-slate-700'
				: 'text-teal-800'
	);

	const dividerClass = $derived(
		palette === 'dark' ? 'bg-slate-600/55' : 'bg-slate-200/90'
	);

	const contactClass = $derived(
		palette === 'dark'
			? 'text-slate-400 hover:text-slate-100'
			: 'text-slate-600 hover:text-slate-900'
	);

	const iconClass = $derived('text-slate-500');

	const avatarImgRing = $derived(
		palette === 'dark' ? 'ring-amber-400/25' : 'ring-slate-300/70'
	);

	const avatarFallbackClass = $derived(
		palette === 'dark'
			? 'bg-slate-700 text-amber-100'
			: palette === 'warm'
				? 'bg-slate-200 text-slate-800'
				: 'bg-teal-100 text-teal-900'
	);

	const emptyHintClass = $derived(palette === 'dark' ? 'text-slate-500' : 'text-slate-500');

	const flipShellClass = $derived(
		darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
	);
	const flipBackClass = $derived(
		darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'
	);
</script>

<FlipCard
	isFlipped={configure.isFlipped}
	shellClass={flipShellClass}
	flipBackClass={flipBackClass}
>
	{#snippet front()}
		<div class="broker-card-widget flex h-full min-h-0 flex-col">
			<div class="flex min-h-0 flex-1 flex-col overflow-hidden {innerShellClass}">
				<div class="flex min-h-0 flex-1 flex-col">
					<div class="flex items-start gap-3 px-4 pb-3 pt-4">
						{#if widgetData.avatarUrl}
							<img
								src={widgetData.avatarUrl}
								alt=""
								class="h-14 w-14 shrink-0 rounded-full object-cover ring-2 {avatarImgRing}"
							/>
						{:else}
							<div
								class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-tight {avatarFallbackClass}"
								aria-hidden="true"
							>
								{displayInitials}
							</div>
						{/if}
						<div class="min-w-0 flex-1 pt-0.5">
							<p class="truncate text-base font-semibold {nameClass}">{widgetData.fullName}</p>
							<p class="mt-0.5 truncate text-sm font-medium {companyClass}">{widgetData.company}</p>
						</div>
					</div>

					<div class="h-px shrink-0 {dividerClass}" role="presentation"></div>

					<div class="space-y-2.5 px-4 pb-4 pt-3">
						{#if widgetData.phone}
							<a
								href={'tel:' + widgetData.phone.replace(/\s+/g, '')}
								class="flex items-center gap-2.5 text-sm transition-colors {contactClass}"
							>
								<svg
									class="h-4 w-4 shrink-0 {iconClass}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="1.5"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
									/>
								</svg>
								<span class="truncate">{widgetData.phone}</span>
							</a>
						{/if}
						{#if widgetData.email}
							<a
								href={'mailto:' + widgetData.email}
								class="flex items-center gap-2.5 text-sm transition-colors {contactClass}"
							>
								<svg
									class="h-4 w-4 shrink-0 {iconClass}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="1.5"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
									/>
								</svg>
								<span class="truncate">{widgetData.email}</span>
							</a>
						{/if}
						{#if !widgetData.phone && !widgetData.email}
							<p class="text-sm {emptyHintClass}">No contact details</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="brokerCard"
			widgetId={widgetId}
			darkMode={darkMode}
			theme={theme}
			topicOverride={topicOverride}
			onApply={() => configure.applyConfig()}
			onCancel={() => configure.cancelConfig()}
		>
			{#snippet userFields()}
				<label class="block">
					<span class={darkMode ? 'mb-1 block text-xs font-medium text-slate-400' : 'mb-1 block text-xs font-medium text-slate-500'}>Full name</span>
					<input type="text" bind:value={configure.draft.fullName} class={inputFieldClass} />
				</label>
				<label class="block">
					<span class={darkMode ? 'mb-1 block text-xs font-medium text-slate-400' : 'mb-1 block text-xs font-medium text-slate-500'}>Company</span>
					<input type="text" bind:value={configure.draft.company} class={inputFieldClass} />
				</label>
				<label class="block">
					<span class={darkMode ? 'mb-1 block text-xs font-medium text-slate-400' : 'mb-1 block text-xs font-medium text-slate-500'}>Phone</span>
					<input type="text" bind:value={configure.draft.phone} class={inputFieldClass} />
				</label>
				<label class="block">
					<span class={darkMode ? 'mb-1 block text-xs font-medium text-slate-400' : 'mb-1 block text-xs font-medium text-slate-500'}>Email</span>
					<input type="email" bind:value={configure.draft.email} class={inputFieldClass} />
				</label>
				<label class="block">
					<span class={darkMode ? 'mb-1 block text-xs font-medium text-slate-400' : 'mb-1 block text-xs font-medium text-slate-500'}>Avatar URL</span>
					<input type="url" bind:value={configure.draft.avatarUrl} class={inputFieldClass} />
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>
