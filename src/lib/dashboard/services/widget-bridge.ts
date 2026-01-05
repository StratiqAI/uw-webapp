// ============================================================================
// Widget Bridge Implementation
// Connects AI Jobs -> MapObjectStore -> Widgets with validation
// ============================================================================

import { get, type Readable } from 'svelte/store';
import { z } from 'zod';
import {
  type WidgetType,
  type WidgetChannelConfig,
  type WidgetPublisher,
  type WidgetConsumer,
  type JobWidgetBridge,
  type JobWidgetBridgeConfig,
  type JobUpdate,
  type WidgetDataTypeMap,
  type BridgeStatus,
  type StoreProducer,
  type StoreConsumer,
  WIDGET_TYPES,
  WidgetDataSchemas,
  ParagraphWidgetDataSchema,
  TableWidgetDataSchema,
  MetricWidgetDataSchema,
  LineChartWidgetDataSchema,
  BarChartWidgetDataSchema,
  TitleWidgetDataSchema,
  ImageWidgetDataSchema,
  MapWidgetDataSchema,
} from './widget-system';

// ============================================================================
// Store Imports (These would be actual imports in your app)
// ============================================================================

// These imports should be replaced with your actual store implementations
// import { jobUpdateStore } from '$lib/stores/jobUpdateStore';
// import { DashboardStorage } from '$lib/dashboard/utils/storage';

// For this implementation, we'll define interfaces that match expected behavior
interface MapStore {
  registerProducer<T>(channelId: string, producerId: string): StoreProducer<T>;
  registerConsumer<T>(channelId: string, consumerId: string): StoreConsumer<T>;
  clearChannel(channelId: string): void;
  getChannelData<T>(channelId: string): T | undefined;
}

interface JobUpdateStore {
  subscribeToJobUpdates(jobId: string): Readable<JobUpdate[]>;
  clearJobUpdates(jobId: string): void;
}

interface DashboardStorage {
  autoSaveWidgetData(): void;
  saveWidgetData(channelId: string, data: any): void;
  loadWidgetData(channelId: string): any | null;
  clearWidgetData(channelId: string): void;
}

// ============================================================================
// Store References (Replace with actual imports)
// ============================================================================

let mapStore: MapStore;
let jobUpdateStore: JobUpdateStore;
let dashboardStorage: DashboardStorage;

// Initialize function to set store references
function initializeWidgetBridge(
  mapStoreRef: MapStore,
  jobUpdateStoreRef: JobUpdateStore,
  dashboardStorageRef: DashboardStorage
) {
  mapStore = mapStoreRef;
  jobUpdateStore = jobUpdateStoreRef;
  dashboardStorage = dashboardStorageRef;
}

// ============================================================================
// Publisher Implementation
// ============================================================================

class WidgetPublisherImpl<T> implements WidgetPublisher<T> {
  private producer: StoreProducer<T>;
  private schema: z.ZodSchema<T>;
  private channelId: string;
  private publisherId: string;
  private publishCount = 0;
  private lastPublish: Date | null = null;

  constructor(
    channelId: string,
    publisherId: string,
    schema: z.ZodSchema<T>,
    producer: StoreProducer<T>
  ) {
    this.channelId = channelId;
    this.publisherId = publisherId;
    this.schema = schema;
    this.producer = producer;
  }

  publish(data: T): void {
    // Validate data
    const result = this.schema.safeParse(data);
    if (!result.success) {
      console.error(`[Publisher ${this.publisherId}] Validation failed:`, result.error);
      throw new Error(`Validation failed: ${result.error.message}`);
    }

    // Publish to channel
    this.producer.publish(result.data);
    this.publishCount++;
    this.lastPublish = new Date();

    // Trigger auto-save
    if (dashboardStorage) {
      dashboardStorage.autoSaveWidgetData();
      dashboardStorage.saveWidgetData(this.channelId, result.data);
    }

    console.log(`[Publisher ${this.publisherId}] Published to channel ${this.channelId}`);
  }

  safeParse(data: unknown): z.SafeParseReturnType<unknown, T> {
    return this.schema.safeParse(data) as z.SafeParseReturnType<unknown, T>;
  }

  clear(): void {
    this.producer.clear();
    if (dashboardStorage) {
      dashboardStorage.clearWidgetData(this.channelId);
      dashboardStorage.autoSaveWidgetData();
    }
    console.log(`[Publisher ${this.publisherId}] Cleared channel ${this.channelId}`);
  }

  getStats() {
    return {
      publishCount: this.publishCount,
      lastPublish: this.lastPublish,
      channelId: this.channelId,
      publisherId: this.publisherId
    };
  }
}

// ============================================================================
// Consumer Implementation
// ============================================================================

class WidgetConsumerImpl<T> implements WidgetConsumer<T> {
  private consumer: StoreConsumer<T>;
  private schema: z.ZodSchema<T>;
  private channelId: string;
  private consumerId: string;
  private subscriptionCount = 0;
  private lastReceived: Date | null = null;

  constructor(
    channelId: string,
    consumerId: string,
    schema: z.ZodSchema<T>,
    consumer: StoreConsumer<T>
  ) {
    this.channelId = channelId;
    this.consumerId = consumerId;
    this.schema = schema;
    this.consumer = consumer;

    // Load persisted data if available
    this.loadPersistedData();
  }

  private loadPersistedData(): void {
    if (dashboardStorage) {
      const savedData = dashboardStorage.loadWidgetData(this.channelId);
      if (savedData) {
        const result = this.schema.safeParse(savedData);
        if (result.success) {
          // This would need to be coordinated with the store implementation
          console.log(`[Consumer ${this.consumerId}] Loaded persisted data for ${this.channelId}`);
        }
      }
    }
  }

  subscribe(callback: (data: T | undefined) => void): () => void {
    this.subscriptionCount++;
    
    return this.consumer.subscribe((data) => {
      if (data === undefined) {
        callback(undefined);
        return;
      }

      const result = this.schema.safeParse(data);
      if (!result.success) {
        console.error(`[Consumer ${this.consumerId}] Invalid data received:`, result.error);
        callback(undefined);
        return;
      }

      this.lastReceived = new Date();
      callback(result.data);
    });
  }

  get(): T | undefined {
    const data = this.consumer.get();
    if (data === undefined) return undefined;

    const result = this.schema.safeParse(data);
    if (!result.success) {
      console.error(`[Consumer ${this.consumerId}] Invalid data in store:`, result.error);
      return undefined;
    }

    return result.data;
  }

  getStats() {
    return {
      subscriptionCount: this.subscriptionCount,
      lastReceived: this.lastReceived,
      channelId: this.channelId,
      consumerId: this.consumerId
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a validated publisher for widget data
 */
function createWidgetPublisher<T extends WidgetType>(
  config: WidgetChannelConfig<T>,
  publisherId: string
): WidgetPublisher<WidgetDataTypeMap[T]> {
  if (!mapStore) {
    throw new Error('Widget bridge not initialized. Call initializeWidgetBridge first.');
  }

  const producer = mapStore.registerProducer<WidgetDataTypeMap[T]>(
    config.channelId,
    publisherId
  );

  return new WidgetPublisherImpl(
    config.channelId,
    publisherId,
    config.schema,
    producer
  );
}

/**
 * Create a validated consumer for widget data
 */
function createWidgetConsumer<T extends WidgetType>(
  config: WidgetChannelConfig<T>,
  consumerId: string
): WidgetConsumer<WidgetDataTypeMap[T]> {
  if (!mapStore) {
    throw new Error('Widget bridge not initialized. Call initializeWidgetBridge first.');
  }

  const consumer = mapStore.registerConsumer<WidgetDataTypeMap[T]>(
    config.channelId,
    consumerId
  );

  return new WidgetConsumerImpl(
    config.channelId,
    consumerId,
    config.schema,
    consumer
  );
}

// ============================================================================
// Job-Widget Bridge
// ============================================================================

class JobWidgetBridgeImpl implements JobWidgetBridge {
  private jobId: string;
  private channelId: string;
  private publisher: WidgetPublisher<any>;
  private subscription: (() => void) | null = null;
  private connected = true;
  private lastUpdate: Date | null = null;
  private lastError: Error | null = null;
  private updateCount = 0;

  constructor(
    jobId: string,
    channelId: string,
    publisher: WidgetPublisher<any>,
    subscription: () => void
  ) {
    this.jobId = jobId;
    this.channelId = channelId;
    this.publisher = publisher;
    this.subscription = subscription;
  }

  disconnect(): void {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.connected = false;
    this.publisher.clear();
    console.log(`[Bridge] Disconnected job ${this.jobId} from channel ${this.channelId}`);
  }

  getStatus(): BridgeStatus {
    return {
      connected: this.connected,
      lastUpdate: this.lastUpdate || undefined,
      lastError: this.lastError || undefined
    };
  }

  recordUpdate(): void {
    this.lastUpdate = new Date();
    this.updateCount++;
  }

  recordError(error: Error): void {
    this.lastError = error;
  }

  getStats() {
    return {
      jobId: this.jobId,
      channelId: this.channelId,
      connected: this.connected,
      updateCount: this.updateCount,
      lastUpdate: this.lastUpdate,
      lastError: this.lastError
    };
  }
}

/**
 * Create a bridge from job updates to widget channel
 */
function createJobWidgetBridge<T extends WidgetType>(
  config: JobWidgetBridgeConfig<T>
): JobWidgetBridge {
  if (!mapStore || !jobUpdateStore) {
    throw new Error('Widget bridge not initialized. Call initializeWidgetBridge first.');
  }

  const bridgeId = `job-${config.jobId}-to-${config.channel.channelId}`;
  const publisher = createWidgetPublisher(config.channel, bridgeId);

  // Default transformer: parse JSON
  const transformer = config.transformer || ((result: string) => JSON.parse(result));
  
  // Default filter: completed jobs with results
  const filter = config.filter || ((update) => 
    (update.status === 'COMPLETED' || update.status === 'COMPLETE') && 
    update.result !== null
  );

  // Subscribe to job updates
  const jobUpdates = jobUpdateStore.subscribeToJobUpdates(config.jobId);
  const bridge = new JobWidgetBridgeImpl(config.jobId, config.channel.channelId, publisher, () => {});

  const unsubscribe = jobUpdates.subscribe((updates: JobUpdate[]) => {
    if (!bridge.getStatus().connected || updates.length === 0) return;

    const latestUpdate = updates[0];
    if (!filter(latestUpdate)) return;

    try {
      const widgetData = transformer(latestUpdate.result!);
      publisher.publish(widgetData as WidgetDataTypeMap[T]);
      bridge.recordUpdate();
      console.log(`[Bridge] Published data from job ${config.jobId} to ${config.channel.channelId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      bridge.recordError(err);
      console.error(`[Bridge] Error processing job update:`, error);
    }
  });

  // Update bridge with real unsubscribe
  (bridge as any).subscription = unsubscribe;

  return bridge;
}

/**
 * Bridge multiple channels from a single job
 */
function bridgeJobToMultipleWidgets(
  jobId: string,
  channels: Array<{
    channel: WidgetChannelConfig<any>;
    transformer?: (jobResult: string) => unknown;
    filter?: (update: JobUpdate) => boolean;
  }>
): JobWidgetBridge {
  const bridges = channels.map((config) =>
    createJobWidgetBridge({
      jobId,
      ...config
    } as JobWidgetBridgeConfig<any>)
  );

  return {
    disconnect(): void {
      bridges.forEach(bridge => bridge.disconnect());
    },
    
    getStatus(): BridgeStatus {
      const statuses = bridges.map(b => b.getStatus());
      return {
        connected: statuses.some(s => s.connected),
        lastUpdate: statuses
          .map(s => s.lastUpdate)
          .filter(Boolean)
          .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0],
        lastError: statuses.find(s => s.lastError)?.lastError
      };
    }
  };
}

// ============================================================================
// Channel Configurations
// ============================================================================

export const WidgetChannels = {
  paragraph: (channelId: string): WidgetChannelConfig<typeof WIDGET_TYPES.PARAGRAPH> => ({
    channelId,
    widgetType: WIDGET_TYPES.PARAGRAPH,
    schema: ParagraphWidgetDataSchema,
    description: 'Channel for paragraph widget content'
  }),

  table: (channelId: string): WidgetChannelConfig<typeof WIDGET_TYPES.TABLE> => ({
    channelId,
    widgetType: WIDGET_TYPES.TABLE,
    schema: TableWidgetDataSchema,
    description: 'Channel for table widget data'
  }),

  metric: (channelId: string): WidgetChannelConfig<typeof WIDGET_TYPES.METRIC> => ({
    channelId,
    widgetType: WIDGET_TYPES.METRIC,
    schema: MetricWidgetDataSchema,
    description: 'Channel for metric widget data'
  }),

  lineChart: (channelId: string): WidgetChannelConfig<typeof WIDGET_TYPES.LINE_CHART> => ({
    channelId,
    widgetType: WIDGET_TYPES.LINE_CHART,
    schema: LineChartWidgetDataSchema,
    description: 'Channel for line chart widget data'
  }),

  barChart: (channelId: string): WidgetChannelConfig<typeof WIDGET_TYPES.BAR_CHART> => ({
    channelId,
    widgetType: WIDGET_TYPES.BAR_CHART,
    schema: BarChartWidgetDataSchema,
    description: 'Channel for bar chart widget data'
  }),

  title: (channelId: string): WidgetChannelConfig<typeof WIDGET_TYPES.TITLE> => ({
    channelId,
    widgetType: WIDGET_TYPES.TITLE,
    schema: TitleWidgetDataSchema,
    description: 'Channel for title widget data'
  }),

  image: (channelId: string): WidgetChannelConfig<typeof WIDGET_TYPES.IMAGE> => ({
    channelId,
    widgetType: WIDGET_TYPES.IMAGE,
    schema: ImageWidgetDataSchema,
    description: 'Channel for image widget data'
  }),

  map: (channelId: string): WidgetChannelConfig<typeof WIDGET_TYPES.MAP> => ({
    channelId,
    widgetType: WIDGET_TYPES.MAP,
    schema: MapWidgetDataSchema,
    description: 'Channel for map widget data'
  })
} as const;

// ============================================================================
// Preset Publishers/Consumers
// ============================================================================

/**
 * Quick publisher creators for common widget types
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

// ============================================================================
// Svelte Store Integration
// ============================================================================

/**
 * Create a reactive Svelte store for widget data
 */
function createWidgetStore<T extends WidgetType>(
  config: WidgetChannelConfig<T>,
  consumerId: string
): WidgetConsumer<WidgetDataTypeMap[T]> {
  return createWidgetConsumer(config, consumerId);
}

/**
 * Preset widget stores for Svelte components
 */
export const WidgetStores = {
  paragraph: (channelId: string, widgetId: string) =>
    createWidgetStore(WidgetChannels.paragraph(channelId), widgetId),
  
  table: (channelId: string, widgetId: string) =>
    createWidgetStore(WidgetChannels.table(channelId), widgetId),
  
  metric: (channelId: string, widgetId: string) =>
    createWidgetStore(WidgetChannels.metric(channelId), widgetId),
  
  lineChart: (channelId: string, widgetId: string) =>
    createWidgetStore(WidgetChannels.lineChart(channelId), widgetId),
  
  barChart: (channelId: string, widgetId: string) =>
    createWidgetStore(WidgetChannels.barChart(channelId), widgetId),
  
  title: (channelId: string, widgetId: string) =>
    createWidgetStore(WidgetChannels.title(channelId), widgetId),
  
  image: (channelId: string, widgetId: string) =>
    createWidgetStore(WidgetChannels.image(channelId), widgetId),
  
  map: (channelId: string, widgetId: string) =>
    createWidgetStore(WidgetChannels.map(channelId), widgetId)
} as const;

// ============================================================================
// Bridge Management
// ============================================================================

/**
 * Bridge manager for tracking active bridges
 */
class BridgeManager {
  private bridges = new Map<string, JobWidgetBridge>();
  
  register(id: string, bridge: JobWidgetBridge): void {
    this.bridges.set(id, bridge);
  }
  
  unregister(id: string): void {
    const bridge = this.bridges.get(id);
    if (bridge) {
      bridge.disconnect();
      this.bridges.delete(id);
    }
  }
  
  get(id: string): JobWidgetBridge | undefined {
    return this.bridges.get(id);
  }
  
  getAll(): JobWidgetBridge[] {
    return Array.from(this.bridges.values());
  }
  
  disconnectAll(): void {
    this.bridges.forEach(bridge => bridge.disconnect());
    this.bridges.clear();
  }
  
  getStatus(): { active: number; connected: number } {
    const bridges = this.getAll();
    return {
      active: bridges.length,
      connected: bridges.filter(b => b.getStatus().connected).length
    };
  }
}

export const bridgeManager = new BridgeManager();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a job-to-widget pipeline with automatic bridge management
 */
async function createJobWidgetPipeline<T extends WidgetType>(
  jobId: string,
  config: WidgetChannelConfig<T>,
  options?: {
    transformer?: (result: string) => WidgetDataTypeMap[T];
    filter?: (update: JobUpdate) => boolean;
    autoDisconnect?: boolean;
    disconnectDelay?: number;
  }
): Promise<{
  bridge: JobWidgetBridge;
  publisher: WidgetPublisher<WidgetDataTypeMap[T]>;
  consumer: WidgetConsumer<WidgetDataTypeMap[T]>;
}> {
  const publisher = createWidgetPublisher(config, `pipeline-${jobId}`);
  const consumer = createWidgetConsumer(config, `pipeline-consumer-${jobId}`);
  
  const bridge = createJobWidgetBridge({
    jobId,
    channel: config,
    transformer: options?.transformer,
    filter: options?.filter
  });
  
  // Register with manager
  bridgeManager.register(`pipeline-${jobId}`, bridge);
  
  // Auto-disconnect if requested
  if (options?.autoDisconnect) {
    const delay = options.disconnectDelay || 60000; // Default 1 minute
    setTimeout(() => {
      bridgeManager.unregister(`pipeline-${jobId}`);
    }, delay);
  }
  
  return { bridge, publisher, consumer };
}

/**
 * Batch create multiple widget channels
 */
function createWidgetChannels(
  configs: Array<{
    type: WidgetType;
    channelId: string;
    publisherId?: string;
    consumerId?: string;
  }>
): {
  publishers: Map<string, WidgetPublisher<any>>;
  consumers: Map<string, WidgetConsumer<any>>;
} {
  const publishers = new Map<string, WidgetPublisher<any>>();
  const consumers = new Map<string, WidgetConsumer<any>>();
  
  configs.forEach(({ type, channelId, publisherId, consumerId }) => {
    const channelConfig = WidgetChannels[type](channelId);
    
    if (publisherId) {
      publishers.set(channelId, createWidgetPublisher(channelConfig, publisherId));
    }
    
    if (consumerId) {
      consumers.set(channelId, createWidgetConsumer(channelConfig, consumerId));
    }
  });
  
  return { publishers, consumers };
}

// ============================================================================
// Export Everything
// ============================================================================

export {
  // Core functions
  createWidgetPublisher,
  createWidgetConsumer,
  createJobWidgetBridge,
  bridgeJobToMultipleWidgets,
  
  // Store integration
  createWidgetStore,
  
  // Initialization
  initializeWidgetBridge,
  
  // Pipeline utilities
  createJobWidgetPipeline,
  createWidgetChannels,
  
  // Types (re-exported from widget-system)
  type WidgetPublisher,
  type WidgetConsumer,
  type JobWidgetBridge,
  type JobWidgetBridgeConfig,
  type WidgetChannelConfig,
  type BridgeStatus,
  type StoreProducer,
  type StoreConsumer
};