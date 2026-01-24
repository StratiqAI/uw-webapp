<script lang="ts">
	import WorkflowModal from './WorkflowModal.svelte';
	import Ajv from 'ajv';
	import addFormats from 'ajv-formats';

	const ajv = new Ajv({ allErrors: true });
	addFormats(ajv);

	let {
		darkMode = false,
		outputSchema = $bindable(null),
		onSave,
		onClose
	}: {
		darkMode?: boolean;
		outputSchema?: Record<string, unknown> | null;
		onSave?: () => void;
		onClose?: () => void;
	} = $props();

	let schemaText = $state('');
	let schemaError = $state('');
	let isValid = $state(false);

	// Initialize schema text from prop
	$effect(() => {
		if (outputSchema) {
			try {
				schemaText = JSON.stringify(outputSchema, null, 2);
				validateSchema();
			} catch (e) {
				schemaText = '';
				schemaError = 'Failed to parse existing schema';
			}
		} else {
			schemaText = '';
			schemaError = '';
			isValid = false;
		}
	});

	function validateSchema() {
		schemaError = '';
		isValid = false;

		if (!schemaText.trim()) {
			// Empty schema is valid (no validation)
			isValid = true;
			return;
		}

		try {
			const parsed = JSON.parse(schemaText);
			
			// Validate it's a valid JSON Schema
			// Basic check: should be an object
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				schemaError = 'Schema must be a JSON object';
				return;
			}

			// Try to compile it with Ajv to check for schema errors
			try {
				ajv.compile(parsed);
				isValid = true;
			} catch (compileError: any) {
				schemaError = compileError.message || 'Invalid JSON Schema structure';
			}
		} catch (parseError: any) {
			schemaError = parseError.message || 'Invalid JSON';
		}
	}

	function handleSchemaTextChange(value: string) {
		schemaText = value;
		validateSchema();
	}

	function handleSave() {
		if (!isValid && schemaText.trim()) {
			return; // Don't save invalid schema
		}

		if (schemaText.trim()) {
			try {
				outputSchema = JSON.parse(schemaText);
			} catch (e) {
				schemaError = 'Failed to parse schema';
				return;
			}
		} else {
			outputSchema = null; // Clear schema
		}

		onSave?.();
		onClose?.();
	}

	function handleCancel() {
		onClose?.();
	}

	// Example schema template
	const exampleSchema = {
		type: 'object',
		properties: {
			result: {
				type: 'string',
				description: 'The workflow result'
			},
			metadata: {
				type: 'object',
				properties: {
					timestamp: { type: 'string', format: 'date-time' },
					status: { type: 'string', enum: ['success', 'warning', 'error'] }
				},
				required: ['timestamp', 'status']
			}
		},
		required: ['result']
	};

	function insertExample() {
		schemaText = JSON.stringify(exampleSchema, null, 2);
		validateSchema();
	}

	const placeholderText = '{"type": "object", "properties": {...}}';
</script>

<WorkflowModal {darkMode} labelledBy="workflow-output-schema-title" onClose={handleCancel}>
	<div class="flex flex-col h-full">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h2 id="workflow-output-schema-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Workflow Output Schema
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
					Define the JSON schema for your workflow output. This schema will be validated when the workflow completes.
				</p>
			</div>
		</div>

		<div class="flex-1 flex flex-col min-h-0">
			<div class="flex items-center justify-between mb-2">
				<label for="schema-textarea" class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
					JSON Schema
				</label>
				<button
					type="button"
					onclick={insertExample}
					class="text-xs px-2 py-1 {darkMode ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/20' : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'} rounded transition-colors"
				>
					Insert Example
				</button>
			</div>

			<div class="flex-1 min-h-0 flex flex-col">
				<textarea
					id="schema-textarea"
					bind:value={schemaText}
					oninput={(e) => handleSchemaTextChange((e.target as HTMLTextAreaElement).value)}
					placeholder={placeholderText}
					class="flex-1 w-full p-3 font-mono text-sm {darkMode ? 'bg-slate-900 text-slate-100 border-slate-600' : 'bg-slate-50 text-slate-900 border-slate-300'} border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
					spellcheck="false"
				></textarea>

				{#if schemaError}
					<div class="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-600 dark:text-red-400">
						{schemaError}
					</div>
				{:else if isValid && schemaText.trim()}
					<div class="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-sm text-emerald-600 dark:text-emerald-400">
						✓ Valid JSON Schema
					</div>
				{/if}
			</div>

			<div class="mt-4 p-3 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-lg">
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1">
					<strong>Tip:</strong> Leave empty to allow any output format. The schema will be validated when the workflow execution completes.
				</p>
			</div>
		</div>

		<div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t {darkMode ? 'border-slate-700' : 'border-slate-200'}">
			<button
				type="button"
				onclick={handleCancel}
				class="px-4 py-2 text-sm font-medium {darkMode ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleSave}
				disabled={!isValid && schemaText.trim() !== ''}
				class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
			>
				Save Schema
			</button>
		</div>
	</div>
</WorkflowModal>
