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

// Auto-generated GraphQL operation for Project (subscription)
export const S_ON_PROJECT = `
subscription OnProject {
  onProject {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    name
    description
  }
}`;

// Auto-generated GraphQL operation for Project (subscriptionCreate)
export const S_ON_CREATE_PROJECT = `
subscription OnCreateProject {
  onCreateProject {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    name
    description
  }
}`;

// Auto-generated GraphQL operation for Project (subscriptionUpdate)
export const S_ON_UPDATE_PROJECT = `
subscription OnUpdateProject($key: PrimaryKeyInput!) {
  onUpdateProject(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    name
    description
  }
}`;

// Auto-generated GraphQL operation for Project (subscriptionDelete)
export const S_ON_DELETE_PROJECT = `
subscription OnDeleteProject($key: PrimaryKeyInput!) {
  onDeleteProject(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    name
    description
  }
}`;

// Auto-generated GraphQL operation for Project (getWith_docLinks)
export const Q_GET_PROJECT_WITH_DOCLINKS = `
query GetProjectWithDocLinks($key: PrimaryKeyInput!) {
  getProject(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    name
    description
    docLinks {
      items {
        id
        entityType
        createdAt
        updatedAt
        tenantId
        ownerId
        parentId
        parentType
        documentId
        filename
        vectorStoreId
        openAIFileId
        status
      }
    }
  }
}`;

// Auto-generated GraphQL operation for Project (listWith_docLinks)
export const Q_LIST_PROJECTS_WITH_DOCLINKS = `
query ListProjectsWithDocLinks($limit: Int, $nextToken: String, $scope: ListScope) {
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
      docLinks {
        items {
          id
        entityType
        createdAt
        updatedAt
        tenantId
        ownerId
        parentId
        parentType
        documentId
        filename
        vectorStoreId
        openAIFileId
        status
        }
      }
    }
    nextToken
  }
}`;

// Auto-generated GraphQL operation for Project (getWith_messages)
export const Q_GET_PROJECT_WITH_MESSAGES = `
query GetProjectWithMessages($key: PrimaryKeyInput!) {
  getProject(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    name
    description
    messages {
      items {
        id
        entityType
        createdAt
        updatedAt
        tenantId
        ownerId
        parentId
        parentType
        content
        sender
      }
    }
  }
}`;

// Auto-generated GraphQL operation for Project (listWith_messages)
export const Q_LIST_PROJECTS_WITH_MESSAGES = `
query ListProjectsWithMessages($limit: Int, $nextToken: String, $scope: ListScope) {
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
      messages {
        items {
          id
        entityType
        createdAt
        updatedAt
        tenantId
        ownerId
        parentId
        parentType
        content
        sender
        }
      }
    }
    nextToken
  }
}`;

// ==== DocLink ====
// Auto-generated GraphQL operation for DocLink (create)
export const M_CREATE_DOCLINK = `
mutation CreateDocLink($input: CreateDocLinkInput!) {
  createDocLink(input: $input) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    documentId
    filename
    vectorStoreId
    openAIFileId
    status
  }
}`;

// Auto-generated GraphQL operation for DocLink (get)
export const Q_GET_DOCLINK = `
query GetDocLink($key: CompositeKeyInput!) {
  getDocLink(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    documentId
    filename
    vectorStoreId
    openAIFileId
    status
  }
}`;

// Auto-generated GraphQL operation for DocLink (list)
export const Q_LIST_DOCLINKS = `
query ListDocLinksWithPagination($limit: Int, $nextToken: String) {
  listDocLinks(limit: $limit, nextToken: $nextToken) {
    items {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
      parentId
      parentType
      documentId
      filename
      vectorStoreId
      openAIFileId
      status
    }
    nextToken
  }
}`;

// Auto-generated GraphQL operation for DocLink (update)
export const M_UPDATE_DOCLINK = `
mutation UpdateDocLink($key: CompositeKeyInput!, $input: UpdateDocLinkInput!) {
  updateDocLink(key: $key, input: $input) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    documentId
    filename
    vectorStoreId
    openAIFileId
    status
  }
}`;

// Auto-generated GraphQL operation for DocLink (delete)
export const M_DELETE_DOCLINK = `
mutation DeleteDocLink($key: CompositeKeyInput!) {
  deleteDocLink(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    documentId
    filename
    vectorStoreId
    openAIFileId
    status
  }
}`;

// Auto-generated GraphQL operation for DocLink (subscription)
export const S_ON_DOCLINK = `
subscription OnDocLink {
  onDocLink {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    documentId
    filename
    vectorStoreId
    openAIFileId
    status
  }
}`;

// Auto-generated GraphQL operation for DocLink (subscriptionCreate)
export const S_ON_CREATE_DOCLINK = `
subscription OnCreateDocLink($parentId: ID) {
  onCreateDocLink(parentId: $parentId) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    documentId
    filename
    vectorStoreId
    openAIFileId
    status
  }
}`;

// Auto-generated GraphQL operation for DocLink (subscriptionUpdate)
export const S_ON_UPDATE_DOCLINK = `
subscription OnUpdateDocLink($key: CompositeKeyInput!) {
  onUpdateDocLink(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    documentId
    filename
    vectorStoreId
    openAIFileId
    status
  }
}`;

// Auto-generated GraphQL operation for DocLink (subscriptionDelete)
export const S_ON_DELETE_DOCLINK = `
subscription OnDeleteDocLink($key: CompositeKeyInput!) {
  onDeleteDocLink(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    documentId
    filename
    vectorStoreId
    openAIFileId
    status
  }
}`;

// ==== Message ====
// Auto-generated GraphQL operation for Message (create)
export const M_CREATE_MESSAGE = `
mutation CreateMessage($input: CreateMessageInput!) {
  createMessage(input: $input) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    content
    sender
  }
}`;

// Auto-generated GraphQL operation for Message (get)
export const Q_GET_MESSAGE = `
query GetMessage($key: CompositeKeyInput!) {
  getMessage(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    content
    sender
  }
}`;

// Auto-generated GraphQL operation for Message (list)
export const Q_LIST_MESSAGES = `
query ListMessagesWithPagination($limit: Int, $nextToken: String) {
  listMessages(limit: $limit, nextToken: $nextToken) {
    items {
      id
      entityType
      createdAt
      updatedAt
      tenantId
      ownerId
      parentId
      parentType
      content
      sender
    }
    nextToken
  }
}`;

// Auto-generated GraphQL operation for Message (update)
export const M_UPDATE_MESSAGE = `
mutation UpdateMessage($key: CompositeKeyInput!, $input: UpdateMessageInput!) {
  updateMessage(key: $key, input: $input) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    content
    sender
  }
}`;

// Auto-generated GraphQL operation for Message (delete)
export const M_DELETE_MESSAGE = `
mutation DeleteMessage($key: CompositeKeyInput!) {
  deleteMessage(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    content
    sender
  }
}`;

// Auto-generated GraphQL operation for Message (subscription)
export const S_ON_MESSAGE = `
subscription OnMessage {
  onMessage {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    content
    sender
  }
}`;

// Auto-generated GraphQL operation for Message (subscriptionCreate)
export const S_ON_CREATE_MESSAGE = `
subscription OnCreateMessage($parentId: ID) {
  onCreateMessage(parentId: $parentId) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    content
    sender
  }
}`;

// Auto-generated GraphQL operation for Message (subscriptionUpdate)
export const S_ON_UPDATE_MESSAGE = `
subscription OnUpdateMessage($key: CompositeKeyInput!) {
  onUpdateMessage(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    content
    sender
  }
}`;

// Auto-generated GraphQL operation for Message (subscriptionDelete)
export const S_ON_DELETE_MESSAGE = `
subscription OnDeleteMessage($key: CompositeKeyInput!) {
  onDeleteMessage(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    tenantId
    ownerId
    parentId
    parentType
    content
    sender
  }
}`;

// ==== Document ====
// Auto-generated GraphQL operation for Document (create)
export const M_CREATE_DOCUMENT = `
mutation CreateDocument($input: CreateDocumentInput!) {
  createDocument(input: $input) {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Document (get)
export const Q_GET_DOCUMENT = `
query GetDocument($key: PrimaryKeyInput!) {
  getDocument(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Document (list)
export const Q_LIST_DOCUMENTS = `
query ListDocumentsWithPagination($limit: Int, $nextToken: String) {
  listDocuments(limit: $limit, nextToken: $nextToken) {
    items {
      id
      entityType
      createdAt
      updatedAt
      docHash
      s3Bucket
      s3Key
    }
    nextToken
  }
}`;

// Auto-generated GraphQL operation for Document (update)
export const M_UPDATE_DOCUMENT = `
mutation UpdateDocument($key: PrimaryKeyInput!, $input: UpdateDocumentInput!) {
  updateDocument(key: $key, input: $input) {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Document (delete)
export const M_DELETE_DOCUMENT = `
mutation DeleteDocument($key: PrimaryKeyInput!) {
  deleteDocument(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Document (subscription)
export const S_ON_DOCUMENT = `
subscription OnDocument {
  onDocument {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Document (subscriptionCreate)
export const S_ON_CREATE_DOCUMENT = `
subscription OnCreateDocument {
  onCreateDocument {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Document (subscriptionUpdate)
export const S_ON_UPDATE_DOCUMENT = `
subscription OnUpdateDocument($key: PrimaryKeyInput!) {
  onUpdateDocument(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Document (subscriptionDelete)
export const S_ON_DELETE_DOCUMENT = `
subscription OnDeleteDocument($key: PrimaryKeyInput!) {
  onDeleteDocument(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Document (getWith_pages)
export const Q_GET_DOCUMENT_WITH_PAGES = `
query GetDocumentWithPages($key: PrimaryKeyInput!) {
  getDocument(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    docHash
    s3Bucket
    s3Key
    pages {
      items {
        id
        entityType
        createdAt
        updatedAt
        parentId
        parentType
        pageNumber
        s3Bucket
        s3Key
      }
    }
  }
}`;

// Auto-generated GraphQL operation for Document (listWith_pages)
export const Q_LIST_DOCUMENTS_WITH_PAGES = `
query ListDocumentsWithPages($limit: Int, $nextToken: String) {
  listDocuments(limit: $limit, nextToken: $nextToken) {
    items {
      id
      entityType
      createdAt
      updatedAt
      docHash
      s3Bucket
      s3Key
      pages {
        items {
          id
        entityType
        createdAt
        updatedAt
        parentId
        parentType
        pageNumber
        s3Bucket
        s3Key
        }
      }
    }
    nextToken
  }
}`;

// ==== Page ====
// Auto-generated GraphQL operation for Page (create)
export const M_CREATE_PAGE = `
mutation CreatePage($input: CreatePageInput!) {
  createPage(input: $input) {
    id
    entityType
    createdAt
    updatedAt
    parentId
    parentType
    pageNumber
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Page (get)
export const Q_GET_PAGE = `
query GetPage($key: CompositeKeyInput!) {
  getPage(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    parentId
    parentType
    pageNumber
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Page (list)
export const Q_LIST_PAGES = `
query ListPagesWithPagination($limit: Int, $nextToken: String) {
  listPages(limit: $limit, nextToken: $nextToken) {
    items {
      id
      entityType
      createdAt
      updatedAt
      parentId
      parentType
      pageNumber
      s3Bucket
      s3Key
    }
    nextToken
  }
}`;

// Auto-generated GraphQL operation for Page (update)
export const M_UPDATE_PAGE = `
mutation UpdatePage($key: CompositeKeyInput!, $input: UpdatePageInput!) {
  updatePage(key: $key, input: $input) {
    id
    entityType
    createdAt
    updatedAt
    parentId
    parentType
    pageNumber
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Page (delete)
export const M_DELETE_PAGE = `
mutation DeletePage($key: CompositeKeyInput!) {
  deletePage(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    parentId
    parentType
    pageNumber
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Page (subscription)
export const S_ON_PAGE = `
subscription OnPage {
  onPage {
    id
    entityType
    createdAt
    updatedAt
    parentId
    parentType
    pageNumber
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Page (subscriptionCreate)
export const S_ON_CREATE_PAGE = `
subscription OnCreatePage($parentId: ID) {
  onCreatePage(parentId: $parentId) {
    id
    entityType
    createdAt
    updatedAt
    parentId
    parentType
    pageNumber
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Page (subscriptionUpdate)
export const S_ON_UPDATE_PAGE = `
subscription OnUpdatePage($key: CompositeKeyInput!) {
  onUpdatePage(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    parentId
    parentType
    pageNumber
    s3Bucket
    s3Key
  }
}`;

// Auto-generated GraphQL operation for Page (subscriptionDelete)
export const S_ON_DELETE_PAGE = `
subscription OnDeletePage($key: CompositeKeyInput!) {
  onDeletePage(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    parentId
    parentType
    pageNumber
    s3Bucket
    s3Key
  }
}`;

// ==== SystemPrompt ====
// Auto-generated GraphQL operation for SystemPrompt (create)
export const M_CREATE_SYSTEMPROMPT = `
mutation CreateSystemPrompt($input: CreateSystemPromptInput!) {
  createSystemPrompt(input: $input) {
    id
    entityType
    createdAt
    updatedAt
    name
    description
  }
}`;

// Auto-generated GraphQL operation for SystemPrompt (get)
export const Q_GET_SYSTEMPROMPT = `
query GetSystemPrompt($key: CompositeKeyInput!) {
  getSystemPrompt(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    name
    description
  }
}`;

// Auto-generated GraphQL operation for SystemPrompt (list)
export const Q_LIST_SYSTEMPROMPTS = `
query ListSystemPromptsWithPagination($limit: Int, $nextToken: String) {
  listSystemPrompts(limit: $limit, nextToken: $nextToken) {
    items {
      id
      entityType
      createdAt
      updatedAt
      name
      description
    }
    nextToken
  }
}`;

// Auto-generated GraphQL operation for SystemPrompt (update)
export const M_UPDATE_SYSTEMPROMPT = `
mutation UpdateSystemPrompt($key: CompositeKeyInput!, $input: UpdateSystemPromptInput!) {
  updateSystemPrompt(key: $key, input: $input) {
    id
    entityType
    createdAt
    updatedAt
    name
    description
  }
}`;

// Auto-generated GraphQL operation for SystemPrompt (delete)
export const M_DELETE_SYSTEMPROMPT = `
mutation DeleteSystemPrompt($key: CompositeKeyInput!) {
  deleteSystemPrompt(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    name
    description
  }
}`;

// Auto-generated GraphQL operation for SystemPrompt (subscription)
export const S_ON_SYSTEMPROMPT = `
subscription OnSystemPrompt {
  onSystemPrompt {
    id
    entityType
    createdAt
    updatedAt
    name
    description
  }
}`;

// Auto-generated GraphQL operation for SystemPrompt (subscriptionCreate)
export const S_ON_CREATE_SYSTEMPROMPT = `
subscription OnCreateSystemPrompt($parentId: ID) {
  onCreateSystemPrompt(parentId: $parentId) {
    id
    entityType
    createdAt
    updatedAt
    name
    description
  }
}`;

// Auto-generated GraphQL operation for SystemPrompt (subscriptionUpdate)
export const S_ON_UPDATE_SYSTEMPROMPT = `
subscription OnUpdateSystemPrompt($key: CompositeKeyInput!) {
  onUpdateSystemPrompt(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    name
    description
  }
}`;

// Auto-generated GraphQL operation for SystemPrompt (subscriptionDelete)
export const S_ON_DELETE_SYSTEMPROMPT = `
subscription OnDeleteSystemPrompt($key: CompositeKeyInput!) {
  onDeleteSystemPrompt(key: $key) {
    id
    entityType
    createdAt
    updatedAt
    name
    description
  }
}`;
