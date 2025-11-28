export const Q_LIST_USER_PROJECTS = `
	query ListProjectsWithPagination($limit: Int, $nextToken: String) {
		listProjects(nextToken: $nextToken, limit: $limit) {
			items {
				id
				entityType
				name
				createdAt
				description
				ownerId
				tenantId
				sharedWith
				sharingMode
				updatedAt
			}
			nextToken
		}
	}
`;



export const Q_GET_PROJECT_BY_ID_WITH_DOCLINKS = `
	query getProject($id: ID!) {
		getProject(id: $id) {
			id
			entityType
			tenantId
			ownerId
			parentId
			parentType
			createdAt
			updatedAt
			name
			description
			sharingMode
			sharedWith
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
			id
			entityType
			tenantId
			ownerId
			parentId
			parentType
			name
			description
			sharingMode
			sharedWith
			createdAt
			updatedAt
		}
	}
`;

export const M_DELETE_PROJECT = `
	mutation DeleteProject($id: ID!) {
		deleteProject(id: $id) {
			id
		}
	}
`;