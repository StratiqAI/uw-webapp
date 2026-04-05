import { gql } from '$lib/services/realtime/graphql/requestHandler';
import { Q_GET_WORKFLOW_EXECUTION, Q_LIST_WORKFLOW_EXECUTIONS } from '@stratiqai/types-simple';
import type { WorkflowExecution } from '@stratiqai/types-simple';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('workflows');

export type WorkflowExecutionListItem = Pick<
	WorkflowExecution,
	| 'id'
	| 'parentId'
	| 'workflow'
	| 'status'
	| 'startedAt'
	| 'completedAt'
	| 'errorMessage'
	| 'totalNodes'
	| 'completedNodes'
	| 'currentNodeId'
	| 'createdAt'
	| 'outputData'
	| 'inputData'
> & { workflow?: { id: string; name: string } | null };

/**
 * Fetch a list of workflow executions for a workflow using hierarchical query.
 * Uses direct listWorkflowExecutions query with workflowId filter.
 * Results are automatically sorted chronologically by the backend (newest first).
 */
export async function fetchWorkflowExecutions(
	workflowId: string,
	projectId: string, // Kept for backward compatibility, but not used in query
	idToken: string,
	options?: { limit?: number; status?: string; nextToken?: string | null }
): Promise<{ items: WorkflowExecutionListItem[]; nextToken?: string | null }> {
	const limit = options?.limit ?? 50;

	log.debug('[fetchWorkflowExecutions] Fetching executions for workflow:', {
		workflowId,
		limit,
		status: options?.status,
		nextToken: options?.nextToken
	});

	const response = await gql<{
		listWorkflowExecutions: {
			items: WorkflowExecutionListItem[];
			nextToken?: string | null;
		};
	}>(
		Q_LIST_WORKFLOW_EXECUTIONS,
		{
			parentId: workflowId, // Backend expects parentId (workflow ID)
			status: options?.status || undefined,
			limit: limit,
			nextToken: options?.nextToken || null
		},
		idToken
	);

	const executions = response?.listWorkflowExecutions?.items ?? [];
	const nextToken = response?.listWorkflowExecutions?.nextToken ?? null;

	log.debug('[fetchWorkflowExecutions] Results:', {
		workflowId,
		count: executions.length,
		executionIds: executions.map((e) => e.id),
		hasNextToken: !!nextToken
	});

	// Results are already filtered by workflowId and sorted chronologically by backend
	// No client-side filtering or sorting needed
	return {
		items: executions,
		nextToken
	};
}

/**
 * Fetch a single workflow execution with node executions.
 * Uses direct getWorkflowExecution query (requires composite key: id + parentId).
 * Node executions are fetched via the field resolver (more efficient with hierarchical schema).
 */
export async function fetchWorkflowExecutionDetail(
	id: string,
	workflowId: string, // parentId - the Workflow ID (execution's parent)
	idToken: string
): Promise<WorkflowExecution | null> {
	log.debug('[fetchWorkflowExecutionDetail] Fetching execution:', { id, workflowId });
	
	// getWorkflowExecution requires composite key: { id, parentId }
	// parentId is the Workflow ID (WorkflowExecution is a child of Workflow)
	try {
		const response = await gql<{ getWorkflowExecution: WorkflowExecution | null }>(
			Q_GET_WORKFLOW_EXECUTION,
			{ key: { id, parentId: workflowId } },
			idToken
		);
		log.debug('[fetchWorkflowExecutionDetail] Query response:', response);
		const result = response?.getWorkflowExecution ?? null;
		if (!result) {
			log.warn('[fetchWorkflowExecutionDetail] Execution not found for id:', id);
		} else {
			log.debug('[fetchWorkflowExecutionDetail] Found execution:', result.id);
		}
		return result;
	} catch (error) {
		log.error('[fetchWorkflowExecutionDetail] GraphQL error:', error);
		throw error;
	}
}
