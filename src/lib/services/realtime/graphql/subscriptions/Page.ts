export const S_CREATE_PAGE = `
  subscription OnCreatePage($docHash: ID) {
    onCreatePage(docHash: $docHash) {
      id
      docHash
      pageNumber
      createdAt
      updatedAt
    }
  }
`;
