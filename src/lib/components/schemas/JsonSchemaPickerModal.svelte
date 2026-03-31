<script lang="ts">
	import {
		Q_LIST_JSON_SCHEMAS,
		M_CREATE_JSON_SCHEMA,
		M_UPDATE_JSON_SCHEMA,
		M_DELETE_JSON_SCHEMA
	} from '$lib/graphql/jsonSchemaOperations';
	import type { IGraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';

	interface JsonSchemaItem {
		id: string;
		name: string;
		description?: string;
		schemaDefinition: string;
		ownerId: string;
		sharingMode: string;
		sourceJsonSchemaId?: string;
		createdAt?: string;
		updatedAt?: string;
	}

	interface Props {
		darkMode?: boolean;
		queryClient: IGraphQLQueryClient;
		selectedSchemaId?: string;
		onselect: (schema: JsonSchemaItem) => void;
		onclose: () => void;
	}

	let { darkMode = false, queryClient, selectedSchemaId, onselect, onclose }: Props = $props();

	let schemas = $state<JsonSchemaItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let editingSchema = $state<JsonSchemaItem | null>(null);
	let showCreateForm = $state(false);

	// Create/Edit form state
	let formName = $state('');
	let formDescription = $state('');
	let formSchemaText = $state('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
	let formSaving = $state(false);

	const isSystemOwned = (s: JsonSchemaItem) => s.ownerId === 'SYSTEM';

	const filteredSchemas = $derived.by(() => {
		if (!searchQuery.trim()) return schemas;
		const q = searchQuery.toLowerCase();
		return schemas.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				(s.description?.toLowerCase().includes(q) ?? false)
		);
	});

	$effect(() => {
		loadSchemas();
	});

	async function loadSchemas() {
		loading = true;
		error = null;
		try {
			const result = await queryClient.query<{
				listJsonSchemas: { items: JsonSchemaItem[]; nextToken?: string };
			}>(Q_LIST_JSON_SCHEMAS, { scope: 'ALL_TENANT', limit: 200 });
			schemas = result?.listJsonSchemas?.items ?? [];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load schemas';
		} finally {
			loading = false;
		}
	}

	function startCreate() {
		editingSchema = null;
		showCreateForm = true;
		formName = '';
		formDescription = '';
		formSchemaText = '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}';
	}

	function startEdit(schema: JsonSchemaItem) {
		if (isSystemOwned(schema)) {
			startCopyOnWrite(schema);
			return;
		}
		editingSchema = schema;
		showCreateForm = true;
		formName = schema.name;
		formDescription = schema.description ?? '';
		try {
			const parsed = typeof schema.schemaDefinition === 'string'
				? JSON.parse(schema.schemaDefinition)
				: schema.schemaDefinition;
			formSchemaText = JSON.stringify(parsed, null, 2);
		} catch {
			formSchemaText = String(schema.schemaDefinition);
		}
	}

	async function startCopyOnWrite(schema: JsonSchemaItem) {
		formSaving = true;
		try {
			const result = await queryClient.query<{ createJsonSchema: JsonSchemaItem }>(
				M_CREATE_JSON_SCHEMA,
				{
					input: {
						name: `${schema.name} (My Copy)`,
						description: schema.description || undefined,
						schemaDefinition:
							typeof schema.schemaDefinition === 'string'
								? schema.schemaDefinition
								: JSON.stringify(schema.schemaDefinition),
						sharingMode: 'PRIVATE',
						sourceJsonSchemaId: schema.id
					}
				}
			);
			if (result?.createJsonSchema) {
				const copy = result.createJsonSchema;
				schemas = [copy, ...schemas];
				editingSchema = copy;
				showCreateForm = true;
				formName = copy.name;
				formDescription = copy.description ?? '';
				try {
					const parsed = typeof copy.schemaDefinition === 'string'
						? JSON.parse(copy.schemaDefinition)
						: copy.schemaDefinition;
					formSchemaText = JSON.stringify(parsed, null, 2);
				} catch {
					formSchemaText = String(copy.schemaDefinition);
				}
			}
		} catch (e) {
			error = `Copy failed: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			formSaving = false;
		}
	}

	async function handleSaveForm() {
		if (!formName.trim()) return;
		formSaving = true;
		try {
			JSON.parse(formSchemaText);
		} catch {
			error = 'Invalid JSON in schema definition';
			formSaving = false;
			return;
		}
		error = null;

		try {
			if (editingSchema) {
				const result = await queryClient.query<{ updateJsonSchema: JsonSchemaItem }>(
					M_UPDATE_JSON_SCHEMA,
					{
						id: editingSchema.id,
						input: {
							name: formName.trim(),
							description: formDescription.trim() || undefined,
							schemaDefinition: formSchemaText
						}
					}
				);
				if (result?.updateJsonSchema) {
					schemas = schemas.map((s) =>
						s.id === editingSchema!.id ? result.updateJsonSchema : s
					);
				}
			} else {
				const result = await queryClient.query<{ createJsonSchema: JsonSchemaItem }>(
					M_CREATE_JSON_SCHEMA,
					{
						input: {
							name: formName.trim(),
							description: formDescription.trim() || undefined,
							schemaDefinition: formSchemaText,
							sharingMode: 'PRIVATE'
						}
					}
				);
				if (result?.createJsonSchema) {
					schemas = [result.createJsonSchema, ...schemas];
				}
			}
			showCreateForm = false;
			editingSchema = null;
		} catch (e) {
			error = `Save failed: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			formSaving = false;
		}
	}

	async function handleDelete(schema: JsonSchemaItem) {
		if (isSystemOwned(schema)) return;
		if (!confirm(`Delete "${schema.name}"?`)) return;
		try {
			await queryClient.query(M_DELETE_JSON_SCHEMA, { id: schema.id });
			schemas = schemas.filter((s) => s.id !== schema.id);
		} catch (e) {
			error = `Delete failed: ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	function cancelForm() {
		showCreateForm = false;
		editingSchema = null;
	}

	const cardCls = $derived(darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200');
	const inputCls = $derived(`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${darkMode ? 'bg-slate-900 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-200 placeholder-slate-400'}`);
	const labelCls = $derived(`block text-[11px] font-medium uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`);
</script>

<div
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	class="fixed inset-0 z-[10100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
	onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}
>
	<div class="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden {cardCls} max-h-[85vh] flex flex-col">
		<!-- Header -->
		<div class="shrink-0 flex items-center justify-between px-5 py-3.5 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg {darkMode ? 'bg-emerald-500/15' : 'bg-emerald-50'} flex items-center justify-center">
					<svg class="w-4 h-4 {darkMode ? 'text-emerald-400' : 'text-emerald-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
					</svg>
				</div>
				<h2 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					{showCreateForm ? (editingSchema ? 'Edit Schema' : 'New Schema') : 'Schema Library'}
				</h2>
			</div>
			<div class="flex items-center gap-2">
				{#if !showCreateForm}
					<button
						type="button"
						onclick={startCreate}
						class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}"
					>+ New Schema</button>
				{/if}
				<button
					type="button"
					onclick={onclose}
					class="p-1.5 rounded-lg transition-colors {darkMode ? 'text-slate-500 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}"
					aria-label="Close"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>
		</div>

		<!-- Body -->
		<div class="flex-1 overflow-y-auto p-5">
			{#if error}
				<div class="mb-3 rounded-lg px-3 py-2 text-xs {darkMode ? 'bg-red-900/30 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'}">
					{error}
				</div>
			{/if}

			{#if showCreateForm}
				<!-- Create / Edit form -->
				<div class="space-y-4">
					<div>
						<label for="schema-form-name" class={labelCls}>Name <span class="text-red-400">*</span></label>
						<input id="schema-form-name" type="text" bind:value={formName} placeholder="Schema name" class={inputCls} />
					</div>
					<div>
						<label for="schema-form-desc" class={labelCls}>Description</label>
						<input id="schema-form-desc" type="text" bind:value={formDescription} placeholder="Optional description" class={inputCls} />
					</div>
					<div>
						<label for="schema-form-def" class={labelCls}>Schema Definition (JSON)</label>
						<textarea
							id="schema-form-def"
							bind:value={formSchemaText}
							rows="12"
							class="w-full px-3 py-2 text-xs font-mono rounded-lg border resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/40 {darkMode ? 'bg-slate-900 text-slate-300 border-slate-600' : 'bg-slate-50 text-slate-800 border-slate-200'}"
						></textarea>
					</div>
					<div class="flex justify-end gap-2">
						<button type="button" onclick={cancelForm}
							class="px-4 py-2 text-xs font-medium rounded-lg transition-colors {darkMode ? 'text-slate-300 hover:bg-slate-700 border border-slate-600' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'}"
						>Cancel</button>
						<button type="button" onclick={handleSaveForm} disabled={formSaving || !formName.trim()}
							class="px-4 py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 {darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
						>{formSaving ? 'Saving...' : 'Save'}</button>
					</div>
				</div>
			{:else}
				<!-- Search -->
				<div class="mb-4">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search schemas..."
						class={inputCls}
					/>
				</div>

				{#if loading}
					<div class="flex items-center justify-center py-12">
						<div class="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
					</div>
				{:else if filteredSchemas.length === 0}
					<div class="py-12 text-center">
						<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-400'}">
							{searchQuery ? 'No schemas match your search' : 'No schemas yet'}
						</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each filteredSchemas as schema (schema.id)}
							{@const isSelected = schema.id === selectedSchemaId}
							{@const isSystem = isSystemOwned(schema)}
							<div
								class="group rounded-lg border px-4 py-3 transition-all cursor-pointer
									{isSelected
										? (darkMode ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-400 bg-indigo-50')
										: (darkMode ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50' : 'border-slate-200 hover:border-slate-300 bg-white')}"
								onclick={() => onselect(schema)}
								onkeydown={(e) => { if (e.key === 'Enter') onselect(schema); }}
								role="button"
								tabindex="0"
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium truncate {darkMode ? 'text-white' : 'text-slate-900'}">
												{schema.name}
											</span>
											{#if isSystem}
												<span class="shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded {darkMode ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'}">
													System
												</span>
											{/if}
											{#if schema.sourceJsonSchemaId}
												<span class="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded {darkMode ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' : 'bg-sky-50 text-sky-600 border border-sky-200'}">
													Copy
												</span>
											{/if}
											{#if isSelected}
												<svg class="shrink-0 w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
												</svg>
											{/if}
										</div>
										{#if schema.description}
											<p class="mt-0.5 text-xs truncate {darkMode ? 'text-slate-500' : 'text-slate-400'}">{schema.description}</p>
										{/if}
									</div>
									<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
										<button
											type="button"
											onclick={() => startEdit(schema)}
											class="p-1.5 rounded-md transition-colors {darkMode ? 'text-slate-500 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}"
											title={isSystem ? 'Customize (creates a copy)' : 'Edit'}
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										{#if !isSystem}
											<button
												type="button"
												onclick={() => handleDelete(schema)}
												class="p-1.5 rounded-md transition-colors {darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}"
												title="Delete"
											>
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
