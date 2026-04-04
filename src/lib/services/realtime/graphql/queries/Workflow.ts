/**
 * GraphQL queries for Workflow operations
 */

export const Q_GET_WORKFLOW = `
  query getWorkflow($id: ID!) {
    getWorkflow(id: $id) {
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

export const Q_LIST_MY_WORKFLOWS = `
  query listMyWorkflows($limit: Int, $nextToken: String) {
    listMyWorkflows(limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`;

export const Q_LIST_WORKFLOWS_BY_OWNER = `
  query listWorkflowsByOwner($ownerId: ID!, $limit: Int, $nextToken: String) {
    listWorkflowsByOwner(ownerId: $ownerId, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`;

