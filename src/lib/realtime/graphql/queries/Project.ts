export const Q_LIST_USER_PROJECTS = `
    query listProjects($limit: Int, $nextToken: String) {
        listMyProjects(limit: $limit, nextToken: $nextToken) {
            items {
                zip
                updatedAt
                tags
                status
                state
                ownerId
                name
                members
                isPublic
                isDeleted
                isArchived
                isActive
                image
                vectorStoreId
                id
                documents {
                    id
                    filename
                }
                description
                createdAt
                country
                city
                assetType
                address
            }
            nextToken
        }
    }
  `;

export const Q_GET_PROJECT_BY_ID = `
    query project($id: ID!) {
        project(id: $id) {
            id
            name
            address
            city
            state
            zip
            country
            assetType
            createdAt
            description
            vectorStoreId
            documents {
              id
              filename
            }
            image
            isActive
            members
            ownerId
            status
            tags
            updatedAt
            isArchived
            isDeleted
            isPublic
        }
    }
  `;
