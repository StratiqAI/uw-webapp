// ============================================================================
// Widget AI Service
// Reusable logic for AI-powered widget components
// ============================================================================

import { writable, derived, type Readable, type Writable } from 'svelte/store';
import { 
  type WidgetType,
  type WidgetDataTypeMap,
  parseWidgetData,
  validateWidgetData,
  WIDGET_TYPES
} from './widgetSystem';
import { 
  type WidgetPublisher,
  type WidgetConsumer,
  Publishers, 
  Consumers 
} from '../types/widgetBridge';
import {
  createJobSubmissionClient,
  PRIORITY_LEVELS,
  CONNECTION_STATES,
  type ConnectionState,
  type Priority,
  type JobSubmissionClient,
  type SubmitJobInput,
  type JobState
} from './jobManager';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('widgets');

// ============================================================================
// Types
// ============================================================================

export interface WidgetAIConfig<T extends WidgetType = WidgetType> {
  /** Widget type */
  type: T;
  /** Channel ID for data flow */
  channelId: string;
  /** Widget instance ID */
  widgetId: string;
  /** Initial data */
  initialData: WidgetDataTypeMap[T];
  /** Default AI prompt */
  defaultPrompt?: string;
  /** Model to use */
  model?: string;
  /** Vector store ID */
  vectorStoreId?: string;
  /** Enable AI features */
  enableAI?: boolean;
  /** Job timeout in ms */
  timeout?: number;
  /** Max retry attempts */
  maxRetries?: number;
}

export interface WidgetAIState<T extends WidgetType = WidgetType> {
  /** Current widget data */
  data: WidgetDataTypeMap[T];
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Connection state */
  connectionState: ConnectionState;
  /** Progress percentage */
  progress: number | null;
  /** Last update timestamp */
  lastUpdate: Date | null;
  /** Is the widget flipped to show AI panel */
  isFlipped: boolean;
  /** Current prompt text */
  promptText: string;
}

export interface WidgetAIService<T extends WidgetType = WidgetType> {
  /** Reactive state store */
  state: Readable<WidgetAIState<T>>;
  /** Current data store */
  data: Readable<WidgetDataTypeMap[T]>;
  /** Actions */
  actions: {
    /** Generate content with AI */
    generate: (prompt: string, token: string) => Promise<void>;
    /** Update widget data */
    updateData: (data: WidgetDataTypeMap[T]) => void;
    /** Clear error */
    clearError: () => void;
    /** Toggle flip state */
    toggleFlip: () => void;
    /** Set prompt text */
    setPrompt: (text: string) => void;
    /** Cancel current job */
    cancel: () => void;
    /** Reset to initial state */
    reset: () => void;
  };
  /** Cleanup function */
  destroy: () => void;
}

// ============================================================================
// Data Transformers
// ============================================================================

/**
 * Transform AI response to widget data
 */
export type DataTransformer<T extends WidgetType> = (
  response: any
) => WidgetDataTypeMap[T];

/**
 * Default transformers for each widget type
 */
export const defaultTransformers: {
  [K in WidgetType]: DataTransformer<K>;
} = {
  [WIDGET_TYPES.PARAGRAPH]: (response) => {
    const output = response.output_parsed || response;
    return {
      content: output.content || '',
      markdown: output.markdown ?? false
    };
  },
  
  [WIDGET_TYPES.TABLE]: (response) => {
    const output = response.output_parsed || response;
    return {
      headers: output.headers || [],
      rows: output.rows || [],
      sortable: output.sortable ?? true,
      paginated: output.paginated ?? false
    };
  },
  
  [WIDGET_TYPES.METRIC]: (response) => {
    const output = response.output_parsed || response;
    return {
      label: output.label || 'Metric',
      value: output.value || 0,
      change: output.change,
      changeType: output.changeType,
      unit: output.unit,
      format: output.format
    };
  },
  
  [WIDGET_TYPES.LINE_CHART]: (response) => {
    const output = response.output_parsed || response;
    return {
      datasets: output.datasets || [],
      labels: output.labels || []
    };
  },
  
  [WIDGET_TYPES.BAR_CHART]: (response) => {
    const output = response.output_parsed || response;
    return {
      datasets: output.datasets || [],
      labels: output.labels || []
    };
  },
  
  [WIDGET_TYPES.TITLE]: (response) => {
    const output = response.output_parsed || response;
    return {
      title: output.title || '',
      subtitle: output.subtitle,
      alignment: output.alignment
    };
  },
  
  [WIDGET_TYPES.IMAGE]: (response) => {
    const output = response.output_parsed || response;
    return {
      src: output.src || '',
      alt: output.alt || ''
    };
  },
  
  [WIDGET_TYPES.MAP]: (response) => {
    const output = response.output_parsed || response;
    return {
      center: output.center || { lat: 0, lon: 0 },
      zoom: output.zoom || 10,
      mapType: output.mapType || 'leaflet'
    };
  }
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate and normalize widget data
 */
export function validateAndNormalize<T extends WidgetType>(
  type: T,
  data: unknown
): WidgetDataTypeMap[T] {
  const result = validateWidgetData(type, data);
  
  if (result.success) {
    return result.data;
  }
  
  log.error('Validation failed:', result.error);
  
  // Return safe defaults based on widget type
  const defaults: { [K in WidgetType]: WidgetDataTypeMap[K] } = {
    [WIDGET_TYPES.PARAGRAPH]: { content: 'Error loading content', markdown: false },
    [WIDGET_TYPES.TABLE]: { headers: [], rows: [] },
    [WIDGET_TYPES.METRIC]: { label: 'Error', value: 0 },
    [WIDGET_TYPES.LINE_CHART]: { datasets: [], labels: [] },
    [WIDGET_TYPES.BAR_CHART]: { datasets: [], labels: [] },
    [WIDGET_TYPES.TITLE]: { title: 'Error' },
    [WIDGET_TYPES.IMAGE]: { src: '', alt: 'Error' },
    [WIDGET_TYPES.MAP]: { center: { lat: 0, lon: 0 }, zoom: 10, mapType: 'leaflet' }
  };
  
  return defaults[type] as WidgetDataTypeMap[T];
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a widget AI service instance
 */
export function createWidgetAIService<T extends WidgetType>(
  config: WidgetAIConfig<T>,
  transformer?: DataTransformer<T>
): WidgetAIService<T> {
  // Validate initial data
  const initialData = validateAndNormalize(config.type, config.initialData);
  
  // Create state store
  const state = writable<WidgetAIState<T>>({
    data: initialData,
    loading: false,
    error: null,
    connectionState: ConnectionState.DISCONNECTED,
    progress: null,
    lastUpdate: null,
    isFlipped: false,
    promptText: config.defaultPrompt || ''
  });
  
  // Create derived data store
  const data = derived(state, $state => $state.data);
  
  // Setup channel publisher/consumer
  const publisher = createPublisher(config.type, config.channelId, config.widgetId);
  const consumer = createConsumer(config.type, config.channelId, config.widgetId);
  
  // Subscribe to channel updates
  const unsubscribe = consumer.subscribe((newData) => {
    if (newData) {
      state.update(s => ({
        ...s,
        data: newData,
        lastUpdate: new Date(),
        error: null
      }));
    }
  });
  
  // Job manager instance
  let jobManager: JobSubmissionClient | null = null;
  let jobStateUnsub: (() => void) | null = null;
  
  // Use custom transformer or default
  const dataTransformer = transformer || defaultTransformers[config.type];
  
  // ============================================================================
  // Actions
  // ============================================================================
  
  const actions = {
    /**
     * Generate content using AI
     */
    async generate(prompt: string, token: string): Promise<void> {
      if (!token) {
        state.update(s => ({ ...s, error: 'Authentication required' }));
        return;
      }
      
      if (!config.enableAI) {
        state.update(s => ({ ...s, error: 'AI features are disabled' }));
        return;
      }
      
      try {
        state.update(s => ({ ...s, error: null }));
        
        // Create job manager if needed
        if (!jobManager) {
          jobManager = createJobManager(
            {
              maxRetries: config.maxRetries || 3,
              timeout: config.timeout || 60000
            },
            {
              onComplete: (update) => {
                try {
                  const result = JSON.parse(update.result || '{}');
                  const widgetData = dataTransformer(result);
                  
                  // Validate before publishing
                  const validated = validateAndNormalize(config.type, widgetData);
                  publisher.publish(validated);
                  
                  log.debug(`✅ ${config.type} content generated successfully`);
                } catch (err) {
                  log.error('Failed to process AI response:', err);
                  state.update(s => ({ 
                    ...s, 
                    error: 'Failed to process AI response' 
                  }));
                }
              },
              
              onError: (err) => {
                log.error('❌ Generation failed:', err);
                state.update(s => ({ 
                  ...s, 
                  error: err.message || 'Generation failed' 
                }));
              },
              
              onProgress: (update) => {
                if (update.progress !== undefined) {
                  state.update(s => ({ ...s, progress: update.progress }));
                }
              },
              
              onConnectionChange: (connState) => {
                state.update(s => ({ ...s, connectionState: connState }));
              }
            }
          );
        }
        
        // Subscribe to job state changes
        jobStateUnsub?.();
        jobStateUnsub = jobManager.getState().subscribe((jobState: JobState) => {
          state.update(s => ({
            ...s,
            loading: jobState.loading,
            connectionState: jobState.connectionState
          }));
        });
        
        // Build job input
        const jobInput: SubmitJobInput = {
          request: JSON.stringify({
            prompt,
            model: config.model || 'gpt-4',
            vectorStoreId: config.vectorStoreId,
            outputFormat: config.type,
            widgetType: config.type
          }),
          priority: PRIORITY_LEVELS.MEDIUM
        };
        
        // Submit job
        await jobManager.submitJob(jobInput, token);
        
      } catch (err) {
        log.error('Failed to submit job:', err);
        state.update(s => ({ 
          ...s, 
          error: 'Failed to submit request',
          loading: false 
        }));
      }
    },
    
    /**
     * Update widget data
     */
    updateData(newData: WidgetDataTypeMap[T]): void {
      const validated = validateAndNormalize(config.type, newData);
      publisher.publish(validated);
    },
    
    /**
     * Clear error state
     */
    clearError(): void {
      state.update(s => ({ ...s, error: null }));
    },
    
    /**
     * Toggle flip state
     */
    toggleFlip(): void {
      state.update(s => ({ 
        ...s, 
        isFlipped: !s.isFlipped,
        promptText: !s.isFlipped ? (config.defaultPrompt || '') : s.promptText
      }));
    },
    
    /**
     * Set prompt text
     */
    setPrompt(text: string): void {
      state.update(s => ({ ...s, promptText: text }));
    },
    
    /**
     * Cancel current job
     */
    cancel(): void {
      jobManager?.cancel();
      state.update(s => ({ 
        ...s, 
        loading: false, 
        connectionState: ConnectionState.DISCONNECTED 
      }));
    },
    
    /**
     * Reset to initial state
     */
    reset(): void {
      jobManager?.cancel();
      state.set({
        data: initialData,
        loading: false,
        error: null,
        connectionState: ConnectionState.DISCONNECTED,
        progress: null,
        lastUpdate: null,
        isFlipped: false,
        promptText: config.defaultPrompt || ''
      });
    }
  };
  
  // ============================================================================
  // Cleanup
  // ============================================================================
  
  const destroy = () => {
    unsubscribe();
    jobStateUnsub?.();
    jobManager?.cancel();
    publisher.clear();
  };
  
  return {
    state: { subscribe: state.subscribe },
    data,
    actions,
    destroy
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function createPublisher<T extends WidgetType>(
  type: T,
  channelId: string,
  widgetId: string
): WidgetPublisher<WidgetDataTypeMap[T]> {
  const publishers = {
    [WIDGET_TYPES.PARAGRAPH]: Publishers.paragraph,
    [WIDGET_TYPES.TABLE]: Publishers.table,
    [WIDGET_TYPES.METRIC]: Publishers.metric,
    [WIDGET_TYPES.LINE_CHART]: Publishers.lineChart,
    [WIDGET_TYPES.BAR_CHART]: Publishers.barChart,
    [WIDGET_TYPES.TITLE]: Publishers.title,
    [WIDGET_TYPES.IMAGE]: Publishers.image,
    [WIDGET_TYPES.MAP]: Publishers.map
  };
  
  return publishers[type](channelId, `ai-${widgetId}`) as any;
}

function createConsumer<T extends WidgetType>(
  type: T,
  channelId: string,
  widgetId: string
): WidgetConsumer<WidgetDataTypeMap[T]> {
  const consumers = {
    [WIDGET_TYPES.PARAGRAPH]: Consumers.paragraph,
    [WIDGET_TYPES.TABLE]: Consumers.table,
    [WIDGET_TYPES.METRIC]: Consumers.metric,
    [WIDGET_TYPES.LINE_CHART]: Consumers.lineChart,
    [WIDGET_TYPES.BAR_CHART]: Consumers.barChart,
    [WIDGET_TYPES.TITLE]: Consumers.title,
    [WIDGET_TYPES.IMAGE]: Consumers.image,
    [WIDGET_TYPES.MAP]: Consumers.map
  };
  
  return consumers[type](channelId, widgetId) as any;
}

// ============================================================================
// Connection State Helpers
// ============================================================================

export const connectionLabels = {
  [CONNECTION_STATES.CONNECTED]: 'Connected',
  [CONNECTION_STATES.CONNECTING]: 'Connecting',
  [CONNECTION_STATES.DISCONNECTED]: 'Disconnected',
  [CONNECTION_STATES.ERROR]: 'Error'
} as const;

export const connectionColors = {
  [CONNECTION_STATES.CONNECTED]: 'green',
  [CONNECTION_STATES.CONNECTING]: 'yellow',
  [CONNECTION_STATES.DISCONNECTED]: 'gray',
  [CONNECTION_STATES.ERROR]: 'red'
} as const;

// ============================================================================
// Export
// ============================================================================

export { CONNECTION_STATES, type ConnectionState } from './jobManager';
export default createWidgetAIService;