export const S_CREATE_DOCUMENT = `
subscription OnCreateDocument {
  onCreateDocument {
    docHash
    s3Bucket
    s3Key
    createdAt
    updatedAt
  }
}
`;
