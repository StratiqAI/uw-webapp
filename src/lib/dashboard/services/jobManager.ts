/**
 * Job Submission Library
 * A TypeScript library for submitting and monitoring jobs with real-time updates via WebSocket
 */

import type { Readable } from 'svelte/store';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('jobs');

// ===== Type Definitions =====

export const JOB_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
  ERROR: 'ERROR'
} as const;

export type JobStatus = (typeof JOB_STATUSES)[keyof typeof JOB_STATUSES];

export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
} as const;

export type ConnectionState = (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES];

export const PRIORITY_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
} as const;

export type Priority = (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS];

export interface SubmitJobInput {
  readonly request: string;
  readonly priority: Priority;
}

export interface SubmitJobResponse {
  readonly id: string;
  readonly status: JobStatus;
}

export interface ParsedResult {
  readonly output_parsed?: Record<string, unknown>;
  readonly error?: string;
  readonly [key: string]: unknown;
}

export interface JobUpdate {
  readonly id: string;
  readonly status: string;
  readonly result?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly [key: string]: unknown;
}

export interface SubscriptionSpec<T> {
  readonly query: string;
  readonly variables: Record<string, unknown>;
  readonly select: (payload: unknown) => T | undefined;
  readonly next: (data: T) => void;
  readonly error: (error: unknown) => void;
}

export interface JobSubmissionConfig {
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly reconnectBackoffMultiplier?: number;
  readonly maxReconnectDelay?: number;
  readonly subscriptionTimeout?: number;
}

export interface JobState {
  readonly result: SubmitJobResponse | null;
  readonly error: Error | null;
  readonly loading: boolean;
  readonly connectionState: ConnectionState;
  readonly reconnectAttempts: number;
}

export interface JobCallbacks {
  onJobComplete?: (update: JobUpdate) => void;
  onJobError?: (error: Error) => void;
  onStatusUpdate?: (update: JobUpdate) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

// ===== Error Classes =====

export class JobSubmissionError extends Error {
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'JobSubmissionError';
    this.code = code;
    this.details = details;
  }
}

export class WebSocketError extends Error {
  readonly code?: string;
  readonly shouldRetry: boolean;

  constructor(message: string, code?: string, shouldRetry: boolean = true) {
    super(message);
    this.name = 'WebSocketError';
    this.code = code;
    this.shouldRetry = shouldRetry;
  }
}

// ===== GraphQL Queries =====

const M_SUBMIT_JOB = `
  mutation SubmitJob($input: SubmitJobInput!) {
    submitJob(input: $input) {
      id
      status
    }
  }
`;

// ===== Utility Functions =====

export function isTerminalStatus(status: JobStatus): boolean {
  const terminalStatuses: JobStatus[] = [
    JOB_STATUSES.COMPLETED,
    JOB_STATUSES.COMPLETE,
    JOB_STATUSES.FAILED,
    JOB_STATUSES.ERROR
  ];
  return terminalStatuses.includes(status);
}

export function parseResult(resultStr: string | null): ParsedResult | null {
  if (!resultStr) return null;

  try {
    const parsed = JSON.parse(resultStr);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid result format');
    }
    return parsed;
  } catch (error) {
    log.error('Failed to parse result:', error);
    return {
      error: `Failed to parse result: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export function calculateBackoffDelay(
  attempt: number,
  config: Required<JobSubmissionConfig>
): number {
  const baseDelay = config.retryDelay;
  const multiplier = config.reconnectBackoffMultiplier;
  const maxDelay = config.maxReconnectDelay;

  const delay = baseDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

// ===== Main Job Submission Class =====

export class JobSubmissionClient {
  private config: Required<JobSubmissionConfig>;
  private callbacks: JobCallbacks;
  private networkState: {
    currentSubscription: SubscriptionSpec<JobUpdate> | null;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    subscriptionTimeout: ReturnType<typeof setTimeout> | null;
  };
  private currentJobId: string | null = null;
  private jobStates: Map<string, JobState> = new Map();
  private jobUpdates: Map<string, JobUpdate[]> = new Map();

  // Dependencies that must be injected
  private gql: <T>(query: string, variables: Record<string, unknown>, token: string) => Promise<T>;
  private jobUpdateStore: {
    subscribeToJobState: (jobId: string) => Readable<JobState>;
    subscribeToJobUpdates: (jobId: string) => Readable<JobUpdate[]>;
    setJobState: (jobId: string, state: JobState) => void;
    updateJobState: (jobId: string, state: Partial<JobState>) => void;
    addJobUpdate: (jobId: string, update: JobUpdate) => void;
    clearJobUpdates: (jobId: string) => void;
    deleteJob: (jobId: string) => void;
  };
  private ensureConnection: (token: string) => Promise<void>;
  private addSubscription: (token: string, spec: SubscriptionSpec<JobUpdate>) => Promise<void>;
  private removeSubscription: (spec: SubscriptionSpec<JobUpdate>) => void;
  private S_JOB_UPDATE: string;

  constructor(
    dependencies: {
      gql: <T>(query: string, variables: Record<string, unknown>, token: string) => Promise<T>;
      jobUpdateStore: any;
      ensureConnection: (token: string) => Promise<void>;
      addSubscription: (token: string, spec: SubscriptionSpec<JobUpdate>) => Promise<void>;
      removeSubscription: (spec: SubscriptionSpec<JobUpdate>) => void;
      S_JOB_UPDATE: string;
    },
    config: JobSubmissionConfig = {},
    callbacks: JobCallbacks = {}
  ) {
    this.gql = dependencies.gql;
    this.jobUpdateStore = dependencies.jobUpdateStore;
    this.ensureConnection = dependencies.ensureConnection;
    this.addSubscription = dependencies.addSubscription;
    this.removeSubscription = dependencies.removeSubscription;
    this.S_JOB_UPDATE = dependencies.S_JOB_UPDATE;

    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      reconnectBackoffMultiplier: config.reconnectBackoffMultiplier ?? 2,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      subscriptionTimeout: config.subscriptionTimeout ?? 300000
    };

    this.callbacks = callbacks;
    this.networkState = {
      currentSubscription: null,
      reconnectTimer: null,
      subscriptionTimeout: null
    };
  }

  // ===== Public Methods =====

  /**
   * Submit a job and set up real-time monitoring
   */
  async submitJob(input: SubmitJobInput, idToken: string): Promise<SubmitJobResponse> {
    // Validate authentication
    if (!idToken) {
      throw new JobSubmissionError('Authentication required', 'AUTH_REQUIRED');
    }

    // Validate input
    const trimmedRequest = input?.request?.trim();
    if (!trimmedRequest) {
      throw new JobSubmissionError('Job request cannot be empty', 'INVALID_INPUT');
    }

    // Clean up previous job if exists
    if (this.currentJobId) {
      await this.cleanup();
    }

    // Create temporary loading state
    const loadingJobId = 'loading-' + Date.now();
    this.currentJobId = loadingJobId;
    this.setJobState(loadingJobId, {
      result: null,
      error: null,
      loading: true,
      connectionState: CONNECTION_STATES.DISCONNECTED,
      reconnectAttempts: 0
    });

    try {
      const result = await this.submitJobWithRetry(input, idToken);
      log.debug('Job submitted successfully:', result);

      // Update with actual job ID
      this.currentJobId = result.id;
      this.setJobState(result.id, {
        result: result,
        error: null,
        loading: false,
        connectionState: CONNECTION_STATES.DISCONNECTED,
        reconnectAttempts: 0
      });

      // Clean up temporary loading state
      this.jobUpdateStore.deleteJob(loadingJobId);

      // Set up real-time subscription
      await this.setupSubscription(result.id, idToken);

      return result;
    } catch (error) {
      const jobError =
        error instanceof JobSubmissionError
          ? error
          : new JobSubmissionError(
              error instanceof Error ? error.message : 'Failed to submit job',
              'UNKNOWN_ERROR',
              error
            );

      this.updateJobState(loadingJobId, {
        error: jobError,
        loading: false
      });

      this.callbacks.onJobError?.(jobError);
      throw jobError;
    }
  }

  /**
   * Get the current state of a job
   */
  getJobState(jobId: string): JobState | undefined {
    return this.jobStates.get(jobId);
  }

  /**
   * Get all updates for a job
   */
  getJobUpdates(jobId: string): JobUpdate[] {
    return this.jobUpdates.get(jobId) || [];
  }

  /**
   * Subscribe to job state changes
   */
  subscribeToJobState(jobId: string): Readable<JobState> {
    return this.jobUpdateStore.subscribeToJobState(jobId);
  }

  /**
   * Subscribe to job updates
   */
  subscribeToJobUpdates(jobId: string): Readable<JobUpdate[]> {
    return this.jobUpdateStore.subscribeToJobUpdates(jobId);
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    if (this.currentJobId) {
      await this.cleanupWebSocket(this.currentJobId);
      this.currentJobId = null;
    }
  }

  // ===== Private Methods =====

  private async submitJobWithRetry(
    input: SubmitJobInput,
    token: string,
    attempt = 1
  ): Promise<SubmitJobResponse> {
    try {
      const response = await this.gql<{ submitJob: SubmitJobResponse }>(
        M_SUBMIT_JOB,
        { input },
        token
      );

      if (!response?.submitJob?.id || !response.submitJob.status) {
        throw new JobSubmissionError('Invalid response structure', 'INVALID_RESPONSE', response);
      }

      return response.submitJob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Job submission attempt ${attempt} failed:`, errorMessage);

      const isRetryable = !(
        error instanceof JobSubmissionError && error.code === 'INVALID_RESPONSE'
      );

      if (attempt < this.config.maxRetries && isRetryable) {
        const delay = calculateBackoffDelay(attempt, this.config);
        log.debug(
          `Retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.submitJobWithRetry(input, token, attempt + 1);
      }

      throw error instanceof JobSubmissionError
        ? error
        : new JobSubmissionError(errorMessage, 'SUBMISSION_FAILED', error);
    }
  }

  private async setupSubscription(jobId: string, token: string): Promise<void> {
    log.debug('Setting up subscription for job:', jobId);
    this.updateJobState(jobId, { connectionState: CONNECTION_STATES.CONNECTING });
    this.callbacks.onConnectionStateChange?.(CONNECTION_STATES.CONNECTING);

    try {
      await this.cleanupWebSocket(jobId);
      this.startSubscriptionTimeout(jobId);

      const subscriptionSpec: SubscriptionSpec<JobUpdate> = {
        query: this.S_JOB_UPDATE,
        variables: { id: jobId },
        select: (payload: unknown): JobUpdate | undefined => {
          const data = payload as any;
          const update = data?.onJobUpdate || data?.data?.onJobUpdate || data;

          if (update?.id && update?.status) {
            return update as JobUpdate;
          }

          log.warn('Invalid update structure:', payload);
          return undefined;
        },
        next: (update: JobUpdate) => {
          if (update) {
            this.clearSubscriptionTimeout();
            this.addJobUpdate(jobId, update);

            if (isTerminalStatus(update.status as JobStatus)) {
              log.debug('Job complete, scheduling subscription cleanup');
              setTimeout(() => this.cleanupWebSocket(jobId), 1000);
            } else {
              this.startSubscriptionTimeout(jobId);
            }
          }
        },
        error: (error: unknown) => {
          const wsError =
            error instanceof Error
              ? new WebSocketError(error.message, 'SUBSCRIPTION_ERROR')
              : new WebSocketError('Unknown subscription error', 'UNKNOWN_ERROR');

          log.error('Subscription error:', wsError);
          this.handleSubscriptionError(wsError, jobId, token);
        }
      };

      this.networkState.currentSubscription = subscriptionSpec;

      await this.ensureConnection(token);
      await this.addSubscription(token, subscriptionSpec);

      this.updateJobState(jobId, {
        connectionState: CONNECTION_STATES.CONNECTED,
        reconnectAttempts: 0
      });
      this.callbacks.onConnectionStateChange?.(CONNECTION_STATES.CONNECTED);
      log.debug('✓ Subscription established for job:', jobId);
    } catch (error) {
      const wsError =
        error instanceof Error
          ? new WebSocketError(error.message, 'CONNECTION_ERROR')
          : new WebSocketError('Failed to establish connection', 'UNKNOWN_ERROR');

      log.error('Failed to establish subscription:', wsError);
      this.handleSubscriptionError(wsError, jobId, token);
    }
  }

  private handleSubscriptionError(error: WebSocketError, jobId: string, token: string): void {
    this.clearSubscriptionTimeout();
    this.updateJobState(jobId, {
      connectionState: CONNECTION_STATES.ERROR,
      error: error
    });
    this.callbacks.onConnectionStateChange?.(CONNECTION_STATES.ERROR);

    const currentState = this.getJobState(jobId);
    const currentReconnectAttempts = currentState?.reconnectAttempts || 0;
    const latestUpdate = this.getJobUpdates(jobId)[0];
    const isJobComplete = latestUpdate && isTerminalStatus(latestUpdate.status as JobStatus);

    const canRetry =
      error.shouldRetry && currentReconnectAttempts < this.config.maxRetries && !isJobComplete;

    if (canRetry) {
      const newAttempts = currentReconnectAttempts + 1;
      this.updateJobState(jobId, { reconnectAttempts: newAttempts });
      const delay = calculateBackoffDelay(newAttempts, this.config);

      log.debug(
        `Scheduling reconnection attempt ${newAttempts}/${this.config.maxRetries} in ${delay}ms`
      );

      this.networkState.reconnectTimer = setTimeout(() => {
        this.setupSubscription(jobId, token);
      }, delay);
    } else {
      log.error('Max reconnection attempts reached or job complete, stopping reconnection');
      this.callbacks.onJobError?.(error);
    }
  }

  private addJobUpdate(jobId: string, update: JobUpdate): void {
    log.debug('Adding job update:', {
      id: update.id,
      status: update.status,
      timestamp: update.updatedAt
    });

    this.jobUpdateStore.addJobUpdate(jobId, update);
    this.callbacks.onStatusUpdate?.(update);

    const status = update.status as JobStatus;
    if (isTerminalStatus(status)) {
      if (status === JOB_STATUSES.FAILED || status === JOB_STATUSES.ERROR) {
        this.callbacks.onJobError?.(new JobSubmissionError('Job failed', status, update));
      } else {
        this.callbacks.onJobComplete?.(update);
      }
    }
  }

  private startSubscriptionTimeout(jobId: string): void {
    this.clearSubscriptionTimeout();

    this.networkState.subscriptionTimeout = setTimeout(() => {
      log.warn(`Subscription timeout for job ${jobId}`);
      const idToken = ''; // This would need to be stored or passed
      this.handleSubscriptionError(
        new WebSocketError('Subscription timeout', 'TIMEOUT', false),
        jobId,
        idToken
      );
    }, this.config.subscriptionTimeout);
  }

  private clearSubscriptionTimeout(): void {
    if (this.networkState.subscriptionTimeout) {
      clearTimeout(this.networkState.subscriptionTimeout);
      this.networkState.subscriptionTimeout = null;
    }
  }

  private async cleanupWebSocket(jobId?: string): Promise<void> {
    this.clearSubscriptionTimeout();

    if (this.networkState.reconnectTimer) {
      clearTimeout(this.networkState.reconnectTimer);
      this.networkState.reconnectTimer = null;
    }

    if (this.networkState.currentSubscription) {
      try {
        this.removeSubscription(this.networkState.currentSubscription);
      } catch (error) {
        log.error('Error removing subscription:', error);
      } finally {
        this.networkState.currentSubscription = null;
      }
    }

    if (jobId) {
      this.updateJobState(jobId, {
        connectionState: CONNECTION_STATES.DISCONNECTED
      });
      this.callbacks.onConnectionStateChange?.(CONNECTION_STATES.DISCONNECTED);
    }
  }

  private setJobState(jobId: string, state: JobState): void {
    this.jobStates.set(jobId, state);
    this.jobUpdateStore.setJobState(jobId, state);
  }

  private updateJobState(jobId: string, state: Partial<JobState>): void {
    const currentState = this.jobStates.get(jobId);
    if (currentState) {
      const newState = { ...currentState, ...state };
      this.jobStates.set(jobId, newState);
    }
    this.jobUpdateStore.updateJobState(jobId, state);
  }
}

// ===== Export a factory function for easier instantiation =====

export interface CreateJobSubmissionClientOptions {
  dependencies: {
    gql: <T>(query: string, variables: Record<string, unknown>, token: string) => Promise<T>;
    jobUpdateStore: any;
    ensureConnection: (token: string) => Promise<void>;
    addSubscription: (token: string, spec: SubscriptionSpec<JobUpdate>) => Promise<void>;
    removeSubscription: (spec: SubscriptionSpec<JobUpdate>) => void;
    S_JOB_UPDATE: string;
  };
  config?: JobSubmissionConfig;
  callbacks?: JobCallbacks;
}

export function createJobSubmissionClient(
  options: CreateJobSubmissionClientOptions
): JobSubmissionClient {
  return new JobSubmissionClient(
    options.dependencies,
    options.config,
    options.callbacks
  );
}

// ===== Factory function with AppSync WebSocket integration =====

/**
 * Creates a JobSubmissionClient with AppSync WebSocket dependencies pre-configured
 * This is the recommended way to instantiate a JobSubmissionClient in your application.
 * 
 * @example
 * ```typescript
 * import { createJobSubmissionClientWithAppSync } from '$lib/dashboard/services/jobManager';
 * 
 * const client = await createJobSubmissionClientWithAppSync({
 *   config: {
 *     maxRetries: 3,
 *     retryDelay: 1000
 *   },
 *   callbacks: {
 *     onJobComplete: (update) => { void update; },
 *     onJobError: (error) => { void error; }
 *   }
 * });
 * 
 * // Submit a job
 * await client.submitJob({ request: 'My request', priority: 'HIGH' }, idToken);
 * ```
 */
export async function createJobSubmissionClientWithAppSync(options?: {
  config?: JobSubmissionConfig;
  callbacks?: JobCallbacks;
}): Promise<JobSubmissionClient> {
  // Ensure browser-only execution
//   if (typeof window === 'undefined') {
//     throw new Error('JobSubmissionClient must be created in the browser');
//   }

  // Use dynamic imports to avoid SSR issues and circular dependencies
  const [
    { gql },
    { jobUpdateStore },
    { ensureConnection, addSubscription, removeSubscription },
    { S_JOB_UPDATE }
  ] = await Promise.all([
    import('$lib/services/realtime/graphql/requestHandler'),
    import('$lib/stores/jobUpdateStore'),
    import('$lib/stores/appSyncClientStore'),
    import('$lib/services/realtime/graphql/subscriptions/Job')
  ]);

  return new JobSubmissionClient(
    {
      gql,
      jobUpdateStore,
      ensureConnection: async (token: string) => {
        await ensureConnection(token);
      },
      addSubscription,
      removeSubscription,
      S_JOB_UPDATE
    },
    options?.config,
    options?.callbacks
  );
}

/**
 * Synchronous version using pre-imported dependencies
 * Use this when you've already imported the dependencies or when dynamic imports aren't needed.
 * 
 * @example
 * ```typescript
 * import { gql } from '$lib/services/realtime/graphql/requestHandler';
 * import { jobUpdateStore } from '$lib/stores/jobUpdateStore';
 * import { ensureConnection, addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';
 * import { S_JOB_UPDATE } from '$lib/services/realtime/graphql/subscriptions/Job';
 * import { createJobSubmissionClientSync } from '$lib/dashboard/services/jobManager';
 * 
 * const client = createJobSubmissionClientSync(
 *   { gql, jobUpdateStore, ensureConnection, addSubscription, removeSubscription, S_JOB_UPDATE },
 *   { config: {...}, callbacks: {...} }
 * );
 * ```
 */
export function createJobSubmissionClientSync(
  dependencies: {
    gql: <T>(query: string, variables: Record<string, unknown>, token: string) => Promise<T>;
    jobUpdateStore: any;
    ensureConnection: (token: string) => Promise<void>;
    addSubscription: (token: string, spec: SubscriptionSpec<JobUpdate>) => Promise<void>;
    removeSubscription: (spec: SubscriptionSpec<JobUpdate>) => void;
    S_JOB_UPDATE: string;
  },
  options?: {
    config?: JobSubmissionConfig;
    callbacks?: JobCallbacks;
  }
): JobSubmissionClient {
  return new JobSubmissionClient(
    dependencies,
    options?.config,
    options?.callbacks
  );
}