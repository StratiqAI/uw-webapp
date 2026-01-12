/**
 * ValidatedTopicStore.test.ts
 *
 * Test suite for ValidatedTopicStore - a reactive topic-based data store
 * with JSON Schema validation.
 *
 * Test Organization:
 * - Schema Registration & Resolution
 * - Pattern Matching & Wildcards
 * - Data Publishing & Validation
 * - Data Retrieval & Navigation
 * - Error Handling
 * - Subscriptions
 * - Cache Behavior
 * - AI Prompt Generation
 * - Edge Cases & Cleanup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Schema } from 'ajv';
import { ValidatedTopicStore } from './ValidatedTopicStore.svelte';

// ============================================================================
// Test Schemas & Data
// ============================================================================

const userSchema: Schema = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		name: { type: 'string' },
		email: { type: 'string', format: 'email' },
		age: { type: 'number', minimum: 0 }
	},
	required: ['id', 'name', 'email']
};

const productSchema: Schema = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		title: { type: 'string' },
		price: { type: 'number', minimum: 0 },
		stock: { type: 'number', minimum: 0 }
	},
	required: ['id', 'title', 'price']
};

const validUserData = {
	id: 'user-1',
	name: 'John Doe',
	email: 'john@example.com',
	age: 30
};

const invalidUserData = {
	id: 'user-1',
	name: 'John Doe'
	// Missing required 'email' field
};

// ============================================================================
// Test Suite
// ============================================================================

describe('ValidatedTopicStore', () => {
	let store: ValidatedTopicStore;

	beforeEach(() => {
		store = new ValidatedTopicStore();
	});

	// ============================================================================
	// Schema Registration & Resolution
	// ============================================================================

	describe('Schema Registration', () => {
		it('should register a schema for a pattern', () => {
			store.registerSchema('app/users/+', userSchema);

			const schemas = store.getRegisteredSchemas();
			expect(schemas).toHaveLength(1);
			expect(schemas[0].pattern).toBe('app/users/+');
			expect(schemas[0].schema).toEqual(userSchema);
		});

		it('should normalize pattern paths when registering', () => {
			store.registerSchema(' /app/users/ ', userSchema);
			store.registerSchema('app//data///items', productSchema);

			const schemas = store.getRegisteredSchemas();
			expect(schemas.some(s => s.pattern === 'app/users')).toBe(true);
			expect(schemas.some(s => s.pattern === 'app/data/items')).toBe(true);
		});

		it('should increment schemaVersion when registering new schemas', () => {
			const initialVersion = store.schemaVersion;
			store.registerSchema('app/users/+', userSchema);
			expect(store.schemaVersion).toBe(initialVersion + 1);

			store.registerSchema('app/products/+', productSchema);
			expect(store.schemaVersion).toBe(initialVersion + 2);
		});

		it('should allow multiple schemas for different patterns', () => {
			store.registerSchema('app/users/+', userSchema);
			store.registerSchema('app/products/+', productSchema);

			const schemas = store.getRegisteredSchemas();
			expect(schemas).toHaveLength(2);
		});

		// TODO: Test schema registration with invalid JSON Schema
		// TODO: Test registering the same pattern twice (should it overwrite?)
	});

	// ============================================================================
	// Pattern Matching & Wildcards
	// ============================================================================

	describe('Pattern Matching', () => {
		beforeEach(() => {
			store.registerSchema('app/users/+', userSchema);
			store.registerSchema('app/users/+/settings', {
				type: 'object',
				properties: { theme: { type: 'string' } }
			});
			store.registerSchema('app/data/#', {
				type: 'object',
				properties: { value: { type: 'string' } }
			});
		});

		it('should match exact topic paths', () => {
			const result = store.publish('app/users/user-1', validUserData);
			expect(result).toBe(true);
			expect(store.at('app/users/user-1')).toEqual(validUserData);
		});

		it('should match single-level wildcard (+) patterns', () => {
			const result1 = store.publish('app/users/alice', validUserData);
			const result2 = store.publish('app/users/bob', validUserData);

			expect(result1).toBe(true);
			expect(result2).toBe(true);
			expect(store.at('app/users/alice')).toBeDefined();
			expect(store.at('app/users/bob')).toBeDefined();
		});

		it('should match multi-level wildcard (#) patterns', () => {
			const data = { value: 'test' };
			const result1 = store.publish('app/data/item1', data);
			const result2 = store.publish('app/data/nested/path/item', data);
			const result3 = store.publish('app/data/very/deeply/nested/path', data);

			expect(result1).toBe(true);
			expect(result2).toBe(true);
			expect(result3).toBe(true);
		});

		it('should not match patterns that do not match the topic', () => {
			// This topic doesn't match 'app/users/+' pattern
			store.publish('app/other/resource', { any: 'data' });
			
			// Should still store data, but without validation
			expect(store.at('app/other/resource')).toEqual({ any: 'data' });
		});

		// TODO: Test edge cases:
		// - Pattern with multiple wildcards: 'app/+/users/+/posts'
		// - Pattern starting/ending with wildcards
		// - Empty patterns
		// - Special characters in topic paths
	});

	// ============================================================================
	// Schema Resolution & Specificity
	// ============================================================================

	describe('Schema Resolution & Specificity', () => {
		it('should resolve the most specific matching schema', () => {
			// More specific pattern (exact match segments)
			store.registerSchema('app/users/settings', {
				type: 'object',
				properties: { theme: { type: 'string' } },
				required: ['theme']
			});

			// Less specific pattern (wildcard)
			store.registerSchema('app/users/+', userSchema);

			// More specific should win
			const specificResult = store.publish('app/users/settings', { theme: 'dark' });
			expect(specificResult).toBe(true);

			// Less specific should also work for other topics
			const wildcardResult = store.publish('app/users/user-1', validUserData);
			expect(wildcardResult).toBe(true);
		});

		it('should prioritize exact matches over wildcards', () => {
			store.registerSchema('app/data/items', productSchema); // Specificity: 30 (3 exact * 10)
			store.registerSchema('app/data/+', userSchema); // Specificity: 25 (2 exact * 10 + 1 wildcard * 5)
			store.registerSchema('app/data/#', { type: 'object' }); // Specificity: 21 (2 exact * 10 + 1 multi * 1)

			const result = store.publish('app/data/items', {
				id: 'item-1',
				title: 'Product',
				price: 99.99
			});

			expect(result).toBe(true);
			// Should validate against productSchema (most specific)
		});

		// TODO: Test specificity calculation edge cases:
		// - Multiple wildcards in pattern
		// - Patterns with same specificity
		// - Cache invalidation when new schema is registered
	});

	// ============================================================================
	// Data Publishing & Validation
	// ============================================================================

	describe('Data Publishing & Validation', () => {
		beforeEach(() => {
			store.registerSchema('app/users/+', userSchema);
		});

		it('should publish valid data successfully', () => {
			const result = store.publish('app/users/user-1', validUserData);
			
			expect(result).toBe(true);
			expect(store.at('app/users/user-1')).toEqual(validUserData);
			expect(store.errors.has('app/users/user-1')).toBe(false);
		});

		it('should reject invalid data and set errors', () => {
			const result = store.publish('app/users/user-1', invalidUserData);
			
			expect(result).toBe(false);
			expect(store.at('app/users/user-1')).toBeUndefined();
			expect(store.errors.has('app/users/user-1')).toBe(true);
		});

		it('should allow publishing data without a schema (no validation)', () => {
			const data = { any: 'data' };
			const result = store.publish('app/unvalidated/topic', data);
			
			expect(result).toBe(true);
			expect(store.at('app/unvalidated/topic')).toEqual(data);
		});

		it('should clear errors when valid data is published', () => {
			// Publish invalid data first
			store.publish('app/users/user-1', invalidUserData);
			expect(store.errors.has('app/users/user-1')).toBe(true);

			// Publish valid data
			store.publish('app/users/user-1', validUserData);
			expect(store.errors.has('app/users/user-1')).toBe(false);
		});

		it('should handle nested object paths', () => {
			store.publish('app/users/user-1', validUserData);
			store.publish('app/users/user-2', { ...validUserData, id: 'user-2' });

			expect(store.at('app/users/user-1')).toBeDefined();
			expect(store.at('app/users/user-2')).toBeDefined();
			expect(store.at('app/users')).toBeDefined();
		});

		// TODO: Test validation with:
		// - Format validators (email, date, etc.)
		// - Number constraints (minimum, maximum)
		// - Array validation
		// - Nested object validation
		// - Default value application
		// - Type coercion
	});

	// ============================================================================
	// Data Retrieval & Navigation
	// ============================================================================

	describe('Data Retrieval', () => {
		beforeEach(() => {
			store.publish('app/users/user-1', validUserData);
			store.publish('app/users/user-2', { ...validUserData, id: 'user-2', name: 'Jane Doe' });
			store.publish('app/products/product-1', { id: 'product-1', title: 'Widget', price: 19.99 });
		});

		it('should retrieve data at a specific path', () => {
			const user = store.at('app/users/user-1');
			expect(user).toEqual(validUserData);
		});

		it('should return undefined for non-existent paths', () => {
			expect(store.at('app/users/nonexistent')).toBeUndefined();
			expect(store.at('app/nonexistent/path')).toBeUndefined();
		});

		it('should retrieve parent container objects', () => {
			const users = store.at('app/users');
			expect(users).toBeDefined();
			expect(typeof users).toBe('object');
			expect((users as any)['user-1']).toBeDefined();
			expect((users as any)['user-2']).toBeDefined();
		});

		describe('getAllAt', () => {
			it('should return all children at a path', () => {
				const children = store.getAllAt('app/users');
				expect(children).toHaveLength(2);
				expect(children.map(c => c.id)).toContain('user-1');
				expect(children.map(c => c.id)).toContain('user-2');
			});

			it('should return empty array for non-existent paths', () => {
				expect(store.getAllAt('app/nonexistent')).toEqual([]);
			});

			it('should exclude specified keys', () => {
				const children = store.getAllAt('app/users', { exclude: ['user-1'] });
				expect(children).toHaveLength(1);
				expect(children[0].id).toBe('user-2');
			});

			it('should filter children using custom filter function', () => {
				const children = store.getAllAt('app/users', {
					filter: (key, value) => (value as any).name === 'Jane Doe'
				});
				expect(children).toHaveLength(1);
				expect(children[0].id).toBe('user-2');
			});

			it('should exclude primitives by default', () => {
				store.publish('app/mixed/string', 'primitive');
				store.publish('app/mixed/object', { data: 'object' });

				const children = store.getAllAt('app/mixed');
				expect(children).toHaveLength(1);
				expect(children[0].id).toBe('object');
			});

			it('should include primitives when includePrimitives is true', () => {
				store.publish('app/mixed/string', 'primitive');
				store.publish('app/mixed/number', 42);
				store.publish('app/mixed/object', { data: 'object' });

				const children = store.getAllAt('app/mixed', { includePrimitives: true });
				expect(children.length).toBeGreaterThanOrEqual(2);
			});

			// TODO: Test edge cases:
			// - Array values (should be excluded by default)
			// - Null values
			// - Empty objects
		});
	});

	// ============================================================================
	// Error Handling
	// ============================================================================

	describe('Error Handling', () => {
		beforeEach(() => {
			store.registerSchema('app/users/+', userSchema);
		});

		it('should store validation errors for invalid data', () => {
			store.publish('app/users/user-1', invalidUserData);
			
			const errors = store.errors.get('app/users/user-1');
			expect(errors).toBeDefined();
			expect(Array.isArray(errors)).toBe(true);
		});

		it('should expose errors via errors getter', () => {
			store.publish('app/users/user-1', invalidUserData);
			
			expect(store.errors.has('app/users/user-1')).toBe(true);
		});

		// TODO: Test error structure:
		// - Error message format
		// - Error path/pointer
		// - Multiple errors for same field
		// - Errors for nested fields
	});

	// ============================================================================
	// Subscriptions
	// ============================================================================

	describe('Subscriptions', () => {
		it('should notify subscribers when data is published', () => {
			const callback = vi.fn();
			const unsubscribe = store.subscribe('app/users/+', callback);

			store.publish('app/users/user-1', validUserData);

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(validUserData, 'app/users/user-1');

			unsubscribe();
		});

		it('should support multiple subscribers for the same pattern', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			const unsub1 = store.subscribe('app/users/+', callback1);
			const unsub2 = store.subscribe('app/users/+', callback2);

			store.publish('app/users/user-1', validUserData);

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);

			unsub1();
			unsub2();
		});

		it('should not notify subscribers after unsubscribe', () => {
			const callback = vi.fn();
			const unsubscribe = store.subscribe('app/users/+', callback);

			store.publish('app/users/user-1', validUserData);
			expect(callback).toHaveBeenCalledTimes(1);

			unsubscribe();
			store.publish('app/users/user-2', validUserData);
			expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
		});

		it('should notify subscribers matching wildcard patterns', () => {
			const callback = vi.fn();
			const unsubscribe = store.subscribe('app/#', callback);

			store.publish('app/users/user-1', validUserData);
			store.publish('app/products/product-1', { id: 'p1' });
			store.publish('app/deep/nested/path', { data: 'test' });

			expect(callback).toHaveBeenCalledTimes(3);
			unsubscribe();
		});

		it('should notify subscribers when topics are deleted', () => {
			const callback = vi.fn();
			const unsubscribe = store.subscribe('app/users/user-1', callback);

			store.publish('app/users/user-1', validUserData);
			store.delete('app/users/user-1');

			// Should be called once for publish, and check if called for delete
			// (implementation dependent - clearAllAt calls callback with undefined)
			expect(callback).toHaveBeenCalled();

			unsubscribe();
		});

		// TODO: Test subscription edge cases:
		// - Subscriptions with complex patterns
		// - Performance with many subscribers
		// - Subscriber errors (should not break other subscribers)
	});

	// ============================================================================
	// Cache Behavior
	// ============================================================================

	describe('Resolution Cache', () => {
		it('should cache schema resolution results', () => {
			store.registerSchema('app/users/+', userSchema);
			
			// First publish should resolve and cache
			store.publish('app/users/user-1', validUserData);
			expect(store.at('app/users/user-1')).toBeDefined();

			// Second publish to same topic should use cache
			store.publish('app/users/user-1', { ...validUserData, age: 31 });
			expect(store.at('app/users/user-1')).toBeDefined();
		});

		it('should invalidate cache when new schema is registered', () => {
			store.registerSchema('app/users/+', userSchema);
			store.publish('app/users/user-1', validUserData);

			// Register more specific schema - should invalidate cache
			store.registerSchema('app/users/user-1', {
				type: 'object',
				properties: { custom: { type: 'string' } }
			});

			// Next publish should re-resolve with new schema
			const result = store.publish('app/users/user-1', { custom: 'value' });
			expect(result).toBe(true);
		});

		// TODO: Test cache performance:
		// - Cache hit/miss behavior
		// - Memory implications
		// - Cache size limits (if any)
	});

	// ============================================================================
	// Data Deletion & Cleanup
	// ============================================================================

	describe('Data Deletion', () => {
		beforeEach(() => {
			store.publish('app/users/user-1', validUserData);
			store.publish('app/users/user-2', { ...validUserData, id: 'user-2' });
		});

		it('should delete a specific topic', () => {
			expect(store.at('app/users/user-1')).toBeDefined();
			
			store.delete('app/users/user-1');
			
			expect(store.at('app/users/user-1')).toBeUndefined();
			expect(store.at('app/users/user-2')).toBeDefined(); // Other data preserved
		});

		it('should clear errors when topic is deleted', () => {
			store.registerSchema('app/users/+', userSchema);
			store.publish('app/users/user-1', invalidUserData);
			expect(store.errors.has('app/users/user-1')).toBe(true);

			store.delete('app/users/user-1');
			expect(store.errors.has('app/users/user-1')).toBe(false);
		});

		it('should handle deleting non-existent topics gracefully', () => {
			expect(() => {
				store.delete('app/nonexistent/topic');
			}).not.toThrow();
		});

		describe('clearAllAt', () => {
			it('should clear all children at a path', () => {
				expect(store.getAllAt('app/users')).toHaveLength(2);
				
				store.clearAllAt('app/users');
				
				expect(store.getAllAt('app/users')).toHaveLength(0);
			});

			it('should exclude specified keys from clearing', () => {
				store.clearAllAt('app/users', { exclude: ['user-1'] });
				
				expect(store.at('app/users/user-1')).toBeDefined();
				expect(store.at('app/users/user-2')).toBeUndefined();
			});

			it('should handle clearing non-existent paths gracefully', () => {
				expect(() => {
					store.clearAllAt('app/nonexistent');
				}).not.toThrow();
			});

			// TODO: Test clearAllAt with subscribers
			// TODO: Test clearAllAt error cleanup
		});
	});

	// ============================================================================
	// AI Prompt Generation
	// ============================================================================

	describe('AI Prompt Generation', () => {
		beforeEach(() => {
			store.registerSchema('app/users/+', userSchema);
		});

		it('should generate prompt for topic with schema', () => {
			const prompt = store.getAISchemaPrompt('app/users/user-1');
			
			expect(prompt).toContain('app/users/user-1');
			expect(prompt).toContain('JSON Schema');
			expect(prompt).toContain('Data Architect');
		});

		it('should generate default prompt for topic without schema', () => {
			const prompt = store.getAISchemaPrompt('app/unvalidated/topic');
			
			expect(prompt).toContain('app/unvalidated/topic');
			expect(prompt).toContain('valid JSON object');
		});

		it('should include schema in prompt', () => {
			const prompt = store.getAISchemaPrompt('app/users/user-1');
			
			expect(prompt).toContain('type');
			expect(prompt).toContain('properties');
		});

		// TODO: Test prompt format:
		// - Schema formatting (JSON.stringify)
		// - Required fields handling
		// - Reasoning field special case
		// - Multi-line prompt structure
	});

	// ============================================================================
	// State Access & Reactivity
	// ============================================================================

	describe('State Getters', () => {
		it('should expose tree state', () => {
			store.publish('app/test', { data: 'value' });
			
			const tree = store.tree;
			expect(tree).toBeDefined();
			expect((tree as any).app).toBeDefined();
		});

		it('should expose errors state', () => {
			store.registerSchema('app/users/+', userSchema);
			store.publish('app/users/user-1', invalidUserData);
			
			const errors = store.errors;
			expect(errors).toBeDefined();
			expect(errors.has('app/users/user-1')).toBe(true);
		});

		it('should expose schemaVersion', () => {
			const initialVersion = store.schemaVersion;
			expect(typeof initialVersion).toBe('number');

			store.registerSchema('app/test/+', userSchema);
			expect(store.schemaVersion).toBeGreaterThan(initialVersion);
		});

		// TODO: Test reactivity (may need Svelte test utilities):
		// - Tree updates trigger reactivity
		// - Error updates trigger reactivity
		// - SchemaVersion updates trigger reactivity
	});

	// ============================================================================
	// Utility Methods
	// ============================================================================

	describe('Utility Methods', () => {
		it('should export state as JSON', () => {
			store.publish('app/users/user-1', validUserData);
			store.publish('app/products/product-1', { id: 'p1', title: 'Widget', price: 10 });

			const json = store.toJSON();
			expect(json).toBeDefined();
			expect(json.app).toBeDefined();
			expect(json.app.users).toBeDefined();
			expect(json.app.products).toBeDefined();
		});

		it('should create deep copy in toJSON (no references)', () => {
			store.publish('app/test', { data: 'value' });
			
			const json = store.toJSON();
			const original = store.at('app/test');
			
			// Modify JSON copy
			(json as any).app.test.data = 'modified';
			
			// Original should be unchanged
			expect(original).toEqual({ data: 'value' });
		});
	});

	// ============================================================================
	// Edge Cases & Integration
	// ============================================================================

	describe('Edge Cases', () => {
		it('should handle empty topic paths', () => {
			expect(() => {
				store.publish('', { data: 'value' });
			}).not.toThrow();
		});

		it('should handle very deep nested paths', () => {
			const deepPath = 'app/level1/level2/level3/level4/level5/item';
			const result = store.publish(deepPath, { data: 'deep' });
			
			expect(result).toBe(true);
			expect(store.at(deepPath)).toBeDefined();
		});

		it('should handle special characters in paths', () => {
			// Note: Some characters may not work with path structure
			const result = store.publish('app/test-item_123', { data: 'special' });
			expect(result).toBe(true);
		});

		// TODO: Test more edge cases:
		// - Concurrent publishes to same topic
		// - Large data objects
		// - Circular references (should fail JSON.stringify in toJSON)
		// - Unicode characters in paths
		// - Very long topic paths
		// - Paths with trailing/leading slashes (should be normalized)
	});

	// ============================================================================
	// Integration & Performance
	// ============================================================================

	describe('Integration Scenarios', () => {
		it('should handle complete workflow: register -> publish -> retrieve -> delete', () => {
			// Register schema
			store.registerSchema('app/users/+', userSchema);
			expect(store.getRegisteredSchemas()).toHaveLength(1);

			// Publish valid data
			const result = store.publish('app/users/user-1', validUserData);
			expect(result).toBe(true);

			// Retrieve data
			const retrieved = store.at('app/users/user-1');
			expect(retrieved).toEqual(validUserData);

			// Delete data
			store.delete('app/users/user-1');
			expect(store.at('app/users/user-1')).toBeUndefined();
		});

		it('should handle multiple schemas with overlapping patterns', () => {
			store.registerSchema('app/data/#', { type: 'object' });
			store.registerSchema('app/data/users/+', userSchema);
			store.registerSchema('app/data/users/settings', {
				type: 'object',
				properties: { theme: { type: 'string' } }
			});

			// Should resolve most specific schema for each topic
			const result1 = store.publish('app/data/users/user-1', validUserData);
			const result2 = store.publish('app/data/users/settings', { theme: 'dark' });
			const result3 = store.publish('app/data/other/item', { any: 'data' });

			expect(result1).toBe(true);
			expect(result2).toBe(true);
			expect(result3).toBe(true);
		});

		// TODO: Add performance tests:
		// - Large number of schemas
		// - Large number of topics
		// - Cache hit rate
		// - Subscription notification performance
	});
});
