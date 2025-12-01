<script lang="ts">
	import type { JsonSchemaDefinition } from '$lib/types/models';

	interface Props {
		fieldName: string;
		fieldSchema: JsonSchemaDefinition;
		value: unknown;
		required: boolean;
		darkMode?: boolean;
		onChange: (value: unknown) => void;
	}

	let { fieldName, fieldSchema, value, required, darkMode = false, onChange }: Props = $props();

	// Resolve anyOf/oneOf/allOf/array type to get the actual schema type
	function resolveSchemaType(schema: JsonSchemaDefinition): JsonSchemaDefinition {
		// Handle type as array (e.g., ["string", "null"]) - extract the non-null type
		if (Array.isArray(schema.type)) {
			const nonNullType = schema.type.find(t => t !== 'null');
			if (nonNullType) {
				return { ...schema, type: nonNullType as JsonSchemaDefinition['type'] };
			}
		}
		// Handle anyOf (e.g., string | null) - extract the non-null type
		if (schema.anyOf && schema.anyOf.length > 0) {
			const nonNullSchema = schema.anyOf.find(s => s.type !== 'null' && s.type);
			if (nonNullSchema) {
				return { ...nonNullSchema, description: schema.description || nonNullSchema.description };
			}
		}
		// Handle oneOf
		if (schema.oneOf && schema.oneOf.length > 0) {
			return resolveSchemaType(schema.oneOf[0]);
		}
		// Handle allOf - merge all schemas
		if (schema.allOf && schema.allOf.length > 0) {
			const merged = { ...schema };
			schema.allOf.forEach(s => {
				Object.assign(merged, s);
			});
			return merged;
		}
		return schema;
	}

	// Get the resolved schema - use $derived.by to avoid issues
	const resolvedSchema = $derived.by(() => resolveSchemaType(fieldSchema));

	// Handle different input types
	function handleInputChange(newValue: unknown) {
		onChange(newValue);
	}

	// For enum types
	let enumValue = $state<string>(String(value || ''));

	// For number types - initialize with default, will be synced in effect
	let numberValue = $state<number>(typeof value === 'number' ? value : 0);

	// For boolean types
	let booleanValue = $state<boolean>(typeof value === 'boolean' ? value : false);

	// For string types
	let stringValue = $state<string>(String(value || ''));

	// For array types (simple arrays of primitives)
	let arrayValue = $state<string>(Array.isArray(value) ? JSON.stringify(value) : '[]');

	// Sync state with value prop
	$effect(() => {
		const schema = resolvedSchema;
		if (!schema || !schema.type) return;
		
		if (schema.type === 'string' || schema.type === 'integer') {
			if (schema.enum) {
				enumValue = String(value || '');
			} else {
				stringValue = String(value || '');
			}
		} else if (schema.type === 'number') {
			numberValue = typeof value === 'number' ? value : (schema.minimum !== undefined ? schema.minimum : 0);
		} else if (schema.type === 'boolean') {
			booleanValue = typeof value === 'boolean' ? value : false;
		} else if (schema.type === 'array' && schema.items?.type !== 'object') {
			arrayValue = Array.isArray(value) ? JSON.stringify(value) : '[]';
		}
	});

	// Handle value changes
	function updateValue(newValue: unknown) {
		onChange(newValue);
	}
</script>

<div class="space-y-2">
	<label class="block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">
		{fieldName}
		{#if required}
			<span class="text-red-500 ml-1">*</span>
		{/if}
		{#if fieldSchema.description}
			<span class="text-xs font-normal {darkMode ? 'text-slate-400' : 'text-slate-500'} ml-2">
				({fieldSchema.description})
			</span>
		{/if}
	</label>

	<!-- String Input -->
	{#if resolvedSchema.type === 'string' && !resolvedSchema.enum}
		{#if resolvedSchema.format === 'date-time'}
			<input
				type="datetime-local"
				bind:value={stringValue}
				oninput={() => updateValue(stringValue)}
				class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
					? 'bg-slate-700 border-slate-600 text-white'
					: 'bg-white border-slate-300 text-slate-900'}"
			/>
		{:else}
			<input
				type="text"
				bind:value={stringValue}
				oninput={() => updateValue(stringValue)}
				class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
					? 'bg-slate-700 border-slate-600 text-white'
					: 'bg-white border-slate-300 text-slate-900'}"
			/>
		{/if}

		<!-- Enum Select -->
	{:else if resolvedSchema.type === 'string' && resolvedSchema.enum}
		<select
			bind:value={enumValue}
			onchange={() => updateValue(enumValue)}
			class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
				? 'bg-slate-700 border-slate-600 text-white'
				: 'bg-white border-slate-300 text-slate-900'}"
		>
			<option value="">-- Select --</option>
			{#each resolvedSchema.enum as option}
				<option value={option}>{option}</option>
			{/each}
		</select>

		<!-- Number Input -->
	{:else if resolvedSchema.type === 'number' || resolvedSchema.type === 'integer'}
		<input
			type="number"
			bind:value={numberValue}
			oninput={() => updateValue(numberValue)}
			min={resolvedSchema.minimum}
			max={resolvedSchema.maximum}
			step={resolvedSchema.type === 'integer' ? 1 : undefined}
			class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
				? 'bg-slate-700 border-slate-600 text-white'
				: 'bg-white border-slate-300 text-slate-900'}"
		/>

		<!-- Boolean Checkbox -->
	{:else if resolvedSchema.type === 'boolean'}
		<label class="flex items-center gap-2 cursor-pointer">
			<input
				type="checkbox"
				bind:checked={booleanValue}
				onchange={() => updateValue(booleanValue)}
				class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
			/>
			<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
				{booleanValue ? 'Yes' : 'No'}
			</span>
		</label>

		<!-- Array Input (for primitive arrays) -->
	{:else if resolvedSchema.type === 'array' && resolvedSchema.items?.type !== 'object'}
		<textarea
			bind:value={arrayValue}
			oninput={() => {
				try {
					const parsed = JSON.parse(arrayValue);
					if (Array.isArray(parsed)) {
						updateValue(parsed);
					}
				} catch {
					// Invalid JSON, ignore
				}
			}}
			placeholder="Enter JSON array, e.g., [1, 2, 3]"
			class="w-full rounded-md border px-3 py-2 font-mono text-sm h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
				? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
				: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
		></textarea>
		<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			Array of {resolvedSchema.items?.type || 'any'}
		</p>

		<!-- Object Input (nested) -->
	{:else if resolvedSchema.type === 'object' && resolvedSchema.properties}
		<div
			class="ml-4 p-3 rounded-md border {darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-50 border-slate-200'}"
		>
			{#each Object.entries(resolvedSchema.properties) as [propName, propSchema]}
				{@const propValue = (value as Record<string, unknown>)?.[propName]}
				{@const isRequired = resolvedSchema.required?.includes(propName) || false}
				<div class="mb-3">
					<svelte:self
						fieldName={propName}
						fieldSchema={propSchema}
						value={propValue}
						required={isRequired}
						{darkMode}
						onChange={(newValue) => {
							const obj = (value as Record<string, unknown>) || {};
							obj[propName] = newValue;
							updateValue(obj);
						}}
					/>
				</div>
			{/each}
		</div>

		<!-- Array of Objects -->
	{:else if resolvedSchema.type === 'array' && resolvedSchema.items?.type === 'object'}
		{@const arrayItems = Array.isArray(value) ? value : []}
		<div
			class="ml-4 p-3 rounded-md border {darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-50 border-slate-200'}"
		>
			{#each arrayItems as item, index}
				<div class="mb-4 p-3 rounded border {darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}">
					<div class="flex items-center justify-between mb-2">
						<span class="text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
							Item {index + 1}
						</span>
						<button
							onclick={() => {
								const newArray = [...arrayItems];
								newArray.splice(index, 1);
								updateValue(newArray);
							}}
							class="text-xs px-2 py-1 {darkMode
								? 'bg-red-900/50 hover:bg-red-800 text-red-200'
								: 'bg-red-100 hover:bg-red-200 text-red-700'} rounded transition-colors"
						>
							Remove
						</button>
					</div>
					{#if resolvedSchema.items.properties}
						{#each Object.entries(resolvedSchema.items.properties) as [propName, propSchema]}
							{@const propValue = (item as Record<string, unknown>)?.[propName]}
							{@const isRequired = resolvedSchema.items.required?.includes(propName) || false}
							<div class="mb-2">
								<svelte:self
									fieldName={propName}
									fieldSchema={propSchema}
									value={propValue}
									required={isRequired}
									{darkMode}
									onChange={(newValue) => {
										const newArray = [...arrayItems];
										newArray[index] = { ...(item as Record<string, unknown>), [propName]: newValue };
										updateValue(newArray);
									}}
								/>
							</div>
						{/each}
					{/if}
				</div>
			{/each}
			<button
				onclick={() => {
					const newArray = [...arrayItems];
					const newItem: Record<string, unknown> = {};
					if (resolvedSchema.items.properties) {
						for (const [propName, propSchema] of Object.entries(resolvedSchema.items.properties)) {
							if (resolvedSchema.items.required?.includes(propName)) {
								// Initialize with default value
								if (propSchema.type === 'string') {
									newItem[propName] = '';
								} else if (propSchema.type === 'number' || propSchema.type === 'integer') {
									newItem[propName] = 0;
								} else if (propSchema.type === 'boolean') {
									newItem[propName] = false;
								}
							}
						}
					}
					newArray.push(newItem);
					updateValue(newArray);
				}}
				class="w-full text-xs px-3 py-2 {darkMode
					? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
					: 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded transition-colors border border-dashed {darkMode
					? 'border-slate-600'
					: 'border-slate-300'}"
			>
				+ Add Item
			</button>
		</div>
	{/if}
</div>

