// Widget Bridge System
// Type-safe bridge between AI JobSubmission -> ValidatedTopicStore -> Widget components

import { z } from 'zod';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import { jobUpdateStore, type JobUpdate } from '$lib/stores/jobUpdateStore.svelte';
import { DashboardStorage } from '$lib/dashboard/utils/storage';
import type {
	WidgetChannelConfig,
	WidgetDataTypeMap,
	ValidatedPublisher,
	ValidatedConsumer,
	WidgetDataBridgeConfig
} from './widgetSchemas';
import type { WidgetType } from './widget';

// ===== Topic Path Utilities =====

/**
 * Generate a topic path for a widget
 * Pattern: widgets/{widgetType}/{channelId}
 */
export function getWidgetTopicPath(widgetType: string, channelId: string): string {
	return `widgets/${widgetType}/${channelId}`;
}

// ===== Validated Publisher Implementation =====

class ValidatedPublisherImpl<T> implements ValidatedPublisher<T> {
	private topic: string;
	
	constructor(
		private schema: z.ZodSchema<T>,
		private channelId: string,
		private widgetType: string
	) {
		this.topic = getWidgetTopicPath(widgetType, channelId);
		console.log(`[ValidatedPublisher] Constructor called for topic: ${this.topic}`);
	}

	publish(data: T): void {
		console.log(`[ValidatedPublisher:${this.topic}] publish() called with data:`, data);
		const result = this.schema.safeParse(data);
		if (!result.success) {
			console.error(`[ValidatedPublisher:${this.topic}] Validation failed:`, result.error);
			throw result.error;
		}
		console.log(`[ValidatedPublisher:${this.topic}] ✅ Validation passed, publishing to ValidatedTopicStore`);
		
		// Publish to ValidatedTopicStore (which also validates against registered schemas)
		const published = validatedTopicStore.publish(this.topic, result.data);
		if (!published) {
			console.error(`[ValidatedPublisher:${this.topic}] ❌ ValidatedTopicStore rejected the data`);
			return;
		}
		
		// Trigger auto-save of widget data to localStorage
		console.log(`[ValidatedPublisher:${this.topic}] 💾 Triggering auto-save to localStorage...`);
		DashboardStorage.autoSaveWidgetData();
	}

	safeParse(data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
		console.log(`[ValidatedPublisher:${this.topic}] safeParse() called`);
		const result = this.schema.safeParse(data);
		if (result.success) {
			console.log(`[ValidatedPublisher:${this.topic}] ✅ safeParse validation passed`);
			return { success: true, data: result.data };
		}
		console.log(`[ValidatedPublisher:${this.topic}] ❌ safeParse validation failed`);
		return { success: false, error: result.error };
	}

	clear(): void {
		console.log(`[ValidatedPublisher:${this.topic}] clear() called`);
		validatedTopicStore.delete(this.topic);
		
		// Trigger auto-save after clearing
		console.log(`[ValidatedPublisher:${this.topic}] 💾 Triggering auto-save after clear...`);
		DashboardStorage.autoSaveWidgetData();
	}
}

// ===== Validated Consumer Implementation =====

class ValidatedConsumerImpl<T> implements ValidatedConsumer<T> {
	private topic: string;
	private unsubscribers: Set<() => void> = new Set();
	
	constructor(
		private schema: z.ZodSchema<T>,
		private channelId: string,
		private widgetType: string
	) {
		this.topic = getWidgetTopicPath(widgetType, channelId);
		console.log(`[ValidatedConsumer] Constructor called for topic: ${this.topic}`);
	}

	subscribe(callback: (data: T | undefined) => void): () => void {
		console.log(`[ValidatedConsumer:${this.topic}] subscribe() called, setting up subscription`);
		
		// Use ValidatedTopicStore's subscribe method for programmatic subscriptions
		const unsubscribe = validatedTopicStore.subscribe(this.topic, (value: unknown) => {
			console.log(`[ValidatedConsumer:${this.topic}] 📥 Data received from ValidatedTopicStore:`, value);
			
			if (value === undefined) {
				console.log(`[ValidatedConsumer:${this.topic}] Data is undefined, passing through`);
				callback(undefined);
				return;
			}

			const result = this.schema.safeParse(value);
			if (!result.success) {
				console.error(`[ValidatedConsumer:${this.topic}] ❌ Invalid data received:`, result.error);
				callback(undefined);
				return;
			}

			console.log(`[ValidatedConsumer:${this.topic}] ✅ Validation passed, calling callback with validated data`);
			callback(result.data);
		});
		
		this.unsubscribers.add(unsubscribe);
		
		// Also call callback with current value immediately
		const currentValue = this.get();
		if (currentValue !== undefined) {
			callback(currentValue);
		}
		
		return () => {
			unsubscribe();
			this.unsubscribers.delete(unsubscribe);
		};
	}

	get(): T | undefined {
		console.log(`[ValidatedConsumer:${this.topic}] get() called`);
		const data = validatedTopicStore.at<T>(this.topic);
		
		if (data === undefined) {
			console.log(`[ValidatedConsumer:${this.topic}] No data in store`);
			return undefined;
		}

		const result = this.schema.safeParse(data);
		if (!result.success) {
			console.error(`[ValidatedConsumer:${this.topic}] Invalid data in store:`, result.error);
			return undefined;
		}

		console.log(`[ValidatedConsumer:${this.topic}] ✅ Returning validated data from store`);
		return result.data;
	}
}

// ===== Widget Bridge Factory =====

/**
 * Create a validated publisher for a widget channel
 * Now uses ValidatedTopicStore instead of MapStore
 */
export function createWidgetPublisher<T extends WidgetType>(
	config: WidgetChannelConfig<T>,
	publisherId: string
): ValidatedPublisher<WidgetDataTypeMap[T]> {
	console.log(`\n🔧 [createWidgetPublisher] Called for channel: ${config.channelId}, publisher: ${publisherId}`);
	console.log(`   ↳ Using ValidatedTopicStore at topic: widgets/${config.widgetType}/${config.channelId}`);

	return new ValidatedPublisherImpl(
		config.schema,
		config.channelId,
		config.widgetType
	);
}

/**
 * Create a validated consumer for a widget channel
 * Now uses ValidatedTopicStore instead of MapStore
 */
export function createWidgetConsumer<T extends WidgetType>(
	config: WidgetChannelConfig<T>,
	consumerId: string
): ValidatedConsumer<WidgetDataTypeMap[T]> {
	console.log(`\n🔧 [createWidgetConsumer] Called for channel: ${config.channelId}, consumer: ${consumerId}`);
	console.log(`   ↳ Using ValidatedTopicStore at topic: widgets/${config.widgetType}/${config.channelId}`);

	return new ValidatedConsumerImpl(
		config.schema,
		config.channelId,
		config.widgetType
	);
}

// ===== AI Job to Widget Bridge =====

/**
 * Result of bridging a job to a widget channel
 */
export interface JobWidgetBridge {
	/** Unsubscribe from job updates */
	disconnect: () => void;
	/** Get current validation status */
	getStatus: () => {
		connected: boolean;
		lastUpdate?: Date;
		lastError?: z.ZodError;
	};
}

/**
 * Create a bridge from AI job updates to a widget channel
 * This automatically:
 * - Listens to job updates
 * - Validates the job result against the widget schema
 * - Publishes valid data to the widget channel via ValidatedTopicStore
 */
export function createJobWidgetBridge<T extends WidgetType>(
	config: WidgetDataBridgeConfig<T>
): JobWidgetBridge {
	const bridgeId = `job-${config.jobId}-to-${config.channel.channelId}`;
	console.log(`\n🌉 [createJobWidgetBridge] Creating bridge: ${bridgeId}`);
	console.log(`   Job ID: ${config.jobId}`);
	console.log(`   Target Channel: ${config.channel.channelId}`);
	
	const publisher = createWidgetPublisher(config.channel, bridgeId);

	let lastUpdate: Date | undefined;
	let lastError: z.ZodError | undefined;
	let isConnected = true;

	// Default transformer: parse JSON from job result
	const transform =
		config.transformer ||
		((result: string): WidgetDataTypeMap[T] => {
			console.log(`[JobWidgetBridge:${bridgeId}] Using default transformer (JSON.parse)`);
			return JSON.parse(result);
		});

	// Default filter: only process COMPLETED status with non-null result
	const filter =
		config.filter ||
		((update: { status: string; result: string | null }) => {
			return (
				(update.status === 'COMPLETED' || update.status === 'COMPLETE') &&
				update.result !== null
			);
		});

	console.log(`[JobWidgetBridge:${bridgeId}] Subscribing to job updates...`);
	
	// Subscribe to job updates
	const jobUpdatesStore = jobUpdateStore.subscribeToJobUpdates(config.jobId);
	const unsubscribe = jobUpdatesStore.subscribe((updates: JobUpdate[]) => {
		console.log(`\n📨 [JobWidgetBridge:${bridgeId}] Job update received, ${updates.length} updates in store`);
		
		if (!isConnected || updates.length === 0) {
			console.log(`   ↳ Skipping: ${!isConnected ? 'disconnected' : 'no updates'}`);
			return;
		}

		const latestUpdate = updates[0];
		console.log(`   Latest update status: ${latestUpdate.status}`);
		console.log(`   Has result: ${latestUpdate.result !== null}`);
		
		if (!filter({ status: latestUpdate.status, result: latestUpdate.result })) {
			console.log(`   ↳ Update filtered out by filter function`);
			return;
		}

		console.log(`   ✅ Update passed filter, processing...`);

		try {
			// Transform job result to widget data
			console.log(`   🔄 Transforming job result to widget data...`);
			const widgetData = transform(latestUpdate.result!);
			console.log(`   ✅ Transform successful:`, widgetData);

			// Publish to widget channel via ValidatedTopicStore (with validation)
			console.log(`   📤 Publishing to ValidatedTopicStore...`);
			publisher.publish(widgetData);
			lastUpdate = new Date();
			lastError = undefined;

			console.log(`✅ [JobWidgetBridge:${bridgeId}] Successfully published data to ValidatedTopicStore`);
		} catch (error) {
			if (error instanceof z.ZodError) {
				lastError = error;
				console.error(`❌ [JobWidgetBridge:${bridgeId}] Validation error:`, error);
			} else {
				console.error(`❌ [JobWidgetBridge:${bridgeId}] Transform error:`, error);
			}
		}
	});

	console.log(`✅ [JobWidgetBridge:${bridgeId}] Bridge created and listening`);

	return {
		disconnect: () => {
			console.log(`\n🔌 [JobWidgetBridge:${bridgeId}] disconnect() called`);
			isConnected = false;
			unsubscribe();
			publisher.clear();
			console.log(`   ✅ Disconnected`);
		},
		getStatus: () => {
			console.log(`[JobWidgetBridge:${bridgeId}] getStatus() called`);
			return {
				connected: isConnected,
				lastUpdate,
				lastError
			};
		}
	};
}

// ===== Multi-Widget Bridge =====

/**
 * Bridge a single job to multiple widget channels
 * Useful when one AI job produces data for multiple widgets
 */
export function createJobMultiWidgetBridge(
	jobId: string,
	channels: Array<{
		config: WidgetChannelConfig;
		transformer: (jobResult: string) => any;
		filter?: (update: { status: string; result: string | null }) => boolean;
	}>
): JobWidgetBridge {
	console.log(`\n🌉🌉 [createJobMultiWidgetBridge] Creating multi-bridge for job: ${jobId}`);
	console.log(`   Number of channels: ${channels.length}`);
	
	const bridges = channels.map((channel, index) => {
		console.log(`   Creating bridge ${index + 1}/${channels.length} for channel: ${channel.config.channelId}`);
		return createJobWidgetBridge({
			jobId,
			channel: channel.config as any,
			transformer: channel.transformer,
			filter: channel.filter
		});
	});

	console.log(`✅ [createJobMultiWidgetBridge] All bridges created`);

	return {
		disconnect: () => {
			console.log(`\n🔌 [createJobMultiWidgetBridge] Disconnecting all bridges for job: ${jobId}`);
			bridges.forEach((bridge, index) => {
				console.log(`   Disconnecting bridge ${index + 1}/${bridges.length}`);
				bridge.disconnect();
			});
		},
		getStatus: () => {
			console.log(`[createJobMultiWidgetBridge] getStatus() called for job: ${jobId}`);
			const statuses = bridges.map((bridge) => bridge.getStatus());
			return {
				connected: statuses.some((s) => s.connected),
				lastUpdate: statuses.map((s) => s.lastUpdate).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0],
				lastError: statuses.find((s) => s.lastError)?.lastError
			};
		}
	};
}

// ===== New Upgraded API =====

/**
 * Bridge job updates to widget channel (cleaner name)
 * Alias for createJobWidgetBridge
 */
export const bridgeJobToWidget = createJobWidgetBridge;

/**
 * Bridge multiple channels from a single job
 */
export function bridgeJobToMultipleWidgets(
	jobId: string,
	channels: Array<{
		channel: WidgetChannelConfig<any>;
		transformer?: (jobResult: string) => unknown;
		filter?: (update: JobUpdate) => boolean;
	}>
): JobWidgetBridge {
	console.log(`\n🌉🌉 [bridgeJobToMultipleWidgets] Creating multi-bridge for job: ${jobId}`);
	console.log(`   Number of channels: ${channels.length}`);
	
	const bridges = channels.map((config) =>
		createJobWidgetBridge({
			jobId,
			channel: config.channel,
			transformer: config.transformer,
			filter: config.filter as any
		})
	);

	console.log(`✅ [bridgeJobToMultipleWidgets] All bridges created`);

	return {
		disconnect(): void {
			console.log(`\n🔌 [bridgeJobToMultipleWidgets] Disconnecting all bridges for job: ${jobId}`);
			bridges.forEach((bridge) => bridge.disconnect());
		},
		getStatus() {
			console.log(`[bridgeJobToMultipleWidgets] getStatus() called for job: ${jobId}`);
			const statuses = bridges.map((b) => b.getStatus());
			return {
				connected: statuses.some((s) => s.connected),
				lastUpdate: statuses
					.map((s) => s.lastUpdate)
					.filter(Boolean)
					.sort((a, b) => b!.getTime() - a!.getTime())[0],
				lastError: statuses.find((s) => s.lastError)?.lastError
			};
		}
	};
}

// ===== Convenience Functions =====

/**
 * Create a simple paragraph widget publisher
 */
export function createParagraphPublisher(
	channelId: string,
	publisherId: string
): ValidatedPublisher<WidgetDataTypeMap['paragraph']> {
	console.log(`\n🔧 [createParagraphPublisher] Called for channel: ${channelId}, publisher: ${publisherId}`);
	return createWidgetPublisher(
		{
			channelId,
			widgetType: 'paragraph' as const,
			schema: z.object({
				title: z.string().nullable().optional(),
				content: z.string(),
				markdown: z.boolean().nullable().optional()
			}) as any
		},
		publisherId
	);
}

/**
 * Create a simple paragraph widget consumer
 */
export function createParagraphConsumer(
	channelId: string,
	consumerId: string
): ValidatedConsumer<WidgetDataTypeMap['paragraph']> {
	console.log(`\n🔧 [createParagraphConsumer] Called for channel: ${channelId}, consumer: ${consumerId}`);
	return createWidgetConsumer(
		{
			channelId,
			widgetType: 'paragraph' as const,
			schema: z.object({
				title: z.string().nullable().optional(),
				content: z.string(),
				markdown: z.boolean().nullable().optional()
			}) as any
		},
		consumerId
	);
}

// ===== Hook for Svelte Components =====

/**
 * Create a reactive widget consumer for use in Svelte components
 * Returns a store that automatically validates data
 */
export function createReactiveWidgetConsumer<T extends WidgetType>(
	config: WidgetChannelConfig<T>,
	consumerId: string
): {
	subscribe: (callback: (data: WidgetDataTypeMap[T] | undefined) => void) => () => void;
	get: () => WidgetDataTypeMap[T] | undefined;
} {
	console.log(`\n🔧 [createReactiveWidgetConsumer] Called for channel: ${config.channelId}, consumer: ${consumerId}`);
	return createWidgetConsumer(config, consumerId);
}

// ===== Preset Publishers/Consumers for All Widget Types =====

import { WidgetChannels } from './widgetSchemas';

/**
 * Quick publisher creators for common widget types
 * Usage: Publishers.paragraph(channelId, publisherId)
 */
export const Publishers = {
	paragraph: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.paragraph(channelId), publisherId),

	table: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.table(channelId), publisherId),

	metric: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.metric(channelId), publisherId),

	lineChart: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.lineChart(channelId), publisherId),

	barChart: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.barChart(channelId), publisherId),

	donutChart: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.donutChart(channelId), publisherId),

	areaChart: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.areaChart(channelId), publisherId),

	gauge: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.gauge(channelId), publisherId),

	sparkline: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.sparkline(channelId), publisherId),

	heatmap: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.heatmap(channelId), publisherId),

	divergingBarChart: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.divergingBarChart(channelId), publisherId),

	title: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.title(channelId), publisherId),

	image: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.image(channelId), publisherId),

	map: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.map(channelId), publisherId),

	locationQuotient: (channelId: string, publisherId: string) =>
		createWidgetPublisher(WidgetChannels.locationQuotient(channelId), publisherId)
} as const;

/**
 * Quick consumer creators for common widget types
 * Usage: Consumers.paragraph(channelId, consumerId)
 */
export const Consumers = {
	paragraph: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.paragraph(channelId), consumerId),

	table: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.table(channelId), consumerId),

	metric: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.metric(channelId), consumerId),

	lineChart: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.lineChart(channelId), consumerId),

	barChart: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.barChart(channelId), consumerId),

	donutChart: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.donutChart(channelId), consumerId),

	areaChart: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.areaChart(channelId), consumerId),

	gauge: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.gauge(channelId), consumerId),

	sparkline: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.sparkline(channelId), consumerId),

	heatmap: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.heatmap(channelId), consumerId),

	divergingBarChart: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.divergingBarChart(channelId), consumerId),

	title: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.title(channelId), consumerId),

	image: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.image(channelId), consumerId),

	map: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.map(channelId), consumerId),

	locationQuotient: (channelId: string, consumerId: string) =>
		createWidgetConsumer(WidgetChannels.locationQuotient(channelId), consumerId)
} as const;

/**
 * Create preset widget stores for reactive Svelte integration
 * Usage: WidgetStores.paragraph(channelId, widgetId)
 */
export const WidgetStores = {
	paragraph: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.paragraph(channelId), widgetId),

	table: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.table(channelId), widgetId),

	metric: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.metric(channelId), widgetId),

	lineChart: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.lineChart(channelId), widgetId),

	barChart: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.barChart(channelId), widgetId),

	donutChart: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.donutChart(channelId), widgetId),

	areaChart: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.areaChart(channelId), widgetId),

	gauge: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.gauge(channelId), widgetId),

	sparkline: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.sparkline(channelId), widgetId),

	heatmap: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.heatmap(channelId), widgetId),

	divergingBarChart: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.divergingBarChart(channelId), widgetId),

	title: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.title(channelId), widgetId),

	image: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.image(channelId), widgetId),

	map: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.map(channelId), widgetId),

	locationQuotient: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.locationQuotient(channelId), widgetId)
} as const;
