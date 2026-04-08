<script lang="ts">
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { topicDragStore, TOPIC_DROP_MIME } from '$lib/dashboard/stores/topicDragStore.svelte';
	import GridContainer from '$lib/dashboard/components/GridContainer.svelte';
	import WidgetWrapper from '$lib/dashboard/components/WidgetWrapper.svelte';
	import GhostIndicator from '$lib/dashboard/components/GhostIndicator.svelte';
	import { getGridPositionFromCoordinates } from '$lib/dashboard/utils/grid';
	import { createDropHandlers } from '$lib/dashboard/utils/dragDrop';
	import { getDefaultDataForWidget, getDefaultSizeForWidget } from '$lib/dashboard/setup/defaultDashboardValues';
	import type { Widget, WidgetType } from '$lib/dashboard/types/widget';
	import { setDashboardWidgetHost, HostServices, parseJsonSchemaToBuilderState, buildSchemaPreview, getAiStatusTopic } from '@stratiqai/dashboard-widget-sdk';
	import type { WidgetPromptEditData, WidgetDebugData } from '@stratiqai/dashboard-widget-sdk';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetTopic, getWidgetTopicsByType, getWidgetStructuralHash, getTopicsByStructuralHash } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { getWidgetPromptConfig } from '$lib/dashboard/setup/widgetRegistry';
	import { toOntologyInstDataTopic, toOntologyInstMetaTopic, flatToPropertyValues } from '$lib/services/realtime/store/ontologyClientHelpers';
	import { M_SAVE_ENTITY_INSTANCE, Q_GET_ENTITY_DEFINITION, Q_GET_ENTITY_INSTANCE } from '@stratiqai/types-simple';
	import type { SaveInstanceInput, EntityInstance } from '@stratiqai/types-simple';
	import { streamCatalog } from '$lib/stores/streamCatalog.svelte';
	import { createSupabaseBrowserClient } from '$lib/services/supabase/browser';
	import { generateWidgetId } from '$lib/dashboard/utils/idGenerator';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { page } from '$app/stores';
	import { GraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
	import {
		ensureWidgetInstancePrompt,
		getWidgetInstancePromptForEditing,
		updateWidgetInstancePrompt
	} from '$lib/services/widgetPromptService';
	import { aiService } from '$lib/services/ai';
	import { Q_GET_PROMPT } from '$lib/services/graphql/promptOperations';
	import { Q_GET_JSON_SCHEMA } from '$lib/services/graphql/jsonSchemaOperations';
	import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';
	import { createLogger } from '$lib/utils/logger';
	import { gql } from '$lib/services/realtime/graphql/requestHandler';
	import { Q_LIST_DOCLINKS } from '@stratiqai/types-simple';
	import type { Project, Doclink } from '$lib/types/cloud/app';

	const log = createLogger('dashboard');

	function extractDocumentIds(project: Project | null | undefined): string[] {
		if (!project?.doclinks) return [];
		const links: Doclink[] = Array.isArray(project.doclinks)
			? project.doclinks
			: (project.doclinks as any).items ?? [];
		return links
			.filter((l: Doclink) => l.documentId && !l.deletedAt)
			.map((l: Doclink) => l.documentId);
	}

	async function getProjectDocumentIds(): Promise<string[]> {
		const pid = dashboard.projectId;
		if (!pid) return [];

		const project = validatedTopicStore.at<Project>(`projects/${pid}`);
		const storeIds = extractDocumentIds(project);
		if (storeIds.length > 0) return storeIds;

		try {
			const token = getIdToken();
			const result = await gql<{ listDoclinks: { items: Doclink[] } }>(
				Q_LIST_DOCLINKS,
				{ parentId: pid, limit: 100 },
				token
			);
			const items = result?.listDoclinks?.items ?? [];
			const ids = items
				.filter((d) => d.documentId && !d.deletedAt)
				.map((d) => d.documentId);
			log.info(`Fetched ${ids.length} documentIds via direct query (store was empty)`);
			return ids;
		} catch (err) {
			log.warn('Failed to fetch documentIds fallback:', err);
			return [];
		}
	}

	function getIdToken(): string {
		const token = ($page?.data as Record<string, unknown>)?.idToken as string | undefined
			?? authStore.idToken;
		if (!token) throw new Error('Not authenticated');
		return token;
	}

	const serviceMap = new Map<string, unknown>();
	const sbClient = createSupabaseBrowserClient();
	if (sbClient) serviceMap.set('supabase', sbClient);
	serviceMap.set('config', { geoapifyApiKey: PUBLIC_GEOAPIFY_API_KEY ?? '' });

	const pendingConfigureTabs: Record<string, string> = {};

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
			},
			getSchemaById: (id: string) => validatedTopicStore.getSchemaById(id),
			getJsonSchemaById: (id: string) => validatedTopicStore.getJsonSchemaById(id)
		},
		getWidgetTopic(kind: string, widgetId: string, topicOverride?: string): string {
			if (topicOverride) return topicOverride;
			const w = dashboard.widgets.find(w => w.id === widgetId);
			const instanceId = w?.entityInstanceId;
			const hash = getWidgetStructuralHash(kind);
			const pid = dashboard.projectId;
			if (instanceId && hash && pid) {
				return toOntologyInstDataTopic(pid, hash, instanceId);
			}
			if (hash && pid) {
				const available = getTopicsByStructuralHash(pid, hash);
				if (available.length > 0) return available[0].topic;
			}
			return `widgets/${kind}/${widgetId}`;
		},
		services: {
			get: <T>(name: string) => serviceMap.get(name) as T | undefined,
			has: (name: string) => serviceMap.has(name)
		},

		getAvailableTopics(kind: string, widgetId: string) {
			const w = dashboard.widgets.find((w) => w.id === widgetId);
			const hash = getWidgetStructuralHash(kind);
			const pid = dashboard.projectId;

			if (hash && pid) {
				const ontologyTopics = getTopicsByStructuralHash(pid, hash);
				const instanceId = w?.entityInstanceId;
				const currentOwnTopic = (instanceId && hash && pid)
					? toOntologyInstDataTopic(pid, hash, instanceId)
					: undefined;
				const currentTopic = w?.topicOverride ?? currentOwnTopic;

				return ontologyTopics.map((item) => ({
					topic: item.topic,
					isCurrent: item.topic === currentTopic,
					data: item.data
				}));
			}

			const defaultTopic = getWidgetTopic(kind as any, widgetId);
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
			dashboard.updateWidget(widgetId, {
				topicOverride: topic || undefined
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

		async loadWidgetPrompt(kind: string, widgetId: string): Promise<WidgetPromptEditData | null> {
			const promptConfig = getWidgetPromptConfig(kind);
			if (!promptConfig) return null;

			const token = getIdToken();

			const qc = new GraphQLQueryClient(token);
			const w = dashboard.widgets.find((w) => w.id === widgetId);
			const existingPromptId = w?.promptId;

			const instance = await ensureWidgetInstancePrompt(
				kind, widgetId, w?.data?.title ?? undefined, undefined, existingPromptId, qc,
				dashboard.projectId!
			);

			if (!existingPromptId && instance.promptId) {
				dashboard.updateWidget(widgetId, {
					promptId: instance.promptId,
					entityDefinitionId: instance.entityDefinitionId
				});
			} else if (instance.entityDefinitionId && !w?.entityDefinitionId) {
				dashboard.updateWidget(widgetId, { entityDefinitionId: instance.entityDefinitionId });
			}

			const editing = await getWidgetInstancePromptForEditing(instance.promptId, qc);
			if (!editing) return null;

			const builderState = editing.schemaDefinition
				? parseJsonSchemaToBuilderState(editing.schemaDefinition)
				: { properties: {}, required: [] as string[], fieldOrder: [] as string[] };

			return {
				promptId: editing.promptId,
				name: editing.name,
				description: editing.description,
				userPrompt: editing.prompt,
				systemInstruction: editing.systemInstruction,
				model: editing.model,
				responseFormatType: 'json_schema',
				schemaProperties: builderState.properties,
				schemaRequired: builderState.required,
				fieldOrder: builderState.fieldOrder,
				stopSequences: ''
			};
		},

		async saveAndRunWidgetPrompt(kind: string, widgetId: string, data: WidgetPromptEditData): Promise<void> {
			const token = getIdToken();

			const qc = new GraphQLQueryClient(token);
			const w = dashboard.widgets.find((w) => w.id === widgetId);
			const promptId = data.promptId ?? w?.promptId;
			if (!promptId) throw new Error('No prompt ID — load prompt first');

			const editing = await getWidgetInstancePromptForEditing(promptId, qc);
			const jsonSchemaId = editing?.jsonSchemaId;

			const schemaDef = Object.keys(data.schemaProperties).length > 0
				? buildSchemaPreview(data.schemaProperties, data.schemaRequired)
				: undefined;

			await updateWidgetInstancePrompt(
				promptId,
				{
					name: data.name,
					description: data.description,
					prompt: data.userPrompt,
					systemInstruction: data.systemInstruction,
					model: data.model,
					schemaDefinition: schemaDef
				},
				jsonSchemaId,
				qc,
				dashboard.projectId!
			);

			const documentIds = await getProjectDocumentIds();

			const inputValues: Record<string, unknown> = {
				prompt: data.userPrompt,
				systemInstruction: data.systemInstruction,
				model: data.model || 'GEMINI_2_5_FLASH',
				widgetKind: kind,
				widgetId,
				...(schemaDef && { responseFormat: { type: 'json_schema', schema: schemaDef } }),
				...(data.temperature !== undefined && { temperature: data.temperature }),
				...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
				...(data.topP !== undefined && { topP: data.topP }),
				...(data.frequencyPenalty !== undefined && { frequencyPenalty: data.frequencyPenalty }),
				...(documentIds.length > 0 && { documentIds })
			};

			const handle = await aiService.submitExecution(
				{
					projectId: dashboard.projectId ?? '',
					promptId,
					inputValues,
					...(documentIds.length > 0 && { documentIds }),
					priority: 'MEDIUM'
				},
				token
			);

			log.info(`AI execution submitted for widget ${widgetId}`);

			const projectId = dashboard.projectId ?? '';
			const definitionId = w?.entityDefinitionId;
			const existingInstanceId = w?.entityInstanceId;
			const structuralHash = getWidgetStructuralHash(kind);


			const effectiveTopic = (existingInstanceId && structuralHash && projectId)
				? toOntologyInstDataTopic(projectId, structuralHash, existingInstanceId)
				: `widgets/${kind}/${widgetId}`;
			const statusTopic = getAiStatusTopic(effectiveTopic);
			validatedTopicStore.publish(statusTopic, { generating: true });

			handle.result.then(async (rawOutput) => {
				if (rawOutput) {
					try {
						let output: Record<string, unknown>;
						try {
							const parsed = JSON.parse(rawOutput);
							const resolved = parsed.output_parsed ?? parsed;
							output = (resolved && typeof resolved === 'object' && !Array.isArray(resolved))
								? resolved as Record<string, unknown>
								: { content: typeof resolved === 'string' ? resolved : rawOutput };
						} catch {
							output = { content: rawOutput };
						}

						if (definitionId && structuralHash && projectId) {
							const instanceId = crypto.randomUUID();
							const instanceInput: SaveInstanceInput = {
								id: instanceId,
								projectId,
								definitionId,
								senderId: `widget:${widgetId}`,
								label: `${kind} output`,
								values: flatToPropertyValues(output)
							};

							const result = await qc.query<{ saveEntityInstance: EntityInstance }>(
								M_SAVE_ENTITY_INSTANCE,
								{ input: instanceInput }
							);

							if (result?.saveEntityInstance) {
								dashboard.updateWidget(widgetId, { entityInstanceId: instanceId });

								const instDataTopic = toOntologyInstDataTopic(projectId, structuralHash, instanceId);
								validatedTopicStore.publish(instDataTopic, output);
								const instMetaTopic = toOntologyInstMetaTopic(projectId, structuralHash, instanceId);
								validatedTopicStore.publish(instMetaTopic, {
									label: instanceInput.label,
									updatedAt: result.saveEntityInstance.updatedAt ?? new Date().toISOString()
								});

								const newStatusTopic = getAiStatusTopic(instDataTopic);
								validatedTopicStore.publish(newStatusTopic, { generating: false });

								log.info(`Persisted EntityInstance ${instanceId} for widget ${widgetId}`);
							}
						} else {
							log.warn(`Skipping EntityInstance persistence: missing definitionId or structuralHash for widget ${widgetId}`);
						}
					} catch (err) {
						log.error('Failed to parse/persist AI result:', err);
					}
				}
				validatedTopicStore.publish(statusTopic, { generating: false });
			}).catch((err) => {
				log.error('AI execution failed:', err);
				validatedTopicStore.publish(statusTopic, { generating: false, error: err instanceof Error ? err.message : String(err) });
			}).finally(() => {
				handle.destroy();
			});
		},

		getServiceStatus() {
			return Object.values(HostServices).map((name) => ({
				name,
				available: serviceMap.has(name)
			}));
		},

		setRequestedConfigureTab(widgetId: string, tab: string) {
			pendingConfigureTabs[widgetId] = tab;
		},
		consumeRequestedConfigureTab(widgetId: string): string | undefined {
			const tab = pendingConfigureTabs[widgetId];
			if (tab !== undefined) delete pendingConfigureTabs[widgetId];
			return tab;
		},

		async loadWidgetDebugData(kind: string, widgetId: string): Promise<WidgetDebugData | null> {
			const w = dashboard.widgets.find((w) => w.id === widgetId);
			if (!w) return null;

			const token = getIdToken();
			const qc = new GraphQLQueryClient(token);
			const projectId = dashboard.projectId ?? '';

			const topicPath = w.topicOverride
				?? (() => {
					const instId = w.entityInstanceId;
					const hash = getWidgetStructuralHash(kind);
					if (instId && hash && projectId) return toOntologyInstDataTopic(projectId, hash, instId);
					return `widgets/${kind}/${widgetId}`;
				})();
			const topicData = validatedTopicStore.at(topicPath);
			const topicSchemaReg = validatedTopicStore.getSchemaById?.(topicPath);

			const widgetRaw = JSON.parse(JSON.stringify(w)) as Record<string, unknown>;
			const { promptId, entityDefinitionId, entityInstanceId } = w;

			const [promptResult, entityDefResult, entityInstResult] = await Promise.allSettled([
				promptId
					? qc.query<{ getPrompt: Record<string, unknown> | null }>(Q_GET_PROMPT, { id: promptId })
					: Promise.resolve(null),
				entityDefinitionId && projectId
					? qc.query<{ getEntityDefinition: Record<string, unknown> | null }>(Q_GET_ENTITY_DEFINITION, { projectId, id: entityDefinitionId })
					: Promise.resolve(null),
				entityInstanceId && projectId
					? qc.query<{ getEntityInstance: Record<string, unknown> | null }>(Q_GET_ENTITY_INSTANCE, { projectId, id: entityInstanceId })
					: Promise.resolve(null),
			]);

			const prompt = promptResult.status === 'fulfilled'
				? (promptResult.value as any)?.getPrompt ?? null
				: null;
			const jsonSchemaId = prompt?.jsonSchemaId;

			let jsonSchema: Record<string, unknown> | null = null;
			if (jsonSchemaId) {
				try {
					const res = await qc.query<{ getJsonSchema: Record<string, unknown> | null }>(Q_GET_JSON_SCHEMA, { id: jsonSchemaId });
					jsonSchema = res?.getJsonSchema ?? null;
				} catch { /* ignore */ }
			}

			const entityDef = entityDefResult.status === 'fulfilled'
				? (entityDefResult.value as any)?.getEntityDefinition ?? null
				: null;

			const entityInst = entityInstResult.status === 'fulfilled'
				? (entityInstResult.value as any)?.getEntityInstance ?? null
				: null;

			return {
				widget: widgetRaw,
				prompt,
				jsonSchema,
				entityDefinition: entityDef,
				entityInstance: entityInst,
				topic: {
					path: topicPath,
					data: topicData,
					schema: topicSchemaReg as Record<string, unknown> | undefined,
				},
			};
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
				const size = getDefaultSizeForWidget(widgetType);
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
			size={getDefaultSizeForWidget(topicDropGhost.widgetType)}
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
