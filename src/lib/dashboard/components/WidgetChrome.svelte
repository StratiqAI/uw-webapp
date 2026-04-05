<script lang="ts">
	import type { Widget, WidgetAction } from '$lib/dashboard/types/widget';
	import type { AiConnectionState } from '$lib/dashboard/context/widgetTitleBarContext';
	import WidgetDropdown from './WidgetDropdown.svelte';

	interface Props {
		widget: Widget;
		displayTitle: string | undefined;
		displayDescription: string | undefined;
		darkMode: boolean;
		isWidgetFullscreen: boolean;
		lastRefreshedAt: Date | null;
		titleBarAiConnection: AiConnectionState | null;
		aiStatusDotClass: string;
		onAction: (action: WidgetAction) => void;
	}

	let {
		widget,
		displayTitle,
		displayDescription,
		darkMode,
		isWidgetFullscreen,
		lastRefreshedAt,
		titleBarAiConnection,
		aiStatusDotClass,
		onAction
	}: Props = $props();
</script>

<!-- Subtle top edge -->
<div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-px {darkMode ? 'bg-linear-to-r from-transparent via-primary-400/15 to-transparent' : 'bg-linear-to-r from-transparent via-primary-400/18 to-transparent'}"></div>

<!-- Widget Header (if a title is available — static or from live data) -->
{#if displayTitle}
	<div
		class="widget-header shrink-0 border-b {darkMode ? 'border-slate-700/30 bg-linear-to-r from-slate-800/95 to-slate-800/88' : 'border-slate-200/55 bg-linear-to-r from-slate-50 to-white'} flex items-center gap-2 px-4 py-1"
	>
		<div class="min-w-0 flex-1">
			<h3 class="text-base font-semibold leading-snug tracking-wide {darkMode ? 'text-slate-100' : 'text-slate-700'}">
				{displayTitle}
			</h3>
			{#if displayDescription}
				<p class="mt-0 text-xs leading-snug {darkMode ? 'text-slate-400' : 'text-slate-500'}">{displayDescription}</p>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-1.5">
			{#if widget.type === 'paragraph' && titleBarAiConnection !== null}
				<div class="flex items-center gap-1.5 pr-0.5">
					<div class="h-2 w-2 shrink-0 rounded-full {aiStatusDotClass}"></div>
					<span class="whitespace-nowrap text-xs {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						{titleBarAiConnection}
					</span>
				</div>
			{/if}
			{#if widget.locked}
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 {darkMode ? 'text-slate-400' : 'text-gray-400'}"
					title="Widget locked"
					aria-label="Widget locked"
				>
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						></path>
					</svg>
				</div>
			{/if}
			<WidgetDropdown
				{widget}
				isFullscreen={isWidgetFullscreen}
				{lastRefreshedAt}
				inTitleBar
				onAction={onAction}
			/>
		</div>
	</div>
{/if}

{#if !displayTitle}
	<WidgetDropdown
		{widget}
		isFullscreen={isWidgetFullscreen}
		{lastRefreshedAt}
		onAction={onAction}
	/>
{/if}

<!-- Floating lock indicator (no title bar) -->
{#if widget.locked && !displayTitle}
	<div class="absolute right-12 top-2.5 opacity-0 transition-opacity group-hover:opacity-100">
		<svg class="h-4 w-4 {darkMode ? 'text-slate-400' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
			></path>
		</svg>
	</div>
{/if}
