<!--
	SchemaBuilder.svelte
	
	Interactive component for building and registering JSON schemas.
	
	Features:
	- Visual schema builder with field-by-field configuration
	- Support for all JSON Schema types (string, number, integer, boolean, array, object)
	- Best practices enforcement (descriptions, required fields, reasoning fields)
	- Schema validation and preview
	- Integration with ValidatedTopicStore for schema registration
	
	The component helps users create well-structured schemas following AI generation
	best practices, including reasoning fields for better AI output quality.
-->

<script lang="ts">
	import type { ValidatedTopicStore } from '../ValidatedTopicStore.svelte';

	interface Props {
		store: ValidatedTopicStore;
	}

	let { store }: Props = $props();

	// Schema Builder State - component manages its own form state
	let newSchemaPattern = $state('app/schema/+'); // MQTT-style topic pattern
	let newSchemaProperties = $state<Record<string, any>>({}); // Field definitions
	let newSchemaRequired = $state<string[]>([]); // Array of required field names
	
	// Maintain explicit order for fields to ensure stable iteration
	let fieldOrder = $state<string[]>([]);
	
	// Derived array of field entries in correct order for stable rendering
	let orderedFieldEntries = $derived.by(() => {
		const entries: Array<[string, any]> = [];
		// First, add fields in the order they were added (fieldOrder)
		for (const fieldName of fieldOrder) {
			if (newSchemaProperties[fieldName]) {
				entries.push([fieldName, newSchemaProperties[fieldName]]);
			}
		}
		// Then add any fields that might not be in fieldOrder (shouldn't happen, but safety check)
		for (const [fieldName, fieldSchema] of Object.entries(newSchemaProperties)) {
			if (!fieldOrder.includes(fieldName)) {
				entries.push([fieldName, fieldSchema]);
			}
		}
		return entries;
	});
	
	// Reactive preview - updates automatically when properties or required fields change
	let newSchemaPreview = $derived.by(() => {
		return {
			type: 'object',
			properties: newSchemaProperties,
			required: newSchemaRequired,
			additionalProperties: false, // Best practice: prevent extra fields
			$schema: 'http://json-schema.org/draft-07/schema#'
		};
	});

	function addSchemaField(isReasoning: boolean = false) {
		// Generate field name: 'reasoning' for reasoning field, auto-increment for others
		const fieldName = isReasoning
			? 'reasoning'
			: `field_${Object.keys(newSchemaProperties).length + 1}`;
		
		// Prevent duplicate reasoning fields (best practice: only one reasoning field)
		if (isReasoning && newSchemaProperties[fieldName]) {
			return;
		}

		const baseField: any = { type: 'string' };
		// Add pre-configured description for reasoning field (AI best practice)
		if (isReasoning) {
			baseField.description =
				'A step-by-step internal monologue explaining the logic and reasoning behind the values chosen for all other fields. This helps ensure accuracy and prevents skipping steps.';
		}

		// Reasoning field should be first in the schema (best practice for AI)
		if (isReasoning) {
			// Create new object with reasoning first, then existing fields
			const newProps: Record<string, any> = { [fieldName]: baseField };
			for (const [key, value] of Object.entries(newSchemaProperties)) {
				newProps[key] = value;
			}
			newSchemaProperties = newProps;
			// Add reasoning to the beginning of fieldOrder
			fieldOrder = [fieldName, ...fieldOrder];
		} else {
			// Regular fields are appended
			newSchemaProperties[fieldName] = baseField;
			// Add to end of fieldOrder
			fieldOrder = [...fieldOrder, fieldName];
		}

		// All fields (including reasoning) should be in required array (Best Practice #5)
		if (!newSchemaRequired.includes(fieldName)) {
			newSchemaRequired.push(fieldName);
		}
		// Trigger reactivity by creating new object/array references
		// This ensures Svelte detects the change and updates the UI
		newSchemaProperties = { ...newSchemaProperties };
		newSchemaRequired = [...newSchemaRequired];
	}

	function removeSchemaField(fieldName: string) {
		delete newSchemaProperties[fieldName];
		// Remove from fieldOrder
		fieldOrder = fieldOrder.filter((name) => name !== fieldName);
		// Also remove from required array if present
		newSchemaRequired = newSchemaRequired.filter((r) => r !== fieldName);
		// Trigger reactivity by creating new references
		newSchemaProperties = { ...newSchemaProperties };
		newSchemaRequired = [...newSchemaRequired];
	}

	function updateSchemaField(fieldName: string, updates: Partial<any>) {
		if (newSchemaProperties[fieldName]) {
			// Merge updates with existing field properties
			newSchemaProperties[fieldName] = { ...newSchemaProperties[fieldName], ...updates };
			// Trigger reactivity
			newSchemaProperties = { ...newSchemaProperties };
		}
	}

	function updateSchemaFieldType(fieldName: string, type: string) {
		if (newSchemaProperties[fieldName]) {
			const current = newSchemaProperties[fieldName];
			// Preserve description and other properties when changing type
			const updated: any = { type, ...current };
			// Clean up type-specific properties when switching types
			// Remove enum/pattern if switching away from string (these are string-only)
			if (type !== 'string') {
				delete updated.enum;
				delete updated.pattern;
			}
			// Remove min/max if switching away from number/integer (these are numeric-only)
			if (type !== 'number' && type !== 'integer') {
				delete updated.minimum;
				delete updated.maximum;
			}
			updateSchemaField(fieldName, updated);
		}
	}

	function toggleSchemaFieldRequired(fieldName: string) {
		if (newSchemaRequired.includes(fieldName)) {
			newSchemaRequired = newSchemaRequired.filter((r) => r !== fieldName);
		} else {
			newSchemaRequired = [...newSchemaRequired, fieldName];
		}
	}

	function updateFieldName(oldName: string, newName: string) {
		if (!newName || newName === oldName) return;
		if (newSchemaProperties[newName]) {
			alert('A field with this name already exists');
			return;
		}

		const wasRequired = newSchemaRequired.includes(oldName);
		const fieldData = newSchemaProperties[oldName];
		const oldIndex = fieldOrder.indexOf(oldName);
		
		// Remove old field
		delete newSchemaProperties[oldName];
		fieldOrder = fieldOrder.filter((name) => name !== oldName);
		newSchemaRequired = newSchemaRequired.filter((r) => r !== oldName);
		
		// Add new field in same position
		newSchemaProperties[newName] = fieldData;
		fieldOrder = [
			...fieldOrder.slice(0, oldIndex),
			newName,
			...fieldOrder.slice(oldIndex)
		];
		
		if (wasRequired) {
			newSchemaRequired = [...newSchemaRequired, newName];
		}
		newSchemaProperties = { ...newSchemaProperties };
	}

	function registerNewSchema() {
		try {
			// Validate that pattern is provided
			if (!newSchemaPattern.trim()) {
				alert('Please enter a topic pattern (e.g., app/schema/+)');
				return;
			}
			// Validate that at least one field exists
			if (Object.keys(newSchemaProperties).length === 0) {
				alert('Please add at least one property to the schema');
				return;
			}

			// Validate best practices - check for missing descriptions
			const warnings: string[] = [];
			for (const [fieldName, fieldSchema] of Object.entries(newSchemaProperties)) {
				if (!fieldSchema.description || fieldSchema.description.trim() === '') {
					warnings.push(`Field "${fieldName}" is missing a description (Best Practice #2)`);
				}
			}

			// Warn user but allow them to proceed if they choose
			if (warnings.length > 0) {
				const proceed = confirm(
					`Warning: Some best practices are not followed:\n\n${warnings.join('\n')}\n\nContinue anyway?`
				);
				if (!proceed) return;
			}

			// Register schema with the store (triggers reactivity in other components)
			store.registerSchema(newSchemaPattern.trim(), newSchemaPreview);
			alert(`Schema registered successfully for pattern: ${newSchemaPattern}`);
			// Reset form to allow creating another schema
			newSchemaPattern = 'app/schema/+';
			newSchemaProperties = {};
			newSchemaRequired = [];
			fieldOrder = [];
		} catch (e: any) {
			alert('Error registering schema: ' + (e?.message || String(e)));
			console.error('Schema registration error:', e);
		}
	}

	function loadExampleSchema() {
		newSchemaPattern = 'app/users/+';
		newSchemaProperties = {
			reasoning: {
				type: 'string',
				description:
					'A step-by-step internal monologue explaining why these user profile values were chosen. This helps ensure accuracy and prevents skipping steps.'
			},
			name: {
				type: 'string',
				description: "The user's full name. Must be a non-empty string."
			},
			age: {
				type: 'integer',
				minimum: 18,
				maximum: 120,
				description: "The user's age in years. Must be between 18 and 120."
			},
			skill: {
				type: 'string',
				enum: ['beginner', 'intermediate', 'advanced', 'expert'],
				description: 'The skill level of the user. Must be one of: beginner, intermediate, advanced, or expert.'
			}
		};
		// Note: reasoning is recommended but optional - only require core fields
		// All fields including reasoning should be required (Best Practice #5)
		newSchemaRequired = ['reasoning', 'name', 'age', 'skill'];
		// Set the field order explicitly
		fieldOrder = ['reasoning', 'name', 'age', 'skill'];
	}
</script>

<div class="rounded-md border border-teal-300 bg-teal-50 dark:border-teal-600 dark:bg-teal-900/30 p-4">
	<div class="mb-4 flex items-center justify-between">
		<strong class="block dark:text-teal-200">Schema Builder:</strong>
		<div class="flex gap-2">
			<button
				onclick={loadExampleSchema}
				class="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800"
			>
				Load Example
			</button>
		</div>
	</div>

	<div class="mb-4 space-y-2">
		<div class="block text-sm font-medium dark:text-slate-200">Topic Pattern:</div>
		<input
			type="text"
			bind:value={newSchemaPattern}
			placeholder="e.g., app/schema/+ or app/users/#"
			class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
		/>
		<p class="text-xs text-gray-600 dark:text-gray-300">
			Use <code class="dark:text-teal-300">+</code> for single-level wildcard, <code class="dark:text-teal-300">#</code> for multi-level wildcard
		</p>
	</div>

	<div class="mb-4">
		<div class="mb-2 flex items-center justify-between">
			<div class="block text-sm font-medium dark:text-slate-200">Properties:</div>
			<div class="flex gap-2">
				<button
					onclick={() => addSchemaField(true)}
					class="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
					title="Add reasoning field (best practice for AI)"
				>
					+ Reasoning
				</button>
				<button
					onclick={() => addSchemaField(false)}
					class="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800"
				>
					+ Add Field
				</button>
			</div>
		</div>
		<div class="space-y-3">
			{#each orderedFieldEntries as [fieldName, fieldSchema] (fieldName)}
				<div class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 p-3">
					<div class="mb-2 flex items-center gap-2">
						{#key fieldName}
							<input
								type="text"
								value={fieldName}
								onblur={(e) => {
									const newName = e.currentTarget.value.trim();
									if (newName && newName !== fieldName) {
										updateFieldName(fieldName, newName);
									} else if (!newName || newName === '') {
										// Reset to original if empty
										e.currentTarget.value = fieldName;
									}
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.currentTarget.blur();
									}
								}}
								class="flex-1 rounded border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-sm font-medium"
								placeholder="Field name"
							/>
						{/key}
						<select
							value={fieldSchema.type || 'string'}
							onchange={(e) => updateSchemaFieldType(fieldName, e.currentTarget.value)}
							class="rounded border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-sm"
						>
							<option value="string">string</option>
							<option value="number">number</option>
							<option value="integer">integer</option>
							<option value="boolean">boolean</option>
							<option value="array">array</option>
							<option value="object">object</option>
						</select>
						<label class="flex cursor-pointer items-center gap-1 text-sm dark:text-slate-200">
							<input
								type="checkbox"
								checked={newSchemaRequired.includes(fieldName)}
								onchange={() => toggleSchemaFieldRequired(fieldName)}
								class="cursor-pointer"
							/>
							Required
						</label>
						<button
							onclick={() => removeSchemaField(fieldName)}
							class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
						>
							Remove
						</button>
					</div>

					<!-- Description (Best Practice #2) -->
					<div class="mb-2">
						<div class="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
							Description <span class="text-red-500 dark:text-red-400">*</span>
						</div>
						<textarea
							value={fieldSchema.description || ''}
							oninput={(e) =>
								updateSchemaField(fieldName, { description: e.currentTarget.value })}
							placeholder="Clear instruction explaining what this field represents and any constraints..."
							class="w-full rounded border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs"
							rows="2"
						></textarea>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Write as if giving direct instructions to the AI model
						</p>
					</div>

					<!-- Enum (Best Practice #3) - for string types -->
					{#if fieldSchema.type === 'string'}
						<div class="mb-2">
							<div class="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
								Enum Values (comma-separated)
							</div>
							<input
								type="text"
								value={fieldSchema.enum ? fieldSchema.enum.join(', ') : ''}
								oninput={(e) => {
									const value = e.currentTarget.value.trim();
									if (value) {
										const enumValues = value.split(',').map((v) => v.trim()).filter(Boolean);
										updateSchemaField(fieldName, { enum: enumValues });
									} else {
										const updated = { ...fieldSchema };
										delete updated.enum;
										updateSchemaField(fieldName, updated);
									}
								}}
								placeholder="e.g., low, medium, high, urgent"
								class="w-full rounded border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs"
							/>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								Force the model to pick from a fixed list (prevents synonyms)
							</p>
						</div>

						<!-- Pattern (Best Practice #7) -->
						<div class="mb-2">
							<div class="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">Pattern (Regex)</div>
							<input
								type="text"
								value={fieldSchema.pattern || ''}
								oninput={(e) => {
									const value = e.currentTarget.value.trim();
									if (value) {
										updateSchemaField(fieldName, { pattern: value });
									} else {
										const updated = { ...fieldSchema };
										delete updated.pattern;
										updateSchemaField(fieldName, updated);
									}
								}}
								placeholder="e.g., ^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
								class="w-full rounded border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs font-mono"
							/>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								Regex pattern for format validation (e.g., dates, hex codes, phone numbers)
							</p>
						</div>
					{/if}

					<!-- Minimum/Maximum (for number/integer) -->
					{#if fieldSchema.type === 'number' || fieldSchema.type === 'integer'}
						<div class="mb-2 grid grid-cols-2 gap-2">
							<div>
								<div class="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">Minimum</div>
								<input
									type="number"
									value={fieldSchema.minimum ?? ''}
									oninput={(e) => {
										const value = e.currentTarget.value;
										updateSchemaField(
											fieldName,
											value ? { minimum: Number(value) } : { minimum: undefined }
										);
									}}
									class="w-full rounded border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs"
								/>
							</div>
							<div>
								<div class="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">Maximum</div>
								<input
									type="number"
									value={fieldSchema.maximum ?? ''}
									oninput={(e) => {
										const value = e.currentTarget.value;
										updateSchemaField(
											fieldName,
											value ? { maximum: Number(value) } : { maximum: undefined }
										);
									}}
									class="w-full rounded border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-xs"
								/>
							</div>
						</div>
					{/if}
				</div>
			{/each}
			{#if Object.keys(newSchemaProperties).length === 0}
				<p class="text-sm text-gray-500 dark:text-gray-400">
					No properties yet. Click "+ Reasoning" (best practice) or "+ Add Field" to get started.
				</p>
			{/if}
		</div>
	</div>

	<!-- Best Practices Checklist -->
	<div class="mb-4 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/30 p-3">
		<strong class="mb-2 block text-sm dark:text-amber-200">Best Practices Checklist:</strong>
		<div class="space-y-1 text-xs">
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={newSchemaPreview.additionalProperties === false}
					disabled
					class="cursor-not-allowed"
				/>
				<span class={newSchemaPreview.additionalProperties === false ? 'dark:text-slate-200' : 'text-red-600 dark:text-red-400'}>
					<code class="dark:text-amber-300">additionalProperties: false</code> (Best Practice #4)
				</span>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={Object.keys(newSchemaProperties).length > 0 && newSchemaRequired.length === Object.keys(newSchemaProperties).length}
					disabled
					class="cursor-not-allowed"
				/>
				<span
					class={
						Object.keys(newSchemaProperties).length > 0 &&
						newSchemaRequired.length === Object.keys(newSchemaProperties).length
							? 'dark:text-slate-200'
							: 'text-red-600 dark:text-red-400'
					}
				>
					All fields in <code class="dark:text-amber-300">required</code> array (Best Practice #5)
				</span>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={
						Object.keys(newSchemaProperties).length > 0 &&
						Object.values(newSchemaProperties).every((f: any) => f.description?.trim())
					}
					disabled
					class="cursor-not-allowed"
				/>
				<span
					class={
						Object.keys(newSchemaProperties).length > 0 &&
						Object.values(newSchemaProperties).every((f: any) => f.description?.trim())
							? 'dark:text-slate-200'
							: 'text-red-600 dark:text-red-400'
					}
				>
					Every property has a <code class="dark:text-amber-300">description</code> (Best Practice #2)
				</span>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={newSchemaProperties.reasoning !== undefined}
					disabled
					class="cursor-not-allowed"
				/>
				<span class={newSchemaProperties.reasoning !== undefined ? 'dark:text-slate-200' : 'text-amber-600 dark:text-amber-400'}>
					<code class="dark:text-amber-300">reasoning</code> field included (Best Practice #1 - Recommended, Optional)
				</span>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={
						Object.values(newSchemaProperties).some((f: any) => f.enum && Array.isArray(f.enum))
					}
					disabled
					class="cursor-not-allowed"
				/>
				<span
					class={
						Object.values(newSchemaProperties).some((f: any) => f.enum && Array.isArray(f.enum))
							? 'dark:text-slate-200'
							: 'text-gray-500 dark:text-gray-400'
					}
				>
					<code class="dark:text-amber-300">enum</code> used for limited options (Best Practice #3 - Optional)
				</span>
			</div>
		</div>
	</div>

	<button
		onclick={registerNewSchema}
		class="mb-4 w-full rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800"
	>
		Register Schema to Store
	</button>

	<div class="rounded-md border border-teal-200 bg-teal-100 dark:border-teal-700 dark:bg-teal-900/30 p-3">
		<strong class="mb-2 block text-sm dark:text-teal-200">Schema Preview:</strong>
		<pre class="max-h-48 overflow-auto text-xs dark:text-slate-200">{JSON.stringify(newSchemaPreview, null, 2)}</pre>
	</div>
</div>
