<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	interface MCPServerConfig {
		name: string;
		type: 'stdio' | 'http' | 'websocket';
		command?: string;
		args?: string[];
		url?: string;
		headers?: Record<string, string>;
	}

	interface MCPTool {
		name: string;
		description: string;
		inputSchema: {
			type: string;
			properties?: Record<string, unknown>;
			required?: string[];
		};
	}

	interface MCPResource {
		uri: string;
		name: string;
		description?: string;
		mimeType?: string;
	}

	interface MCPResponse {
		result?: unknown;
		error?: {
			code: number;
			message: string;
			data?: unknown;
		};
	}

	const servers = writable<MCPServerConfig[]>([]);
	const selectedServer = writable<string>('');
	const tools = writable<MCPTool[]>([]);
	const resources = writable<MCPResource[]>([]);
	const serverInfo = writable<{ name: string; version: string } | null>(null);
	const isLoading = writable(false);
	const error = writable<string | null>(null);
	const response = writable<unknown>(null);
	const activeTab = writable<'tools' | 'resources' | 'response'>('tools');

	// Tool call state
	const selectedTool = writable<string>('');
	const toolParams = writable<Record<string, unknown>>({});
	const toolParamInputs = writable<Record<string, string>>({});

	// Resource state
	const selectedResource = writable<string>('');
	const resourceContent = writable<string>('');

	onMount(async () => {
		await loadServerConfigs();
	});

	async function loadServerConfigs() {
		try {
			const res = await fetch('/api/mcp/servers');
			if (!res.ok) throw new Error('Failed to load server configs');
			const configs = await res.json();
			servers.set(configs);
			if (configs.length > 0) {
				selectedServer.set(configs[0].name);
				await connectToServer(configs[0].name);
			}
		} catch (err) {
			error.set(err instanceof Error ? err.message : 'Failed to load server configs');
		}
	}

	async function connectToServer(serverName: string) {
		isLoading.set(true);
		error.set(null);
		response.set(null);
		tools.set([]);
		resources.set([]);
		serverInfo.set(null);

		try {
			// Initialize connection
			const initRes = await fetch('/api/mcp/initialize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ server: serverName })
			});

			if (!initRes.ok) {
				const err = await initRes.json();
				throw new Error(err.error || 'Failed to initialize connection');
			}

			const initData: MCPResponse = await initRes.json();
			if (initData.error) {
				throw new Error(initData.error.message);
			}

			// Get server info
			if (initData.result && typeof initData.result === 'object') {
				const result = initData.result as { serverInfo?: { name: string; version: string } };
				if (result.serverInfo) {
					serverInfo.set(result.serverInfo);
				}
			}

			// List tools
			await listTools(serverName);

			// List resources
			await listResources(serverName);
		} catch (err) {
			error.set(err instanceof Error ? err.message : 'Failed to connect to server');
		} finally {
			isLoading.set(false);
		}
	}

	async function listTools(serverName: string) {
		try {
			const res = await fetch('/api/mcp/tools/list', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ server: serverName })
			});

			if (!res.ok) throw new Error('Failed to list tools');
			const data: MCPResponse = await res.json();

			if (data.error) {
				throw new Error(data.error.message);
			}

			if (data.result && typeof data.result === 'object') {
				const result = data.result as { tools?: MCPTool[] };
				tools.set(result.tools || []);
			}
		} catch (err) {
			console.error('Failed to list tools:', err);
		}
	}

	async function listResources(serverName: string) {
		try {
			const res = await fetch('/api/mcp/resources/list', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ server: serverName })
			});

			if (!res.ok) throw new Error('Failed to list resources');
			const data: MCPResponse = await res.json();

			if (data.error) {
				throw new Error(data.error.message);
			}

			if (data.result && typeof data.result === 'object') {
				const result = data.result as { resources?: MCPResource[] };
				resources.set(result.resources || []);
			}
		} catch (err) {
			console.error('Failed to list resources:', err);
		}
	}

	async function callTool() {
		if (!$selectedTool) return;

		isLoading.set(true);
		error.set(null);
		response.set(null);
		activeTab.set('response');

		try {
			// Parse tool parameters
			const params: Record<string, unknown> = {};
			const tool = $tools.find((t) => t.name === $selectedTool);
			if (tool) {
				for (const [key, value] of Object.entries($toolParamInputs)) {
					if (value.trim() !== '') {
						// Try to parse as JSON, fallback to string
						try {
							params[key] = JSON.parse(value);
						} catch {
							params[key] = value;
						}
					}
				}
			}

			const res = await fetch('/api/mcp/tools/call', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					server: $selectedServer,
					tool: $selectedTool,
					arguments: params
				})
			});

			if (!res.ok) throw new Error('Failed to call tool');
			const data: MCPResponse = await res.json();

			if (data.error) {
				error.set(data.error.message);
			} else {
				response.set(data.result);
			}
		} catch (err) {
			error.set(err instanceof Error ? err.message : 'Failed to call tool');
		} finally {
			isLoading.set(false);
		}
	}

	async function readResource(uri: string) {
		isLoading.set(true);
		error.set(null);
		resourceContent.set('');
		activeTab.set('response');

		try {
			const res = await fetch('/api/mcp/resources/read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					server: $selectedServer,
					uri
				})
			});

			if (!res.ok) throw new Error('Failed to read resource');
			const data: MCPResponse = await res.json();

			if (data.error) {
				error.set(data.error.message);
			} else if (data.result && typeof data.result === 'object') {
				const result = data.result as { contents?: Array<{ text?: string }> };
				if (result.contents && result.contents.length > 0) {
					resourceContent.set(result.contents[0].text || '');
					response.set(data.result);
				}
			}
		} catch (err) {
			error.set(err instanceof Error ? err.message : 'Failed to read resource');
		} finally {
			isLoading.set(false);
		}
	}

	function selectTool(toolName: string) {
		selectedTool.set(toolName);
		const tool = $tools.find((t) => t.name === toolName);
		if (tool && tool.inputSchema.properties) {
			const inputs: Record<string, string> = {};
			for (const key of Object.keys(tool.inputSchema.properties)) {
				inputs[key] = '';
			}
			toolParamInputs.set(inputs);
		}
	}

	let lastConnectedServer = '';
	$: if ($selectedServer && $selectedServer !== lastConnectedServer) {
		lastConnectedServer = $selectedServer;
		connectToServer($selectedServer);
	}
</script>

<div class="flex h-screen w-full flex-col overflow-hidden bg-slate-50 font-sans">
	<!-- Header -->
	<div class="shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 px-6 py-6 text-white">
		<h2 class="m-0 text-2xl font-semibold tracking-tight text-white">MCP Client</h2>
		<p class="mt-1 text-sm text-indigo-100">Model Context Protocol Client Interface</p>
	</div>

	<!-- Server Selection -->
	<div class="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
		<div class="flex items-center gap-4">
			<label for="server-select" class="text-sm font-medium text-slate-700">Server:</label>
			<select
				id="server-select"
				bind:value={$selectedServer}
				class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
			>
				{#each $servers as server}
					<option value={server.name}>{server.name}</option>
				{/each}
			</select>
			{#if $serverInfo}
				<span class="text-sm text-slate-600">
					{$serverInfo.name} v{$serverInfo.version}
				</span>
			{/if}
			{#if $isLoading}
				<div class="ml-auto flex items-center gap-2 text-sm text-slate-600">
					<svg
						class="h-4 w-4 animate-spin"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					Loading...
				</div>
			{/if}
		</div>
		{#if $error}
			<div class="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
				{$error}
			</div>
		{/if}
	</div>

	<!-- Main Content -->
	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- Left Sidebar: Tools and Resources -->
		<div class="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
			<!-- Tabs -->
			<div class="flex border-b border-slate-200">
				<button
					type="button"
					onclick={() => activeTab.set('tools')}
					class="flex-1 px-4 py-3 text-sm font-medium transition-colors {$activeTab === 'tools'
						? 'border-b-2 border-indigo-500 text-indigo-600'
						: 'text-slate-600 hover:text-slate-900'}"
				>
					Tools ({$tools.length})
				</button>
				<button
					type="button"
					onclick={() => activeTab.set('resources')}
					class="flex-1 px-4 py-3 text-sm font-medium transition-colors {$activeTab === 'resources'
						? 'border-b-2 border-indigo-500 text-indigo-600'
						: 'text-slate-600 hover:text-slate-900'}"
				>
					Resources ({$resources.length})
				</button>
			</div>

			<!-- Tools List -->
			{#if $activeTab === 'tools'}
				<div class="p-4">
					{#if $tools.length === 0}
						<p class="text-sm text-slate-500">No tools available</p>
					{:else}
						<div class="space-y-2">
							{#each $tools as tool}
								<button
									type="button"
									onclick={() => selectTool(tool.name)}
									class="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 {$selectedTool === tool.name
										? 'border-indigo-500 bg-indigo-50'
										: ''}"
								>
									<div class="font-medium text-slate-900">{tool.name}</div>
									<div class="mt-1 text-xs text-slate-600">{tool.description}</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Resources List -->
			{#if $activeTab === 'resources'}
				<div class="p-4">
					{#if $resources.length === 0}
						<p class="text-sm text-slate-500">No resources available</p>
					{:else}
						<div class="space-y-2">
							{#each $resources as resource}
								<button
									type="button"
									onclick={() => readResource(resource.uri)}
									class="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50"
								>
									<div class="font-medium text-slate-900">{resource.name}</div>
									<div class="mt-1 text-xs text-slate-600">{resource.uri}</div>
									{#if resource.description}
										<div class="mt-1 text-xs text-slate-500">{resource.description}</div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Right Panel: Tool/Resource Details and Response -->
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
			<!-- Tool Parameters Form -->
			{#if $activeTab === 'tools' && $selectedTool}
				{@const tool = $tools.find((t) => t.name === $selectedTool)}
				{#if tool}
					<div class="overflow-y-auto border-b border-slate-200 bg-white p-6">
						<h3 class="mb-4 text-lg font-semibold text-slate-900">{tool.name}</h3>
						<p class="mb-4 text-sm text-slate-600">{tool.description}</p>

						{#if tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0}
							<div class="space-y-4">
								{#each Object.entries(tool.inputSchema.properties) as [key, prop]}
									{@const propDef = prop as { type?: string; description?: string }}
									<div>
										<label
											for="param-{key}"
											class="block text-sm font-medium text-slate-700 mb-1"
										>
											{key}
											{#if tool.inputSchema.required?.includes(key)}
												<span class="text-red-500">*</span>
											{/if}
										</label>
										{#if propDef.type === 'object' || propDef.type === 'array'}
											<textarea
												id="param-{key}"
												bind:value={$toolParamInputs[key]}
												placeholder="Enter JSON..."
												class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
												rows="4"
											/>
										{:else}
											<input
												id="param-{key}"
												type="text"
												bind:value={$toolParamInputs[key]}
												placeholder={propDef.description || `Enter ${key}...`}
												class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
											/>
										{/if}
										{#if propDef.description}
											<p class="mt-1 text-xs text-slate-500">{propDef.description}</p>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<button
							type="button"
							onclick={callTool}
							disabled={$isLoading}
							class="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if $isLoading}
								Calling...
							{:else}
								Call Tool
							{/if}
						</button>
					</div>
				{/if}
			{/if}

			<!-- Response Panel -->
			<div class="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
				<h3 class="mb-4 text-lg font-semibold text-slate-900">Response</h3>
				<div class="flex min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
					{#if $error}
						<div class="w-full p-6">
							<div class="rounded-lg border-2 border-red-200 bg-red-50 p-4">
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
									<h4 class="font-semibold text-red-800">Error</h4>
								</div>
								<p class="text-sm text-red-700">{$error}</p>
							</div>
						</div>
					{:else if $response}
						<pre
							class="m-0 w-full overflow-auto p-6 font-mono text-sm leading-relaxed text-slate-900"
						>{JSON.stringify($response, null, 2)}</pre>
					{:else if $resourceContent}
						<pre
							class="m-0 w-full overflow-auto p-6 font-mono text-sm leading-relaxed text-slate-900"
						>{$resourceContent}</pre>
					{:else}
						<div class="flex flex-1 items-center justify-center">
							<p class="text-sm text-slate-500">No response yet</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
