<script lang="ts">
	interface Props {
		onGenerate?: (config: any) => void;
	}

	let { onGenerate }: Props = $props();

	// Main configuration
	let model = $state('gpt-5-nano');
	let schemaName = $state('responseSchema');
	let strict = $state(true);

	// Input messages
	type Message = {
		role: 'system' | 'user';
		content: string;
		id: string;
	};

	let messages = $state<Message[]>([
		{
			role: 'system',
			content: 'Extract the details from the file',
			id: crypto.randomUUID()
		}
	]);

	// Vector store
	let vectorStoreIds = $state<string[]>(['vs_68f27e777d308191bb5c70ad8e5f8ba9']);

	// JSON Schema types
	type PropertyType = 'string' | 'number' | 'boolean' | 'integer' | 'object' | 'array';

	interface SchemaProperty {
		id: string;
		name: string;
		type: PropertyType;
		description?: string;
		required: boolean;
		// For arrays
		itemType?: PropertyType;
		itemProperties?: SchemaProperty[];
		// For objects
		properties?: SchemaProperty[];
	}

	let properties = $state<SchemaProperty[]>([]);

	function addMessage() {
		messages = [
			...messages,
			{
				role: 'user',
				content: '',
				id: crypto.randomUUID()
			}
		];
	}

	function removeMessage(id: string) {
		messages = messages.filter((m) => m.id !== id);
	}

	function addVectorStore() {
		vectorStoreIds = [...vectorStoreIds, 'vs_68f27e777d308191bb5c70ad8e5f8ba9'];
	}

	function removeVectorStore(index: number) {
		vectorStoreIds = vectorStoreIds.filter((_, i) => i !== index);
	}

	function addProperty(parentProperties?: SchemaProperty[]) {
		const newProperty: SchemaProperty = {
			id: crypto.randomUUID(),
			name: '',
			type: 'string',
			required: false
		};

		if (parentProperties) {
			parentProperties.push(newProperty);
			properties = properties; // Trigger reactivity
		} else {
			properties = [...properties, newProperty];
		}
	}

	function removeProperty(id: string, parentProperties?: SchemaProperty[]) {
		if (parentProperties) {
			const index = parentProperties.findIndex((p) => p.id === id);
			if (index !== -1) {
				parentProperties.splice(index, 1);
				properties = properties; // Trigger reactivity
			}
		} else {
			properties = properties.filter((p) => p.id !== id);
		}
	}

	function handleTypeChange(property: SchemaProperty) {
		if (property.type === 'object') {
			property.properties = property.properties || [];
		} else {
			delete property.properties;
		}

		if (property.type === 'array') {
			property.itemType = property.itemType || 'string';
			if (property.itemType === 'object') {
				property.itemProperties = property.itemProperties || [];
			}
		} else {
			delete property.itemType;
			delete property.itemProperties;
		}

		properties = properties; // Trigger reactivity
	}

	function handleArrayItemTypeChange(property: SchemaProperty) {
		if (property.itemType === 'object') {
			property.itemProperties = property.itemProperties || [];
		} else {
			delete property.itemProperties;
		}
		properties = properties; // Trigger reactivity
	}

	function buildJsonSchema(props: SchemaProperty[]): any {
		const schema: any = {
			type: 'object',
			properties: {},
			required: [] as string[],
			additionalProperties: false
		};

		for (const prop of props) {
			if (!prop.name) continue;

			if (prop.type === 'object' && prop.properties) {
				schema.properties[prop.name] = buildJsonSchema(prop.properties);
			} else if (prop.type === 'array') {
				schema.properties[prop.name] = {
					type: 'array',
					items:
						prop.itemType === 'object' && prop.itemProperties
							? buildJsonSchema(prop.itemProperties)
							: { type: prop.itemType || 'string' }
				};
			} else {
				schema.properties[prop.name] = {
					type: prop.type
				};
				if (prop.description) {
					schema.properties[prop.name].description = prop.description;
				}
			}

			if (prop.required) {
				schema.required.push(prop.name);
			}
		}

		if (schema.required.length === 0) {
			delete schema.required;
		}

		return schema;
	}

	function generateOutput() {
		const output = {
			model,
			input: messages.map((m) => ({
				role: m.role,
				content: m.content
			})),
			tools: [
				{
					type: 'file_search',
					vector_store_ids: vectorStoreIds.filter((id) => id.trim() !== '')
				}
			],
			tool_choice: 'auto',
			text: {
				format: {
					type: 'json_schema',
					name: schemaName,
					strict,
					schema: {
						...buildJsonSchema(properties),
						$schema: 'http://json-schema.org/draft-07/schema#'
					}
				}
			}
		};

		onGenerate?.(output);
		return output;
	}

	let outputJson = $state('');
	let showOutput = $state(false);

	function preview() {
		const output = generateOutput();
		outputJson = JSON.stringify(output, null, 2);
		showOutput = true;
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(outputJson);
	}
</script>

<div class="openai-responses-builder">
	<h2>OpenAI Responses Parse API Builder</h2>

	<!-- Model Selection -->
	<section class="section">
		<h3>Model</h3>
		<select bind:value={model} class="input">
			<option value="gpt-4o">gpt-4o</option>
			<option value="gpt-4o-mini">gpt-4o-mini</option>
			<option value="gpt-4-turbo">gpt-4-turbo</option>
			<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
			<option value="gpt-5-nano">gpt-5-nano</option>
		</select>
	</section>

	<!-- Input Messages -->
	<section class="section">
		<h3>Input Messages</h3>
		{#each messages as message (message.id)}
			<div class="message-item">
				<select bind:value={message.role} class="input input-small">
					<option value="system">System</option>
					<option value="user">User</option>
				</select>
				<textarea
					bind:value={message.content}
					placeholder="Message content..."
					class="input textarea"
					rows="2"
				></textarea>
				<button type="button" onclick={() => removeMessage(message.id)} class="btn btn-danger">
					Remove
				</button>
			</div>
		{/each}
		<button type="button" onclick={addMessage} class="btn btn-secondary">Add Message</button>
	</section>

	<!-- Vector Store IDs -->
	<section class="section">
		<h3>Vector Store IDs</h3>
		{#each vectorStoreIds as vectorStoreId, index (index)}
			<div class="vector-store-item">
				<input
					type="text"
					bind:value={vectorStoreIds[index]}
					placeholder="vs_..."
					class="input"
					onfocus={() => {
						if (vectorStoreIds[index] === '') {
							vectorStoreIds[index] = 'vs_68f27e777d308191bb5c70ad8e5f8ba9';
						}
					}}
				/>
				{#if vectorStoreIds.length > 1}
					<button
						type="button"
						onclick={() => removeVectorStore(index)}
						class="btn btn-danger btn-small"
					>
						Remove
					</button>
				{/if}
			</div>
		{/each}
		<button type="button" onclick={addVectorStore} class="btn btn-secondary">
			Add Vector Store
		</button>
	</section>

	<!-- Schema Configuration -->
	<section class="section">
		<h3>Schema Configuration</h3>
		<div class="schema-config">
			<label>
				Schema Name:
				<input type="text" bind:value={schemaName} class="input" />
			</label>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={strict} />
				Strict Mode
			</label>
		</div>
	</section>

	<!-- JSON Schema Properties -->
	<section class="section schema-builder">
		<h3>JSON Schema Properties</h3>
		<div class="properties-container">
			{#each properties as property (property.id)}
				<div class="property-item">
					<div class="property-header">
						<input
							type="text"
							bind:value={property.name}
							placeholder="Property name"
							class="input input-name"
						/>
						<select
							bind:value={property.type}
							onchange={() => handleTypeChange(property)}
							class="input input-small"
						>
							<option value="string">String</option>
							<option value="number">Number</option>
							<option value="integer">Integer</option>
							<option value="boolean">Boolean</option>
							<option value="object">Object</option>
							<option value="array">Array</option>
						</select>
						<label class="checkbox-label">
							<input type="checkbox" bind:checked={property.required} />
							Required
						</label>
						<button
							type="button"
							onclick={() => removeProperty(property.id)}
							class="btn btn-danger btn-small"
						>
							Remove
						</button>
					</div>

					<div class="property-description">
						<input
							type="text"
							bind:value={property.description}
							placeholder="Description (optional)"
							class="input input-full"
						/>
					</div>

					{#if property.type === 'array'}
						<div class="nested-config">
							<label>
								Array Item Type:
								<select
									bind:value={property.itemType}
									onchange={() => handleArrayItemTypeChange(property)}
									class="input input-small"
								>
									<option value="string">String</option>
									<option value="number">Number</option>
									<option value="integer">Integer</option>
									<option value="boolean">Boolean</option>
									<option value="object">Object</option>
								</select>
							</label>

							{#if property.itemType === 'object' && property.itemProperties}
								<div class="nested-properties">
									<h4>Array Item Properties:</h4>
									{#each property.itemProperties as itemProp (itemProp.id)}
										<div class="property-item nested">
											<div class="property-header">
												<input
													type="text"
													bind:value={itemProp.name}
													placeholder="Property name"
													class="input input-name"
												/>
												<select bind:value={itemProp.type} class="input input-small">
													<option value="string">String</option>
													<option value="number">Number</option>
													<option value="integer">Integer</option>
													<option value="boolean">Boolean</option>
												</select>
												<label class="checkbox-label">
													<input type="checkbox" bind:checked={itemProp.required} />
													Required
												</label>
												<button
													type="button"
													onclick={() => removeProperty(itemProp.id, property.itemProperties)}
													class="btn btn-danger btn-small"
												>
													Remove
												</button>
											</div>
										</div>
									{/each}
									<button
										type="button"
										onclick={() => addProperty(property.itemProperties)}
										class="btn btn-secondary btn-small"
									>
										Add Item Property
									</button>
								</div>
							{/if}
						</div>
					{/if}

					{#if property.type === 'object' && property.properties}
						<div class="nested-properties">
							<h4>Nested Properties:</h4>
							{#each property.properties as nestedProp (nestedProp.id)}
								<div class="property-item nested">
									<div class="property-header">
										<input
											type="text"
											bind:value={nestedProp.name}
											placeholder="Property name"
											class="input input-name"
										/>
										<select bind:value={nestedProp.type} class="input input-small">
											<option value="string">String</option>
											<option value="number">Number</option>
											<option value="integer">Integer</option>
											<option value="boolean">Boolean</option>
										</select>
										<label class="checkbox-label">
											<input type="checkbox" bind:checked={nestedProp.required} />
											Required
										</label>
										<button
											type="button"
											onclick={() => removeProperty(nestedProp.id, property.properties)}
											class="btn btn-danger btn-small"
										>
											Remove
										</button>
									</div>
								</div>
							{/each}
							<button
								type="button"
								onclick={() => addProperty(property.properties)}
								class="btn btn-secondary btn-small"
							>
								Add Nested Property
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<button type="button" onclick={() => addProperty()} class="btn btn-primary">
			Add Property
		</button>
	</section>

	<!-- Actions -->
	<section class="section actions">
		<button type="button" onclick={preview} class="btn btn-primary">Preview JSON</button>
		<button type="button" onclick={generateOutput} class="btn btn-success">Generate</button>
	</section>

	<!-- Output Preview -->
	{#if showOutput}
		<section class="section output-section">
			<div class="output-header">
				<h3>Generated JSON</h3>
				<button type="button" onclick={copyToClipboard} class="btn btn-secondary btn-small">
					Copy to Clipboard
				</button>
			</div>
			<pre class="output-preview">{outputJson}</pre>
		</section>
	{/if}
</div>

<style>
	.openai-responses-builder {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h2 {
		font-size: 1.8rem;
		margin-bottom: 2rem;
		color: #1a1a1a;
	}

	h3 {
		font-size: 1.3rem;
		margin-bottom: 1rem;
		color: #2d3748;
	}

	h4 {
		font-size: 1rem;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		color: #4a5568;
	}

	.section {
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: #f7fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	.schema-builder {
		background: #fff;
		border: 2px solid #4299e1;
	}

	.input {
		padding: 0.5rem;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.95rem;
		width: 100%;
		font-family: inherit;
	}

	.input:focus {
		outline: none;
		border-color: #4299e1;
		box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
	}

	.input-small {
		width: auto;
		min-width: 120px;
	}

	.input-name {
		flex: 1;
		min-width: 200px;
	}

	.input-full {
		width: 100%;
	}

	.textarea {
		font-family: inherit;
		resize: vertical;
	}

	.message-item {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		align-items: flex-start;
	}

	.vector-store-item {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		align-items: center;
	}

	.schema-config {
		display: flex;
		gap: 2rem;
		align-items: center;
	}

	.schema-config label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		white-space: nowrap;
		font-size: 0.9rem;
		padding: 0.25rem 0.5rem;
		background: #edf2f7;
		border-radius: 4px;
		border: 1px solid #cbd5e0;
		transition: background 0.2s;
	}

	.checkbox-label:hover {
		background: #e2e8f0;
	}

	.checkbox-label input[type='checkbox'] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		margin: 0;
	}

	.properties-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.property-item {
		padding: 1rem;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
	}

	.property-item.nested {
		background: #f7fafc;
		margin-left: 1rem;
	}

	.property-header {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.property-description {
		margin-top: 0.75rem;
	}

	.nested-config {
		margin-top: 1rem;
		padding: 1rem;
		background: #edf2f7;
		border-radius: 4px;
	}

	.nested-properties {
		margin-top: 1rem;
		padding: 1rem;
		background: #edf2f7;
		border-radius: 4px;
	}

	.nested-properties .property-item {
		margin-bottom: 0.5rem;
	}

	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 500;
	}

	.btn-small {
		padding: 0.25rem 0.75rem;
		font-size: 0.85rem;
	}

	.btn-primary {
		background: #4299e1;
		color: white;
	}

	.btn-primary:hover {
		background: #3182ce;
	}

	.btn-secondary {
		background: #718096;
		color: white;
	}

	.btn-secondary:hover {
		background: #4a5568;
	}

	.btn-success {
		background: #48bb78;
		color: white;
	}

	.btn-success:hover {
		background: #38a169;
	}

	.btn-danger {
		background: #f56565;
		color: white;
	}

	.btn-danger:hover {
		background: #e53e3e;
	}

	.actions {
		display: flex;
		gap: 1rem;
	}

	.output-section {
		background: #1a202c;
		color: #e2e8f0;
	}

	.output-section h3 {
		color: #e2e8f0;
	}

	.output-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.output-preview {
		background: #2d3748;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.9rem;
		line-height: 1.5;
		color: #e2e8f0;
	}
</style>

