<script lang="ts">
	import type { EntityDefinition } from '@stratiqai/types-simple';
	import type { WidgetManifest } from '@stratiqai/dashboard-widget-sdk';
	import type { Widget } from '$lib/dashboard/types/widget';
	import { goto } from '$app/navigation';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { generateWidgetId } from '$lib/dashboard/utils/idGenerator';
	import { findAvailablePosition } from '$lib/dashboard/utils/grid';
	import { getDefaultDataForWidget } from '$lib/dashboard/setup/defaultDashboardValues';
	import { toOntologyInstDataTopic } from '$lib/services/realtime/store/ontologyClientHelpers';
	import { getMatchingWidgets } from './widgetSchemaMatch';
	import { toastStore } from '$lib/stores/toastStore.svelte';

	interface InstanceRow {
		id: string;
		data: Record<string, unknown>;
		label: string | null;
		updatedAt: string | null;
	}

	interface Props {
		definition: EntityDefinition;
		instance: InstanceRow;
		darkMode: boolean;
		projectId: string;
		onback: () => void;
	}

	let { definition, instance, darkMode, projectId, onback }: Props = $props();

	let matches = $state.raw<WidgetManifest[]>([]);
	let fallbacks = $state.raw<WidgetManifest[]>([]);
	let loading = $state(true);

	$effect(() => {
		const hash = definition.structuralHash;
		if (!hash) {
			matches = [];
			fallbacks = [];
			loading = false;
			return;
		}

		loading = true;
		getMatchingWidgets(hash).then((result) => {
			matches = result.matches;
			fallbacks = result.fallbacks;
			loading = false;
		});
	});

	function handleAddWidget(manifest: WidgetManifest) {
		const widgetId = generateWidgetId();
		const config = dashboard.config;
		const size = manifest.defaultSize;
		const topic = toOntologyInstDataTopic(projectId, definition.id, instance.id);

		const position = findAvailablePosition(
			size.colSpan,
			size.rowSpan,
			config.gridColumns,
			config.gridRows,
			dashboard.widgets
		);

		if (!position) {
			toastStore.info('No available space on the dashboard. Try removing some widgets first.');
			return;
		}

		const data = getDefaultDataForWidget({ type: manifest.kind, id: widgetId } as Widget);

		const widget = {
			id: widgetId,
			type: manifest.kind,
			topicOverride: topic,
			title: instance.label ?? definition.name,
			gridColumn: position.gridColumn,
			gridRow: position.gridRow,
			colSpan: size.colSpan,
			rowSpan: size.rowSpan,
			minWidth: 1,
			minHeight: 1,
			data
		} as Widget;

		const success = dashboard.addWidget(widget);
		if (success) {
			toastStore.success(`Added ${manifest.displayName} to dashboard`);
			goto(`/p/${projectId}/dashboard`);
		} else {
			toastStore.error('Failed to add widget to dashboard.');
		}
	}

	function getIcon(manifest: WidgetManifest): string {
		const pal = (manifest as unknown as { palette?: { icon?: string } }).palette;
		return pal?.icon ?? '🧩';
	}

	function getCategory(manifest: WidgetManifest): string {
		const pal = (manifest as unknown as { palette?: { category?: string } }).palette;
		return pal?.category ?? 'widget';
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="flex h-6 w-6 items-center justify-center rounded-md transition-colors
					{darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
				onclick={onback}
				aria-label="Back to definition detail"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<div class="min-w-0 flex-1">
				<h3 class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-800'}">
					Compatible Widgets
				</h3>
				<p class="mt-0.5 truncate text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					{instance.label ?? instance.id}
				</p>
			</div>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent
					{darkMode ? 'border-slate-500' : 'border-slate-300'}"></div>
			</div>
		{:else}
			<!-- Matched Widgets -->
			{#if matches.length > 0}
				<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<h4 class="mb-2.5 text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						Schema Matches
					</h4>
					<div class="grid grid-cols-2 gap-2">
						{#each matches as manifest (manifest.kind)}
							<button
								type="button"
								class="group flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all
									{darkMode
										? 'border-slate-700 bg-slate-800/50 hover:border-indigo-500/50 hover:bg-slate-800'
										: 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'}"
								onclick={() => handleAddWidget(manifest)}
							>
								<span class="text-xl">{getIcon(manifest)}</span>
								<span class="text-xs font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">
									{manifest.displayName}
								</span>
								<span class="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase
									{darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}">
									{getCategory(manifest)}
								</span>
								<span class="mt-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100
									{darkMode ? 'text-indigo-400' : 'text-indigo-600'}">
									Add to Dashboard
								</span>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<p class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
						No widgets match this entity's schema.
					</p>
				</div>
			{/if}

			<!-- Fallback Widgets -->
			{#if fallbacks.length > 0}
				<div class="px-4 py-3">
					<h4 class="mb-2.5 text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						Always Available
					</h4>
					<div class="grid grid-cols-2 gap-2">
						{#each fallbacks as manifest (manifest.kind)}
							<button
								type="button"
								class="group flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all
									{darkMode
										? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
										: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}"
								onclick={() => handleAddWidget(manifest)}
							>
								<span class="text-xl">{getIcon(manifest)}</span>
								<span class="text-xs font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">
									{manifest.displayName}
								</span>
								<span class="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase
									{darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}">
									generic
								</span>
								<span class="mt-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100
									{darkMode ? 'text-slate-400' : 'text-slate-500'}">
									Add to Dashboard
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Info -->
			<div class="px-4 py-3">
				<div class="rounded-lg border p-3
					{darkMode ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}">
					<p class="text-[11px] leading-relaxed {darkMode ? 'text-slate-500' : 'text-slate-400'}">
						Widgets added from here receive <strong>live data</strong> from this instance via topic override.
						Changes to the instance will automatically reflect in the widget.
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>
