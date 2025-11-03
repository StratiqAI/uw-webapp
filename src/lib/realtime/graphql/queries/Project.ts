export const Q_LIST_USER_PROJECTS = `
    query listProjects($limit: Int, $nextToken: String) {
        listMyProjects(limit: $limit, nextToken: $nextToken) {
            items {
                id
                name
                ownerId
                tenant
                sharingMode
                createdAt
                details {
                    id
                    projectId
                    ownerId
                    tenant
                    description
                    streetAddress
                    city
                    state
                    zip
                    assetType
                    sharingMode
                    createdAt
                    updatedAt
                }
            }
            nextToken
        }
    }
  `;

export const Q_GET_PROJECT_BY_ID = `
    query project($id: ID!) {
        getProject(projectId: $id) {
            id
            name
            ownerId
            tenant
            sharingMode
            createdAt
            details {
                id
                projectId
                ownerId
                tenant
                description
                streetAddress
                city
                state
                zip
                assetType
                sharingMode
                createdAt
                updatedAt
            }
        }
    }
  `;
