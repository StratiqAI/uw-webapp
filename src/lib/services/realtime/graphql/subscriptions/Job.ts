export const S_JOB_UPDATE = `
  subscription OnJobUpdate($id: ID!) {
    onJobUpdate(id: $id) {
      id
      request
      result
      status
      createdAt
      updatedAt
    }
  }
`;
