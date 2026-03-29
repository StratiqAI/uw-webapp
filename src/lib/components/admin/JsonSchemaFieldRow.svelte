<script lang="ts">
	import type { JsonSchemaDefinition } from '$lib/types/models';
	import JsonSchemaFieldRowRecursive from './JsonSchemaFieldRow.svelte';

	interface Props {
		fieldName: string;
		fieldSchema: JsonSchemaDefinition;
		required: boolean;
		darkMode?: boolean;
		/** When false, the Required checkbox is hidden and the field is always treated as required. */
		showRequiredCheckbox?: boolean;
		/** When true, the description field is always shown and marked required. */
		descriptionRequired?: boolean;
		onUpdate: (name: string, schema: JsonSchemaDefinition, isRequired: boolean) => void;
		onRemove: () => void;
	}

	let { fieldName, fieldSchema, required, darkMode = false, showRequiredCheckbox = true, descriptionRequired = false, onUpdate, onRemove }: Props = $props();

	const types: Array<JsonSchemaDefinition['type']> = ['string', 'number', 'integer', 'boolean', 'object', 'array'];

	let localName = $state('');
	let localType = $state<JsonSchemaDefinition['type']>('string');
	let localRequired = $state(false);
	let localDescription = $state('');
	let localEnum = $state('');
	let localMin = $state<number | undefined>(undefined);
	let localMax = $state<number | undefined>(undefined);
	let localFormat = $state('');

	$effect(() => {
		localName = fieldName;
		localType = fieldSchema.type;
		localRequired = required;
		localDescription = fieldSchema.description || '';
		localEnum = fieldSchema.enum?.join(', ') || '';
		localMin = fieldSchema.minimum;
		localMax = fieldSchema.maximum;
		localFormat = fieldSchema.format || '';
	});

	// Sync changes back to parent
	function updateSchema() {
		const updatedSchema: JsonSchemaDefinition = {
			type: localType,
			description: localDescription || undefined
		};

		// Add type-specific properties
		if (localType === 'string') {
			if (localEnum) {
				updatedSchema.enum = localEnum.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
			}
			if (localFormat) {
				updatedSchema.format = localFormat;
			}
		}

		if (localType === 'number' || localType === 'integer') {
			if (localMin !== undefined && localMin !== null) {
				updatedSchema.minimum = localMin;
			}
			if (localMax !== undefined && localMax !== null) {
				updatedSchema.maximum = localMax;
			}
		}

		// Handle nested structures
		if (localType === 'object' && fieldSchema.properties) {
			updatedSchema.properties = fieldSchema.properties;
			updatedSchema.required = fieldSchema.required;
		}

		if (localType === 'array' && fieldSchema.items) {
			updatedSchema.items = fieldSchema.items;
		}

		onUpdate(localName, updatedSchema, showRequiredCheckbox ? localRequired : true);
	}

	// Watch for changes
	$effect(() => {
		updateSchema();
	});

	function addSubProperty() {
		if (!fieldSchema.properties) {
			fieldSchema.properties = {};
		}
		const subName = `sub_${Object.keys(fieldSchema.properties).length + 1}`;
		fieldSchema.properties[subName] = { type: 'string' };
		if (!fieldSchema.required) {
			fieldSchema.required = [];
		}
		fieldSchema.required.push(subName);
		updateSchema();
	}

	function removeSubProperty(name: string) {
		if (fieldSchema.properties) {
			delete fieldSchema.properties[name];
		}
		if (fieldSchema.required) {
			fieldSchema.required = fieldSchema.required.filter((r) => r !== name);
		}
		updateSchema();
	}

	function setArrayItemType(itemType: JsonSchemaDefinition['type']) {
		fieldSchema.items = { type: itemType };
		updateSchema();
	}

	function addArrayItemProperty() {
		if (!fieldSchema.items) {
			fieldSchema.items = { type: 'object', properties: {}, required: [] };
		}
		if (fieldSchema.items.type === 'object' && !fieldSchema.items.properties) {
			fieldSchema.items.properties = {};
			fieldSchema.items.required = [];
		}
		if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
			const propName = `item_${Object.keys(fieldSchema.items.properties).length + 1}`;
			fieldSchema.items.properties[propName] = { type: 'string' };
			if (fieldSchema.items.required) {
				fieldSchema.items.required.push(propName);
			}
		}
		updateSchema();
	}
</script>

<div
	class="border-l-2 pl-4 my-3 {darkMode ? 'border-slate-600' : 'border-slate-300'}"
>
	<div class="flex gap-2 items-center flex-wrap">
		<input
			bind:value={localName}
			placeholder="Property Name"
			class="flex-1 min-w-[120px] rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
				? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
				: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
		/>

		<select
			bind:value={localType}
			class="rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
				? 'bg-slate-700 border-slate-600 text-white'
				: 'bg-white border-slate-300 text-slate-900'}"
		>
			{#each types as t}
				<option value={t}>{t}</option>
			{/each}
		</select>

		{#if showRequiredCheckbox}
			<label class="flex gap-1.5 items-center cursor-pointer">
				<input
					type="checkbox"
					bind:checked={localRequired}
					class="h-4 w-4 rounded {darkMode ? 'text-indigo-500' : 'text-indigo-600'} focus:ring-indigo-500"
				/>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">Required</span>
			</label>
		{/if}

		{#if localType === 'string' && !localEnum}
			<select
				bind:value={localFormat}
				class="rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
					? 'bg-slate-700 border-slate-600 text-white'
					: 'bg-white border-slate-300 text-slate-900'}"
			>
				<option value="">No format</option>
				<option value="date-time">Date-Time</option>
				<option value="email">Email</option>
				<option value="uri">URI</option>
			</select>
		{/if}

		{#if localType === 'string'}
			<div class="flex gap-1.5 items-center">
				<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">Enum:</span>
				<input
					bind:value={localEnum}
					placeholder="comma,separated,values"
					class="min-w-[150px] rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				/>
			</div>
		{/if}

		{#if localType === 'number' || localType === 'integer'}
			<div class="flex gap-1.5 items-center">
				<input
					type="number"
					bind:value={localMin}
					placeholder="Min"
					class="w-20 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				/>
				<input
					type="number"
					bind:value={localMax}
					placeholder="Max"
					class="w-20 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				/>
			</div>
		{/if}

		{#if localType === 'object'}
			<button
				onclick={addSubProperty}
				class="px-2 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
			>
				+ Sub-property
			</button>
		{/if}

		{#if localType === 'array'}
			<button
				onclick={() => {
					if (!fieldSchema.items) {
						setArrayItemType('string');
					} else if (fieldSchema.items.type === 'object') {
						addArrayItemProperty();
					}
				}}
				class="px-2 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
			>
				+ Item {fieldSchema.items?.type === 'object' ? 'Property' : 'Type'}
			</button>
		{/if}

		<button
			onclick={onRemove}
			class="px-2 py-1 text-xs font-medium {darkMode
				? 'bg-red-900/50 hover:bg-red-800 text-red-200'
				: 'bg-red-100 hover:bg-red-200 text-red-700'} rounded-md transition-colors"
		>
			Remove
		</button>
	</div>

	{#if descriptionRequired || localDescription !== undefined}
		<div class="mt-2">
			<span class="block text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1">
				Description{descriptionRequired ? ' (required)' : ''}
			</span>
			<input
				bind:value={localDescription}
				required={descriptionRequired}
				placeholder={descriptionRequired ? 'Describe this property for the AI' : 'Description (optional)'}
				class="w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
					? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
					: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
			/>
		</div>
	{:else}
		<button
			onclick={() => {
				localDescription = '';
			}}
			class="text-xs {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600'} mt-1 transition-colors"
		>
			+ Add description
		</button>
	{/if}

	<!-- Recursive Rendering for Objects -->
	{#if localType === 'object' && fieldSchema.properties}
		<div class="mt-3 space-y-3">
			{#each Object.entries(fieldSchema.properties) as [subName, subSchema]}
				<div class="relative">
					<JsonSchemaFieldRowRecursive
						fieldName={subName}
						fieldSchema={subSchema}
						required={fieldSchema.required?.includes(subName) || false}
						showRequiredCheckbox={showRequiredCheckbox}
						descriptionRequired={descriptionRequired}
						onUpdate={(name, updatedSchema, isRequired) => {
							if (name !== subName && fieldSchema.properties) {
								delete fieldSchema.properties[subName];
								fieldSchema.properties[name] = updatedSchema;
							} else if (fieldSchema.properties) {
								fieldSchema.properties[subName] = updatedSchema;
							}

							if (!fieldSchema.required) {
								fieldSchema.required = [];
							}
							if (isRequired && !fieldSchema.required.includes(name)) {
								fieldSchema.required.push(name);
							} else if (!isRequired) {
								fieldSchema.required = fieldSchema.required.filter((r) => r !== name);
							}
							updateSchema();
						}}
						onRemove={() => removeSubProperty(subName)}
						{darkMode}
					/>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Array Item Type Selection -->
	{#if localType === 'array'}
		<div class="ml-4 mt-3">
			<div class="text-sm mb-2 {darkMode ? 'text-slate-400' : 'text-slate-500'}">Array Item Type:</div>
			<select
				value={fieldSchema.items?.type || 'string'}
				onchange={(e) => {
					const itemType = (e.target as HTMLSelectElement).value as JsonSchemaDefinition['type'];
					setArrayItemType(itemType);
				}}
				class="mb-3 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
					? 'bg-slate-700 border-slate-600 text-white'
					: 'bg-white border-slate-300 text-slate-900'}"
			>
				{#each types as t}
					<option value={t}>{t}</option>
				{/each}
			</select>

			{#if fieldSchema.items?.type === 'object' && fieldSchema.items.properties}
				<div class="space-y-3">
					{#each Object.entries(fieldSchema.items.properties) as [itemPropName, itemPropSchema]}
						<div class="relative">
							<JsonSchemaFieldRowRecursive
								fieldName={itemPropName}
								fieldSchema={itemPropSchema}
								required={fieldSchema.items.required?.includes(itemPropName) || false}
								showRequiredCheckbox={showRequiredCheckbox}
								descriptionRequired={descriptionRequired}
								onUpdate={(name, updatedSchema, isRequired) => {
									if (!fieldSchema.items || fieldSchema.items.type !== 'object') return;
									if (name !== itemPropName && fieldSchema.items.properties) {
										delete fieldSchema.items.properties[itemPropName];
										fieldSchema.items.properties[name] = updatedSchema;
									} else if (fieldSchema.items.properties) {
										fieldSchema.items.properties[itemPropName] = updatedSchema;
									}

									if (!fieldSchema.items.required) {
										fieldSchema.items.required = [];
									}
									if (isRequired && !fieldSchema.items.required.includes(name)) {
										fieldSchema.items.required.push(name);
									} else if (!isRequired) {
										fieldSchema.items.required = fieldSchema.items.required.filter((r) => r !== name);
									}
									updateSchema();
								}}
								onRemove={() => {
									if (fieldSchema.items?.type === 'object' && fieldSchema.items.properties) {
										delete fieldSchema.items.properties[itemPropName];
									}
									if (fieldSchema.items?.required) {
										fieldSchema.items.required = fieldSchema.items.required.filter((r) => r !== itemPropName);
									}
									updateSchema();
								}}
								{darkMode}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

