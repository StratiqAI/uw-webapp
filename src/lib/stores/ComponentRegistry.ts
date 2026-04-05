import type { Component } from 'svelte';
import AutoDataView from '$lib/dashboard/widgets/AutoDataView.svelte';
import JsonFallback from '$lib/dashboard/widgets/JsonFallback.svelte';

interface RegistryEntry {
	component: Component<any>;
	options?: Record<string, any>; // Default props
}

/**
 * ComponentRegistry
 * Maps Schema IDs and Topic Patterns to Svelte Components
 * 
 * Priority:
 * 1. Exact Schema ID match
 * 2. Topic pattern match (regex)
 * 3. Auto-generated UI (if schema exists)
 * 4. Raw JSON fallback
 * 
 * For comprehensive usage documentation, see:
 * @see {@link ../../docs/application_stores/ComponentRegistry.md}
 */
export class ComponentRegistry {
	private exact = new Map<string, RegistryEntry>();
	private patterns = new Map<RegExp, RegistryEntry>();

	/**
	 * Register a component for a specific Schema ID
	 */
	register(schemaId: string, component: Component<any>, options: Record<string, any> = {}) {
		this.exact.set(schemaId, { component, options });
	}

	/**
	 * Register a component for a Topic Pattern (Regex)
	 */
	registerPattern(pattern: RegExp, component: Component<any>, options: Record<string, any> = {}) {
		this.patterns.set(pattern, { component, options });
	}

	/**
	 * The "Router" logic for UI
	 * Resolves the appropriate component based on schemaId and topic
	 */
	resolve(schemaId?: string, topic?: string): RegistryEntry {
		// 1. Exact Schema Match (Highest Priority)
		if (schemaId && this.exact.has(schemaId)) {
			return this.exact.get(schemaId)!;
		}

		// 2. Pattern Match on Topic
		if (topic) {
			for (const [regex, entry] of this.patterns) {
				if (regex.test(topic)) return entry;
			}
		}

		// 3. Auto-UI Fallback (If we have a schema, but no custom UI)
		if (schemaId) {
			return { component: AutoDataView };
		}

		// 4. Raw Fallback (No schema, no UI)
		return { component: JsonFallback };
	}

	/**
	 * Check if a schema has a registered component
	 */
	has(schemaId: string): boolean {
		return this.exact.has(schemaId);
	}

	/**
	 * Get all registered schema IDs
	 */
	getRegisteredSchemas(): string[] {
		return Array.from(this.exact.keys());
	}
}

export const uiRegistry = new ComponentRegistry();

