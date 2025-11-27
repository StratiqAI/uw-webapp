import { ResourceManager } from './ResourceManager.svelte';
import { gql } from '$lib/realtime/graphql/requestHandler';

// Define the TS Interface manually since we aren't using codegen
export interface Prompt {
    id: string;
    name: string;
    model: string;
    description?: string;
    inputs: string; // AWSJSON comes back as string
    variables: string[];
    updatedAt: string;
    // ... add other fields as needed for UI
}

// Define the queries once
const QUERIES = {
    list: `
        query ListPrompts($limit: Int, $nextToken: String) {
            listPrompts(limit: $limit, nextToken: $nextToken) {
                items { id name model updatedAt description }
                nextToken
            }
        }
    `,
    get: `
        query GetPrompt($id: ID!) {
            getPrompt(id: $id) {
                id name model description inputs variables toolChoice updatedAt
                tools { items { type functionDefinition } } 
            }
        }
    `,
    create: `
        mutation CreatePrompt($input: CreatePromptInput!) {
            createPrompt(input: $input) {
                id name model updatedAt description
            }
        }
    `,
    update: `
        mutation UpdatePrompt($id: ID!, $input: UpdatePromptInput!) {
            updatePrompt(id: $id, input: $input) {
                id name model updatedAt description
            }
        }
    `,
    delete: `
        mutation DeletePrompt($id: ID!) {
            deletePrompt(id: $id) { id }
        }
    `
};

// Create a GraphQL client wrapper that uses the gql function
const createGraphQLClient = (idToken: string) => ({
    request: async <R = any, V = any>(query: string, variables?: V): Promise<R> => {
        if (!idToken) {
            throw new Error('ID token is required for GraphQL requests');
        }
        return await gql<R>(query, variables || {}, idToken);
    }
});

// Export a factory function that creates a prompt manager with the idToken
export const createPromptManager = (idToken: string) => new ResourceManager<Prompt>({
    client: createGraphQLClient(idToken),
    keys: {
        list: 'listPrompts',
        get: 'getPrompt',
        create: 'createPrompt',
        update: 'updatePrompt',
        delete: 'deletePrompt'
    },
    queries: QUERIES
});