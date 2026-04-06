/** Well-known service names for the host service registry. */
export declare const HostServices: {
    readonly SUPABASE: "supabase";
    readonly FETCH: "fetch";
    readonly MCP: "mcp";
    readonly CONFIG: "config";
};
/** Shape of the config service holding host-level environment values. */
export interface HostConfig {
    geoapifyApiKey?: string;
    [key: string]: string | undefined;
}
