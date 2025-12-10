export const Q_LIST_USER_PROJECTS = `
	query ListProjectsWithPagination($limit: Int, $nextToken: String, $scope: ListScope) {
		listProjects(nextToken: $nextToken, limit: $limit, scope: $scope) {
			items {
				id
				entityType
				name
				createdAt
				updatedAt
				description
				ownerId
				tenantId
				status
				sharingMode
			}
			nextToken
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

export const M_CREATE_PROJECT = `
	mutation CreateProject($input: CreateProjectInput!) {
		createProject(input: $input) {
			project {
				id
				entityType
				tenantId
				ownerId
				createdAt
				updatedAt
				name
				description
				status
				sharingMode
			}
			userErrors {
				message
				code
				field
			}
		}
	}
`;

export const M_DELETE_PROJECT = `
	mutation DeleteProject($id: ID!) {
		deleteProject(id: $id) {
			project {
				id
				entityType
				tenantId
				ownerId
				createdAt
				updatedAt
				name
				description
				status
				sharingMode
			}
			userErrors {
				message
				code
				field
			}
		}
	}
`;