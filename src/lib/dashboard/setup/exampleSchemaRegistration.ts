/**
 * Example: Registering a schema for use with SchemaWidget
 * 
 * This file demonstrates how to register a schema in the SchemaRegistry
 * that can then be used by SchemaWidget components.
 */

import { schemaRegistry } from '$lib/stores/SchemaRegistry';
import { z } from 'zod';

/**
 * Example: User Profile Schema
 * This schema can be used with a SchemaWidget to display user profile data
 */
export const UserProfileSchema = z.object({
	name: z.string().min(1).describe('Full name of the user'),
	email: z.string().email().describe('Email address'),
	age: z.number().int().min(0).max(150).optional().describe('Age in years'),
	role: z.enum(['admin', 'user', 'guest']).describe('User role'),
	bio: z.string().max(500).optional().describe('User biography'),
	preferences: z.object({
		theme: z.enum(['light', 'dark']).default('light'),
		notifications: z.boolean().default(true)
	}).optional().describe('User preferences'),
	tags: z.array(z.string()).optional().describe('User tags')
});

/**
 * Example: Product Schema
 * This schema can be used with a SchemaWidget to display product information
 */
export const ProductSchema = z.object({
	id: z.string().describe('Product ID'),
	name: z.string().min(1).describe('Product name'),
	description: z.string().optional().describe('Product description'),
	price: z.number().min(0).describe('Product price'),
	currency: z.string().length(3).default('USD').describe('Currency code'),
	inStock: z.boolean().describe('Whether product is in stock'),
	categories: z.array(z.string()).describe('Product categories'),
	specifications: z.record(z.string()).optional().describe('Additional specifications')
});

/**
 * Register example schemas
 * Call this function during app initialization (e.g., in +layout.svelte)
 */
export function registerExampleSchemas() {
	// Register User Profile Schema
	schemaRegistry.registerZodSchema(
		'example-user-profile',
		UserProfileSchema,
		{
			name: 'User Profile',
			description: 'Schema for user profile information'
		}
	);

	// Register Product Schema
	schemaRegistry.registerZodSchema(
		'example-product',
		ProductSchema,
		{
			name: 'Product',
			description: 'Schema for product information'
		}
	);

	console.log('✅ Example schemas registered');
}

/**
 * Example usage in dashboard config:
 * 
 * {
 *   id: 'widget-schema-1',
 *   type: 'schema',
 *   gridColumn: 1,
 *   gridRow: 1,
 *   colSpan: 6,
 *   rowSpan: 4,
 *   data: {
 *     schemaId: 'example-user-profile',
 *     data: {
 *       name: 'John Doe',
 *       email: 'john@example.com',
 *       age: 30,
 *       role: 'admin',
 *       bio: 'Software developer',
 *       preferences: {
 *         theme: 'dark',
 *         notifications: true
 *       },
 *       tags: ['developer', 'admin']
 *     }
 *   }
 * }
 */


