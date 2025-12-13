// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.
// Contains GraphQL operations for 6 entities.

// ==== Project ====
// Auto-generated GraphQL operation for Project (create)
export const M_CREATE_PROJECT = `
mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    project {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
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
}`;

// Auto-generated GraphQL operation for Project (get)
export const Q_GET_PROJECT = `
query GetProject($id: ID!) {
  getProject(id: $id) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    name
    description
    status
    sharingMode
  }
}`;

// Auto-generated GraphQL operation for Project (list)
export const Q_LIST_PROJECTS = `
query ListProjectsWithPagination($limit: Int, $nextToken: String, $scope: ListScope) {
  listProjects(limit: $limit, nextToken: $nextToken, scope: $scope) {
    items {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
      name
      description
      status
      sharingMode
    }
    nextToken
  }
}`;

// Auto-generated GraphQL operation for Project (update)
export const M_UPDATE_PROJECT = `
mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
  updateProject(id: $id, input: $input) {
    project {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
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
}`;

// Auto-generated GraphQL operation for Project (delete)
export const M_DELETE_PROJECT = `
mutation DeleteProject($id: ID!) {
  deleteProject(id: $id) {
    project {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
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
}`;

// Auto-generated GraphQL operation for Project (subscriptionCreate)
export const S_ON_CREATE_PROJECT = `
subscription OnCreateProject($ownerId: ID, $tenantId: ID) {
  onCreateProject(ownerId: $ownerId, tenantId: $tenantId) {
    project {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
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
}`;

// Auto-generated GraphQL operation for Project (subscriptionUpdate)
export const S_ON_UPDATE_PROJECT = `
subscription OnUpdateProject($id: ID!) {
  onUpdateProject(id: $id) {
    project {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
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
}`;

// Auto-generated GraphQL operation for Project (subscriptionDelete)
export const S_ON_DELETE_PROJECT = `
subscription OnDeleteProject($id: ID!) {
  onDeleteProject(id: $id) {
    project {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
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
}`;
