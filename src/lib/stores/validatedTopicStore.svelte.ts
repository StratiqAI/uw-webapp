/**
 * ValidatedTopicStore.svelte.ts
 *
 * PHILOSOPHY & DESIGN PRINCIPLES
 * ===============================
 *
 * This store embodies a "Schema-First, Topic-Based" architecture that bridges the gap between
 * structured data validation and flexible, hierarchical state management. The design philosophy
 * is inspired by MQTT's topic system but applied to application state with strong typing and
 * validation guarantees.
 *
 * Core Principles:
 * 1. **Validation at the Boundary**: All data entering the store is validated against registered
 *    JSON Schemas. This ensures data integrity and prevents invalid states from propagating.
 * 2. **Specificity-Based Resolution**: When multiple schemas match a topic (via wildcards),
 *    the most specific schema wins. This allows for general defaults while enabling specific
 *    overrides (e.g., 'app/users/#' has a default, but 'app/users/admin' can have stricter rules).
 * 3. **Reactive by Design**: Built on Svelte 5's $state runes, the store automatically triggers
 *    UI updates when data changes. This eliminates the need for manual subscription management
 *    in components while still supporting programmatic subscriptions for logic-based reactions.
 * 4. **Performance Through Caching**: Schema resolution is cached per topic to avoid repeated
 *    regex matching and specificity calculations. The cache is invalidated when schemas change,
 *    ensuring correctness while maintaining O(1) lookup performance for published data.
 * 5. **Separation of Concerns**: Validation (schema matching), storage (tree structure), and
 *    reactivity (Svelte runes) are cleanly separated, making each concern testable and maintainable.
 *
 * ARCHITECTURE
 * ============
 *
 * The store maintains three core data structures:
 * - #tree: The hierarchical data store, organized by topic paths (e.g., 'app/users/user-1')
 * - #schemas: A registry of compiled validators, pattern regexes, and specificity scores
 * - #errors: A reactive map tracking validation errors per topic for UI error display
 *
 * Data Flow:
 * 1. Schemas are registered with patterns (e.g., 'app/users/+')
 * 2. Data is published to topics (e.g., 'app/users/user-1')
 * 3. The store finds the best matching schema using specificity-based resolution
 * 4. Data is validated; if valid, stored in #tree; if invalid, stored in #errors
 * 5. Subscribers are notified of changes
 * 6. UI components reactively update via Svelte's $state system
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
import type { JsonSchemaDefinition } from '$lib/types/models';

/**
 * Schema registration with optional topic-pattern binding.
 * Schemas without a topicPattern are catalog-only (queryable by ID
 * but not used for publish() validation).
 */
export interface SchemaRegistration {
	id: string;
	name: string;
	description?: string;
	source?: 'ui' | 'code' | 'ai';
	topicPattern?: string;
	jsonSchema: JsonSchemaDefinition;
}

/**
 * AJV Validator Configuration
 * ===========================
 *
 * We use a singleton AJV instance shared across all schema validations for performance.
 * AJV compiles schemas into optimized validation functions, and reusing a single instance
 * allows for schema compilation caching and better memory efficiency.
 *
 * Configuration choices:
 * - allErrors: Collect ALL validation errors, not just the first. This gives users complete
 *   feedback about what's wrong with their data, making debugging faster and UX better.
 * - useDefaults: Automatically apply default values from the schema. This reduces boilerplate
 *   in calling code and ensures consistent data structure.
 * - coerceTypes: Coerce string/number types when possible. This is especially useful for
 *   topic-based systems where data might come from MQTT messages, URLs, or forms as strings
 *   but need to be validated as numbers or other types.
 * - strict: false: Allow properties not defined in the schema. This gives flexibility while
 *   still validating required properties. Schema authors can control strictness via their
 *   schema definitions (additionalProperties: false).
 */
const ajv = new Ajv({
	allErrors: true,
	useDefaults: true,
	coerceTypes: true,
	strict: false
});
addFormats(ajv); // Add support for format validators (email, date, URL, etc.)

/**
 * SchemaEntry Interface
 * =====================
 *
 * Each registered schema is stored with four key pieces of information:
 * - validate: A compiled AJV validation function (fast, reusable)
 * - raw: The original JSON Schema for inspection, AI prompt generation, etc.
 * - regex: A compiled regex pattern that matches topics (e.g., 'app/users/+' -> /^app\/users\/[^\/]+$/)
 * - specificity: A numeric score indicating how specific this pattern is (higher = more specific)
 *
 * Storing the regex and specificity pre-computed allows for O(1) pattern matching and
 * O(n) specificity comparison during resolution, rather than recomputing on every publish.
 */
interface SchemaEntry {
	validate: ValidateFunction;
	raw: Schema;
	regex: RegExp;
	specificity: number;
}

/**
 * SubscriberCallback Type
 * =======================
 *
 * Callback signature for programmatic subscriptions (logic-based, not UI-based).
 * UI components typically use Svelte's reactive $state system instead, but this allows
 * for imperative code to react to data changes (e.g., logging, side effects, API calls).
 */
type SubscriberCallback<T = any> = (value: T, topic: string) => void;

/**
 * Pattern to Regex Conversion (Utility)
 * ======================================
 *
 * Converts MQTT-style topic patterns into JavaScript regex patterns.
 * This follows the MQTT specification for wildcards:
 * - '+': Matches exactly one topic level (e.g., 'app/+' matches 'app/users' but not 'app/users/admin')
 * - '#': Matches zero or more topic levels (e.g., 'app/#' matches 'app/users' and 'app/users/admin/details')
 *
 * Note: This is a utility function extracted for testability, but the class also has its
 * own #patternToRegex method for consistency. In a production system, you might want to
 * consolidate these or extract to a shared utility module.
 */
const patternToRegex = (pattern: string): RegExp => {
	const regexSource = pattern
		.replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special characters
		.replace(/\+/g, '[^/]+') // + becomes "one or more non-slash characters"
		.replace(/#/g, '.*'); // # becomes "any characters" (multi-level match)
	return new RegExp(`^${regexSource}$`);
};

/**
 * Path Normalization Utility
 * ===========================
 *
 * Normalizes topic paths by:
 * 1. Removing leading/trailing slashes (e.g., "/app/users/" -> "app/users")
 * 2. Collapsing multiple consecutive slashes (e.g., "app//data" -> "app/data")
 * 3. Filtering out empty segments
 *
 * This ensures consistent path representation regardless of user input format.
 * For example, all of these are treated as equivalent: "app/users", "/app/users", "app/users/", "app//users"
 *
 * Philosophy: Be permissive with input format, but strict with internal representation.
 * This improves developer experience while maintaining predictable behavior.
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

/**
 * ValidatedTopicStore Class
 * ==========================
 *
 * The core store class that manages hierarchical data with schema validation.
 *
 * STATE MANAGEMENT PHILOSOPHY:
 * - Uses Svelte 5's $state runes for reactive state that automatically triggers UI updates
 * - Private fields (#) ensure encapsulation and prevent external mutation
 * - Separate reactive state (#tree, #errors, #schemaVersion) from non-reactive collections (#schemas, #subscribers)
 *
 * DATA STRUCTURES:
 * - #tree: Reactive hierarchical data store (topic path -> value)
 * - #errors: Reactive error map (topic -> validation errors)
 * - #schemas: Schema registry (pattern -> SchemaEntry with compiled validator and metadata)
 * - #subscribers: Set of programmatic subscribers (for logic-based reactions, not UI)
 * - #resolutionCache: Performance cache for schema resolution (topic -> best matching SchemaEntry)
 * - #schemaVersion: Reactive counter that increments on schema registration (triggers UI updates)
 */
export class ValidatedTopicStore {
	/**
	 * The hierarchical data tree. Structure mirrors topic paths:
	 * 'app/users/user-1' -> tree.app.users['user-1']
	 * 
	 * Reactive: Changes to this object automatically trigger Svelte component updates.
	 */
	#tree = $state<Record<string, any>>({});

	/**
	 * Validation errors keyed by topic path.
	 * 
	 * Reactive: UI components can subscribe to errors for display.
	 * Errors are automatically cleared when data becomes valid.
	 */
	#errors = $state<Map<string, any>>(new SvelteMap());

	/**
	 * Schema registry mapping topic patterns to compiled validators and metadata.
	 * 
	 * Non-reactive: Schema registration doesn't need to trigger UI updates directly
	 * (components that need schema info can watch #schemaVersion instead).
	 */
	#schemas = new SvelteMap<string, SchemaEntry>();

	/**
	 * Programmatic subscribers for logic-based reactions (logging, side effects, etc.).
	 * 
	 * UI components should use Svelte's reactive $state system instead of subscribing here.
	 */
	#subscribers = new Set<{ pattern: string; regex: RegExp; callback: SubscriberCallback }>();

	/**
	 * Performance optimization: Cache the best-matching schema for each topic.
	 * 
	 * Key: topic path (e.g., 'app/users/user-1')
	 * Value: Best matching SchemaEntry, or null if no schema matches
	 * 
	 * This cache is invalidated when schemas are registered (they might change the "best match").
	 * Without caching, every publish() would need to iterate through all schemas and compare specificity.
	 */
	#resolutionCache = new Map<string, SchemaEntry | null>();

	/**
	 * ID-based schema catalog. Stores full SchemaRegistration objects
	 * for both topic-bound and catalog-only schemas.
	 */
	#schemasById = new Map<string, SchemaRegistration>();

	/**
	 * Reverse map from topic pattern to SchemaRegistration, enabling
	 * getSchemaForTopic() to return full metadata after pattern resolution.
	 */
	#patternToRegistration = new Map<string, SchemaRegistration>();

	/**
	 * Reactive version counter that increments when schemas are registered.
	 * 
	 * Components that need to react to schema changes (e.g., displaying available schemas)
	 * can subscribe to this value. This pattern avoids the overhead of making #schemas reactive
	 * while still providing reactivity where needed.
	 */
	#schemaVersion = $state(0);

	/**
	 * Specificity Calculation
	 * ========================
	 *
	 * Calculates a numeric "specificity score" for a topic pattern. Higher scores indicate
	 * more specific patterns, which should take precedence when multiple schemas match.
	 *
	 * Scoring system (per segment):
	 * - Exact segment (e.g., 'users'): 10 points - Most specific, exact match
	 * - Single wildcard '+' (e.g., '+'): 5 points - Matches one level, less specific
	 * - Multi wildcard '#' (e.g., '#'): 1 point - Matches multiple levels, least specific
	 *
	 * Examples:
	 * - 'app/users/admin' = 30 (3 exact segments)
	 * - 'app/users/+' = 25 (2 exact + 1 wildcard)
	 * - 'app/#' = 11 (1 exact + 1 multi-wildcard)
	 *
	 * This scoring system ensures that when multiple schemas match a topic, the most
	 * restrictive (and therefore most appropriate) schema is chosen.
	 */
	#calculateSpecificity(pattern: string): number {
		return pattern.split('/').reduce((acc, part) => {
			if (part === '#') return acc + 1;  // Multi-level wildcard: least specific
			if (part === '+') return acc + 5;  // Single-level wildcard: medium specificity
			return acc + 10;                     // Exact match: most specific
		}, 0);
	}

	/**
	 * Pattern to Regex Conversion (Instance Method)
	 * ==============================================
	 *
	 * Converts MQTT-style topic patterns to JavaScript regex patterns for matching.
	 * This method is used internally for schema pattern matching and subscriber pattern matching.
	 *
	 * Conversion rules:
	 * 1. Escape regex special characters (to match literals like '.' in topic names)
	 * 2. Replace '+' with '[^/]+' (matches one or more non-slash characters - one topic level)
	 * 3. Replace '#' with '.*' (matches any characters - multiple topic levels)
	 *
	 * Note: Per MQTT spec, '#' can only appear at the end of a pattern, but we handle
	 * it anywhere for robustness. The regex is anchored (^...$) to ensure exact matching.
	 */
	#patternToRegex(pattern: string): RegExp {
		const source = pattern
			.replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special characters
			.replace(/\+/g, '[^/]+')                // '+' -> single topic level matcher
			.replace(/#$/, '.*')                    // '#' at end -> multi-level matcher (MQTT spec)
			.replace(/#/g, '.*');                   // '#' anywhere -> multi-level matcher (fallback)
		return new RegExp(`^${source}$`);           // Anchor to ensure exact match
	}

	/**
	 * Schema Registration (overloaded)
	 *
	 * Form 1 — SchemaRegistration object:
	 *   Stores full metadata in the ID catalog. If topicPattern is present,
	 *   also compiles with AJV for publish() validation.
	 *
	 * Form 2 — (pattern, schema) legacy:
	 *   Backward-compatible path. Compiles AJV validator for the pattern
	 *   but does not create an entry in the ID catalog.
	 *
	 * Both forms clear the resolution cache and bump schemaVersion.
	 */
	registerSchema(registration: SchemaRegistration): void;
	registerSchema(pattern: string, schema: Schema): void;
	registerSchema(patternOrReg: string | SchemaRegistration, schema?: Schema): void {
		if (typeof patternOrReg === 'object') {
			const reg = patternOrReg;
			this.#schemasById.set(reg.id, reg);

			if (reg.topicPattern) {
				const cleanedPattern = cleanPath(reg.topicPattern);
				const validate = ajv.compile(reg.jsonSchema as Schema);
				const entry: SchemaEntry = {
					validate,
					raw: reg.jsonSchema as Schema,
					regex: this.#patternToRegex(cleanedPattern),
					specificity: this.#calculateSpecificity(cleanedPattern)
				};
				this.#schemas.set(cleanedPattern, entry);
				this.#patternToRegistration.set(cleanedPattern, reg);
			}
		} else {
			const cleanedPattern = cleanPath(patternOrReg);
			const validate = ajv.compile(schema!);
			const entry: SchemaEntry = {
				validate,
				raw: schema!,
				regex: this.#patternToRegex(cleanedPattern),
				specificity: this.#calculateSpecificity(cleanedPattern)
			};
			this.#schemas.set(cleanedPattern, entry);
		}

		this.#resolutionCache.clear();
		this.#schemaVersion++;
	}

	/**
	 * Programmatic Subscription
	 * ==========================
	 *
	 * Allows imperative code (not UI components) to react to data changes.
	 * UI components should use Svelte's reactive $state system instead (e.g., accessing store.tree).
	 *
	 * Use Cases:
	 * - Side effects (logging, analytics, API calls)
	 * - Business logic that needs to react to data changes
	 * - Integration with non-Svelte code
	 *
	 * Pattern matching uses MQTT wildcards, same as schema registration:
	 * - 'app/users/+' matches 'app/users/user-1' but not 'app/users/user-1/details'
	 * - 'app/#' matches all topics under 'app/'
	 *
	 * The callback receives the new value and the topic path that changed.
	 * If a topic is deleted, the callback is invoked with undefined as the value.
	 *
	 * @param pattern - Topic pattern with optional wildcards
	 * @param callback - Function to call when matching topics change
	 * @returns Unsubscribe function that removes this subscription
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
	 * Schema Resolution with Specificity-Based Matching
	 * ===================================================
	 *
	 * Finds the best-matching schema for a given topic using a "most specific wins" strategy.
	 *
	 * Resolution Strategy:
	 * 1. Check cache first (O(1) lookup) - performance optimization
	 * 2. If not cached, iterate through all registered schemas
	 * 3. Test each schema's regex pattern against the topic
	 * 4. Among all matching schemas, select the one with highest specificity score
	 * 5. Cache the result for future lookups
	 *
	 * Why Specificity Matters:
	 * Consider these schemas:
	 *   - 'app/#' (specificity: 11) - matches all app topics
	 *   - 'app/users/+' (specificity: 25) - matches user topics specifically
	 *   - 'app/users/admin' (specificity: 30) - matches admin user specifically
	 *
	 * For topic 'app/users/admin', all three match, but we want the most specific (admin schema)
	 * because it likely has stricter validation rules. This allows general defaults with specific overrides.
	 *
	 * Performance:
	 * - First lookup: O(n) where n = number of registered schemas
	 * - Subsequent lookups: O(1) via cache
	 * - Cache is invalidated on schema registration (registerSchema clears it)
	 *
	 * @param topic - The topic path to find a schema for (e.g., 'app/users/user-1')
	 * @returns The best-matching SchemaEntry, or null if no schema matches
	 */
	#getBestValidator(topic: string): SchemaEntry | null {
		// 1. FAST PATH: Check the resolution cache
		// We use .has() because the cached value might be null (valid if no schema matches)
		// Caching null prevents repeated scans for topics with no matching schema
		if (this.#resolutionCache.has(topic)) {
			return this.#resolutionCache.get(topic) ?? null;
		}

		// 2. SLOW PATH: Iterate and find the most specific matching regex
		// This runs on cache miss or when cache is invalidated
		let bestMatch: SchemaEntry | null = null;

		for (const entry of this.#schemas.values()) {
			// Test if the topic matches the MQTT-style regex
			if (entry.regex.test(topic)) {
				// Specificity-based resolution:
				// An exact match segment (10) beats a '+' (5), which beats a '#' (1)
				// Higher specificity = more specific pattern = better match
				if (!bestMatch || entry.specificity > bestMatch.specificity) {
					bestMatch = entry;
				}
			}
		}

		// 3. CACHE RESULT: Store the result for this specific topic
		// Even if bestMatch is null, we cache it to avoid scanning again for this topic
		// This is important for performance when many topics have no matching schema
		this.#resolutionCache.set(topic, bestMatch);

		return bestMatch;
	}

	/**
	 * Publish Data to Store (Core Method)
	 * ====================================
	 *
	 * The primary method for adding or updating data in the store. This method embodies
	 * the store's core philosophy: "Validate at the boundary, store if valid."
	 *
	 * Execution Flow:
	 * 1. Resolve the best-matching schema for the topic (cached for performance)
	 * 2. If a schema exists, validate the data against it
	 * 3. If validation fails, store errors and return false (data NOT stored)
	 * 4. If validation passes (or no schema), clear errors and store the data
	 * 5. Notify all matching subscribers (programmatic subscriptions)
	 * 6. Return true to indicate success
	 *
	 * Validation Philosophy:
	 * - If no schema matches, data is stored without validation (permissive by default)
	 * - If a schema matches but validation fails, data is NOT stored (fail-safe)
	 * - Errors are stored in the reactive #errors map for UI display
	 * - Once data becomes valid, errors are automatically cleared
	 *
	 * Reactivity:
	 * - Updating #tree triggers Svelte reactivity (UI components auto-update)
	 * - Updating #errors triggers reactive error displays
	 * - Subscribers are notified for logic-based reactions
	 *
	 * @param topic - The topic path to publish to (e.g., 'app/users/user-1')
	 * @param value - The data to publish (will be validated if a schema matches)
	 * @returns true if data was stored (valid or no schema), false if validation failed
	 */
	publish<T = any>(topic: string, value: T): boolean {
		const entry = this.#getBestValidator(topic);

		if (entry) {
			// Schema exists: validate the data
			const isValid = entry.validate(value);
			if (!isValid) {
				// Validation failed: store errors and reject the data
				this.#errors.set(topic, entry.validate.errors);
				return false;
			}
		}
		// Validation passed (or no schema): store the data

		// Clear any previous errors (data is now valid)
		this.#errors.delete(topic);

		// Store the data in the reactive tree (triggers UI updates)
		this.#setPath(topic, value);

		// Notify programmatic subscribers (for side effects, logging, etc.)
		this.#subscribers.forEach((sub) => {
			if (sub.regex.test(topic)) {
				sub.callback(value, topic);
			}
		});

		return true;
	}

	/**
	 * Deep Path Setting (Internal Helper)
	 * ====================================
	 *
	 * Sets a value at a nested path in the reactive tree, creating intermediate objects as needed.
	 *
	 * Example: setPath('app/users/user-1', data) creates:
	 *   tree.app = {}
	 *   tree.app.users = {}
	 *   tree.app.users['user-1'] = data
	 *
	 * Reactivity: Because #tree is a $state reactive object, modifying it (even deeply nested)
	 * triggers Svelte's reactivity system. UI components that access tree.app.users['user-1']
	 * will automatically re-render when this value changes.
	 *
	 * Safety: If an intermediate path exists but isn't an object (e.g., tree.app is a string),
	 * it will be overwritten with an object. This prevents runtime errors but means the previous
	 * value is lost. Schema validation should prevent this scenario in practice.
	 *
	 * @param path - Topic path (e.g., 'app/users/user-1')
	 * @param value - Value to store at that path
	 */
	#setPath(path: string, value: any) {
		const parts = path.split('/').filter(Boolean);
		let current = this.#tree;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (i === parts.length - 1) {
				// Last part: set the value
				current[part] = value;
			} else {
				// Intermediate part: ensure it's an object, create if needed
				if (!(part in current) || typeof current[part] !== 'object') {
					current[part] = {};
				}
				current = current[part];
			}
		}
	}

	/**
	 * Retrieve Data at Topic Path
	 * ============================
	 *
	 * Retrieves data stored at a specific topic path using safe navigation.
	 *
	 * This method uses optional chaining (?.) internally, so it never throws errors
	 * if intermediate paths don't exist - it simply returns undefined.
	 *
	 * Reactivity: In Svelte components, accessing store.tree directly or via this method
	 * creates a reactive subscription. When the data changes, the component re-renders.
	 *
	 * Example:
	 *   store.publish('app/users/user-1', { name: 'Alice' });
	 *   const user = store.at('app/users/user-1'); // { name: 'Alice' }
	 *   const missing = store.at('app/nonexistent'); // undefined
	 *
	 * @param topic - Topic path to retrieve data from
	 * @returns The data at that path, or undefined if not found
	 */
	at<T = any>(topic: string): T | undefined {
		// Safe navigation: splits path, filters empty segments, navigates through tree
		// Returns undefined if any intermediate path doesn't exist
		return topic
			.split('/')
			.filter(Boolean)
			.reduce((obj, key) => obj?.[key], this.#tree) as T;
	}

	/**
	 * Delete Topic and Data
	 * ======================
	 *
	 * Removes a topic's data from the store and clears any associated validation errors.
	 *
	 * Deletion Strategy:
	 * - Only removes the final key in the path (doesn't delete parent objects)
	 * - Clears errors for the deleted topic
	 * - Safe: doesn't throw if topic doesn't exist
	 *
	 * Reactivity: Deleting from #tree triggers Svelte reactivity, so UI components
	 * automatically update to reflect the deletion.
	 *
	 * Note: This does NOT notify subscribers of the deletion. If you need subscribers
	 * to be notified, use clearAllAt() which handles notifications, or manually notify
	 * after calling delete().
	 *
	 * @param topic - Topic path to delete (e.g., 'app/users/user-1')
	 */
	delete(topic: string): void {
		const parts = topic.split('/').filter(Boolean);
		const targetKey = parts.pop();
		if (!targetKey) return; // Empty path, nothing to delete

		// Navigate to parent object
		const parent = parts.length === 0 ? this.#tree : this.at<Record<string, any>>(parts.join('/'));

		// Delete the key if parent exists and key exists
		if (parent && targetKey in parent) {
			delete parent[targetKey];
		}

		// Clear any validation errors for this topic
		this.#errors.delete(topic);
	}

	/**
	 * Get All Children at Path
	 * =========================
	 *
	 * Returns an array of all child items at a given path, useful for listing collections.
	 *
	 * Use Cases:
	 * - Listing all users under 'app/users'
	 * - Displaying all items in a category
	 * - Rendering dynamic lists in UI components
	 *
	 * Filtering Options:
	 * - exclude: Array of keys to skip (e.g., exclude metadata keys)
	 * - filter: Custom predicate function for advanced filtering
	 * - includePrimitives: Whether to include non-object values (strings, numbers, etc.)
	 *
	 * Default Behavior:
	 * By default, only returns child objects (not primitives or arrays). This aligns with
	 * common SaaS dashboard patterns where paths like 'app/users' contain object children
	 * like 'user-1', 'user-2', etc. However, MQTT topics can contain primitives at any level,
	 * so includePrimitives allows access to those when needed.
	 *
	 * Return Format:
	 * Each child is returned as { id: string, data: T } where:
	 * - id: The key/identifier (e.g., 'user-1')
	 * - data: The value stored at that key
	 *
	 * @param path - Parent path to get children from (e.g., 'app/users')
	 * @param options - Filtering and inclusion options
	 * @returns Array of child items with id and data
	 */
	#getAllEntries<T = any>(
		path: string,
		options: {
			exclude?: string[];
			filter?: (key: string, value: any) => boolean;
			includePrimitives?: boolean;
		} = {}
	): Array<{ id: string; data: T }> {
		const cleanRoot = cleanPath(path);
		const node = this.at<Record<string, any>>(cleanRoot);

		// Return empty if path doesn't exist or isn't a container object
		if (!node || typeof node !== 'object' || Array.isArray(node)) return [];

		const { exclude = [], filter, includePrimitives = false } = options;

		return Object.entries(node)
			.filter(([key, value]) => {
				// Exclusion filter: skip specified keys
				if (exclude.includes(key)) return false;

				// Custom filter: apply user-defined predicate
				if (filter && !filter(key, value)) return false;

				// Type filter: by default, only include objects (not primitives or arrays)
				// MQTT allows primitives at any level, but SaaS dashboards typically want
				// child objects (e.g., users, items, etc.) rather than primitive values
				if (!includePrimitives) {
					return value !== null && typeof value === 'object' && !Array.isArray(value);
				}

				return true;
			})
			.map(([id, data]) => ({ id, data: data as T }));
	}

	/**
	 * Get All Children at Path (Map)
	 * ===============================
	 *
	 * Returns a Map of child items keyed by id.
	 *
	 * @param path - Parent path to get children from (e.g., 'app/users')
	 * @param options - Filtering and inclusion options
	 * @returns Map of child id -> data
	 */
	getAllAtMap<T = any>(
		path: string,
		options: {
			exclude?: string[];
			filter?: (key: string, value: any) => boolean;
			includePrimitives?: boolean;
		} = {}
	): Map<string, T> {
		const entries = this.#getAllEntries<T>(path, options);
		return new Map(entries.map(({ id, data }) => [id, data]));
	}

	/**
	 * Get All Children at Path (Array)
	 * ================================
	 *
	 * Returns an array of child data items.
	 *
	 * @param path - Parent path to get children from (e.g., 'app/users')
	 * @param options - Filtering and inclusion options
	 * @returns Array of child data items
	 */
	getAllAtArray<T = any>(
		path: string,
		options: {
			exclude?: string[];
			filter?: (key: string, value: any) => boolean;
			includePrimitives?: boolean;
		} = {}
	): T[] {
		return this.#getAllEntries<T>(path, options).map(({ data }) => data);
	}

	getAllAt<T = any>(
		path: string,
		options: {
			exclude?: string[];
			filter?: (key: string, value: any) => boolean;
			includePrimitives?: boolean;
		} = {}
	): Array<{ id: string; data: T }> {
		return this.#getAllEntries<T>(path, options);
	}

	/**
	 * AI Prompt Generation from Schema
	 * =================================
	 *
	 * Generates a structured prompt for AI systems (like LLMs) to generate valid data
	 * conforming to the schema registered for a given topic.
	 *
	 * Use Cases:
	 * - Generating data via AI that must conform to schemas
	 * - Providing context to AI assistants about expected data structure
	 * - Creating validation-aware AI agents
	 *
	 * Prompt Structure:
	 * 1. Role definition (Data Architect)
	 * 2. Task description (generate JSON for topic)
	 * 3. Schema constraints (the full JSON Schema)
	 * 4. Special instructions (e.g., chain-of-thought for 'reasoning' fields)
	 *
	 * Philosophy: By generating prompts from registered schemas, we ensure that AI-generated
	 * data will be valid before it's even generated. This reduces validation failures and
	 * creates a tighter feedback loop between schema definition and data generation.
	 *
	 * @param topic - Topic path to generate prompt for
	 * @returns A formatted prompt string ready for AI consumption
	 */
	getAISchemaPrompt(topic: string): string {
		const entry = this.#getBestValidator(topic);
		if (!entry) {
			// No schema: provide minimal prompt
			return `Provide a valid JSON object for: "${topic}".`;
		}

		const jsonSchema = JSON.stringify(entry.raw, null, 2);
		const required = (entry.raw as any).required || [];

		let prompt = `Role: Data Architect. Task: Generate JSON for "${topic}".\n`;
		prompt += `Constraints: Must strictly follow this schema:\n\`\`\`json\n${jsonSchema}\n\`\`\`\n`;

		// Special handling for 'reasoning' fields (common in AI-generated data)
		// Encourages chain-of-thought reasoning before generating final values
		if (required.includes('reasoning')) {
			prompt += `\nNote: The "reasoning" field is mandatory. Perform chain-of-thought analysis here before setting other values.`;
		}

		return prompt;
	}

	// ===== ID-based Schema Catalog =====

	getSchemaById(id: string): SchemaRegistration | undefined {
		return this.#schemasById.get(id);
	}

	getJsonSchemaById(id: string): JsonSchemaDefinition | undefined {
		return this.#schemasById.get(id)?.jsonSchema;
	}

	getAllSchemaDefinitions(): SchemaRegistration[] {
		return Array.from(this.#schemasById.values());
	}

	/**
	 * Resolves the best-matching SchemaRegistration for a topic.
	 * Returns undefined if no registration is linked to the matched pattern
	 * (e.g. when the schema was registered via the legacy (pattern, schema) form).
	 */
	getSchemaForTopic(topic: string): SchemaRegistration | undefined {
		const entry = this.#getBestValidator(topic);
		if (!entry) return undefined;
		for (const [pattern, schemaEntry] of this.#schemas.entries()) {
			if (schemaEntry === entry) {
				return this.#patternToRegistration.get(pattern);
			}
		}
		return undefined;
	}

	// ===== Pattern-based Schema Queries =====

	/**
	 * Returns all registered schema patterns and their raw schemas.
	 * Reactivity: watch schemaVersion to react to changes, then call this method.
	 */
	getRegisteredSchemas(): Array<{ pattern: string; schema: Schema }> {
		return Array.from(this.#schemas.entries()).map(([pattern, entry]) => ({
			pattern,
			schema: entry.raw
		}));
	}

	/**
	 * Clear All Children at Path
	 * ===========================
	 *
	 * Removes all child items at a given path, useful for bulk deletion operations.
	 *
	 * Use Cases:
	 * - Clearing all users: clearAllAt('app/users')
	 * - Resetting a category or collection
	 * - Implementing "clear all" functionality in UIs
	 *
	 * Behavior:
	 * 1. Deletes each child using the delete() method (cleans up errors)
	 * 2. Notifies subscribers for each deleted topic (with undefined value)
	 * 3. Respects exclude list to preserve certain keys (e.g., metadata, defaults)
	 *
	 * Subscriber Notification:
	 * Unlike delete(), this method actively notifies subscribers when items are cleared.
	 * This ensures that logic-based subscriptions (logging, side effects, etc.) are aware
	 * of bulk deletions, not just individual deletions.
	 *
	 * Safety: Uses Object.keys() snapshot to avoid iteration issues if the object
	 * structure changes during deletion (defensive programming).
	 *
	 * @param path - Parent path to clear children from (e.g., 'app/users')
	 * @param options.exclude - Array of keys to preserve (not delete)
	 */
	clearAllAt(path: string, options: { exclude?: string[] } = {}): void {
		const cleanRoot = cleanPath(path);
		const node = this.at<Record<string, any>>(cleanRoot);

		if (!node || typeof node !== 'object') return;

		const exclude = options.exclude ?? [];

		// Use Object.keys to get a snapshot of keys to avoid
		// issues if the object structure mutates during iteration
		// (defensive programming - shouldn't happen, but protects against bugs)
		for (const key of Object.keys(node)) {
			if (exclude.includes(key)) continue;

			const fullPath = `${cleanRoot}/${key}`;

			// 1. Trigger deletion (which cleans up error state)
			this.delete(fullPath);

			// 2. Notify subscribers that this specific topic is now null/deleted
			// This ensures programmatic subscribers are aware of bulk deletions
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

export const validatedTopicStore = new ValidatedTopicStore();