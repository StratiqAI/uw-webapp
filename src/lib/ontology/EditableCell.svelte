<script lang="ts">
	interface Props {
		value: unknown;
		dataType: string;
		darkMode: boolean;
		readonly?: boolean;
		saving?: boolean;
		onsave?: (newValue: unknown) => void;
	}

	let {
		value,
		dataType,
		darkMode,
		readonly = false,
		saving = false,
		onsave,
	}: Props = $props();

	let editing = $state(false);
	let editValue = $state<string>('');
	let inputEl = $state<HTMLInputElement | HTMLSelectElement | null>(null);

	function formatValue(val: unknown): string {
		if (val === null || val === undefined) return '—';
		if (typeof val === 'boolean') return val ? 'Yes' : 'No';
		return String(val);
	}

	function startEdit() {
		if (readonly || saving) return;
		editing = true;
		if (dataType === 'BOOLEAN') {
			editValue = value === true ? 'true' : value === false ? 'false' : '';
		} else {
			editValue = value !== null && value !== undefined ? String(value) : '';
		}
		requestAnimationFrame(() => {
			if (inputEl) {
				inputEl.focus();
				if ('select' in inputEl && dataType !== 'BOOLEAN') {
					(inputEl as HTMLInputElement).select();
				}
			}
		});
	}

	function commit() {
		if (!editing) return;
		editing = false;
		const parsed = parseValue(editValue);
		if (parsed !== value) {
			onsave?.(parsed);
		}
	}

	function cancel() {
		editing = false;
	}

	function parseValue(raw: string): unknown {
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		} else if (e.key === 'Tab') {
			commit();
		}
	}

	function handleCellKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === 'F2') {
			e.preventDefault();
			startEdit();
		}
	}

	let displayText = $derived(formatValue(value));

	let cellClasses = $derived.by(() => {
		const base = 'whitespace-nowrap px-3 py-2 text-xs';
		if (saving) return `${base} opacity-50`;
		if (readonly) return `${base} ${darkMode ? 'text-slate-500' : 'text-slate-400'}`;
		return `${base} ${darkMode ? 'text-slate-300' : 'text-slate-700'}`;
	});

	let inputClasses = $derived.by(() => {
		const base =
			'w-full rounded border px-2 py-1 text-xs outline-none transition-colors';
		return darkMode
			? `${base} border-indigo-500 bg-slate-800 text-slate-200 focus:ring-1 focus:ring-indigo-500`
			: `${base} border-indigo-400 bg-white text-slate-900 focus:ring-1 focus:ring-indigo-400`;
	});
</script>

{#if editing}
	<td class={cellClasses}>
		{#if dataType === 'BOOLEAN'}
			<select
				bind:this={inputEl}
				bind:value={editValue}
				class={inputClasses}
				onkeydown={handleKeydown}
				onblur={commit}
			>
				<option value="">—</option>
				<option value="true">Yes</option>
				<option value="false">No</option>
			</select>
		{:else if dataType === 'NUMBER'}
			<input
				bind:this={inputEl}
				bind:value={editValue}
				type="number"
				step="any"
				class={inputClasses}
				onkeydown={handleKeydown}
				onblur={commit}
			/>
		{:else if dataType === 'DATE'}
			<input
				bind:this={inputEl}
				bind:value={editValue}
				type="date"
				class={inputClasses}
				onkeydown={handleKeydown}
				onblur={commit}
			/>
		{:else}
			<input
				bind:this={inputEl}
				bind:value={editValue}
				type="text"
				class={inputClasses}
				onkeydown={handleKeydown}
				onblur={commit}
			/>
		{/if}
	</td>
{:else}
	<td
		class="{cellClasses} {!readonly && !saving ? 'cursor-pointer' : ''}"
		ondblclick={startEdit}
		onkeydown={handleCellKeydown}
		tabindex={readonly ? -1 : 0}
		role={readonly ? undefined : 'gridcell'}
	>
		{displayText}
	</td>
{/if}
