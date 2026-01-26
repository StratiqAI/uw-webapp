// Re-export Q_LIST_PROJECTS from @agnathan/types-simple for backward compatibility
// Note: Q_LIST_PROJECTS uses the same query structure
export { Q_LIST_PROJECTS as Q_LIST_USER_PROJECTS } from '@agnathan/types-simple';



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
					vectorStoreId
					openAIFileId
					status
				}
			nextToken
			}
		}
	}
  `;

// Re-export mutations from @agnathan/types-simple for backward compatibility
export { M_CREATE_PROJECT, M_DELETE_PROJECT } from '@agnathan/types-simple';