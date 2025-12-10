import type { Project } from "$lib/types/Project";
import { gql } from "$lib/realtime/graphql/requestHandler";

export const M_CREATE_PROJECT = `
    mutation createProject($input: CreateProjectInput!) {
        createProject(input: $input) {
            project {
                id
                entityType
                tenantId
                ownerId
                createdAt
                updatedAt
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
    }
`;



export const M_UPDATE_PROJECT = `
    mutation updateProject($id: ID!, $input: UpdateProjectInput!) {
        updateProject(id: $id, input: $input) {
            project {
                id
                entityType
                tenantId
                ownerId
                createdAt
                updatedAt
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
            project {
                id
                entityType
                tenantId
                ownerId
                createdAt
                updatedAt
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
        name: project.name
    };
    try {
        const res = await gql<{ updateProject: { project: Project | null; userErrors: Array<{ message: string; code: string; field?: string[] }> } }>(
            mutation, 
            { id: project.id, input }, 
            idToken
        );
        
        // Check for user errors
        if (res.updateProject.userErrors && res.updateProject.userErrors.length > 0) {
            const errorMessages = res.updateProject.userErrors.map(e => e.message).join(', ');
            console.error('GraphQL user errors:', res.updateProject.userErrors);
            throw new Error(`Error updating project: ${errorMessages}`);
        }
        
        if (!res.updateProject.project) {
            console.error('Project update returned null project');
            throw new Error('Error updating project: No project returned');
        }
        
        return res.updateProject.project;
    } catch (e) {
        console.error('Error updating project:', e);
        throw e;
    }
}