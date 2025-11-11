export const S_PROJECT_CREATED = `
subscription subCreateProject($ownerId: String!) {
  onCreateProject(ownerId: $ownerId) {
    id
    name
    description
    ownerId
    createdAt
    updatedAt
  }
}
`;

export const S_PROJECT_UPDATED = `
  subscription OnProjectUpdated($projectId: ID!) {
    onUpdateProject(projectId: $projectId) {
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

export const S_PROJECT_DELETED = `
  subscription subDeleteProject($ownerId: String!) {
    onDeleteProject(ownerId: $ownerId) {
    id
    name
    description
    ownerId
    createdAt
    updatedAt
    }
  }
`;

export const S_PROJECT_UPDATED_BY_ID = `
  subscription OnProjectUpdated($projectId: ID!) {
    onUpdateProject(projectId: $projectId) {
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