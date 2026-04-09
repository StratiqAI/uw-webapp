// Widget Bridge System
// Type-safe bridge between AI JobSubmission -> ValidatedTopicStore -> Widget components

import { z } from 'zod';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import { jobUpdateStore, type JobUpdate } from '$lib/stores/jobUpdateStore.svelte';
import { DashboardStorage } from '$lib/dashboard/utils/storage';
import { createLogger } from '$lib/utils/logger';
import type {
	WidgetChannelConfig,
	WidgetDataTypeMap,
	ValidatedPublisher,
	ValidatedConsumer,
	WidgetDataBridgeConfig
} from './widgetSchemas';
import type { WidgetType } from './widget';

const log = createLogger('widgets');

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
		log.debug(`Publisher created for topic: ${this.topic}`);
	}

	publish(data: T): void {
		log.debug(`publish() on ${this.topic}`, data);
		const result = this.schema.safeParse(data);
		if (!result.success) {
			log.error(`Validation failed on ${this.topic}:`, result.error);
			throw result.error;
		}
		log.debug(`Validation passed on ${this.topic}, publishing to store`);
		
		const published = validatedTopicStore.publish(this.topic, result.data);
		if (!published) {
			log.error(`ValidatedTopicStore rejected data on ${this.topic}`);
			return;
		}
		
		log.debug(`Auto-saving widget data for ${this.topic}`);
		DashboardStorage.autoSaveWidgetData();
	}

	safeParse(data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
		const result = this.schema.safeParse(data);
		if (result.success) {
			log.debug(`safeParse passed on ${this.topic}`);
			return { success: true, data: result.data };
		}
		log.debug(`safeParse failed on ${this.topic}`);
		return { success: false, error: result.error };
	}

	clear(): void {
		log.debug(`Clearing ${this.topic}`);
		validatedTopicStore.delete(this.topic);
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
		log.debug(`Consumer created for topic: ${this.topic}`);
	}

	subscribe(callback: (data: T | undefined) => void): () => void {
		log.debug(`subscribe() on ${this.topic}`);
		
		const unsubscribe = validatedTopicStore.subscribe(this.topic, (value: unknown) => {
			if (value === undefined) {
				callback(undefined);
				return;
			}

			const result = this.schema.safeParse(value);
			if (!result.success) {
				log.error(`Invalid data received on ${this.topic}:`, result.error);
				callback(undefined);
				return;
			}

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
		const data = validatedTopicStore.at<T>(this.topic);
		
		if (data === undefined) return undefined;

		const result = this.schema.safeParse(data);
		if (!result.success) {
			log.error(`Invalid data in store for ${this.topic}:`, result.error);
			return undefined;
		}

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
	log.debug(`createWidgetPublisher: channel=${config.channelId}, publisher=${publisherId}`);

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
	log.debug(`createWidgetConsumer: channel=${config.channelId}, consumer=${consumerId}`);

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
	log.debug(`Creating bridge: ${bridgeId}`);
	
	const publisher = createWidgetPublisher(config.channel, bridgeId);

	let lastUpdate: Date | undefined;
	let lastError: z.ZodError | undefined;
	let isConnected = true;

	const transform =
		config.transformer ||
		((result: string): WidgetDataTypeMap[T] => JSON.parse(result));

	const filter =
		config.filter ||
		((update: { status: string; result: string | null }) => {
			return (
				(update.status === 'COMPLETED' || update.status === 'COMPLETE') &&
				update.result !== null
			);
		});

	const jobUpdatesStore = jobUpdateStore.subscribeToJobUpdates(config.jobId);
	const unsubscribe = jobUpdatesStore.subscribe((updates: JobUpdate[]) => {
		if (!isConnected || updates.length === 0) return;

		const latestUpdate = updates[0];
		log.debug(`Bridge ${bridgeId}: status=${latestUpdate.status}, hasResult=${latestUpdate.result !== null}`);
		
		if (!filter({ status: latestUpdate.status, result: latestUpdate.result })) return;

		try {
			const widgetData = transform(latestUpdate.result!);
			publisher.publish(widgetData);
			lastUpdate = new Date();
			lastError = undefined;
			log.debug(`Bridge ${bridgeId}: published successfully`);
		} catch (error) {
			if (error instanceof z.ZodError) {
				lastError = error;
				log.error(`Bridge ${bridgeId}: validation error`, error);
			} else {
				log.error(`Bridge ${bridgeId}: transform error`, error);
			}
		}
	});

	log.debug(`Bridge ${bridgeId} created and listening`);

	return {
		disconnect: () => {
			log.debug(`Disconnecting bridge ${bridgeId}`);
			isConnected = false;
			unsubscribe();
			publisher.clear();
		},
		getStatus: () => {
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
	log.debug(`Creating multi-bridge for job: ${jobId}, channels: ${channels.length}`);
	
	const bridges = channels.map((channel) => {
		return createJobWidgetBridge({
			jobId,
			channel: channel.config as any,
			transformer: channel.transformer,
			filter: channel.filter
		});
	});

	return {
		disconnect: () => {
			log.debug(`Disconnecting all bridges for job: ${jobId}`);
			bridges.forEach((bridge) => bridge.disconnect());
		},
		getStatus: () => {
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
	log.debug(`Creating multi-bridge for job: ${jobId}, channels: ${channels.length}`);
	
	const bridges = channels.map((config) =>
		createJobWidgetBridge({
			jobId,
			channel: config.channel,
			transformer: config.transformer,
			filter: config.filter as any
		})
	);

	return {
		disconnect(): void {
			log.debug(`Disconnecting all bridges for job: ${jobId}`);
			bridges.forEach((bridge) => bridge.disconnect());
		},
		getStatus() {
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
		createWidgetPublisher(WidgetChannels.map(channelId), publisherId)
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
		createWidgetConsumer(WidgetChannels.map(channelId), consumerId)
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
		createReactiveWidgetConsumer(WidgetChannels.map(channelId), widgetId)
} as const;
