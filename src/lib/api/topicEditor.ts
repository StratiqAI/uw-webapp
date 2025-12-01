/**
 * Topic Editor API
 * 
 * Well-structured API for programmatic topic editing and publishing.
 * Provides type-safe functions for managing topic data.
 */

import { mapStore } from '$lib/stores/MapStore';
import { schemaRegistry } from '$lib/stores/SchemaRegistry';

/**
 * Topic metadata
 */
export interface TopicMetadata {
	topic: string;
	schemaId?: string;
	producers: number;
	consumers: number;
	hasValue: boolean;
}

/**
 * Topic data with metadata
 */
export interface TopicData {
	topic: string;
	data: unknown;
	schemaId?: string;
	schema?: {
		id: string;
		name: string;
		description?: string;
	};
}

/**
 * Publish result
 */
export interface PublishResult {
	success: boolean;
	error?: string;
	topic: string;
}

/**
 * Get all topics with metadata
 */
export function getAllTopics(): TopicMetadata[] {
	return mapStore.getInspectorData();
}

/**
 * Get topics filtered by schema
 */
export function getTopicsBySchema(schemaId: string): TopicMetadata[] {
	return getAllTopics().filter(t => t.schemaId === schemaId);
}

/**
 * Get topic data
 */
export function getTopicData(topic: string): TopicData | null {
	const metadata = getAllTopics().find(t => t.topic === topic);
	if (!metadata) return null;

	// Get data from MapStore by creating a stream and getting its value
	const stream = mapStore.getStream(topic, 'topic-editor-api');
	const data = stream.get();
	const schema = metadata.schemaId ? schemaRegistry.getDefinition(metadata.schemaId) : undefined;

	return {
		topic,
		data,
		schemaId: metadata.schemaId,
		schema: schema ? {
			id: schema.id,
			name: schema.name || schema.id,
			description: schema.description
		} : undefined
	};
}

/**
 * Publish data to a topic
 * 
 * @param topic - Topic name
 * @param data - Data to publish
 * @param publisherId - Optional publisher ID (defaults to 'api-publisher')
 * @returns Publish result
 */
export function publishToTopic(topic: string, data: unknown, publisherId: string = 'api-publisher'): PublishResult {
	try {
		// Validate data against schema if schema is enforced
		const metadata = getAllTopics().find(t => t.topic === topic);
		if (metadata?.schemaId) {
			const schema = schemaRegistry.getDefinition(metadata.schemaId);
			if (schema) {
		const validator = schemaRegistry.getValidator(metadata.schemaId);
		if (validator) {
			const result = validator(data);
			if (!result.success) {
				return {
					success: false,
					error: `Schema validation failed: ${result.error?.message || 'Validation failed'}`,
					topic
				};
			}
		}
			}
		}

		// Publish data
		const publisher = mapStore.getPublisher(topic, publisherId);
		publisher.publish(data);
		publisher.dispose();

		return {
			success: true,
			topic
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || String(error),
			topic
		};
	}
}

/**
 * Update topic data (merge with existing)
 * 
 * @param topic - Topic name
 * @param updates - Partial data to merge
 * @param publisherId - Optional publisher ID
 * @returns Publish result
 */
export function updateTopicData(topic: string, updates: Record<string, unknown>, publisherId: string = 'api-publisher'): PublishResult {
	const current = getTopicData(topic);
	if (!current) {
		return {
			success: false,
			error: `Topic ${topic} not found`,
			topic
		};
	}

	const currentData = current.data && typeof current.data === 'object' && !Array.isArray(current.data)
		? current.data as Record<string, unknown>
		: {};

	const mergedData = { ...currentData, ...updates };
	return publishToTopic(topic, mergedData, publisherId);
}

/**
 * Delete topic data (publish undefined/null)
 * 
 * @param topic - Topic name
 * @param publisherId - Optional publisher ID
 * @returns Publish result
 */
export function clearTopicData(topic: string, publisherId: string = 'api-publisher'): PublishResult {
	return publishToTopic(topic, undefined, publisherId);
}

/**
 * Validate data against topic schema
 * 
 * @param topic - Topic name
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateTopicData(topic: string, data: unknown): { valid: boolean; error?: string } {
	const metadata = getAllTopics().find(t => t.topic === topic);
	if (!metadata?.schemaId) {
		return { valid: true }; // No schema to validate against
	}

	const validator = schemaRegistry.getValidator(metadata.schemaId);
	if (!validator) {
		return { valid: true }; // Validator not found, skip validation
	}

	const result = validator(data);
	if (result.success) {
		return { valid: true };
	} else {
		return {
			valid: false,
			error: result.error?.message || 'Validation failed'
		};
	}
}

/**
 * Batch publish to multiple topics
 * 
 * @param publishes - Array of { topic, data } objects
 * @returns Array of publish results
 */
export function batchPublish(publishes: Array<{ topic: string; data: unknown; publisherId?: string }>): PublishResult[] {
	return publishes.map(({ topic, data, publisherId }) =>
		publishToTopic(topic, data, publisherId)
	);
}

/**
 * Subscribe to topic changes (returns unsubscribe function)
 * 
 * @param topic - Topic name
 * @param callback - Callback function called when data changes
 * @param consumerId - Optional consumer ID
 * @returns Unsubscribe function
 */
export function subscribeToTopic(
	topic: string,
	callback: (data: unknown) => void,
	consumerId?: string
): () => void {
	const stream = mapStore.getStream(topic, consumerId);
	
	// Get initial value
	const initialValue = stream.get();
	if (initialValue !== undefined) {
		callback(initialValue);
	}
	
	// Subscribe to updates
	return stream.subscribe(callback);
}

/**
 * Get topic statistics
 */
export function getTopicStats() {
	const topics = getAllTopics();
	return {
		total: topics.length,
		withSchema: topics.filter(t => t.schemaId).length,
		withData: topics.filter(t => t.hasValue).length,
		withProducers: topics.filter(t => t.producers > 0).length,
		withConsumers: topics.filter(t => t.consumers > 0).length
	};
}

