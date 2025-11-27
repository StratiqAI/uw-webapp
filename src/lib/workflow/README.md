# Workflow GraphQL Integration

This directory contains utilities for integrating the Workflow Builder with GraphQL.

## Files

- **`workflowUtils.ts`**: Conversion utilities between internal component state and GraphQL types
- **`../types/Workflow.ts`**: TypeScript types matching the GraphQL schema
- **`../realtime/graphql/schema/workflow.graphql`**: GraphQL schema definition
- **`../realtime/graphql/queries/Workflow.ts`**: GraphQL queries
- **`../realtime/graphql/mutations/Workflow.ts`**: GraphQL mutations with helper functions
- **`../realtime/graphql/subscriptions/Workflow.ts`**: GraphQL subscriptions

## GraphQL Schema

The workflow schema includes:

- **Workflow**: Main type containing elements and connections
- **WorkflowElement**: Represents a node in the workflow (input, process, output, or AI)
- **WorkflowConnection**: Represents a connection between two elements
- **AIQueryData**: Configuration for AI query nodes

## Usage Example

```typescript
import { createWorkflow, updateWorkflow, getWorkflow } from '$lib/realtime/graphql/mutations/Workflow';
import { Q_GET_WORKFLOW } from '$lib/realtime/graphql/queries/Workflow';
import { workflowToInternal, internalToWorkflow } from '$lib/workflow/workflowUtils';
import { gql } from '$lib/realtime/graphql/requestHandler';

// Load a workflow from GraphQL
async function loadWorkflow(workflowId: string, idToken: string, elementTypes: InternalElementType[]) {
  const result = await gql<{ getWorkflow: Workflow }>(
    Q_GET_WORKFLOW,
    { id: workflowId },
    idToken
  );
  
  const { elements, connections } = workflowToInternal(result.getWorkflow, elementTypes);
  return { elements, connections };
}

// Save a workflow to GraphQL
async function saveWorkflow(
  name: string,
  elements: InternalGridElement[],
  connections: InternalConnection[],
  idToken: string
) {
  const { elements: workflowElements, connections: workflowConnections } = 
    internalToWorkflow(elements, connections);
  
  const workflow = await createWorkflow({
    name,
    elements: workflowElements,
    connections: workflowConnections
  }, idToken);
  
  return workflow;
}
```

## Schema Location

The GraphQL schema file is located at:
- `src/lib/realtime/graphql/schema/workflow.graphql`

This schema should be added to your AppSync schema definition to enable the workflow API.

