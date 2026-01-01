import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mcpClientManager } from '$lib/mcp/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { MCPServerConfig } from '$lib/mcp/client';

interface InitializeRequest {
	server: string;
}

interface MCPConfig {
	mcpServers: Record<string, {
		type?: 'stdio' | 'http' | 'websocket';
		command?: string;
		args?: string[];
		url?: string;
		headers?: Record<string, string>;
		env?: Record<string, string>;
	}>;
}

function getServerConfig(serverName: string): MCPServerConfig | null {
	try {
		const configPath = join(process.cwd(), 'mcp.json');
		const configContent = readFileSync(configPath, 'utf-8');
		const config: MCPConfig = JSON.parse(configContent);
		const serverConfig = config.mcpServers[serverName];
		if (!serverConfig) return null;
		return { 
			name: serverName, 
			type: serverConfig.type || 'stdio',
			...serverConfig 
		};
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { server }: InitializeRequest = await request.json();

		const serverConfig = getServerConfig(server);
		if (!serverConfig) {
			return json(
				{
					jsonrpc: '2.0',
					id: null,
					error: {
						code: -32602,
						message: `Server configuration not found: ${server}`
					}
				},
				{ status: 404 }
			);
		}

		// Get or create MCP client
		const client = await mcpClientManager.getClient(serverConfig);

		// Initialize the connection
		const response = await client.initialize({
			name: 'sveltekit-mcp-client',
			version: '1.0.0'
		});

		return json(response);
	} catch (error) {
		return json(
			{
				jsonrpc: '2.0',
				id: null,
				error: {
					code: -32603,
					message: error instanceof Error ? error.message : 'Internal error'
				}
			},
			{ status: 500 }
		);
	}
};
