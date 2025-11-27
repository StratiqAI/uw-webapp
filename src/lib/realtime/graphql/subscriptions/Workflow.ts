/**
 * GraphQL subscriptions for Workflow real-time updates
 */

export const S_ON_WORKFLOW_UPDATED = `
  subscription onWorkflowUpdated($id: ID!) {
    onWorkflowUpdated(id: $id) {
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

export const S_ON_WORKFLOW_DELETED = `
  subscription onWorkflowDeleted($id: ID!) {
    onWorkflowDeleted(id: $id) {
      id
      name
      ownerId
      tenant
      sharingMode
      createdAt
    }
  }
`;

