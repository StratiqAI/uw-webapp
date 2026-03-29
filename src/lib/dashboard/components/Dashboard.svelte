<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { topicDragStore, TOPIC_DROP_MIME } from '$lib/dashboard/stores/topicDragStore';
	import GridContainer from '$lib/dashboard/components/GridContainer.svelte';
	import WidgetWrapper from '$lib/dashboard/components/WidgetWrapper.svelte';
	import GhostIndicator from '$lib/dashboard/components/GhostIndicator.svelte';
	import { getGridPositionFromCoordinates } from '$lib/dashboard/utils/grid';
	import { createDropHandlers } from '$lib/dashboard/utils/drag-drop';
	import { DEFAULT_WIDGET_SIZES, getDefaultDataForWidget } from '$lib/dashboard/setup/defaultDashboardValues';
	import type { Widget, WidgetType } from '$lib/dashboard/types/widget';
	import { setDashboardWidgetHost } from '@stratiqai/dashboard-widget-sdk';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { createSupabaseBrowserClient } from '$lib/supabase/browser';

	const serviceMap = new Map<string, unknown>();
	const sbClient = createSupabaseBrowserClient();
	if (sbClient) serviceMap.set('supabase', sbClient);

	setDashboardWidgetHost({
		validatedTopicStore: {
			get tree() { return validatedTopicStore.tree; },
			at: <T>(topic: string) => validatedTopicStore.at<T>(topic),
			publish: (topic: string, data: unknown) => validatedTopicStore.publish(topic, data),
			registerSchema: (pattern: string, schema: unknown) =>
				validatedTopicStore.registerSchema(pattern, schema as any),
			patch(topic: string, partial: Record<string, unknown>): boolean {
				const current = validatedTopicStore.at<Record<string, unknown>>(topic);
				const merged = { ...(current ?? {}), ...partial };
				return validatedTopicStore.publish(topic, merged);
			}
		},
		getWidgetTopic,
		services: {
			get: <T>(name: string) => serviceMap.get(name) as T | undefined,
			has: (name: string) => serviceMap.has(name)
		}
	});

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let containerEl = $state<HTMLElement>();
	let topicDropGhost = $state<{ position: { gridColumn: number; gridRow: number }; widgetType: WidgetType; topic: string } | null>(null);
	let ghostValid = $state(true);
	let lastDragCell: { col: number; row: number } | null = null;

	function getPositionFromEvent(e: DragEvent): { gridColumn: number; gridRow: number } | null {
		if (!containerEl) return null;
		const rect = containerEl.getBoundingClientRect();
		return getGridPositionFromCoordinates(
			e.clientX,
			e.clientY,
			rect,
			dashboard.config.gridColumns,
			dashboard.config.gridRows,
			dashboard.config.gap,
			dashboard.config.minCellHeight
		);
	}

	const dropHandlers = createDropHandlers({
		onDragOver: (e: DragEvent) => {
			if (!containerEl || !e.dataTransfer) return;

			const isTopicDrag = e.dataTransfer.types.includes(TOPIC_DROP_MIME);

			if (isTopicDrag) {
				e.dataTransfer.dropEffect = 'copy';
				const t = topicDragStore.current;
				const position = getPositionFromEvent(e);
				if (t && position) {
					topicDropGhost = { position, widgetType: t.widgetType, topic: t.topic };
				} else {
					topicDropGhost = null;
				}
				dashboard.setDragState({ ghostPosition: null });
				return;
			}

			e.dataTransfer.dropEffect = 'move';
			topicDropGhost = null;
			if (!dashboard.dragState.isDragging) return;

			const position = getPositionFromEvent(e);
			if (!position) return;

			if (
				lastDragCell &&
				lastDragCell.col === position.gridColumn &&
				lastDragCell.row === position.gridRow
			) {
				return;
			}
			lastDragCell = { col: position.gridColumn, row: position.gridRow };

			if (dashboard.activeWidget) {
				const fits = dashboard.fitsInColumns(
					dashboard.activeWidget.colSpan,
					position.gridColumn
				);
				ghostValid = fits;
				dashboard.setDragState({ ghostPosition: position });
				if (fits) {
					dashboard.setDisplacementPreview(dashboard.activeWidget.id, position);
				} else {
					dashboard.clearDisplacementPreview();
				}
			}
		},

		onDrop: (e: DragEvent) => {
			const raw = e.dataTransfer?.getData(TOPIC_DROP_MIME);
			if (raw) {
				try {
					const { topic, widgetType } = JSON.parse(raw) as { topic: string; widgetType: WidgetType };
					const position = getPositionFromEvent(e);
					if (!position) {
						topicDropGhost = null;
						topicDragStore.set(null);
						return;
					}
					const size = DEFAULT_WIDGET_SIZES[widgetType] ?? { colSpan: 4, rowSpan: 2 };
					const newId = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
					const data = getDefaultDataForWidget({ type: widgetType, id: newId } as Widget);
					const widget: Widget = {
						id: newId,
						type: widgetType,
						topicOverride: topic,
						gridColumn: position.gridColumn,
						gridRow: position.gridRow,
						colSpan: size.colSpan,
						rowSpan: size.rowSpan,
						minWidth: 1,
						minHeight: 1,
						data
					} as Widget;
					dashboard.addWidget(widget);
				} catch (err) {
					console.error('Topic drop failed:', err);
				}
				topicDropGhost = null;
				topicDragStore.set(null);
				return;
			}

			const position = dashboard.dragState.ghostPosition;
			if (position && dashboard.dragState.activeWidgetId && ghostValid) {
				dashboard.moveWidgetWithDisplacement(
					dashboard.dragState.activeWidgetId,
					position
				);
			}
			ghostValid = true;
			lastDragCell = null;
			dashboard.resetInteractionStates();
			topicDropGhost = null;
		},

		onDragLeave: (e: DragEvent) => {
			if (
				containerEl &&
				e.relatedTarget instanceof Node &&
				containerEl.contains(e.relatedTarget)
			) {
				return;
			}
			topicDropGhost = null;
			ghostValid = true;
			lastDragCell = null;
			dashboard.clearDisplacementPreview();
			dashboard.setDragState({ ghostPosition: null });
			topicDragStore.set(null);
		}
	});

	function handleWidgetDragStart(widget: Widget) {
		dashboard.pushUndoSnapshot();
		dashboard.setDragState({
			isDragging: true,
			activeWidgetId: widget.id
		});
	}

	function handleWidgetDragEnd() {
		ghostValid = true;
		lastDragCell = null;
		dashboard.clearDisplacementPreview();
		dashboard.resetInteractionStates();
	}

	// Keyboard shortcuts for undo / redo
	function handleKeyboard(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
		const mod = e.ctrlKey || e.metaKey;
		if (!mod || e.key.toLowerCase() !== 'z') return;

		e.preventDefault();
		if (e.shiftKey) {
			dashboard.redo();
		} else {
			dashboard.undo();
		}
	}

	onMount(() => window.addEventListener('keydown', handleKeyboard));
	onDestroy(() => window.removeEventListener('keydown', handleKeyboard));
</script>

<GridContainer
	bind:containerEl
	columns={dashboard.config.gridColumns}
	rows={dashboard.config.gridRows}
	gap={dashboard.config.gap}
	minCellHeight={dashboard.config.minCellHeight}
	{...dropHandlers}
>
	{#key dashboard.activeTabId}
		{#each dashboard.widgets as widget (widget.id)}
			<WidgetWrapper {widget} {darkMode} onDragStart={handleWidgetDragStart} onDragEnd={handleWidgetDragEnd} />
		{/each}
	{/key}

	{#if dashboard.dragState.isDragging && dashboard.dragState.ghostPosition}
		<GhostIndicator
			position={dashboard.dragState.ghostPosition}
			size={{
				colSpan: dashboard.activeWidget?.colSpan || 1,
				rowSpan: dashboard.activeWidget?.rowSpan || 1
			}}
			valid={ghostValid}
		/>
	{:else if topicDropGhost}
		<GhostIndicator
			position={topicDropGhost.position}
			size={DEFAULT_WIDGET_SIZES[topicDropGhost.widgetType]}
		/>
	{/if}
</GridContainer>

{#if dashboard.fullscreenWidgetId}
	<button
		type="button"
		class="fixed inset-0 z-[100040] cursor-default border-0 bg-black/55 p-0"
		aria-label="Exit widget full screen"
		onclick={() => dashboard.setFullscreenWidget(null)}
	></button>
{/if}
