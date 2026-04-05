<script lang="ts">
	import type { GridElement } from '../../types';
	import { isProcessNode, isInputNode } from '../../types/node';
	import type { ProcessNodeRequiredInput } from '../../types/node';
	import WorkflowModal from './WorkflowModal.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('workflows');

	/** Gold default for Input node trigger (e.g. doclink created). */
	const DEFAULT_TRIGGER_SOURCE = 'com.stratiqai.doclink';
	const DEFAULT_TRIGGER_DETAIL_TYPE = 'Created';

	let {
		darkMode = false,
		editingNodeOptions = $bindable(null),
		selectedProjectId = null,
		onSave,
		onClose
	}: {
		darkMode?: boolean;
		editingNodeOptions?: GridElement | null;
		selectedProjectId?: string | null;
		onSave?: () => void;
		onClose?: () => void;
	} = $props();

	let nodeOptionsText = $state('');
	let nodeOptionsError = $state('');

	// Process node editing state
	let processRequiredInputsText = $state('');
	let processFunctionText = $state('');
	let processRequiredInputsError = $state('');
	let processFunctionError = $state('');

	// Input node editing state (trigger event: source, detailType)
	let triggerSource = $state('');
	let triggerDetailType = $state('');

	const isProcess = $derived(editingNodeOptions && isProcessNode(editingNodeOptions.type));
	const isInput = $derived(editingNodeOptions != null && isInputNode(editingNodeOptions.type));
	const processType = $derived(
		isProcess && editingNodeOptions ? (editingNodeOptions.type as { requiredInputs?: ProcessNodeRequiredInput[]; formula?: string; execute?: (input: unknown) => unknown }) : null
	);

	function getDefaultNodeOptions(element: GridElement) {
		if (element.type.type !== 'input') {
			return {};
		}
		// Gold default: EventBridge-style trigger for doclink created
		const triggerDefaults = { source: DEFAULT_TRIGGER_SOURCE, detailType: DEFAULT_TRIGGER_DETAIL_TYPE };
		if (element.nodeOptions && (element.nodeOptions.source != null || element.nodeOptions.detailType != null)) {
			return { ...triggerDefaults, ...element.nodeOptions };
		}
		try {
			const fallbackOptions = element.type.execute(null);
			if (fallbackOptions && typeof (fallbackOptions as Promise<any>).then === 'function') {
				return triggerDefaults;
			}
			let options = (fallbackOptions ?? {}) as Record<string, unknown>;
			if (options.source == null) options.source = DEFAULT_TRIGGER_SOURCE;
			if (options.detailType == null) options.detailType = DEFAULT_TRIGGER_DETAIL_TYPE;
			// For Document Knowledge Base node, ensure it has projectId
			if (element.type.id === 'property-data') {
				options = { ...options, projectId: selectedProjectId || '' };
			}
			return options;
		} catch (error) {
			log.warn('Failed to resolve default node options', error);
			return triggerDefaults;
		}
	}

	$effect(() => {
		if (editingNodeOptions && isInputNode(editingNodeOptions.type)) {
			const fallbackOptions = getDefaultNodeOptions(editingNodeOptions) as { source?: string; detailType?: string };
			triggerSource = editingNodeOptions.nodeOptions?.source ?? fallbackOptions?.source ?? DEFAULT_TRIGGER_SOURCE;
			triggerDetailType = editingNodeOptions.nodeOptions?.detailType ?? fallbackOptions?.detailType ?? DEFAULT_TRIGGER_DETAIL_TYPE;
		} else if (editingNodeOptions && !isProcessNode(editingNodeOptions.type)) {
			nodeOptionsError = '';
			const fallbackOptions = getDefaultNodeOptions(editingNodeOptions);
			const optionsValue = editingNodeOptions.nodeOptions ?? fallbackOptions ?? {};
			nodeOptionsText = JSON.stringify(optionsValue, null, 2);
		} else if (editingNodeOptions && isProcessNode(editingNodeOptions.type)) {
			// Initialize process node editing state
			processRequiredInputsError = '';
			processFunctionError = '';
			
			const nodeOptions = editingNodeOptions.nodeOptions || {};
			const defaultInputs = processType?.requiredInputs || [];
			const defaultFunction = processType?.execute?.toString() || '';
			
			// Load custom values or use defaults
			if (nodeOptions.customRequiredInputs) {
				processRequiredInputsText = JSON.stringify(nodeOptions.customRequiredInputs, null, 2);
			} else {
				processRequiredInputsText = JSON.stringify(defaultInputs, null, 2);
			}
			
			if (nodeOptions.customExecute) {
				processFunctionText = nodeOptions.customExecute;
			} else {
				processFunctionText = defaultFunction;
			}
		} else if (!editingNodeOptions) {
			nodeOptionsText = '';
			nodeOptionsError = '';
			processRequiredInputsText = '';
			processFunctionText = '';
			processRequiredInputsError = '';
			processFunctionError = '';
			triggerSource = '';
			triggerDetailType = '';
		}
	});

	function saveNodeOptions() {
		if (!editingNodeOptions) return;

		if (isInputNode(editingNodeOptions.type)) {
			editingNodeOptions.nodeOptions = {
				source: triggerSource.trim() || DEFAULT_TRIGGER_SOURCE,
				detailType: triggerDetailType.trim() || DEFAULT_TRIGGER_DETAIL_TYPE
			};
			editingNodeOptions = null;
			triggerSource = '';
			triggerDetailType = '';
			onSave?.();
			return;
		}

		if (isProcessNode(editingNodeOptions.type)) {
			// Save process node customizations
			try {
				const customRequiredInputs = processRequiredInputsText.trim()
					? JSON.parse(processRequiredInputsText.trim())
					: null;
				
				// Validate required inputs structure
				if (customRequiredInputs !== null) {
					if (!Array.isArray(customRequiredInputs)) {
						processRequiredInputsError = 'Required inputs must be an array.';
						return;
					}
					for (const input of customRequiredInputs) {
						if (!input || typeof input !== 'object' || !input.name || typeof input.name !== 'string') {
							processRequiredInputsError = 'Each input must have a "name" property (string).';
							return;
						}
					}
				}
				
				// Validate function syntax (basic check)
				const functionText = processFunctionText.trim();
				if (functionText) {
					try {
						// Try to create a function from the text
						// Remove function wrapper if present
						let funcBody = functionText;
						if (funcBody.startsWith('function') || funcBody.startsWith('(') || funcBody.includes('=>')) {
							// Extract body if it's a full function declaration
							const match = funcBody.match(/\{([\s\S]*)\}/);
							if (match) {
								funcBody = match[1];
							}
						}
						// Try to parse as function
						new Function('input', funcBody);
					} catch (error) {
						processFunctionError = 'Invalid function syntax. Please check your code.';
						return;
					}
				}
				
				// Save to nodeOptions
				editingNodeOptions.nodeOptions = {
					...(editingNodeOptions.nodeOptions || {}),
					...(customRequiredInputs !== null && { customRequiredInputs }),
					...(functionText && { customExecute: functionText })
				};
				
				editingNodeOptions = null;
				processRequiredInputsText = '';
				processFunctionText = '';
				processRequiredInputsError = '';
				processFunctionError = '';
				onSave?.();
			} catch (error) {
				if (!processRequiredInputsError) {
					processRequiredInputsError = 'Invalid JSON. Please fix and try again.';
				}
			}
		} else {
			// Save non-process node options
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
	}

	function cancelNodeOptions() {
		editingNodeOptions = null;
		nodeOptionsText = '';
		nodeOptionsError = '';
		processRequiredInputsText = '';
		processFunctionText = '';
		processRequiredInputsError = '';
		processFunctionError = '';
		triggerSource = '';
		triggerDetailType = '';
		onClose?.();
	}

	function resetProcessToDefault() {
		if (!editingNodeOptions || !processType) return;
		
		const defaultInputs = processType.requiredInputs || [];
		const defaultFunction = processType.execute?.toString() || '';
		
		processRequiredInputsText = JSON.stringify(defaultInputs, null, 2);
		processFunctionText = defaultFunction;
		processRequiredInputsError = '';
		processFunctionError = '';
	}

	function formatAlternates(alt?: string[]): string {
		if (!alt?.length) return '';
		return alt.length === 1 ? ` or ${alt[0]}` : ` or ${alt.join(', ')}`;
	}

	const requiredInputsPlaceholder = $derived(
		JSON.stringify([{ name: 'input1', description: 'Description', alternateNames: ['alt1'] }], null, 2)
	);
	const functionPlaceholder = '(input) => {\n  // Your processing logic here\n  return result;\n}';
</script>

<WorkflowModal
	{darkMode}
	labelledBy="node-options-title"
	maxWidthClass="max-w-2xl"
	maxHeightClass="max-h-[90vh]"
	containerClass="overflow-y-auto"
	onClose={cancelNodeOptions}
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
					{isProcess ? 'Process node' : isInput ? 'Input node' : 'Configure'} {editingNodeOptions?.type.label}
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">
					{isProcess
						? 'Edit required inputs and processing function'
						: isInput
							? 'Set the trigger event (source and detail type) for this workflow.'
							: 'Set node options as JSON'}
				</p>
			</div>
		</div>

		{#if isProcess && processType}
			<!-- Process node: editable required inputs + function -->
			<div class="space-y-6">
				{#if editingNodeOptions?.type.description}
					<p class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
						{editingNodeOptions.type.description}
					</p>
				{/if}

				<!-- Required inputs editor -->
				<div>
					<label for="process-required-inputs" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
						Required inputs
					</label>
					<textarea
						id="process-required-inputs"
						bind:value={processRequiredInputsText}
						class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm font-mono"
						rows="8"
						placeholder={requiredInputsPlaceholder}
					></textarea>
					{#if processRequiredInputsError}
						<p class="text-xs text-red-500 mt-1.5">{processRequiredInputsError}</p>
					{:else}
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">
							Edit the required inputs as a JSON array. Each input should have a "name" (string) and optionally "description" and "alternateNames".
						</p>
					{/if}
				</div>

				<!-- Formula (read-only reference) -->
				{#if processType.formula}
					<div>
						<h3 class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
							Default formula (reference)
						</h3>
						<p class="font-mono text-sm px-3 py-2 rounded-lg {darkMode ? 'bg-slate-700/60 text-slate-200' : 'bg-slate-100 text-slate-800'}">
							{processType.formula}
						</p>
					</div>
				{/if}

				<!-- Processing function editor -->
				<div>
					<label for="process-function" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
						Processing function
					</label>
					<textarea
						id="process-function"
						bind:value={processFunctionText}
						class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm font-mono"
						rows="12"
						placeholder={functionPlaceholder}
					></textarea>
					{#if processFunctionError}
						<p class="text-xs text-red-500 mt-1.5">{processFunctionError}</p>
					{:else}
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">
							Edit the processing function. It should accept an "input" parameter and return the processed result.
						</p>
					{/if}
				</div>
			</div>

			<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
				<button
					onclick={resetProcessToDefault}
					class="px-4 py-2.5 {darkMode ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} rounded-md transition-colors font-semibold text-sm"
					type="button"
				>
					Reset to Default
				</button>
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
		{:else if isInput}
			<!-- Input node: trigger event (source, detailType) -->
			<div class="space-y-4">
				<p class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					This event identifies when the workflow is triggered (e.g. doclink created). Stored as the node configuration and used when starting runs.
				</p>
				<div>
					<label for="trigger-source" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
						Source
					</label>
					<input
						id="trigger-source"
						type="text"
						bind:value={triggerSource}
						class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
						placeholder={DEFAULT_TRIGGER_SOURCE}
					/>
					<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">
						Event source (e.g. com.stratiqai.doclink).
					</p>
				</div>
				<div>
					<label for="trigger-detail-type" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
						Detail type
					</label>
					<input
						id="trigger-detail-type"
						type="text"
						bind:value={triggerDetailType}
						class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
						placeholder={DEFAULT_TRIGGER_DETAIL_TYPE}
					/>
					<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">
						Event detail type (e.g. Created).
					</p>
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
		{:else}
			<!-- Non-process, non-input: JSON options editor -->
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
		{/if}
	</div>
</WorkflowModal>
