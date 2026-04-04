export const S_CREATE_TEXT = `
subscription OnCreateText($pageId: ID) {
  onCreateText(pageId: $pageId) {
    id
    pageId
    pageNumber
    docHash
    content
    createdAt
    updatedAt
  }
}
`;
