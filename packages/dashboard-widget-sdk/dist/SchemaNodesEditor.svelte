<script lang="ts">
	/**
	 * Recursive editor for JSON Schema object `properties` trees (name, type, nested object/array).
	 * Used by PromptEditor for object and array item shapes.
	 */
	import type {
		NestedItemSchema,
		NestedSchemaNodeType,
		NestedSchemaPropertyNode
	} from './promptSchemaTypes.js';
	import Self from './SchemaNodesEditor.svelte';

	interface Props {
		nodes: NestedSchemaPropertyNode[];
		darkMode?: boolean;
		newNestedId: () => string;
		onNodesChange: (next: NestedSchemaPropertyNode[]) => void;
		sectionTitle?: string;
		addButtonLabel?: string;
	}

	let {
		nodes,
		darkMode = false,
		newNestedId,
		onNodesChange,
		sectionTitle = 'Nested properties',
		addButtonLabel = '+ Add property'
	}: Props = $props();

	function patchRoot(id: string, patch: Partial<NestedSchemaPropertyNode>): void {
		onNodesChange(
			nodes.map((n) => {
				if (n.id === id) return { ...n, ...patch };
				let next = n;
				if (n.children?.length) {
					const ch = patchInList(n.children, id, patch);
					if (ch !== n.children) next = { ...n, children: ch };
				}
				if (n.itemSchema) {
					const is = patchItemSchema(n.itemSchema, id, patch);
					if (is !== n.itemSchema) next = { ...n, itemSchema: is };
				}
				return next;
			})
		);
	}

	function patchInList(
		list: NestedSchemaPropertyNode[],
		id: string,
		patch: Partial<NestedSchemaPropertyNode>
	): NestedSchemaPropertyNode[] {
		let changed = false;
		const out = list.map((n) => {
			if (n.id === id) {
				changed = true;
				return { ...n, ...patch };
			}
			let next = n;
			if (n.children?.length) {
				const ch = patchInList(n.children, id, patch);
				if (ch !== n.children) {
					next = { ...n, children: ch };
					changed = true;
				}
			}
			if (n.itemSchema) {
				const is = patchItemSchema(n.itemSchema, id, patch);
				if (is !== n.itemSchema) {
					next = { ...next, itemSchema: is };
					changed = true;
				}
			}
			return next;
		});
		return changed ? out : list;
	}

	function patchItemSchema(
		item: NestedItemSchema,
		id: string,
		patch: Partial<NestedSchemaPropertyNode>
	): NestedItemSchema {
		if (item.properties?.length) {
			const next = patchInList(item.properties, id, patch);
			if (next !== item.properties) return { ...item, properties: next };
		}
		if (item.items) {
			const inner = patchItemSchema(item.items, id, patch);
			if (inner !== item.items) return { ...item, items: inner };
		}
		return item;
	}

	function replaceChildList(parentId: string | null, nextChildren: NestedSchemaPropertyNode[]): void {
		if (parentId === null) {
			onNodesChange(nextChildren);
			return;
		}
		onNodesChange(
			nodes.map((n) => {
				if (n.id === parentId) return { ...n, children: nextChildren };
				if (n.children?.length)
					return { ...n, children: replaceChildListIn(n.children, parentId, nextChildren) };
				if (n.itemSchema?.properties) {
					const p = replaceChildListInItemProps(n.itemSchema, parentId, nextChildren);
					if (p) return { ...n, itemSchema: p };
				}
				return n;
			})
		);
	}

	function replaceChildListIn(
		list: NestedSchemaPropertyNode[],
		parentId: string,
		nextChildren: NestedSchemaPropertyNode[]
	): NestedSchemaPropertyNode[] {
		return list.map((n) => {
			if (n.id === parentId) return { ...n, children: nextChildren };
			if (n.children?.length) return { ...n, children: replaceChildListIn(n.children, parentId, nextChildren) };
			return n;
		});
	}

	function replaceChildListInItemProps(
		item: NestedItemSchema,
		parentId: string,
		nextChildren: NestedSchemaPropertyNode[]
	): NestedItemSchema | null {
		if (item.properties?.length) {
			const mapped = item.properties.map((p) => {
				if (p.id === parentId) return { ...p, children: nextChildren };
				if (p.children?.length) {
					const ch = replaceChildListIn(p.children, parentId, nextChildren);
					if (ch !== p.children) return { ...p, children: ch };
				}
				return p;
			});
			if (mapped !== item.properties) return { ...item, properties: mapped };
		}
		if (item.items) {
			const inner = replaceChildListInItemProps(item.items, parentId, nextChildren);
			if (inner) return { ...item, items: inner };
		}
		return null;
	}

	function removeNode(id: string): void {
		onNodesChange(
			nodes
				.filter((n) => n.id !== id)
				.map((n) => ({
					...n,
					children: n.children ? removeFromList(n.children, id) : undefined,
					itemSchema: n.itemSchema ? removeFromItemSchema(n.itemSchema, id) : undefined
				}))
		);
	}

	function removeFromList(list: NestedSchemaPropertyNode[], id: string): NestedSchemaPropertyNode[] {
		return list
			.filter((n) => n.id !== id)
			.map((n) => ({
				...n,
				children: n.children ? removeFromList(n.children, id) : undefined,
				itemSchema: n.itemSchema ? removeFromItemSchema(n.itemSchema, id) : undefined
			}));
	}

	function removeFromItemSchema(item: NestedItemSchema, id: string): NestedItemSchema {
		const next: NestedItemSchema = { ...item };
		if (item.properties) next.properties = removeFromList(item.properties, id);
		if (item.items) next.items = removeFromItemSchema(item.items, id);
		return next;
	}

	function addProperty(parentId: string | null): void {
		const child: NestedSchemaPropertyNode = {
			id: newNestedId(),
			name: '',
			type: 'string',
			required: false,
			description: ''
		};
		if (parentId === null) {
			onNodesChange([...nodes, child]);
			return;
		}
		onNodesChange(
			nodes.map((n) => {
				if (n.id === parentId) return { ...n, children: [...(n.children ?? []), child] };
				if (n.children?.length) return { ...n, children: addToList(n.children, parentId, child) };
				if (n.itemSchema?.type === 'object') {
					const updated = addItemProperty(n.itemSchema, parentId, child);
					if (updated) return { ...n, itemSchema: updated };
				}
				return n;
			})
		);
	}

	function addToList(
		list: NestedSchemaPropertyNode[],
		parentId: string,
		child: NestedSchemaPropertyNode
	): NestedSchemaPropertyNode[] {
		return list.map((n) => {
			if (n.id === parentId) return { ...n, children: [...(n.children ?? []), child] };
			if (n.children?.length) return { ...n, children: addToList(n.children, parentId, child) };
			return n;
		});
	}

	function addItemProperty(
		item: NestedItemSchema,
		parentId: string,
		child: NestedSchemaPropertyNode
	): NestedItemSchema | null {
		if (item.type === 'object') {
			return { ...item, properties: [...(item.properties ?? []), child] };
		}
		if (item.items) {
			const inner = addItemProperty(item.items, parentId, child);
			if (inner) return { ...item, items: inner };
		}
		return null;
	}

	function patchItemAtNode(nodeId: string, item: NestedItemSchema): void {
		onNodesChange(
			nodes.map((n) => {
				if (n.id === nodeId) return { ...n, itemSchema: item };
				if (n.children?.length) return { ...n, children: patchItemInList(n.children, nodeId, item) };
				if (n.itemSchema) {
					const is = patchItemDeep(n.itemSchema, nodeId, item);
					if (is !== n.itemSchema) return { ...n, itemSchema: is };
				}
				return n;
			})
		);
	}

	function patchItemInList(
		list: NestedSchemaPropertyNode[],
		nodeId: string,
		item: NestedItemSchema
	): NestedSchemaPropertyNode[] {
		return list.map((n) => {
			if (n.id === nodeId) return { ...n, itemSchema: item };
			if (n.children?.length) return { ...n, children: patchItemInList(n.children, nodeId, item) };
			if (n.itemSchema) {
				const is = patchItemDeep(n.itemSchema, nodeId, item);
				if (is !== n.itemSchema) return { ...n, itemSchema: is };
			}
			return n;
		});
	}

	function patchItemDeep(schema: NestedItemSchema, nodeId: string, item: NestedItemSchema): NestedItemSchema {
		if (schema.properties?.some((p) => p.id === nodeId || containsNode(p, nodeId))) {
			return {
				...schema,
				properties: patchItemInList(schema.properties, nodeId, item)
			};
		}
		if (schema.items) {
			const inner = patchItemDeep(schema.items, nodeId, item);
			if (inner !== schema.items) return { ...schema, items: inner };
		}
		return schema;
	}

	function containsNode(n: NestedSchemaPropertyNode, id: string): boolean {
		if (n.id === id) return true;
		if (n.children?.some((c) => containsNode(c, id))) return true;
		return false;
	}

	function setItemType(nodeId: string, v: NestedSchemaNodeType): void {
		const item: NestedItemSchema =
			v === 'object'
				? { type: 'object', properties: [] }
				: v === 'array'
					? { type: 'array', items: { type: 'string' } }
					: { type: v };
		patchItemAtNode(nodeId, item);
	}
</script>

<div class="mt-2 rounded border {darkMode ? 'border-gray-600 border-dashed' : 'border-gray-300 border-dashed'} p-2">
	<div class="mb-2 flex items-center justify-between">
		<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'}">{sectionTitle}</span>
		<button
			type="button"
			onclick={() => addProperty(null)}
			class="rounded bg-teal-600 px-2 py-1 text-xs text-white hover:bg-teal-700"
		>
			{addButtonLabel}
		</button>
	</div>
	<div class="space-y-3">
		{#each nodes as node (node.id)}
			{@const isObject = node.type === 'object'}
			{@const isArray = node.type === 'array'}
			<div class="rounded border {darkMode ? 'border-gray-600 bg-slate-800' : 'border-gray-300 bg-white'} p-3">
				<div class="mb-2 flex flex-wrap items-center gap-2">
					<input
						type="text"
						value={node.name}
						oninput={(e) => patchRoot(node.id, { name: e.currentTarget.value })}
						class="flex-1 min-w-24 rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-sm"
						placeholder="Property name"
					/>
					<select
						value={node.type}
						onchange={(e) => {
							const v = e.currentTarget.value as NestedSchemaNodeType;
							patchRoot(node.id, {
								type: v,
								children: v === 'object' ? [] : undefined,
								itemSchema: v === 'array' ? { type: 'string' } : undefined,
								enum: v !== 'string' ? undefined : node.enum
							});
						}}
						class="rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-sm"
					>
						<option value="string">String</option>
						<option value="number">Number</option>
						<option value="integer">Integer</option>
						<option value="boolean">Boolean</option>
						<option value="object">Object</option>
						<option value="array">Array</option>
					</select>
					<label class="flex cursor-pointer items-center gap-1 text-sm {darkMode ? 'text-slate-200' : 'text-slate-700'}">
						<input
							type="checkbox"
							checked={node.required}
							onchange={(e) => patchRoot(node.id, { required: e.currentTarget.checked })}
							class="cursor-pointer"
						/>
						Required
					</label>
					<button
						type="button"
						onclick={() => removeNode(node.id)}
						class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
					>
						Remove
					</button>
				</div>
				<div class="mb-2">
					<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">
						Extraction description
					</div>
					<textarea
						value={node.description}
						oninput={(e) => patchRoot(node.id, { description: e.currentTarget.value })}
						placeholder="Describe this property..."
						class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
						rows="2"
					></textarea>
				</div>
				{#if isObject}
					<Self
						nodes={node.children ?? []}
						{darkMode}
						{newNestedId}
						sectionTitle="Nested properties"
						addButtonLabel="+ Add nested property"
						onNodesChange={(ch: NestedSchemaPropertyNode[]) => replaceChildList(node.id, ch)}
					/>
				{/if}
				{#if isArray && node.itemSchema}
					<div class="ml-2 mt-2 rounded border {darkMode ? 'border-gray-600' : 'border-gray-300'} border-dashed p-2">
						<span class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'}">Array item shape</span>
						<select
							value={node.itemSchema.type}
							onchange={(e) => setItemType(node.id, e.currentTarget.value as NestedSchemaNodeType)}
							class="rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
						>
							<option value="string">String</option>
							<option value="number">Number</option>
							<option value="integer">Integer</option>
							<option value="boolean">Boolean</option>
							<option value="object">Object</option>
							<option value="array">Array</option>
						</select>
						{#if node.itemSchema.type === 'object'}
							<div class="mt-2">
								<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">
									Description of each array item (optional)
								</div>
								<textarea
									value={node.itemSchema.description ?? ''}
									oninput={(e) =>
										patchItemAtNode(node.id, {
											...node.itemSchema!,
											type: 'object',
											description: e.currentTarget.value
										})}
									placeholder="Shown on the JSON Schema `items` object"
									class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
									rows="2"
								></textarea>
							</div>
							<Self
								nodes={node.itemSchema.properties ?? []}
								{darkMode}
								{newNestedId}
								sectionTitle="Fields on each array item"
								addButtonLabel="+ Add item field"
								onNodesChange={(ch: NestedSchemaPropertyNode[]) =>
									patchItemAtNode(node.id, {
										...node.itemSchema!,
										type: 'object',
										properties: ch
									})}
							/>
						{/if}
						{#if node.itemSchema.type === 'array' && node.itemSchema.items}
							{@const inner = node.itemSchema.items}
							<div class="mt-2 space-y-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'}">
								<span class="mr-1 font-medium">Inner element type</span>
								<select
									value={inner.type}
									onchange={(e) => {
										const v = e.currentTarget.value as NestedSchemaNodeType;
										const nextInner: NestedItemSchema =
											v === 'object'
												? { type: 'object', properties: [] }
												: v === 'array'
													? { type: 'array', items: { type: 'string' } }
													: { type: v };
										patchItemAtNode(node.id, { ...node.itemSchema!, items: nextInner });
									}}
									class="ml-1 rounded border px-1 py-0.5 {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'}"
								>
									<option value="string">String</option>
									<option value="number">Number</option>
									<option value="integer">Integer</option>
									<option value="boolean">Boolean</option>
									<option value="object">Object</option>
									<option value="array">Array</option>
								</select>
								{#if inner.type === 'object'}
									<div>
										<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">
											Description of each inner item (optional)
										</div>
										<textarea
											value={inner.description ?? ''}
											oninput={(e) =>
												patchItemAtNode(node.id, {
													...node.itemSchema!,
													items: { ...inner, type: 'object', description: e.currentTarget.value }
												})}
											class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
											rows="2"
										></textarea>
									</div>
									<Self
										nodes={inner.properties ?? []}
										{darkMode}
										{newNestedId}
										sectionTitle="Fields on each inner item"
										addButtonLabel="+ Add field"
										onNodesChange={(ch: NestedSchemaPropertyNode[]) =>
											patchItemAtNode(node.id, {
												...node.itemSchema!,
												items: { ...inner, type: 'object', properties: ch }
											})}
									/>
								{:else if inner.type === 'array'}
									<p class="text-xs italic {darkMode ? 'text-slate-500' : 'text-slate-500'}">
										Third nesting level: use primitive inner types, or add an object property above with
										its own array field for deeper shapes.
									</p>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
		{#if nodes.length === 0}
			<p class="text-sm {darkMode ? 'text-gray-400' : 'text-gray-500'}">
				No nested properties yet. Use "{addButtonLabel}" to define the structure.
			</p>
		{/if}
	</div>
</div>
