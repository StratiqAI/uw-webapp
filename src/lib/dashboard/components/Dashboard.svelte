<script lang="ts">
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { topicDragStore, TOPIC_DROP_MIME } from '$lib/dashboard/stores/topicDragStore.svelte';
	import GridContainer from '$lib/dashboard/components/GridContainer.svelte';
	import WidgetWrapper from '$lib/dashboard/components/WidgetWrapper.svelte';
	import GhostIndicator from '$lib/dashboard/components/GhostIndicator.svelte';
	import { getGridPositionFromCoordinates } from '$lib/dashboard/utils/grid';
	import { createDropHandlers } from '$lib/dashboard/utils/dragDrop';
	import { DEFAULT_WIDGET_SIZES, getDefaultDataForWidget } from '$lib/dashboard/setup/defaultDashboardValues';
	import type { Widget, WidgetType } from '$lib/dashboard/types/widget';
	import { setDashboardWidgetHost, HostServices } from '@stratiqai/dashboard-widget-sdk';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetTopic, getWidgetTopicsByType } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { streamCatalog } from '$lib/stores/streamCatalog.svelte';
	import { createSupabaseBrowserClient } from '$lib/services/supabase/browser';
	import { generateWidgetId } from '$lib/dashboard/utils/idGenerator';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('dashboard');

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
		},

		getAvailableTopics(kind: string, widgetId: string) {
			const defaultTopic = getWidgetTopic(kind as any, widgetId);
			const w = dashboard.widgets.find((w) => w.id === widgetId);
			const currentTopic = w?.topicOverride ?? defaultTopic;
			const byType = getWidgetTopicsByType(kind as any);
			return byType.map((item) => ({
				topic: `widgets/${kind}/${item.id}`,
				isCurrent: `widgets/${kind}/${item.id}` === currentTopic,
				data: (item.data && typeof item.data === 'object' && !Array.isArray(item.data))
					? item.data as Record<string, unknown>
					: undefined
			}));
		},
		setTopicOverride(widgetId: string, topic: string | undefined) {
			const w = dashboard.widgets.find((w) => w.id === widgetId);
			const defaultTopic = getWidgetTopic(w?.type as any ?? '', widgetId);
			dashboard.updateWidget(widgetId, {
				topicOverride: topic === defaultTopic ? undefined : topic
			});
		},
		getCurrentTopicOverride(widgetId: string) {
			return dashboard.widgets.find((w) => w.id === widgetId)?.topicOverride;
		},

		streams: {
			list() {
				return streamCatalog.streams.map((s) => ({
					id: s.id,
					topic: s.topic,
					title: s.title,
					schemaId: s.schemaId,
					source: s.source
				}));
			},
			getByTopic(topic: string) {
				const s = streamCatalog.getStreamByTopic(topic);
				return s ? { id: s.id, title: s.title } : undefined;
			},
			filterBySchemaId(schemaId: string) {
				return streamCatalog.getStreamsBySchemaId(schemaId).map((s) => ({
					id: s.id,
					topic: s.topic,
					title: s.title,
					schemaId: s.schemaId,
					source: s.source
				}));
			}
		},

		setWidgetFullscreen(widgetId: string, fullscreen: boolean) {
			dashboard.setFullscreenWidget(fullscreen ? widgetId : null);
		},

		getServiceStatus() {
			return Object.values(HostServices).map((name) => ({
				name,
				available: serviceMap.has(name)
			}));
		}
	});

	const darkMode = $derived(themeStore.darkMode);

	let containerEl = $state<HTMLElement>();
	let dropZoneEl = $state<HTMLElement>();
	let topicDropGhost = $state<{ position: { gridColumn: number; gridRow: number }; widgetType: WidgetType; topic: string } | null>(null);
	let ghostValid = $state(true);
	let lastDragCell: { col: number; row: number } | null = null;

	function getCellAtPoint(clientX: number, clientY: number): { gridColumn: number; gridRow: number } | null {
		if (!containerEl) return null;
		const rect = containerEl.getBoundingClientRect();
		return getGridPositionFromCoordinates(
			clientX,
			clientY,
			rect,
			dashboard.config.gridColumns,
			dashboard.config.gridRows,
			dashboard.config.gap,
			dashboard.config.minCellHeight,
			0
		);
	}

	function getPositionFromEvent(e: DragEvent): { gridColumn: number; gridRow: number } | null {
		return getCellAtPoint(e.clientX, e.clientY);
	}

	function getOffsetPositionFromEvent(e: DragEvent): { gridColumn: number; gridRow: number } | null {
		const mouseCell = getPositionFromEvent(e);
		if (!mouseCell) return null;
		const cellOffset = dashboard.dragState.dragCellOffset;
		if (!cellOffset) return mouseCell;
		return {
			gridColumn: Math.max(1, mouseCell.gridColumn - cellOffset.col),
			gridRow: Math.max(1, mouseCell.gridRow - cellOffset.row)
		};
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

			const position = getOffsetPositionFromEvent(e);
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
				const newId = generateWidgetId();
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
					log.error('Topic drop failed:', err);
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
				dropZoneEl &&
				e.relatedTarget instanceof Node &&
				dropZoneEl.contains(e.relatedTarget)
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

	function handleWidgetDragStart(widget: Widget, grabPoint: { clientX: number; clientY: number }) {
		dashboard.pushUndoSnapshot();
		const grabCell = getCellAtPoint(grabPoint.clientX, grabPoint.clientY);
		const dragCellOffset = grabCell
			? { col: grabCell.gridColumn - widget.gridColumn, row: grabCell.gridRow - widget.gridRow }
			: { col: 0, row: 0 };
		dashboard.setDragState({
			isDragging: true,
			activeWidgetId: widget.id,
			dragCellOffset
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

</script>

<svelte:window onkeydown={handleKeyboard} />

<GridContainer
	bind:containerEl
	bind:dropZoneEl
	columns={dashboard.config.gridColumns}
	rows={dashboard.config.gridRows}
	gap={dashboard.config.gap}
	minCellHeight={dashboard.config.minCellHeight}
	{...dropHandlers}
>
	{#key dashboard.activeTabId}
		{#each dashboard.widgets as widget (widget.id)}
			<WidgetWrapper {widget} onDragStart={handleWidgetDragStart} onDragEnd={handleWidgetDragEnd} />
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
