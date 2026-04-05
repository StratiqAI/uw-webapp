/**
 * MCP (Model Context Protocol) Client
 * Handles communication with MCP servers via JSON-RPC 2.0
 */

import { spawn } from 'child_process';
import type { Readable, Writable } from 'stream';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('mcp');

export interface MCPServerConfig {
	name: string;
	type?: 'stdio' | 'http' | 'websocket';
	command?: string;
	args?: string[];
	url?: string;
	headers?: Record<string, string>;
	env?: Record<string, string>;
}

export interface JSONRPCRequest {
	jsonrpc: '2.0';
	id: string | number | null;
	method: string;
	params?: unknown;
}

export interface JSONRPCResponse {
	jsonrpc: '2.0';
	id: string | number | null;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export class MCPClient {
	private process: ChildProcess | null = null;
	private requestId = 0;
	private pendingRequests = new Map<string | number, {
		resolve: (value: JSONRPCResponse) => void;
		reject: (error: Error) => void;
	}>();

	constructor(private config: MCPServerConfig) {}

	async connect(): Promise<void> {
		const serverType = this.config.type || 'stdio';
		if (serverType === 'stdio' && this.config.command) {
			// Merge environment variables
			const env = { ...process.env, ...this.config.env };
			
			this.process = spawn(this.config.command, this.config.args || [], {
				stdio: ['pipe', 'pipe', 'pipe'],
				env
			});

			// Handle stdout (responses from server)
			let buffer = '';
			this.process.stdout?.on('data', (chunk: Buffer) => {
				buffer += chunk.toString();
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.trim()) {
						try {
							const response: JSONRPCResponse = JSON.parse(line);
							this.handleResponse(response);
						} catch (error) {
							log.error('Failed to parse MCP response:', error);
						}
					}
				}
			});

			// Handle stderr
			this.process.stderr?.on('data', (chunk: Buffer) => {
				log.error('MCP server stderr:', chunk.toString());
			});

			// Handle process exit
			this.process.on('exit', (code) => {
				log.info(`MCP server exited with code ${code}`);
				this.process = null;
			});

			// Wait a bit for the process to start
			await new Promise((resolve) => setTimeout(resolve, 100));
		} else if (serverType === 'http' && this.config.url) {
			// HTTP-based MCP servers would use fetch
			// Implementation would go here
		}
	}

	async disconnect(): Promise<void> {
		if (this.process) {
			this.process.kill();
			this.process = null;
		}
		this.pendingRequests.clear();
	}

	private handleResponse(response: JSONRPCResponse): void {
		if (response.id !== null && this.pendingRequests.has(response.id)) {
			const { resolve, reject } = this.pendingRequests.get(response.id)!;
			this.pendingRequests.delete(response.id);

			if (response.error) {
				reject(new Error(response.error.message));
			} else {
				resolve(response);
			}
		}
	}

	async sendRequest(method: string, params?: unknown): Promise<JSONRPCResponse> {
		const id = ++this.requestId;
		const request: JSONRPCRequest = {
			jsonrpc: '2.0',
			id,
			method,
			params
		};

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(id, { resolve, reject });

			const serverType = this.config.type || 'stdio';
			if (serverType === 'stdio' && this.process?.stdin) {
				const message = JSON.stringify(request) + '\n';
				this.process.stdin.write(message, (error) => {
					if (error) {
						this.pendingRequests.delete(id);
						reject(error);
					}
				});
			} else if (serverType === 'http' && this.config.url) {
				// HTTP implementation
				fetch(this.config.url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(this.config.headers || {})
					},
					body: JSON.stringify(request)
				})
					.then((res) => res.json())
					.then((response: JSONRPCResponse) => {
						this.pendingRequests.delete(id);
						if (response.error) {
							reject(new Error(response.error.message));
						} else {
							resolve(response);
						}
					})
					.catch((error) => {
						this.pendingRequests.delete(id);
						reject(error);
					});
			} else {
				this.pendingRequests.delete(id);
				reject(new Error('No connection available'));
			}
		});
	}

	async initialize(clientInfo?: { name: string; version: string }): Promise<JSONRPCResponse> {
		return this.sendRequest('initialize', {
			protocolVersion: '2024-11-05',
			capabilities: {},
			clientInfo
		});
	}

	async listTools(): Promise<JSONRPCResponse> {
		return this.sendRequest('tools/list');
	}

	async callTool(name: string, arguments_: Record<string, unknown>): Promise<JSONRPCResponse> {
		return this.sendRequest('tools/call', {
			name,
			arguments: arguments_
		});
	}

	async listResources(uri?: string): Promise<JSONRPCResponse> {
		return this.sendRequest('resources/list', uri ? { uri } : undefined);
	}

	async readResource(uri: string): Promise<JSONRPCResponse> {
		return this.sendRequest('resources/read', { uri });
	}
}

// Client manager to handle multiple MCP server connections
class MCPClientManager {
	private clients = new Map<string, MCPClient>();

	async getClient(config: MCPServerConfig): Promise<MCPClient> {
		if (!this.clients.has(config.name)) {
			const client = new MCPClient(config);
			await client.connect();
			this.clients.set(config.name, client);
		}
		return this.clients.get(config.name)!;
	}

	async disconnectClient(name: string): Promise<void> {
		const client = this.clients.get(name);
		if (client) {
			await client.disconnect();
			this.clients.delete(name);
		}
	}

	async disconnectAll(): Promise<void> {
		for (const [name] of this.clients) {
			await this.disconnectClient(name);
		}
	}
}

export const mcpClientManager = new MCPClientManager();
