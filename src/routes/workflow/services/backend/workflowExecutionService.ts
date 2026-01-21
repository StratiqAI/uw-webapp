import { gql } from '$lib/realtime/graphql/requestHandler';
import {
	Q_GET_WORKFLOW_EXECUTION,
	Q_LIST_WORKFLOW_EXECUTIONS
} from '@stratiqai/types-simple';
import type { WorkflowExecution } from '@stratiqai/types-simple';

export type WorkflowExecutionListItem = Pick<
	WorkflowExecution,
	| 'id'
	| 'workflowId'
	| 'workflow'
	| 'status'
	| 'startedAt'
	| 'completedAt'
	| 'errorMessage'
	| 'totalNodes'
	| 'completedNodes'
	| 'currentNodeId'
	| 'createdAt'
> & { workflow?: { id: string; name: string } | null };

/**
 * Fetch a list of workflow executions for a workflow.
 */
export async function fetchWorkflowExecutions(
	workflowId: string,
	idToken: string,
	options?: { limit?: number; status?: string; nextToken?: string | null }
): Promise<{ items: WorkflowExecutionListItem[]; nextToken?: string | null }> {
	const response = await gql<{
		listWorkflowExecutions: {
			items: WorkflowExecutionListItem[];
			nextToken?: string | null;
		};
	}>(
		Q_LIST_WORKFLOW_EXECUTIONS,
		{
			workflowId,
			limit: options?.limit ?? 50,
			...(options?.status && { status: options.status }),
			...(options?.nextToken && { nextToken: options.nextToken })
		},
		idToken
	);

	const conn = response?.listWorkflowExecutions;
	return {
		items: conn?.items ?? [],
		nextToken: conn?.nextToken ?? null
	};
}

/**
 * Fetch a single workflow execution with node executions.
 */
export async function fetchWorkflowExecutionDetail(
	id: string,
	idToken: string
): Promise<WorkflowExecution | null> {
	const response = await gql<{ getWorkflowExecution: WorkflowExecution | null }>(
		Q_GET_WORKFLOW_EXECUTION,
		{ id },
		idToken
	);
	return response?.getWorkflowExecution ?? null;
}
