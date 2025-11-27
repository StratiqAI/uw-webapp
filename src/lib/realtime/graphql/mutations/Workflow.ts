/**
 * GraphQL mutations for Workflow operations
 */

import type { Workflow, CreateWorkflowInput, UpdateWorkflowInput } from '$lib/types/Workflow';
import { gql } from '$lib/realtime/graphql/requestHandler';

export const M_CREATE_WORKFLOW = `
  mutation createWorkflow($input: CreateWorkflowInput!) {
    createWorkflow(input: $input) {
      id
      name
      description
      ownerId
      tenant
      sharingMode
      elements {
        id
        elementTypeId
        x
        y
        width
        height
        aiQueryData {
          prompt
          model
          systemPrompt
        }
      }
      connections {
        id
        fromElementId
        toElementId
        fromSide
        toSide
      }
      createdAt
      updatedAt
    }
  }
`;

export const M_UPDATE_WORKFLOW = `
  mutation updateWorkflow($input: UpdateWorkflowInput!) {
    updateWorkflow(input: $input) {
      id
      name
      description
      ownerId
      tenant
      sharingMode
      elements {
        id
        elementTypeId
        x
        y
        width
        height
        aiQueryData {
          prompt
          model
          systemPrompt
        }
      }
      connections {
        id
        fromElementId
        toElementId
        fromSide
        toSide
      }
      createdAt
      updatedAt
    }
  }
`;

export const M_DELETE_WORKFLOW = `
  mutation deleteWorkflow($id: ID!) {
    deleteWorkflow(id: $id) {
      id
      name
      ownerId
      tenant
      sharingMode
      createdAt
    }
  }
`;

/**
 * Create a new workflow
 */
export async function createWorkflow(
	input: CreateWorkflowInput,
	idToken: string
): Promise<Workflow> {
	try {
		const res = await gql<{ createWorkflow: Workflow }>(M_CREATE_WORKFLOW, { input }, idToken);
		return res.createWorkflow;
	} catch (e) {
		console.error('Error creating workflow:', e);
		throw e;
	}
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
	input: UpdateWorkflowInput,
	idToken: string
): Promise<Workflow> {
	try {
		const res = await gql<{ updateWorkflow: Workflow }>(M_UPDATE_WORKFLOW, { input }, idToken);
		return res.updateWorkflow;
	} catch (e) {
		console.error('Error updating workflow:', e);
		throw e;
	}
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string, idToken: string): Promise<Workflow> {
	try {
		const res = await gql<{ deleteWorkflow: Workflow }>(M_DELETE_WORKFLOW, { id }, idToken);
		return res.deleteWorkflow;
	} catch (e) {
		console.error('Error deleting workflow:', e);
		throw e;
	}
}

