<script lang="ts">
	import { onMount } from 'svelte';
	import { Q_LIST_ENTITY_DEFINITIONS, M_SAVE_ENTITY_DEFINITION, M_DELETE_ENTITY_DEFINITION } from '@stratiqai/types-simple';
	import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
	import { derivePropertiesFromJsonSchema } from '$lib/services/graphql/schemaPropertyDeriver';

	interface EntityDefinitionItem {
		id: string;
		projectId: string;
		jsonSchemaId?: string;
		name: string;
		description?: string;
		jsonSchema: string;
		structuralHash?: string;
	}

	interface Props {
		darkMode?: boolean;
		queryClient: IGraphQLQueryClient;
		projectId: string;
		selectedSchemaId?: string;
		onselect: (schema: { id: string; jsonSchemaId: string; schemaDefinition: string }) => void;
		onclose: () => void;
	}

	let { darkMode = false, queryClient, projectId, selectedSchemaId, onselect, onclose }: Props = $props();

	let definitions = $state<EntityDefinitionItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let editingDef = $state<EntityDefinitionItem | null>(null);
	let showCreateForm = $state(false);

	let formName = $state('');
	let formDescription = $state('');
	let formSchemaText = $state('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
	let formSaving = $state(false);

	const filteredDefinitions = $derived.by(() => {
		if (!searchQuery.trim()) return definitions;
		const q = searchQuery.toLowerCase();
		return definitions.filter(
			(d) =>
				d.name.toLowerCase().includes(q) ||
				(d.description?.toLowerCase().includes(q) ?? false)
		);
	});

	onMount(() => {
		loadDefinitions();
	});

	async function loadDefinitions() {
		loading = true;
		error = null;
		try {
			const result = await queryClient.query<{
				listEntityDefinitions: EntityDefinitionItem[];
			}>(Q_LIST_ENTITY_DEFINITIONS, { projectId });
			definitions = result?.listEntityDefinitions ?? [];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load definitions';
		} finally {
			loading = false;
		}
	}

	function startCreate() {
		editingDef = null;
		showCreateForm = true;
		formName = '';
		formDescription = '';
		formSchemaText = '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}';
	}

	function startEdit(def: EntityDefinitionItem) {
		editingDef = def;
		showCreateForm = true;
		formName = def.name;
		formDescription = def.description ?? '';
		try {
			const parsed = typeof def.jsonSchema === 'string'
				? JSON.parse(def.jsonSchema)
				: def.jsonSchema;
			formSchemaText = JSON.stringify(parsed, null, 2);
		} catch {
			formSchemaText = String(def.jsonSchema);
		}
	}

	async function handleSaveForm() {
		if (!formName.trim()) return;
		formSaving = true;
		let parsedSchema: unknown;
		try {
			parsedSchema = JSON.parse(formSchemaText);
		} catch {
			error = 'Invalid JSON in schema definition';
			formSaving = false;
			return;
		}
		error = null;

		try {
			const id = editingDef?.id ?? crypto.randomUUID();
			const properties = derivePropertiesFromJsonSchema(parsedSchema);

			const result = await queryClient.query<{ saveEntityDefinition: EntityDefinitionItem }>(
				M_SAVE_ENTITY_DEFINITION,
				{
					input: {
						projectId,
						id,
						name: formName.trim(),
						description: formDescription.trim() || undefined,
						jsonSchema: formSchemaText,
						properties
					}
				}
			);

			if (result?.saveEntityDefinition) {
				const saved = result.saveEntityDefinition;
				if (editingDef) {
					definitions = definitions.map((d) =>
						d.id === editingDef!.id ? saved : d
					);
				} else {
					definitions = [saved, ...definitions];
				}
			}

			showCreateForm = false;
			editingDef = null;
		} catch (e) {
			error = `Save failed: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			formSaving = false;
		}
	}

	async function handleDelete(def: EntityDefinitionItem) {
		if (!confirm(`Delete "${def.name}"?`)) return;
		try {
			await queryClient.query(M_DELETE_ENTITY_DEFINITION, { projectId, id: def.id });
			definitions = definitions.filter((d) => d.id !== def.id);
		} catch (e) {
			error = `Delete failed: ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	function cancelForm() {
		showCreateForm = false;
		editingDef = null;
	}

	function handleSelect(def: EntityDefinitionItem) {
		const schemaDef = typeof def.jsonSchema === 'string' ? def.jsonSchema : JSON.stringify(def.jsonSchema);
		onselect({ id: def.id, jsonSchemaId: def.jsonSchemaId ?? '', schemaDefinition: schemaDef });
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
					{showCreateForm ? (editingDef ? 'Edit Definition' : 'New Definition') : 'Schema Library'}
				</h2>
			</div>
			<div class="flex items-center gap-2">
				{#if !showCreateForm}
					<button
						type="button"
						onclick={startCreate}
						class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}"
					>+ New Definition</button>
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
						<input id="schema-form-name" type="text" bind:value={formName} placeholder="Definition name" class={inputCls} />
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
						placeholder="Search definitions..."
						class={inputCls}
					/>
				</div>

				{#if loading}
					<div class="flex items-center justify-center py-12">
						<div class="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
					</div>
				{:else if filteredDefinitions.length === 0}
					<div class="py-12 text-center">
						<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-400'}">
							{searchQuery ? 'No definitions match your search' : 'No definitions yet'}
						</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each filteredDefinitions as def (def.id)}
							{@const isSelected = def.jsonSchemaId === selectedSchemaId || def.id === selectedSchemaId}
							<div
								class="group rounded-lg border px-4 py-3 transition-all cursor-pointer
									{isSelected
										? (darkMode ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-400 bg-indigo-50')
										: (darkMode ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50' : 'border-slate-200 hover:border-slate-300 bg-white')}"
								onclick={() => handleSelect(def)}
								onkeydown={(e) => { if (e.key === 'Enter') handleSelect(def); }}
								role="button"
								tabindex="0"
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium truncate {darkMode ? 'text-white' : 'text-slate-900'}">
												{def.name}
											</span>
											{#if isSelected}
												<svg class="shrink-0 w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
												</svg>
											{/if}
										</div>
										{#if def.description}
											<p class="mt-0.5 text-xs truncate {darkMode ? 'text-slate-500' : 'text-slate-400'}">{def.description}</p>
										{/if}
									</div>
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div class="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
										<button
											type="button"
											onclick={() => startEdit(def)}
											class="p-1.5 rounded-md transition-colors {darkMode ? 'text-slate-500 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}"
											title="Edit"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											type="button"
											onclick={() => handleDelete(def)}
											class="p-1.5 rounded-md transition-colors {darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}"
											title="Delete"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
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
