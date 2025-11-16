<script lang="ts">
	interface Props {
		onGenerate?: (config: any) => void;
	}

	let { onGenerate }: Props = $props();

	const STORAGE_KEY = 'openai-responses-builder-state';

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

	type Message = {
		role: 'system' | 'user';
		content: string;
		id: string;
	};

	interface SavedState {
		model: string;
		schemaName: string;
		strict: boolean;
		messages: Message[];
		vectorStoreIds: string[];
		properties: SchemaProperty[];
	}

	// Load state from localStorage
	function loadState(): SavedState | null {
		if (typeof window === 'undefined') return null;
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				return JSON.parse(saved);
			}
		} catch (error) {
			console.error('Failed to load state from localStorage:', error);
		}
		return null;
	}

	// Save state to localStorage
	function saveState(state: SavedState) {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (error) {
			console.error('Failed to save state to localStorage:', error);
		}
	}

	// Initialize state with saved values or defaults
	const savedState = loadState();

	// Main configuration
	let model = $state(savedState?.model || 'gpt-5-nano');
	let schemaName = $state(savedState?.schemaName || 'responseSchema');
	let strict = $state(savedState?.strict ?? true);

	// Input messages
	let messages = $state<Message[]>(
		savedState?.messages || [
			{
				role: 'system',
				content: 'Extract the details from the file',
				id: crypto.randomUUID()
			}
		]
	);

	// Vector store
	let vectorStoreIds = $state<string[]>(
		savedState?.vectorStoreIds || ['vs_6918d2ecf0f48191af572585f63ab54a']
	);

	let properties = $state<SchemaProperty[]>(savedState?.properties || []);

	// Save state whenever it changes
	$effect(() => {
		saveState({
			model,
			schemaName,
			strict,
			messages,
			vectorStoreIds,
			properties
		});
	});

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
		vectorStoreIds = [...vectorStoreIds, 'vs_6918d2ecf0f48191af572585f63ab54a'];
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

	function buildOutput() {
		return {
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
	}

	function generateOutput() {
		const output = buildOutput();
		onGenerate?.(output);
		return output;
	}

	// Auto-update JSON preview reactively
	let outputJson = $derived.by(() => {
		const output = buildOutput();
		return JSON.stringify(output, null, 2);
	});

	function copyToClipboard() {
		navigator.clipboard.writeText(outputJson);
	}

	// API submission state
	let isSubmitting = $state(false);
	let apiResult = $state<any>(null);
	let apiError = $state<string | null>(null);

	async function submitToAPI() {
		isSubmitting = true;
		apiError = null;
		apiResult = null;

		try {
			const config = buildOutput();
			const response = await fetch('/api/openai-responses', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(config)
			});

			const result = await response.json();

			if (!response.ok) {
				apiError = result.error || 'Failed to submit to OpenAI API';
				if (result.details) {
					apiError += `: ${JSON.stringify(result.details)}`;
				}
			} else {
				apiResult = result.data;
				onGenerate?.(config);
			}
		} catch (error) {
			apiError = error instanceof Error ? error.message : 'An unexpected error occurred';
		} finally {
			isSubmitting = false;
		}
	}

	function copyResultToClipboard() {
		if (apiResult) {
			navigator.clipboard.writeText(JSON.stringify(apiResult, null, 2));
		}
	}
</script>

<div class="flex h-full w-full flex-col bg-white font-sans">
	<!-- Header -->
	<div class="bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-6 text-white">
		<h2 class="m-0 text-2xl font-semibold tracking-tight text-white">
			OpenAI Responses Parse API Builder
		</h2>
	</div>

	<!-- Main Content Container -->
	<div class="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden bg-slate-50 lg:grid-cols-2">
		<!-- Left Column: Inputs -->
		<div class="overflow-y-auto border-b border-r-0 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-8 lg:border-b-0 lg:border-r">
			<!-- Model & Schema Config -->
			<div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Configuration
				</div>
				<div class="grid grid-cols-[2fr_2fr_1fr] items-end gap-4">
					<div class="flex flex-col gap-2">
						<label for="model-select" class="mb-1.5 text-sm font-semibold text-slate-700">Model</label
						>
						<select
							id="model-select"
							bind:value={model}
							class="font-inherit w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
						>
							<option value="gpt-4o">gpt-4o</option>
							<option value="gpt-4o-mini">gpt-4o-mini</option>
							<option value="gpt-4-turbo">gpt-4-turbo</option>
							<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
							<option value="gpt-5-nano">gpt-5-nano</option>
						</select>
					</div>
					<div class="flex flex-col gap-2">
						<label for="schema-name-input" class="mb-1.5 text-sm font-semibold text-slate-700"
							>Schema Name</label
						>
						<input
							id="schema-name-input"
							type="text"
							bind:value={schemaName}
							class="font-inherit w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
						/>
					</div>
					<div class="flex flex-col justify-end gap-2 pb-2">
						<label
							class="flex cursor-pointer select-none items-center gap-2 rounded-lg border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:from-indigo-50 hover:to-indigo-100"
						>
							<input
								type="checkbox"
								bind:checked={strict}
								class="m-0 h-4 w-4 cursor-pointer accent-indigo-500"
							/>
							<span class="font-medium">Strict Mode</span>
						</label>
					</div>
				</div>
			</div>

			<!-- Input Messages -->
			<div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Input Messages
				</div>
				{#each messages as message (message.id)}
					<div class="mb-4 flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm">
						<select
							bind:value={message.role}
							class="font-inherit w-auto min-w-[140px] shrink-0 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
							aria-label="Message role"
						>
							<option value="system">System</option>
							<option value="user">User</option>
						</select>
						<textarea
							bind:value={message.content}
							placeholder="Message content..."
							class="font-inherit min-h-[60px] w-full flex-1 resize-y rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
							rows="2"
							aria-label="Message content"
						></textarea>
						<button
							type="button"
							onclick={() => removeMessage(message.id)}
							class="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-red-600"
							aria-label="Remove message"
							title="Remove"
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<path
									d="M4 4L12 12M12 4L4 12"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
								/>
							</svg>
						</button>
					</div>
				{/each}
				<button
					type="button"
					onclick={addMessage}
					class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-5 py-2.5 text-[0.9375rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M8 3V13M3 8H13"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
					Add Message
				</button>
			</div>

			<!-- Vector Store IDs -->
			<div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Vector Store IDs
				</div>
				{#each vectorStoreIds as vectorStoreId, index (index)}
					<div class="mb-4 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm">
						<input
							type="text"
							bind:value={vectorStoreIds[index]}
							placeholder="vs_..."
							class="font-inherit w-full flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
							aria-label="Vector store ID"
							onfocus={() => {
								if (vectorStoreIds[index] === '') {
									vectorStoreIds[index] = 'vs_6918d2ecf0f48191af572585f63ab54a';
								}
							}}
						/>
						{#if vectorStoreIds.length > 1}
							<button
								type="button"
								onclick={() => removeVectorStore(index)}
								class="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-red-600"
								aria-label="Remove vector store"
								title="Remove"
							>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
									<path
										d="M4 4L12 12M12 4L4 12"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
									/>
								</svg>
							</button>
						{/if}
					</div>
				{/each}
				<button
					type="button"
					onclick={addVectorStore}
					class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-5 py-2.5 text-[0.9375rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M8 3V13M3 8H13"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
					Add Vector Store
				</button>
			</div>

			<!-- JSON Schema Properties -->
			<div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
					JSON Schema Properties
				</div>
				<div class="mb-4 flex flex-col gap-4">
					{#each properties as property (property.id)}
						<div
							class="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
						>
							<div class="flex flex-wrap items-center gap-3">
								<input
									type="text"
									bind:value={property.name}
									placeholder="Property name"
									class="font-inherit w-full min-w-[180px] flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
									aria-label="Property name"
								/>
								<select
									bind:value={property.type}
									onchange={() => handleTypeChange(property)}
									class="font-inherit w-auto min-w-[140px] shrink-0 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
									aria-label="Property type"
								>
									<option value="string">String</option>
									<option value="number">Number</option>
									<option value="integer">Integer</option>
									<option value="boolean">Boolean</option>
									<option value="object">Object</option>
									<option value="array">Array</option>
								</select>
								<label
									class="flex cursor-pointer select-none items-center gap-2 rounded-lg border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:from-indigo-50 hover:to-indigo-100"
								>
									<input
										type="checkbox"
										bind:checked={property.required}
										class="m-0 h-4 w-4 cursor-pointer accent-indigo-500"
									/>
									<span class="font-semibold">Required</span>
								</label>
								<button
									type="button"
									onclick={() => removeProperty(property.id)}
									class="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-red-600"
									aria-label="Remove property"
									title="Remove"
								>
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
										<path
											d="M4 4L12 12M12 4L4 12"
											stroke="currentColor"
											stroke-width="1.5"
											stroke-linecap="round"
										/>
									</svg>
								</button>
							</div>

							<div class="mt-4">
								<input
									type="text"
									bind:value={property.description}
									placeholder="Description (optional)"
									class="font-inherit w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
									aria-label="Property description"
								/>
							</div>

							{#if property.type === 'array'}
								<div class="mt-4 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
									<label class="flex items-center gap-3 text-sm font-semibold text-slate-700">
										Array Item Type:
										<select
											bind:value={property.itemType}
											onchange={() => handleArrayItemTypeChange(property)}
											class="font-inherit w-auto min-w-[140px] shrink-0 rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
										>
											<option value="string">String</option>
											<option value="number">Number</option>
											<option value="integer">Integer</option>
											<option value="boolean">Boolean</option>
											<option value="object">Object</option>
										</select>
									</label>

									{#if property.itemType === 'object' && property.itemProperties}
										<div class="mt-4 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 p-4 shadow-sm">
											<h4
												class="m-0 mb-3 text-[0.8125rem] font-semibold uppercase tracking-wide text-slate-600"
											>
												Array Item Properties
											</h4>
											{#each property.itemProperties as itemProp (itemProp.id)}
												<div
													class="mb-3 ml-6 rounded-lg border-2 border-slate-300 bg-white p-4 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
												>
													<div class="flex flex-wrap items-center gap-3">
														<input
															type="text"
															bind:value={itemProp.name}
															placeholder="Property name"
															class="font-inherit w-full min-w-[180px] flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
														/>
														<select
															bind:value={itemProp.type}
															class="font-inherit w-auto min-w-[140px] shrink-0 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
														>
															<option value="string">String</option>
															<option value="number">Number</option>
															<option value="integer">Integer</option>
															<option value="boolean">Boolean</option>
														</select>
														<label
															class="flex cursor-pointer select-none items-center gap-2 rounded-lg border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:from-indigo-50 hover:to-indigo-100"
														>
															<input
																type="checkbox"
																bind:checked={itemProp.required}
																class="m-0 h-4 w-4 cursor-pointer accent-indigo-500"
															/>
															<span class="font-semibold">Required</span>
														</label>
														<button
															type="button"
															onclick={() => removeProperty(itemProp.id, property.itemProperties)}
															class="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-red-600"
															aria-label="Remove item property"
															title="Remove"
														>
															<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
																<path
																	d="M4 4L12 12M12 4L4 12"
																	stroke="currentColor"
																	stroke-width="1.5"
																	stroke-linecap="round"
																/>
															</svg>
														</button>
													</div>
												</div>
											{/each}
											<button
												type="button"
												onclick={() => addProperty(property.itemProperties)}
												class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
											>
												<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
													<path
														d="M8 3V13M3 8H13"
														stroke="currentColor"
														stroke-width="1.5"
														stroke-linecap="round"
													/>
												</svg>
												Add Item Property
											</button>
										</div>
									{/if}
								</div>
							{/if}

							{#if property.type === 'object' && property.properties}
								<div class="mt-4 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 p-4 shadow-sm">
									<h4
										class="m-0 mb-3 text-[0.8125rem] font-semibold uppercase tracking-wide text-slate-600"
									>
										Nested Properties
									</h4>
									{#each property.properties as nestedProp (nestedProp.id)}
										<div
											class="mb-3 ml-6 rounded-lg border-2 border-slate-300 bg-white p-4 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
										>
											<div class="flex flex-wrap items-center gap-3">
												<input
													type="text"
													bind:value={nestedProp.name}
													placeholder="Property name"
													class="font-inherit w-full min-w-[180px] flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
												/>
												<select
													bind:value={nestedProp.type}
													class="font-inherit w-auto min-w-[140px] shrink-0 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
												>
													<option value="string">String</option>
													<option value="number">Number</option>
													<option value="integer">Integer</option>
													<option value="boolean">Boolean</option>
												</select>
												<label
													class="flex cursor-pointer select-none items-center gap-2 rounded-lg border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:from-indigo-50 hover:to-indigo-100"
												>
													<input
														type="checkbox"
														bind:checked={nestedProp.required}
														class="m-0 h-4 w-4 cursor-pointer accent-indigo-500"
													/>
													<span class="font-semibold">Required</span>
												</label>
												<button
													type="button"
													onclick={() => removeProperty(nestedProp.id, property.properties)}
													class="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-red-600"
													aria-label="Remove nested property"
													title="Remove"
												>
													<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
														<path
															d="M4 4L12 12M12 4L4 12"
															stroke="currentColor"
															stroke-width="1.5"
															stroke-linecap="round"
														/>
													</svg>
												</button>
											</div>
										</div>
									{/each}
									<button
										type="button"
										onclick={() => addProperty(property.properties)}
										class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
									>
										<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
											<path
												d="M8 3V13M3 8H13"
												stroke="currentColor"
												stroke-width="1.5"
												stroke-linecap="round"
											/>
										</svg>
										Add Nested Property
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
				<button
					type="button"
					onclick={() => addProperty()}
					class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-5 py-2.5 text-[0.9375rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M8 3V13M3 8H13"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
					Add Property
				</button>
			</div>
		</div>

		<!-- Right Column: JSON Preview -->
		<div class="flex max-h-[50vh] flex-col overflow-y-auto bg-slate-50 p-8 lg:max-h-none">
			<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-700 bg-slate-800 p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="m-0 text-base font-semibold text-slate-200">Generated JSON</h3>
					<button
						type="button"
						onclick={copyToClipboard}
						class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] border-none border-slate-200 bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98]"
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<path
								d="M5.5 4.5H3.5C2.67 4.5 2 5.17 2 6V12.5C2 13.33 2.67 14 3.5 14H10C10.83 14 11.5 13.33 11.5 12.5V10.5M11.5 4.5H13.5C14.33 4.5 15 5.17 15 6V12.5C15 13.33 14.33 14 13.5 14H7C6.17 14 5.5 13.33 5.5 12.5V10.5M11.5 4.5V2M11.5 4.5H9.5M11.5 4.5V6.5"
								stroke="currentColor"
								stroke-width="1.2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Copy
					</button>
				</div>
				<pre
					class="m-0 min-h-0 flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-5 font-mono text-sm leading-relaxed text-slate-300">{outputJson}</pre>
			</div>
		</div>
	</div>

	<!-- Footer Actions -->
	<div class="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-6">
		<button
			type="button"
			onclick={submitToAPI}
			disabled={isSubmitting}
			class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-[0.9375rem] font-medium text-white shadow-[0_4px_12px_rgba(102,126,234,0.3)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(102,126,234,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if isSubmitting}
				<svg
					class="h-4 w-4 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Submitting...
			{:else}
				Submit to API
			{/if}
		</button>
	</div>

	<!-- API Result Display -->
	{#if apiError}
		<div class="border-t border-red-200 bg-red-50 px-6 py-6">
			<div class="rounded-lg border-2 border-red-200 bg-white p-6 shadow-sm">
				<div class="mb-2 flex items-center gap-2">
					<svg
						class="h-5 w-5 text-red-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-red-800">Error</h3>
				</div>
				<p class="text-sm text-red-700">{apiError}</p>
			</div>
		</div>
	{/if}

	{#if apiResult}
		<div class="border-t border-green-200 bg-green-50 px-6 py-6">
			<div class="rounded-lg border-2 border-green-200 bg-white p-6 shadow-sm">
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<svg
							class="h-5 w-5 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<h3 class="text-lg font-semibold text-green-800">API Response</h3>
					</div>
					<button
						type="button"
						onclick={copyResultToClipboard}
						class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 shadow-sm transition-all duration-200 hover:border-green-400 hover:bg-green-50 hover:shadow-md active:scale-[0.98]"
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<path
								d="M5.5 4.5H3.5C2.67 4.5 2 5.17 2 6V12.5C2 13.33 2.67 14 3.5 14H10C10.83 14 11.5 13.33 11.5 12.5V10.5M11.5 4.5H13.5C14.33 4.5 15 5.17 15 6V12.5C15 13.33 14.33 14 13.5 14H7C6.17 14 5.5 13.33 5.5 12.5V10.5M11.5 4.5V2M11.5 4.5H9.5M11.5 4.5V6.5"
								stroke="currentColor"
								stroke-width="1.2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Copy Result
					</button>
				</div>
				<pre
					class="m-0 max-h-[600px] overflow-auto rounded-lg border border-green-200 bg-slate-950 p-5 font-mono text-sm leading-relaxed text-green-100"
				>{JSON.stringify(apiResult, null, 2)}</pre>
			</div>
		</div>
	{/if}
</div>
