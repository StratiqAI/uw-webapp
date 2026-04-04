export const S_CREATE_INSIGHT = `
subscription OnCreateInsight($docHash: ID) {
  onCreateInsight(docHash: $docHash) {
    category
    confidence
    createdAt
    docHash
    hash
    imageId
    model
    name
    pageId
    textId
    type
    value
  }
}
`;
