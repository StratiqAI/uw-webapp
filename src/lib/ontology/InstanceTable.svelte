<script lang="ts">
	import type { EntityDefinition, PropertyDefinition } from '@stratiqai/types-simple';
	import type { OntologySyncManager } from '$lib/services/realtime/websocket/sync-managers/OntologySyncManager';
	import { flatMapToEav } from '$lib/services/realtime/store/ontologyClientHelpers';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import EditableCell from './EditableCell.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

	interface InstanceRow {
		id: string;
		data: Record<string, unknown>;
		label: string | null;
		updatedAt: string | null;
	}

	interface Props {
		definition: EntityDefinition;
		instances: InstanceRow[];
		darkMode: boolean;
		syncManager: OntologySyncManager | null;
		projectId: string;
		selectedInstanceId: string | null;
		onselect: (id: string | null) => void;
	}

	let {
		definition,
		instances,
		darkMode,
		syncManager,
		projectId,
		selectedInstanceId,
		onselect,
	}: Props = $props();

	let properties = $derived(
		(definition.properties?.filter(Boolean) ?? []) as PropertyDefinition[]
	);

	let isEditable = $derived(syncManager?.isReady ?? false);

	// ── Cell-level saving state ────────────────────────────────────────
	let savingCells = $state(new Set<string>());

	function cellKey(instId: string, propName: string): string {
		return `${instId}:${propName}`;
	}

	// ── Row selection for bulk delete ──────────────────────────────────
	let selectedIds = $state(new Set<string>());

	let allSelected = $derived(
		instances.length > 0 && selectedIds.size === instances.length
	);

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(instances.map((i) => i.id));
		}
	}

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	// ── Type badge styles ──────────────────────────────────────────────
	const TYPE_BADGE: Record<string, { bg: string; bgDark: string; text: string; textDark: string }> = {
		STRING:      { bg: 'bg-slate-100',   bgDark: 'bg-slate-700',       text: 'text-slate-600',   textDark: 'text-slate-400' },
		NUMBER:      { bg: 'bg-blue-100',    bgDark: 'bg-blue-900/30',     text: 'text-blue-700',    textDark: 'text-blue-400' },
		BOOLEAN:     { bg: 'bg-emerald-100', bgDark: 'bg-emerald-900/30',  text: 'text-emerald-700', textDark: 'text-emerald-400' },
		DATE:        { bg: 'bg-amber-100',   bgDark: 'bg-amber-900/30',    text: 'text-amber-700',   textDark: 'text-amber-400' },
		CALCULATION: { bg: 'bg-violet-100',  bgDark: 'bg-violet-900/30',   text: 'text-violet-700',  textDark: 'text-violet-400' },
	};

	function badgeClass(dataType: string): string {
		const b = TYPE_BADGE[dataType] ?? TYPE_BADGE.STRING;
		return darkMode ? `${b.bgDark} ${b.textDark}` : `${b.bg} ${b.text}`;
	}

	// ── Row flash animation on data change ─────────────────────────────
	let flashKeys = $state(new Map<string, number>());

	$effect(() => {
		for (const inst of instances) {
			const sig = JSON.stringify(inst.data);
			const hash = sig.length + sig.charCodeAt(0) + (sig.charCodeAt(sig.length - 1) || 0);
			const prev = flashKeys.get(inst.id);
			if (prev !== undefined && prev !== hash) {
				const el = document.getElementById(`row-${inst.id}`);
				if (el) {
					el.classList.remove('animate-row-flash');
					void el.offsetWidth;
					el.classList.add('animate-row-flash');
				}
			}
			flashKeys.set(inst.id, hash);
		}
	});

	// ── Save a single property value ───────────────────────────────────
	async function handleCellSave(inst: InstanceRow, propName: string, newValue: unknown) {
		if (!syncManager?.isReady) return;
		const key = cellKey(inst.id, propName);
		savingCells = new Set([...savingCells, key]);
		try {
			const updatedFlat = { ...inst.data, [propName]: newValue };
			const values = flatMapToEav(updatedFlat, properties);
			await syncManager.saveInstance({
				projectId,
				id: inst.id,
				definitionId: definition.id!,
				label: inst.label,
				values,
			});
		} catch (err) {
			toastStore.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			const next = new Set(savingCells);
			next.delete(key);
			savingCells = next;
		}
	}

	// ── Save label inline ──────────────────────────────────────────────
	async function handleLabelSave(inst: InstanceRow, newLabel: unknown) {
		if (!syncManager?.isReady) return;
		const key = cellKey(inst.id, '__label');
		savingCells = new Set([...savingCells, key]);
		try {
			const labelStr = newLabel !== null && newLabel !== undefined ? String(newLabel) : null;
			const values = flatMapToEav(inst.data, properties);
			await syncManager.saveInstance({
				projectId,
				id: inst.id,
				definitionId: definition.id!,
				label: labelStr?.trim() || null,
				values,
			});
		} catch (err) {
			toastStore.error(`Save label failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			const next = new Set(savingCells);
			next.delete(key);
			savingCells = next;
		}
	}

	// ── Create instance ────────────────────────────────────────────────
	let creating = $state(false);

	async function handleCreate() {
		if (!syncManager?.isReady) return;
		creating = true;
		try {
			const id = crypto.randomUUID();
			const inst = await syncManager.saveInstance({
				projectId,
				id,
				definitionId: definition.id!,
				values: [],
			});
			onselect(inst.id);
		} catch (err) {
			toastStore.error(`Create failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			creating = false;
		}
	}

	// ── Delete instances ───────────────────────────────────────────────
	let deleteTarget = $state<{ ids: string[]; label: string } | null>(null);
	let deleteModalOpen = $state(false);
	let deleting = $state(false);

	function requestDeleteSingle(inst: InstanceRow) {
		const label = inst.label || inst.id.slice(0, 16);
		deleteTarget = { ids: [inst.id], label: `"${label}"` };
		deleteModalOpen = true;
	}

	function requestDeleteSelected() {
		if (selectedIds.size === 0) return;
		deleteTarget = {
			ids: [...selectedIds],
			label: `${selectedIds.size} instance${selectedIds.size !== 1 ? 's' : ''}`,
		};
		deleteModalOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTarget || !syncManager?.isReady) return;
		deleting = true;
		const ids = deleteTarget.ids;
		deleteTarget = null;
		deleteModalOpen = false;
		try {
			for (const id of ids) {
				await syncManager.deleteInstance(projectId, id, definition.id!);
			}
			const next = new Set(selectedIds);
			for (const id of ids) next.delete(id);
			selectedIds = next;
			if (ids.includes(selectedInstanceId ?? '')) onselect(null);
		} catch (err) {
			toastStore.error(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			deleting = false;
		}
	}

	// ── Row click to select for detail panel ───────────────────────────
	function handleRowClick(id: string) {
		onselect(selectedInstanceId === id ? null : id);
	}
</script>

<style>
	@keyframes row-flash-light {
		0% { background-color: #dbeafe; }
		100% { background-color: transparent; }
	}
	@keyframes row-flash-dark {
		0% { background-color: rgba(59, 130, 246, 0.15); }
		100% { background-color: transparent; }
	}
	:global(.animate-row-flash) {
		animation: row-flash-light 1.5s ease-out;
	}
	:global(.dark .animate-row-flash) {
		animation: row-flash-dark 1.5s ease-out;
	}
</style>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Toolbar -->
	<div class="flex items-center gap-3 border-b px-4 py-2.5
		{darkMode ? 'border-slate-700' : 'border-slate-200'}">
		<h2 class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-800'}">
			{definition.name}
		</h2>
		<span class="rounded-full px-2 py-0.5 text-[10px] font-medium
			{darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}">
			{instances.length} instance{instances.length !== 1 ? 's' : ''}
		</span>

		<div class="ml-auto flex items-center gap-2">
			{#if selectedIds.size > 0 && isEditable}
				<button
					type="button"
					class="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-white transition-colors
						bg-red-600 hover:bg-red-700 disabled:opacity-50"
					onclick={requestDeleteSelected}
					disabled={deleting}
				>
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					Delete ({selectedIds.size})
				</button>
			{/if}

			{#if isEditable}
				<button
					type="button"
					class="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-white transition-colors
						bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
					onclick={handleCreate}
					disabled={creating}
				>
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					{creating ? 'Creating...' : 'New Instance'}
				</button>
			{/if}
		</div>
	</div>

	{#if instances.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<svg class="mx-auto h-10 w-10 {darkMode ? 'text-slate-700' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-7.5m7.5 0h7.5M12 10.875c0-.621.504-1.125 1.125-1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 15.75h-7.5m8.625 0h7.5" />
				</svg>
				<p class="mt-3 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No instances yet</p>
				{#if isEditable}
					<button
						type="button"
						class="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
						onclick={handleCreate}
						disabled={creating}
					>
						{creating ? 'Creating...' : 'Create First Instance'}
					</button>
				{:else}
					<p class="mt-1 text-xs {darkMode ? 'text-slate-600' : 'text-slate-400'}">
						Waiting for connection...
					</p>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex-1 overflow-auto">
			<table class="w-full text-xs" role="grid">
				<thead>
					<tr class="sticky top-0 {darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}">
						{#if isEditable}
							<th class="w-8 px-2 py-2 text-center">
								<input
									type="checkbox"
									checked={allSelected}
									onchange={toggleSelectAll}
									class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
									aria-label="Select all"
								/>
							</th>
						{/if}
						<th class="whitespace-nowrap px-3 py-2 text-left font-medium">ID</th>
						<th class="whitespace-nowrap px-3 py-2 text-left font-medium">Label</th>
						{#each properties as prop}
							<th class="whitespace-nowrap px-3 py-2 text-left font-medium">
								<div class="flex items-center gap-1.5">
									<span>{prop.name}</span>
									<span class="rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none {badgeClass(prop.dataType)}">
										{prop.dataType}
									</span>
								</div>
							</th>
						{/each}
						{#if isEditable}
							<th class="w-10 px-2 py-2"></th>
						{/if}
					</tr>
				</thead>
				<tbody class="divide-y {darkMode ? 'divide-slate-800' : 'divide-slate-100'}">
					{#each instances as inst (inst.id)}
						<tr
							id="row-{inst.id}"
							class="group transition-colors
								{selectedInstanceId === inst.id
									? (darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50')
									: (darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')}"
							onclick={() => handleRowClick(inst.id)}
						>
							{#if isEditable}
								<td class="w-8 px-2 py-2 text-center" onclick={(e) => e.stopPropagation()}>
									<input
										type="checkbox"
										checked={selectedIds.has(inst.id)}
										onchange={() => toggleSelect(inst.id)}
										class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
										aria-label="Select instance {inst.id}"
									/>
								</td>
							{/if}

							<!-- ID (always readonly) -->
							<td class="whitespace-nowrap px-3 py-2 font-mono {darkMode ? 'text-slate-500' : 'text-slate-400'}">
								{inst.id.length > 16 ? inst.id.slice(0, 16) + '...' : inst.id}
							</td>

							<!-- Label (editable) -->
							<EditableCell
								value={inst.label}
								dataType="STRING"
								{darkMode}
								readonly={!isEditable}
								saving={savingCells.has(cellKey(inst.id, '__label'))}
								onsave={(v) => handleLabelSave(inst, v)}
							/>

							<!-- Property values -->
							{#each properties as prop}
								<EditableCell
									value={inst.data[prop.name]}
									dataType={prop.dataType}
									{darkMode}
									readonly={!isEditable || prop.dataType === 'CALCULATION'}
									saving={savingCells.has(cellKey(inst.id, prop.name))}
									onsave={(v) => handleCellSave(inst, prop.name, v)}
								/>
							{/each}

							<!-- Actions column -->
							{#if isEditable}
								<td class="w-10 px-2 py-2 text-center" onclick={(e) => e.stopPropagation()}>
									<button
										type="button"
										class="rounded p-1 opacity-0 transition-all group-hover:opacity-100
											{darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'}"
										onclick={() => requestDeleteSingle(inst)}
										aria-label="Delete instance"
										disabled={deleting}
									>
										<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Delete confirmation modal -->
<ConfirmModal
	bind:open={deleteModalOpen}
	title="Delete {deleteTarget?.label ?? 'instance'}?"
	message="This action cannot be undone. The instance data will be permanently removed."
	confirmLabel={deleting ? 'Deleting...' : 'Delete'}
	cancelLabel="Cancel"
	danger={true}
	{darkMode}
	onConfirm={confirmDelete}
/>
