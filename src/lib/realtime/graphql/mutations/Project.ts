import type { Project } from "$lib/types/Project";
import { gql } from "$lib/realtime/graphql/requestHandler";

export const M_CREATE_PROJECT = `
    mutation createProject($input: CreateProjectInput!) {
        createProject(input: $input) {
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



export const M_UPDATE_PROJECT = `
    mutation updateProject($input: UpdateProjectInput!) {
        updateProject(input: $input) {
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

export const M_SHARE_PROJECT = `
    mutation shareProject($input: ShareProjectInput!) {
        shareProject(input: $input) {
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

export const M_DELETE_PROJECT = `
    mutation deleteProject($id: ID!) {
        deleteProject(id: $id) {
            id
            name
            ownerId
            tenant
            sharingMode
            createdAt
        }
    }
`;


// Mutation for creating ProjectDetail
export const M_CREATE_PROJECT_DETAIL = `
    mutation createProjectDetail($input: CreateProjectDetailInput!) {
        createProjectDetail(input: $input) {
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
`;

// Mutation for updating ProjectDetail
export const M_UPDATE_PROJECT_DETAIL = `
    mutation updateProjectDetail($input: UpdateProjectDetailInput!) {
        updateProjectDetail(input: $input) {
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
`;

// Mutation for deleting ProjectDetail
export const M_DELETE_PROJECT_DETAIL = `
    mutation deleteProjectDetail($id: ID!) {
        deleteProjectDetail(id: $id) {
            id
            projectId
            ownerId
        }
    }
`;

// Mutation for creating ProjectDocument
export const M_CREATE_PROJECT_DOCUMENT = `
    mutation createProjectDocument($input: CreateProjectDocumentInput!) {
        createProjectDocument(input: $input) {
            id
            projectId
            ownerId
            tenant
            filename
            openAIFileId
            sharingMode
            createdAt
            updatedAt
        }
    }
`;

// Mutation for updating ProjectDocument
export const M_UPDATE_PROJECT_DOCUMENT = `
    mutation updateProjectDocument($input: UpdateProjectDocumentInput!) {
        updateProjectDocument(input: $input) {
            id
            projectId
            ownerId
            tenant
            filename
            openAIFileId
            sharingMode
            createdAt
            updatedAt
        }
    }
`;

// Mutation for deleting ProjectDocument
export const M_DELETE_PROJECT_DOCUMENT = `
    mutation deleteProjectDocument($id: ID!) {
        deleteProjectDocument(id: $id) {
            id
            projectId
            ownerId
        }
    }
`;

// Mutation for creating ProjectDocumentLink
export const M_CREATE_PROJECT_DOCUMENT_LINK = `
    mutation createProjectDocumentLink($input: CreateProjectDocumentLinkInput!) {
        createProjectDocumentLink(input: $input) {
            id
            parentId
            parentType
            documentId
            filename
            ownerId
            tenantId
            createdAt
            updatedAt
        }
    }
`;

// Mutation for deleting ProjectDocumentLink
export const M_DELETE_PROJECT_DOCUMENT_LINK = `
    mutation deleteProjectDocumentLink($id: ID!) {
        deleteProjectDocumentLink(id: $id) {
            id
            parentId
            documentId
            filename
        }
    }
`;

export async function updateProject(project: Project, idToken: string) {
    const mutation = M_UPDATE_PROJECT;
    // Extract only the fields that can be updated according to UpdateProjectInput
    const input = {
        projectId: project.id,
        name: project.name
    };
    try {
        const res = await gql<{ updateProject: Project }>(mutation, { input }, idToken);
        return res.updateProject;
    } catch (e) {
        console.error('Error updating project:', e);
        throw e;
    }
}