<script lang="ts">
	import type { EntityDefinition, PropertyDefinition } from '@stratiqai/types-simple';
	import type { OntologySyncManager } from '$lib/services/realtime/websocket/sync-managers/OntologySyncManager';
	import { flatMapToEav } from '$lib/services/realtime/store/ontologyClientHelpers';
	import { toastStore } from '$lib/stores/toastStore.svelte';

	interface InstanceRow {
		id: string;
		data: Record<string, unknown>;
		label: string | null;
		updatedAt: string | null;
	}

	interface Props {
		instance: InstanceRow;
		definition: EntityDefinition;
		darkMode: boolean;
		syncManager: OntologySyncManager | null;
		projectId: string;
		onclose: () => void;
	}

	let { instance, definition, darkMode, syncManager, projectId, onclose }: Props = $props();

	let properties = $derived(
		(definition.properties?.filter(Boolean) ?? []) as PropertyDefinition[]
	);

	let editingLabel = $state(false);
	let labelDraft = $state('');
	let savingLabel = $state(false);

	let editingField = $state<string | null>(null);
	let fieldDraft = $state('');
	let savingField = $state<string | null>(null);

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

	function formatValue(val: unknown): string {
		if (val === null || val === undefined) return '—';
		if (typeof val === 'boolean') return val ? 'Yes' : 'No';
		return String(val);
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}

	function startLabelEdit() {
		if (!syncManager?.isReady) return;
		editingLabel = true;
		labelDraft = instance.label ?? '';
		requestAnimationFrame(() => {
			const el = document.getElementById('detail-label-input');
			if (el) (el as HTMLInputElement).focus();
		});
	}

	async function commitLabel() {
		if (!editingLabel) return;
		editingLabel = false;
		const newLabel = labelDraft.trim() || null;
		if (newLabel === instance.label) return;
		savingLabel = true;
		try {
			const values = flatMapToEav(instance.data, properties);
			await syncManager!.saveInstance({
				projectId,
				id: instance.id,
				definitionId: definition.id!,
				label: newLabel,
				values,
			});
		} catch (err) {
			toastStore.error(`Failed to save label: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			savingLabel = false;
		}
	}

	function cancelLabelEdit() {
		editingLabel = false;
	}

	function startFieldEdit(propName: string, currentValue: unknown) {
		if (!syncManager?.isReady) return;
		editingField = propName;
		fieldDraft = currentValue !== null && currentValue !== undefined ? String(currentValue) : '';
		requestAnimationFrame(() => {
			const el = document.getElementById(`detail-field-${propName}`);
			if (el) (el as HTMLInputElement).focus();
		});
	}

	async function commitField(prop: PropertyDefinition) {
		if (editingField !== prop.name) return;
		editingField = null;
		const parsed = parseTypedValue(fieldDraft, prop.dataType);
		if (parsed === instance.data[prop.name]) return;
		savingField = prop.name;
		try {
			const updatedFlat = { ...instance.data, [prop.name]: parsed };
			const values = flatMapToEav(updatedFlat, properties);
			await syncManager!.saveInstance({
				projectId,
				id: instance.id,
				definitionId: definition.id!,
				label: instance.label,
				values,
			});
		} catch (err) {
			toastStore.error(`Failed to save ${prop.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			savingField = null;
		}
	}

	function cancelFieldEdit() {
		editingField = null;
	}

	function parseTypedValue(raw: string, dataType: string): unknown {
		if (raw === '' || raw === '—') return null;
		switch (dataType) {
			case 'NUMBER': {
				const n = Number(raw);
				return isNaN(n) ? null : n;
			}
			case 'BOOLEAN':
				if (raw === 'true') return true;
				if (raw === 'false') return false;
				return null;
			case 'DATE':
				return raw || null;
			default:
				return raw;
		}
	}

	function handleFieldKeydown(e: KeyboardEvent, prop: PropertyDefinition) {
		if (e.key === 'Enter') { e.preventDefault(); commitField(prop); }
		else if (e.key === 'Escape') { e.preventDefault(); cancelFieldEdit(); }
	}

	function handleLabelKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); commitLabel(); }
		else if (e.key === 'Escape') { e.preventDefault(); cancelLabelEdit(); }
	}

	let isEditable = $derived(syncManager?.isReady ?? false);

	let inputClasses = $derived.by(() => {
		const base = 'w-full rounded border px-2 py-1 text-xs outline-none';
		return darkMode
			? `${base} border-indigo-500 bg-slate-800 text-slate-200 focus:ring-1 focus:ring-indigo-500`
			: `${base} border-indigo-400 bg-white text-slate-900 focus:ring-1 focus:ring-indigo-400`;
	});
</script>

<div class="max-h-64 overflow-y-auto px-4 py-3">
	<!-- Header -->
	<div class="mb-3 flex items-center justify-between">
		<h4 class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			Instance Detail
		</h4>
		<button
			type="button"
			class="rounded p-1 transition-colors {darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}"
			onclick={onclose}
			aria-label="Close detail panel"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
		<!-- ID -->
		<span class="font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">ID</span>
		<span class="select-all font-mono {darkMode ? 'text-slate-300' : 'text-slate-700'}">{instance.id}</span>

		<!-- Label -->
		<span class="font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Label</span>
		{#if editingLabel}
			<input
				id="detail-label-input"
				type="text"
				bind:value={labelDraft}
				class={inputClasses}
				onkeydown={handleLabelKeydown}
				onblur={commitLabel}
			/>
		{:else if isEditable}
			<button
				type="button"
				class="text-left {darkMode ? 'text-slate-300' : 'text-slate-700'} cursor-pointer rounded border-0 bg-transparent px-1 py-0 font-inherit -mx-1 hover:bg-indigo-500/10 {savingLabel ? 'opacity-50' : ''}"
				ondblclick={startLabelEdit}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'F2') startLabelEdit(); }}
			>
				{instance.label || '—'}
			</button>
		{:else}
			<span class="{darkMode ? 'text-slate-300' : 'text-slate-700'}">
				{instance.label || '—'}
			</span>
		{/if}

		<!-- Updated At -->
		<span class="font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Updated</span>
		<span class="{darkMode ? 'text-slate-500' : 'text-slate-400'}">{formatDate(instance.updatedAt)}</span>

		<!-- Definition -->
		<span class="font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Definition</span>
		<span class="font-mono {darkMode ? 'text-slate-500' : 'text-slate-400'}">{definition.name}</span>

		<!-- Separator -->
		<div class="col-span-2 my-1 border-t {darkMode ? 'border-slate-700' : 'border-slate-200'}"></div>

		<!-- Properties -->
		{#each properties as prop}
			{@const val = instance.data[prop.name]}
			{@const isCalc = prop.dataType === 'CALCULATION'}
			{@const isSaving = savingField === prop.name}

			<span class="flex items-center gap-1.5 font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				{prop.name}
				<span class="rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none {badgeClass(prop.dataType)}">
					{prop.dataType}
				</span>
			</span>

			{#if editingField === prop.name}
				{#if prop.dataType === 'BOOLEAN'}
					<select
						id="detail-field-{prop.name}"
						bind:value={fieldDraft}
						class={inputClasses}
						onkeydown={(e) => handleFieldKeydown(e, prop)}
						onblur={() => commitField(prop)}
					>
						<option value="">—</option>
						<option value="true">Yes</option>
						<option value="false">No</option>
					</select>
				{:else if prop.dataType === 'NUMBER'}
					<input
						id="detail-field-{prop.name}"
						type="number"
						step="any"
						bind:value={fieldDraft}
						class={inputClasses}
						onkeydown={(e) => handleFieldKeydown(e, prop)}
						onblur={() => commitField(prop)}
					/>
				{:else if prop.dataType === 'DATE'}
					<input
						id="detail-field-{prop.name}"
						type="date"
						bind:value={fieldDraft}
						class={inputClasses}
						onkeydown={(e) => handleFieldKeydown(e, prop)}
						onblur={() => commitField(prop)}
					/>
				{:else}
					<input
						id="detail-field-{prop.name}"
						type="text"
						bind:value={fieldDraft}
						class={inputClasses}
						onkeydown={(e) => handleFieldKeydown(e, prop)}
						onblur={() => commitField(prop)}
					/>
				{/if}
			{:else if isEditable && !isCalc}
				<button
					type="button"
					class="text-left {darkMode ? 'text-slate-300' : 'text-slate-700'} cursor-pointer rounded border-0 bg-transparent px-1 py-0 font-inherit -mx-1 hover:bg-indigo-500/10 {isSaving ? 'opacity-50' : ''}"
					ondblclick={() => startFieldEdit(prop.name, val)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'F2') startFieldEdit(prop.name, val); }}
				>
					{formatValue(val)}
				</button>
			{:else}
				<span class="{darkMode ? 'text-slate-300' : 'text-slate-700'} {isSaving ? 'opacity-50' : ''}">
					{formatValue(val)}
				</span>
			{/if}
		{/each}
	</div>
</div>
