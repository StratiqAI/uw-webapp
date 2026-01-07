/**
 * ValidatedTopicStore.svelte.ts
 *
 * A reactive topic-based data store with JSON Schema validation.
 *
 * This store provides:
 * - Topic-based data storage using MQTT-style wildcards (+ and #)
 * - JSON Schema validation for all published data
 * - Reactive state management using Svelte 5 runes
 * - Schema pattern matching with specificity-based resolution
 * - AI prompt generation from registered schemas
 *
 * Key Features:
 * - Wildcard pattern matching: '+' for single-level, '#' for multi-level
 * - Automatic validation against registered schemas
 * - Reactive error tracking per topic
 * - Deep path navigation and manipulation
 * - Schema version tracking for reactivity
 *
 * Usage:
 *   const store = new ValidatedTopicStore();
 *   store.registerSchema('app/users/+', userSchema);
 *   store.publish('app/users/user-1', userData); // Validates automatically
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Schema, ValidateFunction } from 'ajv';
import { SvelteMap } from 'svelte/reactivity';

// Standardized AJV instance configuration
// Shared instance across all schema validations for performance
const ajv = new Ajv({
	allErrors: true, // Collect all validation errors, not just the first
	useDefaults: true, // Apply default values from schema
	coerceTypes: true, // Useful for MQTT/Topic data which might come as strings
	strict: false // Allow additional properties (we control this in schema)
});
addFormats(ajv); // Add support for format validators (email, date, etc.)

interface SchemaEntry {
	validate: ValidateFunction;
	raw: Schema;
	regex: RegExp;
	specificity: number;
}

type SubscriberCallback<T = any> = (value: T, topic: string) => void;

/**
 * topicUtils.ts - Extracted for testability and reuse
 */
const patternToRegex = (pattern: string): RegExp => {
	const regexSource = pattern
		.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		.replace(/\+/g, '[^/]+')
		.replace(/#/g, '.*');
	return new RegExp(`^${regexSource}$`);
};

/**
 * Normalizes a topic path by removing leading/trailing slashes
 * and collapsing multiple consecutive slashes.
 *
 * @example " /app/users/ " -> "app/users"
 * @example "app//data///item" -> "app/data/item"
 */
const cleanPath = (path: string): string => {
	if (!path) return '';

	return path
		.split('/')
		.filter((segment) => segment.trim().length > 0)
		.join('/');
};

export class ValidatedTopicStore {
	// Svelte 5 Runes
	#tree = $state<Record<string, any>>({});
	#errors = $state<Map<string, any>>(new SvelteMap());

	// Internal registry for schemas and logic-based subscribers
	#schemas = new SvelteMap<string, SchemaEntry>();
	#subscribers = new Set<{ pattern: string; regex: RegExp; callback: SubscriberCallback }>();
    #resolutionCache = new Map<string, SchemaEntry | null>();
    
	// Reactive trigger for schema changes (increments when schemas are registered)
	#schemaVersion = $state(0);

	/**
	 * Calculates specificity: Higher is more specific.
	 * Exact segments = 10pts, + = 5pts, # = 1pt.
	 */
	#calculateSpecificity(pattern: string): number {
		return pattern.split('/').reduce((acc, part) => {
			if (part === '#') return acc + 1;
			if (part === '+') return acc + 5;
			return acc + 10;
		}, 0);
	}

	#patternToRegex(pattern: string): RegExp {
		const source = pattern
			.replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex
			.replace(/\+/g, '[^/]+') // + single level
			.replace(/#$/, '.*') // # multi-level (only at end per MQTT spec)
			.replace(/#/g, '.*'); // General fallback
		return new RegExp(`^${source}$`);
	}

	/**
	 * Register a JSON Schema for a specific topic pattern.
	 * Supports MQTT wildcards: '+' (single level) and '#' (multi-level remainder)
	 */
	registerSchema(pattern: string, schema: Schema) {
		const cleanedPattern = cleanPath(pattern); // Use the utility

		// Compile schema into a validation function (reusable, fast)
		const validate = ajv.compile(schema);

		const entry: SchemaEntry = {
			validate,
			raw: schema,
			regex: this.#patternToRegex(cleanedPattern),
			specificity: this.#calculateSpecificity(cleanedPattern)
		};

		// Store compiled validator, raw schema, and regex for pattern matching
		this.#schemas.set(cleanedPattern, entry);

		// CRITICAL: Clear the resolution cache
		// A new schema registration could change the "best match" for existing topics.
		this.#resolutionCache.clear();

		// Increment schema version to trigger reactivity in components using getRegisteredSchemas()
		this.#schemaVersion++;
	}

	/**
	 * Logic-based subscription (independent of UI)
	 * Returns an unsubscribe function.
	 */
	subscribe<T = any>(pattern: string, callback: SubscriberCallback<T>): () => void {
		const sub = {
			pattern,
			regex: this.#patternToRegex(pattern),
			callback
		};
		this.#subscribers.add(sub);
		return () => this.#subscribers.delete(sub);
	}

	/**
	 * Finds the best matching schema using a "Specific to General" strategy.
	 * Results are cached in #resolutionCache for O(1) subsequent lookups.
	 */
	#getBestValidator(topic: string): SchemaEntry | null {
		// 1. FAST PATH: Check the resolution cache
		// We use .has() because the cached value might be null (valid if no schema matches)
		if (this.#resolutionCache.has(topic)) {
			return this.#resolutionCache.get(topic) ?? null;
		}

		// 2. SLOW PATH: Iterate and find the most specific matching regex
		let bestMatch: SchemaEntry | null = null;

		for (const entry of this.#schemas.values()) {
			// Test if the topic matches the MQTT-style regex
			if (entry.regex.test(topic)) {
				// Specificity-based resolution:
				// An exact match segment (10) beats a '+' (5), which beats a '#' (1)
				if (!bestMatch || entry.specificity > bestMatch.specificity) {
					bestMatch = entry;
				}
			}
		}

		// 3. CACHE RESULT: Store the result for this specific topic
		// Even if bestMatch is null, we cache it to avoid scanning again for this topic
		this.#resolutionCache.set(topic, bestMatch);

		return bestMatch;
	}

	/**
	 * Validates and updates the store
	 */
	publish<T = any>(topic: string, value: T): boolean {
		const entry = this.#getBestValidator(topic);

		if (entry) {
			const isValid = entry.validate(value);
			if (!isValid) {
				this.#errors.set(topic, entry.validate.errors);
				return false;
			}
		}

		this.#errors.delete(topic);
		this.#setPath(topic, value);

		// Notify subscribers
		this.#subscribers.forEach((sub) => {
			if (sub.regex.test(topic)) {
				sub.callback(value, topic);
			}
		});

		return true;
	}

	/**
	 * Deeply sets a value in the reactive tree
	 */
	#setPath(path: string, value: any) {
		const parts = path.split('/').filter(Boolean);
		let current = this.#tree;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (i === parts.length - 1) {
				current[part] = value;
			} else {
				if (!(part in current) || typeof current[part] !== 'object') {
					current[part] = {};
				}
				current = current[part];
			}
		}
	}

	/**
	 * Retrieve data at a specific path
	 */
	at<T = any>(topic: string): T | undefined {
		return topic
			.split('/')
			.filter(Boolean)
			.reduce((obj, key) => obj?.[key], this.#tree) as T;
	}

	/**
	 * Deletes a topic and its associated errors
	 */
	delete(topic: string): void {
		const parts = topic.split('/').filter(Boolean);
		const targetKey = parts.pop();
		if (!targetKey) return;

		const parent = parts.length === 0 ? this.#tree : this.at<Record<string, any>>(parts.join('/'));

		if (parent && targetKey in parent) {
			delete parent[targetKey];
		}
		this.#errors.delete(topic);
	}

	/**
	 * Returns a list of children at a path
	 */
	getAllAt<T = any>(
		path: string,
		options: {
			exclude?: string[];
			filter?: (key: string, value: any) => boolean;
			includePrimitives?: boolean; // New option for robustness
		} = {}
	): Array<{ id: string; data: T }> {
		const cleanRoot = cleanPath(path);
		const node = this.at<Record<string, any>>(cleanRoot);

		// Return empty if path doesn't exist or isn't a container
		if (!node || typeof node !== 'object' || Array.isArray(node)) return [];

		const { exclude = [], filter, includePrimitives = false } = options;

		return Object.entries(node)
			.filter(([key, value]) => {
				if (exclude.includes(key)) return false;

				// Apply custom logic filter
				if (filter && !filter(key, value)) return false;

				// MQTT allows primitives at any level.
				// By default, we usually only want child 'objects' in SaaS dashboards,
				// but we should allow primitives if explicitly requested.
				if (!includePrimitives) {
					return value !== null && typeof value === 'object' && !Array.isArray(value);
				}

				return true;
			})
			.map(([id, data]) => ({ id, data: data as T }));
	}

	/**
	 * AI Prompt Generation with enhanced schema reflection
	 */
	getAISchemaPrompt(topic: string): string {
		const entry = this.#getBestValidator(topic);
		if (!entry) return `Provide a valid JSON object for: "${topic}".`;

		const jsonSchema = JSON.stringify(entry.raw, null, 2);
		const required = (entry.raw as any).required || [];

		let prompt = `Role: Data Architect. Task: Generate JSON for "${topic}".\n`;
		prompt += `Constraints: Must strictly follow this schema:\n\`\`\`json\n${jsonSchema}\n\`\`\`\n`;

		if (required.includes('reasoning')) {
			prompt += `\nNote: The "reasoning" field is mandatory. Perform chain-of-thought analysis here before setting other values.`;
		}

		return prompt;
	}

	/**
	 * Get all registered schema patterns
	 */
	getRegisteredSchemas(): Array<{ pattern: string; schema: Schema }> {
		return Array.from(this.#schemas.entries()).map(([pattern, entry]) => ({
			pattern,
			schema: entry.raw
		}));
	}

	/**
	 * Clear all items at a given path
	 * @param path - The path to clear items from (e.g., 'app/users')
	 * @param options - Optional configuration
	 * @param options.exclude - Array of keys to exclude from clearing
	 */

	clearAllAt(path: string, options: { exclude?: string[] } = {}): void {
		const cleanRoot = cleanPath(path);
		const node = this.at<Record<string, any>>(cleanRoot);

		if (!node || typeof node !== 'object') return;

		const exclude = options.exclude ?? [];

		// Use Object.keys to get a snapshot of keys to avoid
		// issues if the object structure mutates during iteration
		for (const key of Object.keys(node)) {
			if (exclude.includes(key)) continue;

			const fullPath = `${cleanRoot}/${key}`;

			// 1. Trigger deletion (which cleans up error state)
			this.delete(fullPath);

			// 2. Notify subscribers that this specific topic is now null/deleted
			this.#subscribers.forEach((sub) => {
				if (sub.regex.test(fullPath)) {
					sub.callback(undefined, fullPath);
				}
			});
		}
	}

	// Getters for Svelte 5 consumption
	get errors() {
		return this.#errors;
	}
	get tree() {
		return this.#tree;
	}
	get schemaVersion() {
		return this.#schemaVersion;
	}

	/**
	 * Utility to export state for debugging or persistence
	 */
	toJSON() {
		return JSON.parse(JSON.stringify(this.#tree));
	}
}
