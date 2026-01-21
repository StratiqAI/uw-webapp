import { gql } from 'graphql-tag';

/**
 * Workflow execution subscription documents.
 * Mirrors @stratiqai/types-simple so the app works before the package is updated.
 * Prefer importing from @stratiqai/types-simple when available.
 */

export const S_ON_UPDATE_WORKFLOW_EXECUTION = gql`
  subscription OnUpdateWorkflowExecution($id: ID!) {
    onUpdateWorkflowExecution(id: $id) {
      id
      status
      totalNodes
      completedNodes
      currentNodeId
      outputData
      errorMessage
      completedAt
    }
  }
`;

export const S_ON_WORKFLOW_EXECUTION_STATUS_CHANGE = gql`
  subscription OnWorkflowExecutionStatusChange(
    $workflowId: ID
    $status: WorkflowExecutionStatus
  ) {
    onWorkflowExecutionStatusChange(workflowId: $workflowId, status: $status) {
      id
      workflowId
      workflow { id name }
      status
      startedAt
      completedAt
      errorMessage
      totalNodes
      completedNodes
      currentNodeId
      createdAt
    }
  }
`;

export const S_ON_WORKFLOW_NODE_EXECUTION_STATUS_CHANGE = gql`
  subscription OnWorkflowNodeExecutionStatusChange($workflowExecutionId: ID!) {
    onWorkflowNodeExecutionStatusChange(workflowExecutionId: $workflowExecutionId) {
      id
      workflowExecutionId
      nodeId
      nodeCategory
      nodeName
      nodeType
      status
      startedAt
      completedAt
      outputData
      errorMessage
      errorDetails
    }
  }
`;
