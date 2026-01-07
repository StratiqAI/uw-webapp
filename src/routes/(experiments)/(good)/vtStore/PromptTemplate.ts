/**
 * PromptTemplate.ts
 * 
 * Template resolver for prompts that can reference data from the store.
 * 
 * This module provides functionality to resolve template variables in prompts,
 * allowing one AI request to use the output of previous AI requests.
 * 
 * Template Syntax:
 * - {{store:app/users/item-1}} - References a specific topic path in the store
 * - {{store:app/users/item-1.name}} - References a nested property
 * - {{store:app/users/+}} - References all items matching a pattern
 * 
 * Usage:
 *   const template = new PromptTemplate('Generate a profile based on {{store:app/users/item-1}}');
 *   const resolved = template.resolve(store);
 */

import type { ValidatedTopicStore } from './ValidatedTopicStore.svelte';

/**
 * Template variable resolver
 */
export class PromptTemplate {
	private template: string;

	/**
	 * Create a new PromptTemplate instance
	 * 
	 * @param template The template string with variables
	 */
	constructor(template: string) {
		this.template = template;
	}

	/**
	 * Resolve template variables from the store
	 * 
	 * @param store The ValidatedTopicStore instance
	 * @returns Resolved prompt string
	 */
	resolve(store: ValidatedTopicStore): string {
		// Match template variables like {{store:path}} or {{store:path.property}}
		const variablePattern = /\{\{store:([^}]+)\}\}/g;

		return this.template.replace(variablePattern, (match, path) => {
			try {
				const resolved = this.resolvePath(store, path.trim());
				// Format the resolved value nicely
				if (resolved === null || resolved === undefined) {
					return `[No data found at ${path}]`;
				}
				// If it's an object/array, stringify it nicely
				if (typeof resolved === 'object') {
					return JSON.stringify(resolved, null, 2);
				}
				return String(resolved);
			} catch (error) {
				console.error(`Error resolving template variable ${path}:`, error);
				return `[Error resolving ${path}]`;
			}
		});
	}

	/**
	 * Resolve a path expression from the store
	 * 
	 * Supports:
	 * - Direct paths: 'app/users/item-1'
	 * - Nested properties: 'app/users/item-1.name'
	 * - Pattern matching: 'app/users/+' (returns array of all matches)
	 * 
	 * @param store The ValidatedTopicStore instance
	 * @param pathExpression The path expression to resolve
	 * @returns The resolved value
	 */
	private resolvePath(store: ValidatedTopicStore, pathExpression: string): any {
		// Check if it's a pattern (contains + or #)
		if (pathExpression.includes('+') || pathExpression.includes('#')) {
			// Get all items matching the pattern
			return store.getAllAt(pathExpression);
		}

		// Check if it's a nested property access (e.g., 'app/users/item-1.name')
		const parts = pathExpression.split('.');
		if (parts.length > 1) {
			const basePath = parts[0];
			const propertyPath = parts.slice(1).join('.');
			
			const baseValue = store.getAt(basePath);
			if (baseValue === null || baseValue === undefined) {
				return null;
			}

			// Navigate nested properties
			return this.getNestedProperty(baseValue, propertyPath);
		}

		// Direct path access
		return store.getAt(pathExpression);
	}

	/**
	 * Get a nested property from an object using dot notation
	 * 
	 * @param obj The object to navigate
	 * @param path The property path (e.g., 'user.name' or 'items.0.title')
	 * @returns The property value
	 */
	private getNestedProperty(obj: any, path: string): any {
		const parts = path.split('.');
		let current = obj;

		for (const part of parts) {
			if (current === null || current === undefined) {
				return null;
			}

			// Handle array indices
			if (!isNaN(Number(part))) {
				current = current[Number(part)];
			} else {
				current = current[part];
			}
		}

		return current;
	}

	/**
	 * Check if the template contains any variables
	 * 
	 * @returns True if template contains variables
	 */
	hasVariables(): boolean {
		return /\{\{store:[^}]+\}\}/.test(this.template);
	}

	/**
	 * Get all variable paths referenced in the template
	 * 
	 * @returns Array of variable paths
	 */
	getVariablePaths(): string[] {
		const paths: string[] = [];
		const variablePattern = /\{\{store:([^}]+)\}\}/g;
		let match;

		while ((match = variablePattern.exec(this.template)) !== null) {
			paths.push(match[1].trim());
		}

		return paths;
	}

	/**
	 * Validate that all referenced paths exist in the store
	 * 
	 * @param store The ValidatedTopicStore instance
	 * @returns Array of missing paths, empty if all exist
	 */
	validatePaths(store: ValidatedTopicStore): string[] {
		const paths = this.getVariablePaths();
		const missing: string[] = [];

		for (const pathExpression of paths) {
			// Skip pattern matching paths (they might not have results)
			if (pathExpression.includes('+') || pathExpression.includes('#')) {
				continue;
			}

			// Check if base path exists (before any property access)
			const basePath = pathExpression.split('.')[0];
			const value = store.getAt(basePath);

			if (value === null || value === undefined) {
				missing.push(pathExpression);
			}
		}

		return missing;
	}
}