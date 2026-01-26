import { gql } from "$lib/realtime/graphql/requestHandler";
import { print } from 'graphql';

// Re-export operations from @agnathan/types-simple for backward compatibility
// New code should import directly from '@agnathan/types-simple'
export { M_CREATE_PROJECT, M_UPDATE_PROJECT, M_DELETE_PROJECT } from '@agnathan/types-simple';

// Legacy operations that don't exist in types-simple (ProjectDetail, ProjectDocument, etc.)
// These are kept for backward compatibility but should be migrated or removed

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

// M_DELETE_PROJECT is now exported from @agnathan/types-simple above


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

// import { print } from 'graphql';
// import type { Project } from '@agnathan/types-simple';

// export async function updateProject(project: Project, idToken: string) {
//     // Extract only the fields that can be updated according to UpdateProjectInput
//     const input = {
//         name: project.name
//     };
//     try {
//         const res = await gql<{ updateProject: Project | null }>(
//             print(M_UPDATE_PROJECT), 
//             { id: project.id, input }, 
//             idToken
//         );
        
//         if (!res.updateProject) {
//             console.error('Project update returned null project');
//             throw new Error('Error updating project: No project returned');
//         }
        
//         return res.updateProject;
//     } catch (e) {
//         console.error('Error updating project:', e);
//         throw e;
//     }
// }