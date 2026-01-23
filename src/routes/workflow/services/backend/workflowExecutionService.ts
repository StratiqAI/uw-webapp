import { gql } from '$lib/realtime/graphql/requestHandler';
import { Q_GET_WORKFLOW_EXECUTION } from '@stratiqai/types-simple';
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
	| 'outputData'
	| 'inputData'
> & { workflow?: { id: string; name: string } | null };

/**
 * Fetch a list of workflow executions for a workflow by querying the project.
 * Uses the parent-child relationship: Project → WorkflowExecution
 * Filters by workflowId on the client side since workflowexecutions returns all executions for the project
 */
export async function fetchWorkflowExecutions(
	workflowId: string,
	projectId: string,
	idToken: string,
	options?: { limit?: number; status?: string; nextToken?: string | null }
): Promise<{ items: WorkflowExecutionListItem[]; nextToken?: string | null }> {
	const limit = options?.limit ?? 50;
	const QUERY_PROJECT_WITH_WORKFLOW_EXECUTIONS = `
		query GetProjectWithWorkflowExecutions($id: ID!, $executionsLimit: Int, $executionsNextToken: String) {
			getProject(id: $id) {
				id
				workflowexecutions(limit: $executionsLimit, nextToken: $executionsNextToken) {
					items {
						id
						entityType
						tenantId
						ownerId
						createdAt
						updatedAt
						deletedAt
						parentId
						workflowId
						workflow {
							id
							name
							definition
						}
						status
						startedAt
						completedAt
						cancelledAt
						triggerEvent
						inputData
						outputData
						errorMessage
						totalNodes
						completedNodes
						currentNodeId
					}
					nextToken
				}
			}
		}
	`;

	const response = await gql<{
		getProject: {
			workflowexecutions?: {
				items: WorkflowExecutionListItem[];
				nextToken?: string | null;
			} | null;
		} | null;
	}>(
		QUERY_PROJECT_WITH_WORKFLOW_EXECUTIONS,
		{
			id: projectId,
			executionsLimit: limit,
			executionsNextToken: options?.nextToken ?? null
		},
		idToken
	);

	// Get all executions from the project
	const project = response?.getProject;
	const allExecutions = project?.workflowexecutions?.items ?? [];
	const nextToken = project?.workflowexecutions?.nextToken ?? null;

	console.log('[fetchWorkflowExecutions] Debug:', {
		projectId,
		workflowId,
		totalExecutions: allExecutions.length,
		executionWorkflowIds: allExecutions.map((e) => e.workflowId),
		executionIds: allExecutions.map((e) => e.id)
	});

	// Filter by workflowId and optionally by status
	let filteredExecutions = allExecutions.filter((exec) => exec.workflowId === workflowId);
	if (options?.status) {
		filteredExecutions = filteredExecutions.filter((exec) => exec.status === options.status);
	}

	console.log('[fetchWorkflowExecutions] Filtered:', {
		filteredCount: filteredExecutions.length,
		filteredIds: filteredExecutions.map((e) => e.id)
	});

	// Sort by creation date (newest first)
	const sortedItems = [...filteredExecutions].sort((a, b) => {
		const aTime = new Date(a.createdAt || a.startedAt || 0).getTime();
		const bTime = new Date(b.createdAt || b.startedAt || 0).getTime();
		return bTime - aTime;
	});

	return {
		items: sortedItems,
		nextToken
	};
}

/**
 * Fetch a single workflow execution with node executions.
 * If projectId is provided, fetches through the project relationship (more reliable for child entities).
 */
export async function fetchWorkflowExecutionDetail(
	id: string,
	idToken: string,
	projectId?: string
): Promise<WorkflowExecution | null> {
	console.log('[fetchWorkflowExecutionDetail] Fetching execution:', { id, projectId });
	
	// If projectId is provided, fetch through project relationship (more reliable)
	if (projectId) {
		const QUERY_PROJECT_WITH_EXECUTION = `
			query GetProjectWithExecution($projectId: ID!, $executionId: ID!) {
				getProject(id: $projectId) {
					id
					workflowexecutions(limit: 1000) {
						items {
							id
							entityType
							tenantId
							ownerId
							createdAt
							updatedAt
							deletedAt
							parentId
							workflowId
							workflow {
								id
								entityType
								tenantId
								ownerId
								createdAt
								updatedAt
								deletedAt
								sharingMode
								name
								definition
							}
							status
							startedAt
							completedAt
							cancelledAt
							triggerEvent
							inputData
							outputData
							errorMessage
							totalNodes
							completedNodes
							currentNodeId
							nodeExecutions(limit: 100) {
								items {
									id
									entityType
									tenantId
									ownerId
									createdAt
									updatedAt
									deletedAt
									parentId
									workflowExecutionId
									nodeId
									nodeCategory
									nodeName
									nodeType
									status
									startedAt
									completedAt
									inputData
									outputData
									errorMessage
									errorDetails
								}
								nextToken
							}
						}
					}
				}
			}
		`;

		try {
			const response = await gql<{
				getProject: {
					workflowexecutions?: {
						items: WorkflowExecution[];
					} | null;
				} | null;
			}>(QUERY_PROJECT_WITH_EXECUTION, { projectId, executionId: id }, idToken);
			
			const executions = response?.getProject?.workflowexecutions?.items ?? [];
			const execution = executions.find((e) => e.id === id);
			
			if (execution) {
				console.log('[fetchWorkflowExecutionDetail] Found execution via project:', execution.id);
				return execution;
			}
			console.warn('[fetchWorkflowExecutionDetail] Execution not found in project executions');
		} catch (error) {
			console.error('[fetchWorkflowExecutionDetail] Error fetching via project:', error);
			// Fall through to direct query
		}
	}

	// Fallback to direct query
	try {
		const response = await gql<{ getWorkflowExecution: WorkflowExecution | null }>(
			Q_GET_WORKFLOW_EXECUTION,
			{ id },
			idToken
		);
		console.log('[fetchWorkflowExecutionDetail] Direct query response:', response);
		const result = response?.getWorkflowExecution ?? null;
		if (!result) {
			console.warn('[fetchWorkflowExecutionDetail] Execution not found for id:', id);
		}
		return result;
	} catch (error) {
		console.error('[fetchWorkflowExecutionDetail] GraphQL error:', error);
		throw error;
	}
}
