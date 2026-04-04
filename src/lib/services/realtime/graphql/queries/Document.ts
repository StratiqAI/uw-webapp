export const Q_DOCUMENT_BY_ID = `
  query documentById($id: ID!) {
    document(
      docHash: $id
    ) {
    docHash
    s3Bucket
    s3Key
    updatedAt
    texts {
      items {
        id
        docHash
        pageId
        pageNumber
        content
        createdAt
        updatedAt
      }
    }
    pages {
      items {
        id
        docHash
        pageNumber
        createdAt
        updatedAt
      }
    }
  }
}
`;
