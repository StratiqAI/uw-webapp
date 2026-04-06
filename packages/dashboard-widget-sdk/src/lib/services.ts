/** Well-known service names for the host service registry. */
export const HostServices = {
	SUPABASE: 'supabase',
	FETCH: 'fetch',
	MCP: 'mcp',
	CONFIG: 'config'
} as const;

/** Shape of the config service holding host-level environment values. */
export interface HostConfig {
	geoapifyApiKey?: string;
	[key: string]: string | undefined;
}
