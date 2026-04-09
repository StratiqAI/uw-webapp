<script lang="ts">
	import { setContext } from 'svelte';
	import type { Widget, WidgetAction } from '$lib/dashboard/types/widget';
	import {
		WIDGET_TITLE_BAR_CONTEXT,
		type AiConnectionState,
		type WidgetTitleBarContext
	} from '$lib/dashboard/context/widgetTitleBarContext';
	import { createDragHandlers } from '$lib/dashboard/utils/dragDrop';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetSchemaId, getWidgetStructuralHash, getTopicsByStructuralHash } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { toOntologyInstDataTopic } from '$lib/services/realtime/store/ontologyClientHelpers';
	import ResizeHandles from './ResizeHandles.svelte';
	import WidgetChrome from './WidgetChrome.svelte';
	import { resolveWidgetComponent } from '$lib/dashboard/setup/widgetTypeMap';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { setConfigureTab, WidgetConfigureBack } from '@stratiqai/dashboard-widget-sdk';
	import { useExtraction } from '$lib/hooks/useExtraction.svelte';
	import { page } from '$app/stores';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('dashboard');

	let titleBarAiConnection = $state<AiConnectionState | null>(null);

	setContext<WidgetTitleBarContext>(WIDGET_TITLE_BAR_CONTEXT, {
		setAiConnectionState: (v) => {
			titleBarAiConnection = v;
		}
	});

	interface Props {
		widget: Widget;
		onDragStart: (widget: Widget, grabPoint: { clientX: number; clientY: number }) => void;
		onDragEnd: () => void;
	}

	let { widget, onDragStart, onDragEnd }: Props = $props();

	const darkMode = $derived(themeStore.darkMode);

	let showHostConfigure = $state(false);
	let removeConfirmOpen = $state(false);
	let lastRefreshedAt = $state<Date | null>(null);

	let registeredRefreshCounter = $state(0);
	let registeredConfigureFn: (() => void) | null = null;

	const isWidgetFullscreen = $derived(dashboard.fullscreenWidgetId === widget.id);

	function handleFullscreenEscape(e: KeyboardEvent) {
		if (isWidgetFullscreen && e.key === 'Escape') {
			if (showHostConfigure) showHostConfigure = false;
			dashboard.setFullscreenWidget(null);
		}
	}

	const currentTopic = $derived.by(() => {
		if (widget.topicOverride) return widget.topicOverride;
		const hash = getWidgetStructuralHash(widget.type);
		const pid = dashboard.projectId;
		const instId = widget.entityInstanceId;
		if (instId && hash && pid) return toOntologyInstDataTopic(pid, hash, instId);
		if (hash && pid) {
			void validatedTopicStore.tree;
			const available = getTopicsByStructuralHash(pid, hash);
			if (available.length > 0) {
				return available[0].topic;
			}
		}
		return `widgets/${widget.type}/${widget.id}`;
	});
	const schemaId = $derived.by(() => {
		try {
			return getWidgetSchemaId(widget.type);
		} catch {
			return widget.type === 'schema' ? (widget.data as any).schemaId : null;
		}
	});

	const idToken = $derived(
		($page?.data as Record<string, unknown>)?.idToken as string ?? authStore.idToken ?? ''
	);
	const extraction = useExtraction(
		() => widget.extractionId,
		() => idToken
	);

	$effect(() => {
		if (widget.extractionId && extraction.result) {
			validatedTopicStore.publish(currentTopic, extraction.result);
		} else if (widget.extractionId && extraction.data?.rawAnswer && !extraction.result) {
			validatedTopicStore.publish(currentTopic, { content: extraction.data.rawAnswer });
		}
	});

	$effect(() => {
		if (!widget.extractionId) return;
		const statusTopic = `${currentTopic}/__ai_status`;
		validatedTopicStore.publish(statusTopic, {
			generating: extraction.isRunning,
			error: extraction.hasError ? (extraction.data?.errorMessage ?? 'Extraction failed') : undefined
		});
	});

	const dragHandlers = $derived.by(() =>
		createDragHandlers(widget, {
			onDragStart,
			onDragEnd,
			onDrop: () => {}
		})
	);
	
	function handleWidgetAction(action: WidgetAction) {
		switch (action) {
		case 'aiConfiguration':
			setConfigureTab(widget.id, 'ai');
			// fall through to open configure panel
		case 'configure':
		case 'edit':
		case 'settings':
			if (ResolvedComp && registeredConfigureFn) {
				registeredConfigureFn();
				if (!isWidgetFullscreen) {
					dashboard.setFullscreenWidget(widget.id);
				}
				break;
			}
			showHostConfigure = true;
			if (!isWidgetFullscreen) {
				dashboard.setFullscreenWidget(widget.id);
			}
			break;

			case 'duplicate':
				dashboard.duplicateWidget(widget.id);
				break;

			case 'exportData':
				exportWidgetData();
				break;

			case 'refresh':
				if (ResolvedComp) {
					registeredRefreshCounter++;
				}
				refreshWidgetData();
				lastRefreshedAt = new Date();
				break;

			case 'viewFullscreen':
				dashboard.setFullscreenWidget(
					dashboard.fullscreenWidgetId === widget.id ? null : widget.id
				);
				break;

			case 'remove':
				removeConfirmOpen = true;
				break;
		}
	}

	function exportWidgetData() {
		const blob = new Blob([JSON.stringify(widget.data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${widget.type}-${widget.id}-data.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function refreshWidgetData() {
		log.debug('Refreshing widget data:', widget.id);
	}

	let lastMousedownTarget: EventTarget | null = null;

	const zIndex = $derived(dashboard.getWidgetZIndex(widget.id));
	const isBeingDragged = $derived(
		dashboard.dragState.isDragging && dashboard.dragState.activeWidgetId === widget.id
	);
	const displacedPos = $derived(dashboard.displacementPreview[widget.id]);

	const ResolvedComp = $derived(resolveWidgetComponent(widget.type));

	/**
	 * Read live data reactively from the ValidatedTopicStore so that when AI or
	 * another publisher updates the topic, the header title/description reflects
	 * the new values immediately — without a full widget reconfigure.
	 *
	 * The TitleWidget is excluded: its data.title IS the rendered content, not a
	 * chrome header label, so lifting it would duplicate the text.
	 */
	const liveData = $derived.by(() => {
		if (widget.extractionId && extraction.result) {
			return extraction.result;
		}
		if (widget.extractionId && extraction.data?.rawAnswer && !extraction.result) {
			return { content: extraction.data.rawAnswer };
		}
		const _ = validatedTopicStore.tree;
		return validatedTopicStore.at(currentTopic);
	});

	const rawTitle = $derived.by(() => {
		if (widget.type === 'title') return widget.title;
		const d = liveData as Record<string, unknown> | undefined | null;
		if (d && typeof d === 'object') {
			const t = d.title;
			if (typeof t === 'string' && t.trim()) return t;
		}
		return widget.title;
	});

	const rawDescription = $derived.by(() => {
		if (widget.type === 'title') return widget.description;
		const d = liveData as Record<string, unknown> | undefined | null;
		if (d && typeof d === 'object') {
			const desc = d.description;
			if (typeof desc === 'string' && desc.trim()) return desc;
		}
		return widget.description;
	});

	const displayTitle = $derived(widget.showTitle !== false ? rawTitle : undefined);
	const displayDescription = $derived(widget.showDescription !== false ? rawDescription : undefined);
	const showTitleBar = $derived(!!displayTitle || !!displayDescription);

	const extractionProp = $derived.by(() => {
		if (!widget.extractionId) return undefined;
		return {
			id: widget.extractionId,
			result: extraction.result as Record<string, unknown> | null,
			status: extraction.status ?? 'DRAFT',
			loading: extraction.loading || extraction.isRunning,
			error: extraction.error ?? extraction.data?.errorMessage ?? null,
		};
	});

	const widgetBodyPaddingClass = $derived(
		widget.type === 'brokerCard'
			? 'min-h-0 flex-1 overflow-hidden p-0'
			: showTitleBar
				? 'p-2'
				: 'h-full p-2'
	);

	const widgetBodyBgClass = $derived(
		widget.type === 'brokerCard'
			? 'bg-transparent'
			: darkMode
				? 'bg-transparent'
				: 'bg-white/60'
	);

	const aiStatusDotClass = $derived.by(() => {
		if (!titleBarAiConnection) return '';
		const colorMap: Record<string, string> = {
			Researching: darkMode ? 'bg-green-400' : 'bg-green-500',
			Ready: darkMode ? 'bg-yellow-400' : 'bg-yellow-500',
			Complete: darkMode ? 'bg-blue-400' : 'bg-blue-500'
		};
		return colorMap[titleBarAiConnection] ?? '';
	});
</script>

<svelte:window onkeydown={handleFullscreenEscape} />

<!-- Drag surface for the grid item; focus stays on controls inside (menus, charts). -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="widget-wrapper group relative h-full"
	class:widget-wrapper--fullscreen={isWidgetFullscreen}
	class:widget-wrapper--dragging={isBeingDragged}
	style={isWidgetFullscreen
		? `position: fixed; inset: 1rem; width: calc(100vw - 2rem); height: calc(100vh - 2rem); z-index: 100050; max-width: none;`
		: `
    grid-column: ${(displacedPos?.gridColumn ?? widget.gridColumn)} / span ${widget.colSpan};
    grid-row: ${(displacedPos?.gridRow ?? widget.gridRow)} / span ${widget.rowSpan};
    z-index: ${isBeingDragged ? 0 : zIndex};
  `}
	draggable={!widget.locked && !isWidgetFullscreen}
	onmousedown={(e) => { lastMousedownTarget = e.target; }}
	ondragstart={(e) => {
		if (widget.locked || isWidgetFullscreen) {
			e.preventDefault();
			return;
		}
		dragHandlers.handleDragStart(e);
	}}
	ondragend={dragHandlers.handleDragEnd}
>
	<div
		class="widget-content h-full overflow-hidden rounded-2xl
		{widget.type === 'brokerCard' ? 'flex min-h-0 flex-col' : ''}
		{darkMode
			? 'bg-linear-to-b from-slate-800/96 to-slate-900/94 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]'
			: 'bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]'}
		transition-all duration-200
		{darkMode
			? 'hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.42)] hover:-translate-y-px'
			: 'hover:shadow-[0_8px_28px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-px'}"
	>
		<WidgetChrome
			{widget}
			{displayTitle}
			{displayDescription}
			{showTitleBar}
			{darkMode}
			{isWidgetFullscreen}
			{lastRefreshedAt}
			{titleBarAiConnection}
			{aiStatusDotClass}
			onAction={handleWidgetAction}
		/>

		<!-- Widget Body -->
		<div class="widget-body {widgetBodyBgClass} {widgetBodyPaddingClass}">
			{#if showHostConfigure}
				<WidgetConfigureBack
					kind={widget.type}
					widgetId={widget.id}
					{darkMode}
					theme={themeStore.theme}
					topicOverride={widget.topicOverride}
					schemaId={schemaId ?? undefined}
					showAITab={true}
					onApply={() => { showHostConfigure = false; dashboard.setFullscreenWidget(null); }}
					onCancel={() => { showHostConfigure = false; dashboard.setFullscreenWidget(null); }}
				/>
			{:else if ResolvedComp}
				<ResolvedComp
					data={widget.data}
					widgetId={widget.id}
					topicOverride={widget.topicOverride}
					extraction={extractionProp}
					{darkMode}
					theme={themeStore.theme}
					refreshSignal={registeredRefreshCounter}
					showTitleInChrome={showTitleBar}
					showDescriptionInChrome={!!displayDescription}
					onUpdateConfig={(d: any) => dashboard.updateWidget(widget.id, { data: d })}
					onConfigureReady={(fn: () => void) => { registeredConfigureFn = fn; }}
				onUpdateData={(d: any) => dashboard.updateWidget(widget.id, { data: d })}
				/>
			{/if}
		</div>
	</div>

	<!-- Resize Handles -->
	{#if !widget.locked && !isWidgetFullscreen}
		<ResizeHandles widgetId={widget.id} />
	{/if}
</div>

<ConfirmModal
	bind:open={removeConfirmOpen}
	title="Remove widget?"
	message={`Are you sure you want to remove this ${widget.type} widget?`}
	confirmLabel="Remove"
	cancelLabel="Cancel"
	{darkMode}
	onConfirm={() => dashboard.removeWidget(widget.id)}
/>



<style>
	.widget-wrapper {
		cursor: move;
		position: relative;
		outline: none;
	}

	.widget-wrapper[draggable='false'] {
		cursor: default;
	}

	.widget-wrapper--fullscreen {
		cursor: default;
	}

	.widget-wrapper--dragging {
		opacity: 0.3;
		transform: scale(0.97);
		transition: opacity 0.15s ease, transform 0.15s ease;
	}

	.widget-content {
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.widget-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
	}
</style>
