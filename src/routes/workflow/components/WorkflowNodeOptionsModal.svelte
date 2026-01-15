<script lang="ts">
	import type { GridElement } from '../types';
	import WorkflowModal from './WorkflowModal.svelte';

	let {
		darkMode = false,
		editingNodeOptions = $bindable(null),
		onSave,
		onClose
	}: {
		darkMode?: boolean;
		editingNodeOptions?: GridElement | null;
		onSave?: () => void;
		onClose?: () => void;
	} = $props();

	let nodeOptionsText = $state('');
	let nodeOptionsError = $state('');

	function getDefaultNodeOptions(element: GridElement) {
		if (element.type.type !== 'input') {
			return {};
		}

		try {
			const fallbackOptions = element.type.execute(null);
			if (fallbackOptions && typeof (fallbackOptions as Promise<any>).then === 'function') {
				return {};
			}
			return fallbackOptions ?? {};
		} catch (error) {
			console.warn('Failed to resolve default node options', error);
			return {};
		}
	}

	$effect(() => {
		if (editingNodeOptions) {
			nodeOptionsError = '';
			const fallbackOptions = getDefaultNodeOptions(editingNodeOptions);
			const optionsValue = editingNodeOptions.nodeOptions ?? fallbackOptions ?? {};
			nodeOptionsText = JSON.stringify(optionsValue, null, 2);
		} else {
			nodeOptionsText = '';
			nodeOptionsError = '';
		}
	});

	function saveNodeOptions() {
		if (!editingNodeOptions) return;
		try {
			const trimmed = nodeOptionsText.trim();
			editingNodeOptions.nodeOptions = trimmed ? JSON.parse(trimmed) : {};
			editingNodeOptions = null;
			nodeOptionsText = '';
			nodeOptionsError = '';
			onSave?.();
		} catch (error) {
			nodeOptionsError = 'Invalid JSON. Please fix and try again.';
		}
	}

	function cancelNodeOptions() {
		editingNodeOptions = null;
		nodeOptionsText = '';
		nodeOptionsError = '';
		onClose?.();
	}
</script>

<WorkflowModal
	{darkMode}
	labelledBy="node-options-title"
	maxWidthClass="max-w-2xl"
	maxHeightClass="max-h-[90vh]"
	containerClass="overflow-y-auto"
	{onClose}
>
	<div class="p-6">
		<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
			<div class="w-10 h-10 {darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg flex items-center justify-center">
				<span class="{darkMode ? 'text-slate-200' : 'text-slate-700'} font-semibold text-sm">
					{editingNodeOptions?.type.icon}
				</span>
			</div>
			<div>
				<h2 id="node-options-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Configure {editingNodeOptions?.type.label}
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">
					Set node options as JSON
				</p>
			</div>
		</div>

		<div class="space-y-4">
			<div>
				<label for="node-options-json" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					Options JSON
				</label>
				<textarea
					id="node-options-json"
					bind:value={nodeOptionsText}
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm font-mono"
					rows="10"
					placeholder="Example: &#123;&quot;example&quot;: true&#125;"
				></textarea>
				{#if nodeOptionsError}
					<p class="text-xs text-red-500 mt-1.5">{nodeOptionsError}</p>
				{:else}
					<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">
						These options are used as the node's input when no upstream data is connected.
					</p>
				{/if}
			</div>
		</div>

		<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
			<button
				onclick={saveNodeOptions}
				class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
			>
				Save Configuration
			</button>
			<button
				onclick={cancelNodeOptions}
				class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
			>
				Cancel
			</button>
		</div>
	</div>
</WorkflowModal>
