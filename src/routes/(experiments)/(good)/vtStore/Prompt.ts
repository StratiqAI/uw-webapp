/**
 * Prompt.ts
 * 
 * Encapsulates all input needed for an AI query.
 * 
 * This class provides a clean, type-safe interface for constructing
 * AI prompts with schemas, system instructions, and generation parameters.
 * 
 * Key Features:
 * - Builder pattern for fluent API
 * - Type-safe construction
 * - Default values for common scenarios
 * - Validation of required fields
 * - Integration with ValidatedTopicStore
 * 
 * Usage:
 *   // Basic usage
 *   const prompt = new Prompt({
 *     userPrompt: 'Generate a user profile',
 *     schema: userSchema,
 *     schemaPattern: 'app/users/+'
 *   });
 * 
 *   // With all options
 *   const prompt = Prompt.create()
 *     .withUserPrompt('Generate a product')
 *     .withSchema(productSchema, 'app/products/+')
 *     .withSystemPrompt('You are a helpful assistant')
 *     .withTemperature(1.2)
 *     .withSchemaPrompt(schemaPrompt)
 *     .build();
 * 
 *   // Using factory methods
 *   const prompt = Prompt.forSchema(userSchema, 'app/users/+', 'Generate a user');
 */

import type { Schema } from 'ajv';
import type { ValidatedTopicStore } from './ValidatedTopicStore.svelte';
import type { RegisteredSchema } from './AIService';
import { PromptTemplate } from './PromptTemplate';

/**
 * Configuration for creating a Prompt
 */
export interface PromptConfig {
	/** The user's prompt/question/instruction */
	userPrompt: string;
	
	/** The JSON Schema to validate against */
	schema: Schema;
	
	/** The schema pattern (e.g., 'app/users/+') */
	schemaPattern: string;
	
	/** Optional system prompt/instructions */
	systemPrompt?: string;
	
	/** Optional pre-generated schema prompt from store */
	schemaPrompt?: string;
	
	/** Temperature for randomness (0-2, default 1.0) */
	temperature?: number;
	
	/** AI provider to use */
	provider?: 'openai' | 'gemini';
}

/**
 * Prompt class encapsulates all input needed for an AI query
 */
export class Prompt {
	public readonly userPrompt: string;
	public readonly schema: Schema;
	public readonly schemaPattern: string;
	public readonly systemPrompt?: string;
	public readonly schemaPrompt?: string;
	public readonly temperature: number;
	public readonly provider?: 'openai' | 'gemini';

	/**
	 * Create a new Prompt instance
	 * 
	 * @param config Prompt configuration
	 * @throws Error if required fields are missing
	 */
	constructor(config: PromptConfig) {
		// Validate required fields
		if (!config.userPrompt || config.userPrompt.trim() === '') {
			throw new Error('userPrompt is required and cannot be empty');
		}
		if (!config.schema) {
			throw new Error('schema is required');
		}
		if (!config.schemaPattern || config.schemaPattern.trim() === '') {
			throw new Error('schemaPattern is required and cannot be empty');
		}

		// Validate temperature range
		const temperature = config.temperature ?? 1.0;
		if (temperature < 0 || temperature > 2) {
			throw new Error('temperature must be between 0 and 2');
		}

		this.userPrompt = config.userPrompt.trim();
		this.schema = config.schema;
		this.schemaPattern = config.schemaPattern.trim();
		this.systemPrompt = config.systemPrompt?.trim();
		this.schemaPrompt = config.schemaPrompt?.trim();
		this.temperature = temperature;
		this.provider = config.provider;
	}

	/**
	 * Create a Prompt from a RegisteredSchema and store
	 * 
	 * This factory method automatically retrieves the schema prompt
	 * from the store if available.
	 * 
	 * @param registeredSchema The registered schema entry
	 * @param userPrompt The user's prompt
	 * @param store The ValidatedTopicStore instance
	 * @param options Optional additional configuration
	 * @returns A new Prompt instance
	 */
	static fromRegisteredSchema(
		registeredSchema: RegisteredSchema,
		userPrompt: string,
		store: ValidatedTopicStore,
		options?: {
			systemPrompt?: string;
			temperature?: number;
			provider?: 'openai' | 'gemini';
		}
	): Prompt {
		// Get schema prompt from store
		const schemaPrompt = store.getAISchemaPrompt(registeredSchema.pattern);

		return new Prompt({
			userPrompt,
			schema: registeredSchema.schema,
			schemaPattern: registeredSchema.pattern,
			schemaPrompt,
			systemPrompt: options?.systemPrompt,
			temperature: options?.temperature,
			provider: options?.provider
		});
	}

	/**
	 * Create a Prompt with a schema pattern lookup
	 * 
	 * Finds the schema from registered schemas and creates a Prompt.
	 * 
	 * @param schemaPattern The schema pattern to find
	 * @param userPrompt The user's prompt
	 * @param registeredSchemas Array of registered schemas
	 * @param store The ValidatedTopicStore instance
	 * @param options Optional additional configuration
	 * @returns A new Prompt instance
	 * @throws Error if schema pattern is not found
	 */
	static fromSchemaPattern(
		schemaPattern: string,
		userPrompt: string,
		registeredSchemas: RegisteredSchema[],
		store: ValidatedTopicStore,
		options?: {
			systemPrompt?: string;
			temperature?: number;
			provider?: 'openai' | 'gemini';
		}
	): Prompt {
		const registeredSchema = registeredSchemas.find(
			(s) => s.pattern === schemaPattern
		);

		if (!registeredSchema) {
			throw new Error(`Schema pattern '${schemaPattern}' not found in registered schemas`);
		}

		return Prompt.fromRegisteredSchema(registeredSchema, userPrompt, store, options);
	}

	/**
	 * Create a builder for fluent API construction
	 * 
	 * @returns A new PromptBuilder instance
	 */
	static create(): PromptBuilder {
		return new PromptBuilder();
	}

	/**
	 * Create a Prompt with default system prompt for diversity
	 * 
	 * @param config Basic prompt configuration
	 * @returns A new Prompt with diversity-focused system prompt
	 */
	static withDiversity(config: Omit<PromptConfig, 'systemPrompt'>): Prompt {
		const defaultSystemPrompt =
			'You are a helpful assistant that generates valid, diverse, and unique JSON data. Always create different values for each generation, avoiding repetition of names or other field values.';

		return new Prompt({
			...config,
			systemPrompt: defaultSystemPrompt
		});
	}

	/**
	 * Get the enhanced user prompt with uniqueness instructions
	 * 
	 * Optionally resolves template variables from the store if provided.
	 * 
	 * @param store Optional store instance to resolve template variables
	 * @returns Enhanced prompt string with resolved variables
	 */
	getEnhancedPrompt(store?: ValidatedTopicStore): string {
		let resolvedPrompt = this.userPrompt;

		// Resolve template variables if store is provided
		if (store) {
			const template = new PromptTemplate(this.userPrompt);
			resolvedPrompt = template.resolve(store);
		}

		const uniquenessInstructions =
			'\n\nIMPORTANT: Generate unique and diverse data that differs from previous generations. Use different names, ages, and other field values. Create realistic variety in all fields.';

		return `${resolvedPrompt}${uniquenessInstructions}`;
	}

	/**
	 * Resolve template variables in the prompt using the store
	 * 
	 * @param store The ValidatedTopicStore instance
	 * @returns A new Prompt with resolved variables
	 */
	resolveTemplates(store: ValidatedTopicStore): Prompt {
		const template = new PromptTemplate(this.userPrompt);
		const resolvedPrompt = template.resolve(store);

		return new Prompt({
			...this,
			userPrompt: resolvedPrompt
		});
	}

	/**
	 * Check if the prompt contains template variables
	 * 
	 * @returns True if prompt contains template variables
	 */
	hasTemplateVariables(): boolean {
		const template = new PromptTemplate(this.userPrompt);
		return template.hasVariables();
	}

	/**
	 * Convert to AIClient GenerateRequest format
	 * 
	 * Optionally resolves template variables from the store.
	 * 
	 * @param store Optional store instance to resolve template variables
	 * @returns GenerateRequest object
	 */
	toGenerateRequest(store?: ValidatedTopicStore): {
		prompt: string;
		schema: Schema;
		schemaPattern: string;
		schemaPrompt?: string;
		systemPrompt?: string;
		temperature?: number;
	} {
		return {
			prompt: this.getEnhancedPrompt(store),
			schema: this.schema,
			schemaPattern: this.schemaPattern,
			schemaPrompt: this.schemaPrompt,
			systemPrompt: this.systemPrompt,
			temperature: this.temperature
		};
	}

	/**
	 * Create a copy with overridden values
	 * 
	 * @param overrides Values to override
	 * @returns A new Prompt instance with overridden values
	 */
	with(overrides: Partial<PromptConfig>): Prompt {
		return new Prompt({
			userPrompt: overrides.userPrompt ?? this.userPrompt,
			schema: overrides.schema ?? this.schema,
			schemaPattern: overrides.schemaPattern ?? this.schemaPattern,
			systemPrompt: overrides.systemPrompt ?? this.systemPrompt,
			schemaPrompt: overrides.schemaPrompt ?? this.schemaPrompt,
			temperature: overrides.temperature ?? this.temperature,
			provider: overrides.provider ?? this.provider
		});
	}

	/**
	 * Validate the prompt configuration
	 * 
	 * @returns True if valid, false otherwise
	 */
	isValid(): boolean {
		try {
			new Prompt({
				userPrompt: this.userPrompt,
				schema: this.schema,
				schemaPattern: this.schemaPattern,
				systemPrompt: this.systemPrompt,
				schemaPrompt: this.schemaPrompt,
				temperature: this.temperature,
				provider: this.provider
			});
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * Builder class for fluent Prompt construction
 */
class PromptBuilder {
	private config: Partial<PromptConfig> = {};

	/**
	 * Set the user prompt
	 */
	withUserPrompt(prompt: string): this {
		this.config.userPrompt = prompt;
		return this;
	}

	/**
	 * Set the schema and pattern
	 */
	withSchema(schema: Schema, pattern: string): this {
		this.config.schema = schema;
		this.config.schemaPattern = pattern;
		return this;
	}

	/**
	 * Set the system prompt
	 */
	withSystemPrompt(prompt: string): this {
		this.config.systemPrompt = prompt;
		return this;
	}

	/**
	 * Set the schema prompt
	 */
	withSchemaPrompt(prompt: string): this {
		this.config.schemaPrompt = prompt;
		return this;
	}

	/**
	 * Set the temperature
	 */
	withTemperature(temp: number): this {
		this.config.temperature = temp;
		return this;
	}

	/**
	 * Set the provider
	 */
	withProvider(provider: 'openai' | 'gemini'): this {
		this.config.provider = provider;
		return this;
	}

	/**
	 * Build the Prompt instance
	 * 
	 * @throws Error if required fields are missing
	 */
	build(): Prompt {
		if (!this.config.userPrompt || !this.config.schema || !this.config.schemaPattern) {
			throw new Error(
				'Prompt requires userPrompt, schema, and schemaPattern. Use withUserPrompt(), withSchema(), etc.'
			);
		}

		return new Prompt(this.config as PromptConfig);
	}
}