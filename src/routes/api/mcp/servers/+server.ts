import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { MCPServerConfig } from '$lib/mcp/client';

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

// Load MCP server configurations from mcp.json file
function loadMCPConfig(): MCPServerConfig[] {
	try {
		// Try to load from project root
		const configPath = join(process.cwd(), 'mcp.json');
		const configContent = readFileSync(configPath, 'utf-8');
		const config: MCPConfig = JSON.parse(configContent);

		return Object.entries(config.mcpServers).map(([name, server]) => ({
			name,
			type: server.type || 'stdio', // Default to stdio if not specified
			...server
		}));
	} catch (error) {
		// Fallback to default configuration if file doesn't exist
		console.warn('Could not load mcp.json, using default configuration:', error);
		return [
			{
				name: 'us-census',
				type: 'stdio' as const,
				command: 'node',
				args: ['/Users/danie/projects/StratiqAI/census-tools/packages/mcp-host/dist/index.js'],
				env: {
					CENSUS_API_KEYS: 'eb160b9b99cc1241c76b809a4a068e9f6dfc6506'
				}
			}
		];
	}
}

export const GET: RequestHandler = async () => {
	const servers = loadMCPConfig();
	return json(servers);
};
