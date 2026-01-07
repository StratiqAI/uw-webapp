// Widget Bridge System
// Type-safe bridge between AI JobSubmission -> mapObjectStore -> Widget components

import { z } from 'zod';
import { mapStore } from '$lib/stores/MapStore';
import { jobUpdateStore, type JobUpdate } from '$lib/stores/jobUpdateStore.svelte';
import { DashboardStorage } from '$lib/dashboard/utils/storage';
import type { Readable } from 'svelte/store';
import type {
	WidgetChannelConfig,
	WidgetDataTypeMap,
	ValidatedPublisher,
	ValidatedConsumer,
	WidgetDataBridgeConfig
} from './widgetSchemas';
import type { WidgetType } from './widget';

// ===== Validated Publisher Implementation =====

class ValidatedPublisherImpl<T> implements ValidatedPublisher<T> {
	constructor(
		private schema: z.ZodSchema<T>,
		private publisher: { publish: (value: T) => void; clear: () => void },
		private channelId: string
	) {
		console.log(`[ValidatedPublisher] Constructor called for channel: ${this.channelId}`);
	}

	publish(data: T): void {
		console.log(`[ValidatedPublisher:${this.channelId}] publish() called with data:`, data);
		const result = this.schema.safeParse(data);
		if (!result.success) {
			console.error(`[ValidatedPublisher:${this.channelId}] Validation failed:`, result.error);
			throw result.error;
		}
		console.log(`[ValidatedPublisher:${this.channelId}] ✅ Validation passed, publishing to mapStore`);
		this.publisher.publish(result.data);
		
		// Trigger auto-save of widget data to localStorage
		console.log(`[ValidatedPublisher:${this.channelId}] 💾 Triggering auto-save to localStorage...`);
		DashboardStorage.autoSaveWidgetData();
	}

	safeParse(data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
		console.log(`[ValidatedPublisher:${this.channelId}] safeParse() called`);
		const result = this.schema.safeParse(data);
		if (result.success) {
			console.log(`[ValidatedPublisher:${this.channelId}] ✅ safeParse validation passed`);
			return { success: true, data: result.data };
		}
		console.log(`[ValidatedPublisher:${this.channelId}] ❌ safeParse validation failed`);
		return { success: false, error: result.error };
	}

	clear(): void {
		console.log(`[ValidatedPublisher:${this.channelId}] clear() called`);
		this.publisher.clear();
		
		// Trigger auto-save after clearing
		console.log(`[ValidatedPublisher:${this.channelId}] 💾 Triggering auto-save after clear...`);
		DashboardStorage.autoSaveWidgetData();
	}
}

// ===== Validated Consumer Implementation =====

class ValidatedConsumerImpl<T> implements ValidatedConsumer<T> {
	constructor(
		private schema: z.ZodSchema<T>,
		private consumer: { subscribe: Readable<T | undefined>['subscribe']; get: () => T | undefined },
		private channelId: string
	) {
		console.log(`[ValidatedConsumer] Constructor called for channel: ${this.channelId}`);
	}

	subscribe(callback: (data: T | undefined) => void): () => void {
		console.log(`[ValidatedConsumer:${this.channelId}] subscribe() called, setting up subscription`);
		return this.consumer.subscribe((data) => {
			console.log(`[ValidatedConsumer:${this.channelId}] 📥 Data received from mapStore:`, data);
			if (data === undefined) {
				console.log(`[ValidatedConsumer:${this.channelId}] Data is undefined, passing through`);
				callback(undefined);
				return;
			}

			const result = this.schema.safeParse(data);
			if (!result.success) {
				console.error(`[ValidatedConsumer:${this.channelId}] ❌ Invalid data received:`, result.error);
				callback(undefined);
				return;
			}

			console.log(`[ValidatedConsumer:${this.channelId}] ✅ Validation passed, calling callback with validated data`);
			callback(result.data);
		});
	}

	get(): T | undefined {
		console.log(`[ValidatedConsumer:${this.channelId}] get() called`);
		const data = this.consumer.get();
		if (data === undefined) {
			console.log(`[ValidatedConsumer:${this.channelId}] No data in store`);
			return undefined;
		}

		const result = this.schema.safeParse(data);
		if (!result.success) {
			console.error(`[ValidatedConsumer:${this.channelId}] Invalid data in store:`, result.error);
			return undefined;
		}

		console.log(`[ValidatedConsumer:${this.channelId}] ✅ Returning validated data from store`);
		return result.data;
	}
}

// ===== Widget Bridge Factory =====

/**
 * Create a validated publisher for a widget channel
 */
export function createWidgetPublisher<T extends WidgetType>(
	config: WidgetChannelConfig<T>,
	publisherId: string
): ValidatedPublisher<WidgetDataTypeMap[T]> {
	console.log(`\n🔧 [createWidgetPublisher] Called for channel: ${config.channelId}, publisher: ${publisherId}`);
	const mapStorePublisher = mapStore.getPublisher(config.channelId, publisherId);
	
	// Adapter to match expected interface (publish + clear)
	const publisher = {
		publish: (value: WidgetDataTypeMap[T]) => mapStorePublisher.publish(value),
		clear: () => mapStorePublisher.clear()
	};
	
	console.log(`   ↳ Registered publisher in mapStore`);

	return new ValidatedPublisherImpl(
		config.schema,
		publisher,
		`${config.channelId}:${publisherId}`
	);
}

/**
 * Create a validated consumer for a widget channel
 */
export function createWidgetConsumer<T extends WidgetType>(
	config: WidgetChannelConfig<T>,
	consumerId: string
): ValidatedConsumer<WidgetDataTypeMap[T]> {
	console.log(`\n🔧 [createWidgetConsumer] Called for channel: ${config.channelId}, consumer: ${consumerId}`);
	const stream = mapStore.getStream(config.channelId, consumerId);
	
	// Adapter to match expected interface (subscribe + get)
	const consumer = {
		subscribe: stream.subscribe,
		get: () => stream.get() as WidgetDataTypeMap[T] | undefined
	};
	
	console.log(`   ↳ Registered consumer in mapStore`);

	return new ValidatedConsumerImpl(
		config.schema,
		consumer,
		`${config.channelId}:${consumerId}`
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
 * - Publishes valid data to the widget channel
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

			// Publish to widget channel (with validation)
			console.log(`   📤 Publishing to widget channel...`);
			publisher.publish(widgetData);
			lastUpdate = new Date();
			lastError = undefined;

			console.log(`✅ [JobWidgetBridge:${bridgeId}] Successfully published data to widget channel`);
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

	title: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.title(channelId), widgetId),

	image: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.image(channelId), widgetId),

	map: (channelId: string, widgetId: string) =>
		createReactiveWidgetConsumer(WidgetChannels.map(channelId), widgetId)
} as const;

// ===== Example Usage =====

/*
// ============================================================================
// Example 1: Simple paragraph widget with AI job
// ============================================================================
import { WidgetChannels, bridgeJobToWidget } from '$lib/dashboard/types/widgetBridge';

async function setupParagraphWidget() {
  // Submit AI job
  const jobId = await submitJob({
    request: "Generate a summary of recent sales",
    priority: "HIGH"
  });
  
  // Create bridge to paragraph widget (NEW CLEANER API)
  const bridge = bridgeJobToWidget({
    jobId,
    channel: WidgetChannels.paragraph('sales-summary'),
    transformer: (result) => {
      const data = JSON.parse(result);
      return {
        content: data.summary,
        markdown: true
      };
    }
  });
  
  return { jobId, bridge };
}

// ============================================================================
// Example 2: Using Preset Publishers/Consumers
// ============================================================================
import { Publishers, Consumers, WidgetStores } from '$lib/dashboard/types/widgetBridge';

// Direct publishing (without AI job)
function publishMetricData() {
  const publisher = Publishers.metric('cpu-usage', 'system-monitor');
  
  publisher.publish({
    label: 'CPU Usage',
    value: 75.5,
    unit: '%',
    changeType: 'increase',
    change: 5.2
  });
}

// ============================================================================
// Example 3: In a Svelte component
// ============================================================================
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { WidgetStores } from '$lib/dashboard/types/widgetBridge';
  
  let dataStore = WidgetStores.paragraph('sales-summary', 'widget-1');
  let content: string | undefined;
  
  const unsubscribe = dataStore.subscribe(data => {
    content = data?.content;
  });
  
  onDestroy(unsubscribe);
</script>

{#if content}
  <div>{content}</div>
{/if}

// ============================================================================
// Example 4: Multiple widgets from one job
// ============================================================================
import { bridgeJobToMultipleWidgets, WidgetChannels } from '$lib/dashboard/types/widgetBridge';

async function setupDashboard() {
  const jobId = await submitJob({
    request: "Analyze quarterly performance",
    priority: "HIGH"
  });
  
  const bridge = bridgeJobToMultipleWidgets(jobId, [
    {
      channel: WidgetChannels.metric('revenue-metric'),
      transformer: (result) => {
        const data = JSON.parse(result);
        return {
          label: 'Q4 Revenue',
          value: data.revenue,
          change: data.revenueChange,
          changeType: data.revenueChange > 0 ? 'increase' : 'decrease',
          unit: '$'
        };
      }
    },
    {
      channel: WidgetChannels.lineChart('revenue-chart'),
      transformer: (result) => {
        const data = JSON.parse(result);
        return {
          datasets: [{
            label: 'Revenue',
            data: data.monthlyRevenue,
            color: '#10b981'
          }],
          labels: data.months
        };
      }
    },
    {
      channel: WidgetChannels.paragraph('analysis'),
      transformer: (result) => {
        const data = JSON.parse(result);
        return {
          content: data.analysis,
          markdown: true
        };
      }
    }
  ]);
  
  return { jobId, bridge };
}

// ============================================================================
// Example 5: Legacy API (still supported for backward compatibility)
// ============================================================================
import { createWidgetConsumer, createJobWidgetBridge } from '$lib/dashboard/types/widgetBridge';

const consumer = createWidgetConsumer(
  WidgetChannels.paragraphContent,
  'my-paragraph-widget'
);

consumer.subscribe((data) => {
  if (data) {
    console.log('Received validated data:', data);
    // data is fully typed as ParagraphWidgetData
  }
});
*/

