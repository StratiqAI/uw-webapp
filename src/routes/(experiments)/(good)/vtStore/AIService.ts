/**
 * AIService.ts
 * 
 * Service layer for AI-powered structured data generation.
 * 
 * This service wraps the AIClient and provides a higher-level interface
 * for generating structured data with automatic schema validation and storage.
 * 
 * Architecture:
 * - Encapsulates AI client operations
 * - Integrates with ValidatedTopicStore for schema management
 * - Handles prompt enhancement and variation
 * - Provides error handling and validation
 * 
 * Key Features:
 * - High-level callAI method that handles the full workflow
 * - Automatic prompt enhancement for uniqueness
 * - Schema validation and topic generation
 * - Comprehensive error handling
 * 
 * Usage:
 *   const service = new AIService({
 *     openai: { apiKey: '...', model: 'gpt-4o-mini' },
 *     gemini: { apiKey: '...', model: 'gemini-2.0-flash-exp' }
 *   });
 *   
 *   const result = await service.callAI({
 *     provider: 'openai',
 *     userPrompt: 'Generate a user profile',
 *     selectedSchemaPattern: 'app/users/+',
 *     registeredSchemas: [...],
 *     store: validatedTopicStore,
 *     onProgress: (loading) => { ... },
 *     onError: (error) => { ... },
 *     onResponse: (response) => { ... }
 *   });
 */

import type { ValidatedTopicStore } from './ValidatedTopicStore.svelte';
import { AIClient, type AIConfig, AIClientError, type GenerateRequest } from './AIClient';
import { Prompt } from './Prompt';
import { PromptTemplate } from './PromptTemplate';

/**
 * Registered schema entry
 */
export interface RegisteredSchema {
	pattern: string;
	schema: any;
}

/**
 * Parameters for the callAI method
 */
export interface CallAIParams {
	provider: 'openai' | 'gemini';
	userPrompt: string;
	selectedSchemaPattern: string;
	registeredSchemas: RegisteredSchema[];
	store: ValidatedTopicStore;
	onProgress?: (loading: boolean) => void;
	onError?: (error: string | null) => void;
	onResponse?: (response: any) => void;
	temperature?: number;
}

/**
 * Result of the callAI operation
 */
export interface CallAIResult {
	success: boolean;
	data?: any;
	error?: string;
	topic?: string;
	isValid?: boolean;
}

/**
 * AIService provides a high-level interface for AI data generation
 */
export class AIService {
	private client: AIClient;
	private itemCounter: number = 0;

	/**
	 * Create a new AIService instance
	 * 
	 * @param config Configuration for AI providers
	 */
	constructor(config: AIConfig) {
		this.client = new AIClient(config);
	}

	/**
	 * Call AI API with structured output, validation, and storage
	 * 
	 * This method handles the complete workflow:
	 * 1. Validates provider availability
	 * 2. Finds the matching schema
	 * 3. Enhances the prompt for uniqueness
	 * 4. Calls the AI provider
	 * 5. Validates and stores the result
	 * 
	 * @param params CallAI parameters or Prompt instance
	 * @returns Promise resolving to the call result
	 */
	async callAI(params: CallAIParams | { prompt: Prompt; store: ValidatedTopicStore; onProgress?: (loading: boolean) => void; onError?: (error: string | null) => void; onResponse?: (response: any) => void }): Promise<CallAIResult> {
		// Check if params is a Prompt instance
		if ('prompt' in params && params.prompt instanceof Prompt) {
			return this.callAIWithPrompt(params.prompt, params.store, params.onProgress, params.onError, params.onResponse);
		}

		// Otherwise use the original CallAIParams interface
		const callParams = params as CallAIParams;
		const {
			provider,
			userPrompt,
			selectedSchemaPattern,
			registeredSchemas,
			store,
			onProgress,
			onError,
			onResponse,
			temperature = 1.2
		} = callParams;

		// Set loading state
		onProgress?.(true);
		onError?.(null);
		onResponse?.(null);

		try {
			// Validate provider availability before making API call
			if (!this.client.isProviderAvailable(provider)) {
				const errorMsg = `Provider '${provider}' is not configured. Please check API key configuration.`;
				onError?.(errorMsg);
				onProgress?.(false);
				return {
					success: false,
					error: errorMsg
				};
			}

			// Find the schema object matching the selected pattern
			const selectedSchema = registeredSchemas.find((s: RegisteredSchema) => s.pattern === selectedSchemaPattern);
			if (!selectedSchema) {
				const errorMsg = `No schema found for pattern: ${selectedSchemaPattern}`;
				onError?.(errorMsg);
				onProgress?.(false);
				return {
					success: false,
					error: errorMsg
				};
			}

			// Get the enhanced schema prompt from the store
			// This includes reasoning field instructions if present in the schema
			const schemaPrompt = store.getAISchemaPrompt(selectedSchemaPattern);

			// Resolve template variables in the user prompt if any exist
			// This allows using output from previous AI requests
			const template = new PromptTemplate(userPrompt);
			const resolvedUserPrompt = template.hasVariables()
				? template.resolve(store)
				: userPrompt;

			// Enhance the user prompt with instructions for uniqueness and variation
			// This ensures each generation produces different, diverse results
			const enhancedPrompt = `${resolvedUserPrompt}\n\nIMPORTANT: Generate unique and diverse data that differs from previous generations. Use different names, ages, and other field values. Create realistic variety in all fields.`;

			// Call AI client to generate structured data conforming to the schema
			const generateRequest: GenerateRequest = {
				prompt: enhancedPrompt,
				schema: selectedSchema.schema, // The JSON Schema for validation
				schemaPattern: selectedSchemaPattern, // Used for topic path generation
				schemaPrompt: schemaPrompt, // Enhanced prompt with schema details
				systemPrompt: 'You are a helpful assistant that generates valid, diverse, and unique JSON data. Always create different values for each generation, avoiding repetition of names or other field values.',
				temperature // Higher temperature for more variation (0-2, default 1.0)
			};

			const aiResponse = await this.client.generate(provider, generateRequest);
			const data = aiResponse.data;

			// Notify response callback
			onResponse?.(data);

			// Generate a unique topic ID based on the selected schema pattern
			// Extract base path from pattern (e.g., 'app/users/+' -> 'app/users')
			this.itemCounter++;
			const basePath = selectedSchemaPattern.split('/').slice(0, -1).join('/') || 'app/data';
			// Create unique ID with counter and timestamp to avoid collisions
			const topicId = `item-${this.itemCounter}-${Date.now()}`;
			const topic = `${basePath}/${topicId}`;

			// Publish to the store - this automatically validates against the registered schema
			// Returns false if validation fails, true if successful
			const isValid = store.publish(topic, data);

			if (!isValid) {
				const errorMsg = 'Response did not pass schema validation. Check console for details.';
				onError?.(errorMsg);
				onProgress?.(false);
				return {
					success: false,
					error: errorMsg,
					data,
					topic,
					isValid: false
				};
			}

			onProgress?.(false);
			return {
				success: true,
				data,
				topic,
				isValid: true
			};
		} catch (err) {
			// Handle AI client errors with provider context
			let errorMsg: string;
			if (err instanceof AIClientError) {
				errorMsg = err.message;
				console.error(`${err.provider} API error:`, err.originalError);
			} else {
				// Handle unexpected errors
				errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
				console.error('Unexpected error:', err);
			}

			onError?.(errorMsg);
			onProgress?.(false);
			return {
				success: false,
				error: errorMsg
			};
		}
	}

	/**
	 * Internal method to call AI with a Prompt instance
	 * 
	 * @param prompt The Prompt instance
	 * @param store The ValidatedTopicStore instance
	 * @param onProgress Optional progress callback
	 * @param onError Optional error callback
	 * @param onResponse Optional response callback
	 * @returns Promise resolving to the call result
	 */
	private async callAIWithPrompt(
		prompt: Prompt,
		store: ValidatedTopicStore,
		onProgress?: (loading: boolean) => void,
		onError?: (error: string | null) => void,
		onResponse?: (response: any) => void
	): Promise<CallAIResult> {
		const provider = prompt.provider || 'openai';

		// Set loading state
		onProgress?.(true);
		onError?.(null);
		onResponse?.(null);

		try {
			// Validate provider availability before making API call
			if (!this.client.isProviderAvailable(provider)) {
				const errorMsg = `Provider '${provider}' is not configured. Please check API key configuration.`;
				onError?.(errorMsg);
				onProgress?.(false);
				return {
					success: false,
					error: errorMsg
				};
			}

			// Resolve template variables in the prompt if any exist
			const resolvedPrompt = prompt.hasTemplateVariables()
				? prompt.resolveTemplates(store)
				: prompt;

			// Convert Prompt to GenerateRequest (with resolved templates)
			const generateRequest: GenerateRequest = resolvedPrompt.toGenerateRequest();

			const aiResponse = await this.client.generate(provider, generateRequest);
			const data = aiResponse.data;

			// Notify response callback
			onResponse?.(data);

			// Generate a unique topic ID based on the schema pattern
			this.itemCounter++;
			const basePath = prompt.schemaPattern.split('/').slice(0, -1).join('/') || 'app/data';
			const topicId = `item-${this.itemCounter}-${Date.now()}`;
			const topic = `${basePath}/${topicId}`;

			// Publish to the store - this automatically validates against the registered schema
			const isValid = store.publish(topic, data);

			if (!isValid) {
				const errorMsg = 'Response did not pass schema validation. Check console for details.';
				onError?.(errorMsg);
				onProgress?.(false);
				return {
					success: false,
					error: errorMsg,
					data,
					topic,
					isValid: false
				};
			}

			onProgress?.(false);
			return {
				success: true,
				data,
				topic,
				isValid: true
			};
		} catch (err) {
			// Handle AI client errors with provider context
			let errorMsg: string;
			if (err instanceof AIClientError) {
				errorMsg = err.message;
				console.error(`${err.provider} API error:`, err.originalError);
			} else {
				// Handle unexpected errors
				errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
				console.error('Unexpected error:', err);
			}

			onError?.(errorMsg);
			onProgress?.(false);
			return {
				success: false,
				error: errorMsg
			};
		}
	}

	/**
	 * Check if a provider is available
	 * 
	 * @param provider The provider to check
	 * @returns True if the provider is configured and available
	 */
	isProviderAvailable(provider: 'openai' | 'gemini'): boolean {
		return this.client.isProviderAvailable(provider);
	}

	/**
	 * Get list of available providers
	 * 
	 * @returns Array of available provider names
	 */
	getAvailableProviders(): Array<'openai' | 'gemini'> {
		return this.client.getAvailableProviders();
	}

	/**
	 * Reset the item counter (useful for clearing state)
	 */
	resetCounter(): void {
		this.itemCounter = 0;
	}
}