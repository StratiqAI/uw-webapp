/**
 * AIClient.ts
 * 
 * Unified AI client for structured data generation using multiple providers.
 * 
 * This module provides a clean abstraction over different AI providers (OpenAI, Google Gemini)
 * for generating structured JSON data that conforms to JSON Schemas.
 * 
 * Architecture:
 * - Strategy pattern for provider abstraction
 * - Provider-specific implementations (OpenAIProvider, GeminiProvider)
 * - Unified interface for schema-based data generation
 * - Comprehensive error handling with AIClientError
 * 
 * Key Features:
 * - Multi-provider support (OpenAI, Gemini)
 * - JSON Schema-based structured output
 * - Provider-specific schema sanitization
 * - Flexible prompt building with schema instructions
 * - Error handling with provider context
 * 
 * Usage:
 *   const client = new AIClient({
 *     openai: { apiKey: '...', model: 'gpt-4o-mini' },
 *     gemini: { apiKey: '...', model: 'gemini-2.0-flash-exp' }
 *   });
 *   
 *   const response = await client.generate('openai', {
 *     prompt: 'Generate a user profile',
 *     schema: userSchema,
 *     schemaPattern: 'app/users/+'
 *   });
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Schema } from 'ajv';

/**
 * Configuration for AI providers
 */
export interface AIConfig {
	openai?: {
		apiKey: string;
		model?: string;
	};
	gemini?: {
		apiKey: string;
		model?: string;
	};
}

/**
 * Request parameters for generating structured data
 */
export interface GenerateRequest {
	prompt: string;
	schema: Schema;
	schemaPattern: string;
	schemaPrompt?: string; // Optional pre-generated schema prompt
	systemPrompt?: string;
	temperature?: number; // Temperature for randomness (0-2, default 1.0). Higher = more random/varied
}

/**
 * Response from AI generation
 */
export interface GenerateResponse {
	data: any;
	provider: 'openai' | 'gemini';
	metadata?: {
		model?: string;
		usage?: any;
	};
}

/**
 * Custom error class for AI client errors
 */
export class AIClientError extends Error {
	constructor(
		message: string,
		public readonly provider: 'openai' | 'gemini',
		public readonly originalError?: unknown
	) {
		super(message);
		this.name = 'AIClientError';
	}
}

/**
 * Abstract base class for AI providers
 */
abstract class AIProvider {
	abstract generate(request: GenerateRequest): Promise<GenerateResponse>;
	
	/**
	 * Sanitize schema for provider-specific requirements
	 */
	protected sanitizeSchema(schema: Schema): any {
		return schema;
	}
	
	/**
	 * Build the full prompt with schema instructions
	 */
	protected buildPrompt(
		userPrompt: string,
		schemaPrompt: string | undefined,
		schema: Schema,
		systemPrompt?: string
	): string {
		// Use provided schema prompt (from store.getAISchemaPrompt) or generate a basic one
		// The store's prompt is enhanced with reasoning field instructions
		const effectiveSchemaPrompt = schemaPrompt || this.generateSchemaPrompt(schema);
		
		// Combine user prompt, schema instructions, and reminder about required fields
		const parts = [
			userPrompt,
			effectiveSchemaPrompt,
			'Remember: All required fields in the schema must be included in your response. Do not omit any required fields.'
		];
		return parts.join('\n\n');
	}

	/**
	 * Generate a basic schema prompt from JSON Schema
	 */
	protected generateSchemaPrompt(schema: Schema): string {
		return `Generate data that conforms to the following JSON Schema: ${JSON.stringify(schema, null, 2)}`;
	}
}

/**
 * OpenAI provider implementation
 */
class OpenAIProvider extends AIProvider {
	private client: OpenAI;
	private model: string;

	constructor(apiKey: string, model: string = 'gpt-4o-mini') {
		super();
		this.client = new OpenAI({
			apiKey,
			dangerouslyAllowBrowser: true
		});
		this.model = model;
	}

	async generate(request: GenerateRequest): Promise<GenerateResponse> {
		try {
			// Build the full prompt with schema instructions
			const fullPrompt = this.buildPrompt(
				request.prompt,
				request.schemaPrompt,
				request.schema,
				request.systemPrompt
			);

			// Configure OpenAI's structured output format
			const schemaConfig = {
				type: 'json_schema' as const, // OpenAI's structured output format
				name: request.schemaPattern.replace(/[^a-zA-Z0-9]/g, '_'), // Sanitize pattern for format name
				strict: true, // Enforce strict schema compliance
				schema: this.sanitizeSchema(request.schema) as Record<string, unknown>
			};

			// Call OpenAI's structured output API
			const response = await this.client.responses.parse({
				model: this.model,
				input: [
					{
						role: 'system',
						content: request.systemPrompt || 'You are a helpful assistant that generates valid JSON data'
					},
					{ role: 'user', content: fullPrompt }
				],
				tool_choice: 'auto',
				text: {
					format: schemaConfig // Use JSON Schema format for structured output
				},
				// Add temperature for randomness (default 1.0 if not specified)
				...(request.temperature !== undefined && { temperature: request.temperature })
			});

			// Extract parsed data from response (handles multiple response formats)
			const parsedData = this.extractParsedData(response as any);

			if (!parsedData) {
				throw new Error('Failed to extract parsed data from OpenAI response');
			}

			return {
				data: parsedData,
				provider: 'openai',
				metadata: {
					model: this.model
				}
			};
		} catch (error) {
			// Wrap error with provider context for better error handling
			throw new AIClientError(
				`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'openai',
				error
			);
		}
	}

	/**
	 * Extract parsed data from OpenAI response with multiple fallback strategies
	 */
	private extractParsedData(responseData: any): any {
		// Priority 1: Check for output_parsed at root level (preferred format)
		// This is the most direct path for structured output
		if (responseData.output_parsed) {
			return responseData.output_parsed;
		}

		// Priority 2: Check output array structure (alternative response format)
		// Some OpenAI API versions return data in a nested message structure
		if (
			responseData.output &&
			Array.isArray(responseData.output) &&
			responseData.output.length > 0
		) {
			const message = responseData.output[0];
			if (message.content && Array.isArray(message.content) && message.content.length > 0) {
				const contentItem = message.content[0];
				// Check for parsed data first
				if (contentItem.parsed) {
					return contentItem.parsed;
				}
				// Fallback to text content (may need parsing)
				if (contentItem.text) {
					return typeof contentItem.text === 'string'
						? JSON.parse(contentItem.text)
						: contentItem.text;
				}
			}
		}

		// Priority 3: Try to parse output_text if available (legacy format)
		if (responseData.output_text) {
			return typeof responseData.output_text === 'string'
				? JSON.parse(responseData.output_text)
				: responseData.output_text;
		}

		return null; // No data found in any expected format
	}
}

/**
 * Google Gemini provider implementation
 */
class GeminiProvider extends AIProvider {
	private genAI: GoogleGenerativeAI;
	private model: string;

	constructor(apiKey: string, model: string = 'gemini-2.0-flash-exp') {
		super();
		this.genAI = new GoogleGenerativeAI(apiKey);
		this.model = model;
	}

	async generate(request: GenerateRequest): Promise<GenerateResponse> {
		try {
			// Build the full prompt with schema instructions
			const fullPrompt = this.buildPrompt(
				request.prompt,
				request.schemaPrompt,
				request.schema,
				request.systemPrompt
			);

			// Gemini doesn't support additionalProperties and $schema fields
			// Sanitize schema to remove unsupported fields
			const geminiSchema = this.sanitizeSchema(request.schema);

			// Configure Gemini model with structured output
			const model = this.genAI.getGenerativeModel({
				model: this.model,
				generationConfig: {
					responseMimeType: 'application/json', // Force JSON output
					responseSchema: geminiSchema as any, // Schema for structured output
					// Add temperature for randomness (default 1.0 if not specified, max 2.0 for Gemini)
					...(request.temperature !== undefined && { temperature: Math.min(request.temperature, 2.0) })
				}
			});

			// Generate content with structured output
			const response = await model.generateContent(fullPrompt);
			const text = response.response.text();

			// Parse the JSON response (Gemini returns JSON string)
			const data = JSON.parse(text);

			return {
				data,
				provider: 'gemini',
				metadata: {
					model: this.model
				}
			};
		} catch (error) {
			// Wrap error with provider context
			throw new AIClientError(
				`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'gemini',
				error
			);
		}
	}

	/**
	 * Remove fields that Gemini doesn't support
	 */
	protected sanitizeSchema(schema: Schema): any {
		// Gemini API doesn't support additionalProperties and $schema fields
		// Destructure to remove these fields and keep the rest
		const { additionalProperties, $schema, ...rest } = schema as any;
		return {
			type: rest.type || 'object',
			properties: rest.properties || {},
			required: rest.required || []
		};
	}
}

/**
 * Main AI Client class that manages multiple providers
 * 
 * This class follows the Strategy pattern, allowing easy switching between
 * different AI providers while maintaining a consistent interface.
 */
export class AIClient {
	private providers: Map<'openai' | 'gemini', AIProvider> = new Map();

	/**
	 * Create a new AIClient instance
	 * 
	 * @param config Configuration for AI providers
	 */
	constructor(config: AIConfig) {
		// Initialize providers only if API keys are provided
		// This allows partial configuration (e.g., only OpenAI or only Gemini)
		if (config.openai?.apiKey) {
			this.providers.set(
				'openai',
				new OpenAIProvider(config.openai.apiKey, config.openai.model)
			);
		}

		if (config.gemini?.apiKey) {
			this.providers.set(
				'gemini',
				new GeminiProvider(config.gemini.apiKey, config.gemini.model)
			);
		}
	}

	/**
	 * Generate structured data using the specified provider
	 * 
	 * @param provider The AI provider to use ('openai' | 'gemini')
	 * @param request The generation request
	 * @returns Promise resolving to the generated response
	 * @throws AIClientError if the provider is not configured or an error occurs
	 */
	async generate(
		provider: 'openai' | 'gemini',
		request: GenerateRequest
	): Promise<GenerateResponse> {
		// Get the provider instance from the map
		const providerInstance = this.providers.get(provider);

		// Validate that the provider is configured
		if (!providerInstance) {
			throw new AIClientError(
				`Provider '${provider}' is not configured. Please provide API key in config.`,
				provider
			);
		}

		// Delegate to the provider's generate method
		return providerInstance.generate(request);
	}

	/**
	 * Check if a provider is available
	 * 
	 * @param provider The provider to check
	 * @returns True if the provider is configured and available
	 */
	isProviderAvailable(provider: 'openai' | 'gemini'): boolean {
		return this.providers.has(provider);
	}

	/**
	 * Get list of available providers
	 * 
	 * @returns Array of available provider names
	 */
	getAvailableProviders(): Array<'openai' | 'gemini'> {
		return Array.from(this.providers.keys());
	}
}
