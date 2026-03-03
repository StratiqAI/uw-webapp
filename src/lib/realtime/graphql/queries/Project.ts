// Re-export Q_LIST_PROJECTS from @stratiqai/types-simple for backward compatibility
// Note: Q_LIST_PROJECTS uses the same query structure
export { Q_LIST_PROJECTS as Q_LIST_USER_PROJECTS } from '@stratiqai/types-simple';

/**
 * GetProject with doclinks using status + linkType (schema fields).
 * Use this instead of Q_GET_PROJECT from @stratiqai/types-simple when the installed
 * package still requests textIndexStatus/imageIndexStatus.
 */
export const Q_GET_PROJECT = `
  query GetProject($id: ID!) {
    getProject(id: $id) {
      id
      entityType
      tenantId
      ownerId
      createdAt
      updatedAt
      sharingMode
      accessList(limit: 10) {
        items {
          id
          entityType
          tenantId
          ownerId
          createdAt
          updatedAt
          recipientUserId
          permission
          resourceTitle
          resourceType
        }
        nextToken
      }
      name
      description
      status
      doclinks(limit: 10) {
        items {
          id
          entityType
          tenantId
          ownerId
          createdAt
          updatedAt
          parentId
          filename
          status
          linkType
          documentId
          deletedAt
        }
        nextToken
      }
      topics(limit: 10) {
        items {
          id
          entityType
          tenantId
          ownerId
          createdAt
          updatedAt
          sharingMode
          parentId
          name
        }
        nextToken
      }
      workflows {
        items {
          id
          entityType
          tenantId
          ownerId
          createdAt
          updatedAt
          deletedAt
          sharingMode
          name
          definition {
            nodes {
              id
              kind
              label
              options
              configuration {
                ... on ProcessNodeConfig {
                  options
                  staticOutput
                }
                ... on AINodeConfig {
                  prompt
                  model
                  topK
                  systemPrompt
                  structuredOutputSchema {
                    jsonSchema
                  }
                }
                ... on ToolsNodeConfig {
                  options
                }
                ... on EmptyNodeConfig {
                  _empty
                }
              }
            }
            edges {
              id
              sourceId
              targetId
              sourcePort
              targetPort
            }
          }
          structuredOutputSchema {
            jsonSchema
          }
          ui {
            elements {
              id
              type
              category
              typeLabel
              x
              y
              width
              height
            }
            connections {
              id
              from
              to
              fromSide
              toSide
            }
          }
        }
        nextToken
      }
    }
  }
`;

export const Q_GET_PROJECT_BY_ID_WITH_DOCLINKS = `
  query GetProjectDeep($id: ID!) {
    getProject(id: $id) {
			id
			entityType
			tenantId
			ownerId
			createdAt
			updatedAt
			name
			description
      docLinks {
        items {
			id
			entityType
			tenantId
			ownerId
			parentId
			createdAt
			updatedAt
			documentId
			filename
			status
			linkType
        }
      }
    }
  }
`;

export const Q_GET_PROJECT_BY_ID_WITH_DOCLINKS_OLD = `
	query getProject($id: ID!) {
		getProject(id: $id) {
			id
			entityType
			tenantId
			ownerId
			createdAt
			updatedAt
			name
			description
			docLinks {
				items {
					id
					entityType
					tenantId
					ownerId
					parentId
					parentType
					createdAt
					updatedAt
					documentId
					filename
					status
					linkType
				}
			nextToken
			}
		}
	}
  `;

// Re-export mutations from @stratiqai/types-simple for backward compatibility
export { M_CREATE_PROJECT, M_DELETE_PROJECT } from '@stratiqai/types-simple';