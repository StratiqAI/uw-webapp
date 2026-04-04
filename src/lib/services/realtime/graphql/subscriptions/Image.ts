export const S_CREATE_IMAGE = `
subscription OnCreateImage($pageId: ID) {
  onCreateImage(pageId: $pageId) {
    id
    pageId
    docHash
    s3Bucket
    s3Key
    createdAt
    updatedAt
  }
}
`;
